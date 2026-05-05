package com.app.auth;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {
    private final Map<String, Integer> counts = new ConcurrentHashMap<>();
    private final Map<String, Long> expiry = new ConcurrentHashMap<>();

    /**
     * Checks if a request is allowed based on the key (e.g., IP or Username).
     */
    public boolean isAllowed(String key, int maxRequests, long windowMs) {
        long now = System.currentTimeMillis();
        
        // Simple cleanup of expired entries
        if (counts.size() > 1000) {
            expiry.entrySet().removeIf(e -> e.getValue() < now);
            counts.keySet().removeIf(k -> !expiry.containsKey(k));
        }

        Integer currentCount = counts.get(key);
        Long currentExpiry = expiry.get(key);

        if (currentCount == null || currentExpiry == null || now > currentExpiry) {
            counts.put(key, 1);
            expiry.put(key, now + windowMs);
            return true;
        }

        if (currentCount < maxRequests) {
            counts.put(key, currentCount + 1);
            return true;
        }

        return false;
    }
}
