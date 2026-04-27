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

    public void notifyNewMessage(String serverId, String channelId, String senderId, String content) {
        NotificationMessage message = new NotificationMessage(serverId, channelId, senderId, content);
        messagingTemplate.convertAndSend(NOTIFICATION_TOPIC, message);
        logger.info("New message notification sent for server {} channel {} from user {}", serverId, channelId, senderId);
    }

    public static class NotificationMessage {
        private String type = "new_message";
        private String serverId;
        private String channelId;
        private String senderId;
        private String content;

        public NotificationMessage(String serverId, String channelId, String senderId, String content) {
            this.serverId = serverId;
            this.channelId = channelId;
            this.senderId = senderId;
            this.content = content;
        }

        // Getters
        public String getType() { return type; }
        public String getServerId() { return serverId; }
        public String getChannelId() { return channelId; }
        public String getSenderId() { return senderId; }
        public String getContent() { return content; }
    }
}
