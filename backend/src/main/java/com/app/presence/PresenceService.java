package com.app.presence;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    private static final Logger logger = LoggerFactory.getLogger(PresenceService.class);
    private static final String PRESENCE_TOPIC = "/topic/presence";

    private final Map<String, String> onlineUsers = new ConcurrentHashMap<>();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void markAsOnline(String userId) {
        if (userId == null) return;
        onlineUsers.put(userId, "online");
        broadcastStatus(userId, "online");
        logger.info("User {} is now online", userId);
    }

    public void markAsOffline(String userId) {
        if (userId == null) return;
        onlineUsers.remove(userId);
        broadcastStatus(userId, "offline");
        logger.info("User {} is now offline", userId);
    }

    private void broadcastStatus(String userId, String status) {
        PresenceMessage message = new PresenceMessage(userId, status);
        messagingTemplate.convertAndSend(PRESENCE_TOPIC, message);
    }

    public static class PresenceMessage {
        private String userId;
        private String status;

        public PresenceMessage(String userId, String status) {
            this.userId = userId;
            this.status = status;
        }

        public String getUserId() { return userId; }
        public String getStatus() { return status; }
    }
}
