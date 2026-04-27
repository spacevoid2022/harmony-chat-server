package com.app.chat;

import com.app.auth.User;
import jakarta.persistence.*;

@Entity
@Table(name = "reactions")
public class Reaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String emoji;

    public Reaction() {}

    public Reaction(Message message, User user, String emoji) {
        this.message = message;
        this.user = user;
        this.emoji = emoji;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }

    @com.fasterxml.jackson.annotation.JsonProperty("username")
    public String getUsername() {
        return user != null ? user.getUsername() : "Unknown";
    }
}
