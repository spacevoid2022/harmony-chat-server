package com.app.friends;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
public class FriendshipController {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public FriendshipController(FriendshipRepository friendshipRepository, UserRepository userRepository) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/request/{username}")
    public ResponseEntity<?> sendFriendRequest(@PathVariable String username, Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        User target = userRepository.findByUsername(username).orElse(null);

        if (target == null) return ResponseEntity.badRequest().body("User not found");
        if (me.getId().equals(target.getId())) return ResponseEntity.badRequest().body("Cannot add yourself");

        if (friendshipRepository.findByUserAndFriend(me, target).isPresent()) {
            return ResponseEntity.badRequest().body("Request already exists");
        }

        Friendship request = new Friendship(me, target, FriendshipStatus.PENDING);
        friendshipRepository.save(request);
        return ResponseEntity.ok("Friend request sent");
    }

    @PostMapping("/accept/{username}")
    public ResponseEntity<?> acceptFriendRequest(@PathVariable String username, Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        User target = userRepository.findByUsername(username).orElse(null);

        if (target == null) return ResponseEntity.badRequest().body("User not found");

        Friendship incoming = friendshipRepository.findByUserAndFriend(target, me)
                .filter(f -> f.getStatus() == FriendshipStatus.PENDING)
                .orElse(null);

        if (incoming == null) return ResponseEntity.badRequest().body("No pending request");

        incoming.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(incoming);

        // Create the reverse friendship for easy lookup
        if (friendshipRepository.findByUserAndFriend(me, target).isEmpty()) {
            Friendship reverse = new Friendship(me, target, FriendshipStatus.ACCEPTED);
            friendshipRepository.save(reverse);
        }

        return ResponseEntity.ok("Friend request accepted");
    }

    @GetMapping
    public List<User> getFriends(Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        return friendshipRepository.findByUserAndStatus(me, FriendshipStatus.ACCEPTED)
                .stream()
                .map(Friendship::getFriend)
                .collect(Collectors.toList());
    }

    @GetMapping("/pending")
    public List<User> getPendingRequests(Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        return friendshipRepository.findByFriendAndStatus(me, FriendshipStatus.PENDING)
                .stream()
                .map(Friendship::getUser)
                .collect(Collectors.toList());
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<?> removeFriend(@PathVariable String username, Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        User target = userRepository.findByUsername(username).orElseThrow();

        friendshipRepository.findByUserAndFriend(me, target).ifPresent(friendshipRepository::delete);
        friendshipRepository.findByUserAndFriend(target, me).ifPresent(friendshipRepository::delete);

        return ResponseEntity.ok("Friend removed");
    }
}
