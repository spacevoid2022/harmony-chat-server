package com.app.auth.dto;

public class AuthResponse {
    private String token;
    private Long userId;
    private String avatarUrl;

    public AuthResponse(String token, Long userId, String avatarUrl) {
        this.token = token;
        this.userId = userId;
        this.avatarUrl = avatarUrl;
    }

    // Getters and Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}
