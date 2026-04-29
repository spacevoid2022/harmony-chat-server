package com.app.chat;

import com.app.auth.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "channel_id", nullable = false)
    private Channel channel;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @com.fasterxml.jackson.annotation.JsonProperty("senderId")
    public String getSenderIdString() {
        return sender != null ? sender.getUsername() : "Unknown";
    }

    @com.fasterxml.jackson.annotation.JsonProperty("channelId")
    public String getChannelIdString() {
        return channel != null ? channel.getId().toString() : null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("senderAvatarUrl")
    public String getSenderAvatarUrl() {
        return sender != null ? sender.getAvatarUrl() : null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("senderStatus")
    public String getSenderStatus() {
        return sender != null ? sender.getStatus() : "OFFLINE";
    }

    @com.fasterxml.jackson.annotation.JsonProperty("senderCustomStatus")
    public String getSenderCustomStatus() {
        return sender != null ? sender.getCustomStatus() : null;
    }

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 512)
    private String imageUrl;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private java.util.List<Reaction> reactions = new java.util.ArrayList<>();

    public Message() {}

    public Message(Channel channel, User sender, String content) {
        this(channel, sender, content, null);
    }

    public Message(Channel channel, User sender, String content, String imageUrl) {
        this.channel = channel;
        this.sender = sender;
        this.content = content;
        this.imageUrl = imageUrl;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Channel getChannel() { return channel; }
    public void setChannel(Channel channel) { this.channel = channel; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public java.util.List<Reaction> getReactions() { return reactions; }
    public void setReactions(java.util.List<Reaction> reactions) { this.reactions = reactions; }
}
