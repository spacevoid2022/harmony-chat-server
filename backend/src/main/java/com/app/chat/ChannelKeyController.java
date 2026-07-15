package com.app.chat;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/channels")
@CrossOrigin(origins = "*")
public class ChannelKeyController {

    @Autowired
    private ChannelKeyRepository channelKeyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private ServerService serverService;

    @GetMapping("/{channelId}/key")
    public ResponseEntity<?> getChannelKey(@PathVariable Long channelId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Optional<ChannelKey> channelKey = channelKeyRepository.findByChannelIdAndUserId(channelId, user.getId());
        if (channelKey.isPresent()) {
            return ResponseEntity.ok(channelKey.get());
        }
        
        // Check if any keys have been generated for this channel by other members
        List<ChannelKey> allKeys = channelKeyRepository.findByChannelId(channelId);
        if (!allKeys.isEmpty()) {
            return ResponseEntity.status(202).body("{\"status\":\"pending_sync\"}");
        }
        
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{channelId}/keys")
    public ResponseEntity<?> saveChannelKeys(@PathVariable Long channelId, @RequestBody List<ChannelKeyRequest> keys) {
        List<ChannelKey> savedKeys = new ArrayList<>();
        for (ChannelKeyRequest req : keys) {
            Optional<ChannelKey> existing = channelKeyRepository.findByChannelIdAndUserId(channelId, req.getUserId());
            ChannelKey channelKey;
            if (existing.isPresent()) {
                channelKey = existing.get();
                channelKey.setEncryptedKey(req.getEncryptedKey());
            } else {
                channelKey = new ChannelKey(channelId, req.getUserId(), req.getEncryptedKey());
            }
            savedKeys.add(channelKeyRepository.save(channelKey));
        }
        return ResponseEntity.ok(savedKeys);
    }

    @GetMapping("/{channelId}/members-missing-keys")
    public ResponseEntity<List<UserKeyInfo>> getMembersMissingKeys(@PathVariable Long channelId) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("Channel not found"));

        List<User> members;
        if ("DM".equals(channel.getType())) {
            members = channel.getParticipants();
        } else if (channel.getServer() != null) {
            members = serverService.getServerMembers(channel.getServer().getId());
        } else {
            members = new ArrayList<>();
        }

        List<UserKeyInfo> missing = new ArrayList<>();
        for (User member : members) {
            if (member.getPublicKey() == null || member.getPublicKey().isEmpty()) {
                continue; // Cannot encrypt for users who don't have a public key yet
            }
            Optional<ChannelKey> key = channelKeyRepository.findByChannelIdAndUserId(channelId, member.getId());
            if (key.isEmpty()) {
                missing.add(new UserKeyInfo(member.getId(), member.getUsername(), member.getPublicKey()));
            }
        }
        return ResponseEntity.ok(missing);
    }

    public static class ChannelKeyRequest {
        private Long userId;
        private String encryptedKey;

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getEncryptedKey() { return encryptedKey; }
        public void setEncryptedKey(String encryptedKey) { this.encryptedKey = encryptedKey; }
    }

    public static class UserKeyInfo {
        private Long userId;
        private String username;
        private String publicKey;

        public UserKeyInfo(Long userId, String username, String publicKey) {
            this.userId = userId;
            this.username = username;
            this.publicKey = publicKey;
        }

        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPublicKey() { return publicKey; }
        public void setPublicKey(String publicKey) { this.publicKey = publicKey; }
    }
}
