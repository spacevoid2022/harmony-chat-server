package com.app.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private static final String NOTIFICATION_TOPIC = "/topic/notifications";

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void notifyNewMessage(String channelId, String senderId, String snippet) {
        NotificationMessage message = new NotificationMessage(channelId, senderId, snippet);
        messagingTemplate.convertAndSend(NOTIFICATION_TOPIC, message);
        logger.info("New message notification sent for channel {} from user {}", channelId, senderId);
    }

    public static class NotificationMessage {
        private String type = "new_message";
        private String channelId;
        private String senderId;
        private String snippet;

        public NotificationMessage(String channelId, String senderId, String snippet) {
            this.channelId = channelId;
            this.senderId = senderId;
            this.snippet = snippet != null && snippet.length() > 50 ? snippet.substring(0, 50) + "..." : snippet;
        }

        // Getters
        public String getType() { return type; }
        public String getChannelId() { return channelId; }
        public String getSenderId() { return senderId; }
        public String getSnippet() { return snippet; }
    }
}
