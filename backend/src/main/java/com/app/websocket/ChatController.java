package com.app.websocket;

import com.app.chat.ChatService;
import com.app.chat.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.format.DateTimeFormatter;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatService chatService;

    @Autowired
    private com.app.notifications.NotificationService notificationService;

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(ChatMessage chatMessage) {
        // Save the message in PostgreSQL via ChatService
        Message savedMessage = chatService.saveMessage(
                Long.parseLong(chatMessage.getChannelId()),
                chatMessage.getSenderId(),
                chatMessage.getContent(),
                chatMessage.getImageUrl()
        );

        chatMessage.setId(savedMessage.getId().toString());
        chatMessage.setTimestamp(savedMessage.getTimestamp().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        // Broadcast the message to all users in the specific channel
        messagingTemplate.convertAndSend(
                "/topic/channel/" + chatMessage.getChannelId(),
                chatMessage
        );

        // Send a notification for the new message if it's a server channel
        if (savedMessage.getChannel().getServer() != null) {
            notificationService.notifyNewMessage(
                    savedMessage.getChannel().getServer().getId().toString(),
                    chatMessage.getChannelId(),
                    chatMessage.getSenderId(),
                    chatMessage.getContent()
            );
        }
    }

    @MessageMapping("/chat.deleteMessage")
    public void deleteMessage(ChatMessage chatMessage) {
        System.out.println("DEBUG: Delete request received for messageId: " + chatMessage.getId() + " from user: " + chatMessage.getSenderId());
        
        boolean success = chatService.deleteMessage(
                Long.parseLong(chatMessage.getId()),
                chatMessage.getSenderId()
        );

        if (success) {
            System.out.println("DEBUG: Deletion successful for messageId: " + chatMessage.getId());
            chatMessage.setType("DELETE");
            // Broadcast the deletion event to all users in the specific channel
            messagingTemplate.convertAndSend(
                    "/topic/channel/" + chatMessage.getChannelId(),
                    chatMessage
            );
        } else {
            System.out.println("DEBUG: Deletion FAILED for messageId: " + chatMessage.getId() + " (Wrong user or non-existent)");
        }
    }

    @MessageMapping("/chat.toggleReaction")
    public void toggleReaction(ChatMessage chatMessage) {
        Message updatedMessage = chatService.toggleReaction(
                Long.parseLong(chatMessage.getId()),
                chatMessage.getSenderId(),
                chatMessage.getEmoji()
        );

        chatMessage.setType("REACTION");
        chatMessage.setReactions(updatedMessage.getReactions());
        
        messagingTemplate.convertAndSend(
                "/topic/channel/" + chatMessage.getChannelId(),
                chatMessage
        );
    }

    @MessageMapping("/voice.signal")
    public void handleVoiceSignal(VoiceSignalMessage signalMessage) {
        // Broadcast the signal to the specific voice channel
        messagingTemplate.convertAndSend(
                "/topic/voice/" + signalMessage.getChannelId(),
                signalMessage
        );
    }

    @MessageMapping("/chat.sendTyping")
    public void sendTyping(ChatMessage chatMessage) {
        chatMessage.setType("TYPING");
        messagingTemplate.convertAndSend(
                "/topic/channel/" + chatMessage.getChannelId(),
                chatMessage
        );
    }
}
