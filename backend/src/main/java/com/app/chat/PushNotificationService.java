package com.app.chat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.springframework.stereotype.Service;

@Service
public class PushNotificationService {

    public void sendPushNotification(String token, String title, String body) {
        if (token == null || token.isEmpty()) return;

        try {
            Message message = Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("Successfully sent push notification: " + response);
        } catch (Exception e) {
            System.err.println("Error sending push notification: " + e.getMessage());
        }
    }
}
