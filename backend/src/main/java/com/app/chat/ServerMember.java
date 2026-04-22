package com.app.chat;

import com.app.auth.User;
import jakarta.persistence.*;

@Entity
@Table(name = "server_members")
public class ServerMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "server_id")
    private Server server;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String role; // OWNER, MEMBER, ADMIN

    public ServerMember() {}

    public ServerMember(Server server, User user, String role) {
        this.server = server;
        this.user = user;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Server getServer() { return server; }
    public void setServer(Server server) { this.server = server; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
