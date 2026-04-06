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

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(ChatMessage chatMessage) {
        // Save the message in PostgreSQL via ChatService
        Message savedMessage = chatService.saveMessage(
                Long.parseLong(chatMessage.getChannelId()),
                chatMessage.getSenderId(), // Expecting username here
                chatMessage.getContent()
        );

        // Update the timestamp to match the one saved in the DB
        chatMessage.setTimestamp(savedMessage.getTimestamp().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        // Broadcast the message to all users in the specific channel
        messagingTemplate.convertAndSend(
                "/topic/channel/" + chatMessage.getChannelId(),
                chatMessage
        );
    }
}
