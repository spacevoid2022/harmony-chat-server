package com.app.chat;

import com.app.auth.User;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "channels")
public class Channel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "varchar(255) default 'TEXT'")
    private String type = "TEXT";

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne
    @JoinColumn(name = "server_id")
    private Server server;

    @ManyToMany
    @JoinTable(
      name = "channel_participants",
      joinColumns = @JoinColumn(name = "channel_id"),
      inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private List<User> participants = new java.util.ArrayList<>();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "channel", cascade = CascadeType.ALL)
    private List<Message> messages;

    public Channel() {}

    public Channel(String name, Server server) {
        this.name = name;
        this.server = server;
    }

    public Channel(String name, List<User> participants) {
        this.name = name;
        this.participants = participants;
        this.type = "DM";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Server getServer() { return server; }
    public void setServer(Server server) { this.server = server; }
    public List<User> getParticipants() { return participants; }
    public void setParticipants(List<User> participants) { this.participants = participants; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}
