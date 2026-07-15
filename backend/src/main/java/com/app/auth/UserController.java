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

    @PutMapping("/fcm-token")
    public ResponseEntity<Void> updateFcmToken(@RequestBody String fcmToken, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setFcmToken(fcmToken);
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/keys")
    public ResponseEntity<User> updateKeys(@RequestBody UserKeysDto keys, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPublicKey(keys.getPublicKey());
        user.setEncryptedPrivateKey(keys.getEncryptedPrivateKey());
        user.setKeySalt(keys.getKeySalt());
        user.setKeyIv(keys.getKeyIv());
        return ResponseEntity.ok(userRepository.save(user));
    }

    @GetMapping("/keys")
    public ResponseEntity<UserKeysDto> getKeys(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserKeysDto dto = new UserKeysDto();
        dto.setPublicKey(user.getPublicKey());
        dto.setEncryptedPrivateKey(user.getEncryptedPrivateKey());
        dto.setKeySalt(user.getKeySalt());
        dto.setKeyIv(user.getKeyIv());
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/{username}/public-key")
    public ResponseEntity<String> getPublicKey(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getPublicKey() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(user.getPublicKey());
    }

    public static class UserKeysDto {
        private String publicKey;
        private String encryptedPrivateKey;
        private String keySalt;
        private String keyIv;

        public String getPublicKey() { return publicKey; }
        public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
        public String getEncryptedPrivateKey() { return encryptedPrivateKey; }
        public void setEncryptedPrivateKey(String encryptedPrivateKey) { this.encryptedPrivateKey = encryptedPrivateKey; }
        public String getKeySalt() { return keySalt; }
        public void setKeySalt(String keySalt) { this.keySalt = keySalt; }
        public String getKeyIv() { return keyIv; }
        public void setKeyIv(String keyIv) { this.keyIv = keyIv; }
    }
}

