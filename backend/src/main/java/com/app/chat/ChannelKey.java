package com.app.chat;

import jakarta.persistence.*;

@Entity
@Table(name = "channel_keys", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"channel_id", "user_id"})
})
public class ChannelKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "channel_id", nullable = false)
    private Long channelId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String encryptedKey; // Channel's symmetric key encrypted with user's public key

    public ChannelKey() {}

    public ChannelKey(Long channelId, Long userId, String encryptedKey) {
        this.channelId = channelId;
        this.userId = userId;
        this.encryptedKey = encryptedKey;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getChannelId() { return channelId; }
    public void setChannelId(Long channelId) { this.channelId = channelId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getEncryptedKey() { return encryptedKey; }
    public void setEncryptedKey(String encryptedKey) { this.encryptedKey = encryptedKey; }
}
