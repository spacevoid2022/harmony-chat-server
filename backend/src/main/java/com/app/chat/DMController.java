package com.app.chat;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dm")
public class DMController {

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<Channel> getMyDMs(Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        return channelRepository.findByType("DM").stream()
                .filter(c -> c.getParticipants().stream().anyMatch(p -> p.getId().equals(me.getId())))
                .collect(Collectors.toList());
    }

    @PostMapping("/open/{username}")
    public Channel openDM(@PathVariable String username, Principal principal) {
        User me = userRepository.findByUsername(principal.getName()).orElseThrow();
        User target = userRepository.findByUsername(username).orElseThrow();

        // Check if DM already exists
        Optional<Channel> existing = channelRepository.findByType("DM").stream()
                .filter(c -> c.getParticipants().size() == 2)
                .filter(c -> c.getParticipants().stream().anyMatch(p -> p.getId().equals(me.getId())))
                .filter(c -> c.getParticipants().stream().anyMatch(p -> p.getId().equals(target.getId())))
                .findFirst();

        if (existing.isPresent()) {
            return existing.get();
        }

        // Create new DM channel
        Channel dm = new Channel("DM: " + me.getUsername() + " & " + target.getUsername(), Arrays.asList(me, target));
        return channelRepository.save(dm);
    }
}
