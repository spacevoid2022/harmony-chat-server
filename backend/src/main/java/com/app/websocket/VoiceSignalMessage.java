package com.app.websocket;

public class VoiceSignalMessage {
    private String type; // join, leave, offer, answer, candidate
    private String channelId;
    private String senderId;
    private String targetId; // used for offer, answer, candidate
    private Object payload; // WebRTC SDP or ICE candidate

    public VoiceSignalMessage() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getChannelId() { return channelId; }
    public void setChannelId(String channelId) { this.channelId = channelId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }
}
