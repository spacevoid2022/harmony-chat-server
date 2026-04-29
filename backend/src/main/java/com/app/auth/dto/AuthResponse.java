package com.app.auth.dto;

public class AuthResponse {
    private String token;
    private Long userId;
    private String avatarUrl;
    private String status;
    private String customStatus;

    public AuthResponse(String token, Long userId, String avatarUrl, String status, String customStatus) {
        this.token = token;
        this.userId = userId;
        this.avatarUrl = avatarUrl;
        this.status = status;
        this.customStatus = customStatus;
    }

    // Getters and Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCustomStatus() { return customStatus; }
    public void setCustomStatus(String customStatus) { this.customStatus = customStatus; }
}
