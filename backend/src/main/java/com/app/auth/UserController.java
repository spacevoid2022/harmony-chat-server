package com.app.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PutMapping("/avatar")
    public ResponseEntity<User> updateAvatar(@RequestBody String avatarUrl, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setAvatarUrl(avatarUrl);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/status")
    public ResponseEntity<User> updateStatus(@RequestBody String status, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus(status);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PutMapping("/custom-status")
    public ResponseEntity<User> updateCustomStatus(@RequestBody String customStatus, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setCustomStatus(customStatus);
        return ResponseEntity.ok(userRepository.save(user));
    }
}
