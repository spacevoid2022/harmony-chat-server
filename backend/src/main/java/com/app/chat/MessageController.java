package com.app.chat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private ChatService chatService;

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id, java.security.Principal principal) {
        String username = principal.getName();
        System.out.println("DEBUG: REST Delete request received for ID: " + id + " from authenticated user: " + username);
        boolean success = chatService.deleteMessage(id, username);
        if (success) {
            return ResponseEntity.ok().build();
        } else {
            return ResponseEntity.status(403).body("Unauthorized or message not found");
        }
    }

}
