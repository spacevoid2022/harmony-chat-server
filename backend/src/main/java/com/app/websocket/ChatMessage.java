package com.app.websocket;

public class ChatMessage {
    private String id;
    private String channelId;
    private String senderId;
    private String content;
    private String imageUrl;
    private String timestamp;
    private String type = "CHAT"; // CHAT or DELETE

    public ChatMessage() {}

    public ChatMessage(String id, String channelId, String senderId, String content, String timestamp) {
        this.id = id;
        this.channelId = channelId;
        this.senderId = senderId;
        this.content = content;
        this.timestamp = timestamp;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getChannelId() { return channelId; }
    public void setChannelId(String channelId) { this.channelId = channelId; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
