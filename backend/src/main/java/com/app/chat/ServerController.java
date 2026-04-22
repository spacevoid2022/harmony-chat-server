package com.app.chat;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servers")
@CrossOrigin(origins = "*")
public class ServerController {

    @Autowired
    private ServerService serverService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Server>> getMyServers(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(serverService.getServersForUser(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<Server> createServer(@RequestBody Server server, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(serverService.createServer(server.getName(), user.getId(), server.getIconUrl()));
    }

    @GetMapping("/{serverId}/channels")
    public ResponseEntity<List<Channel>> getChannels(@PathVariable Long serverId) {
        return ResponseEntity.ok(serverService.getChannelsForServer(serverId));
    }

    @PostMapping("/{serverId}/join")
    public ResponseEntity<String> joinServer(@PathVariable Long serverId, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        serverService.joinServer(serverId, user.getId());
        return ResponseEntity.ok("Joined successfully");
    }
}
