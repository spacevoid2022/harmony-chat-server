package com.app.auth;

import com.app.auth.dto.AuthResponse;
import com.app.auth.dto.LoginRequest;
import com.app.auth.dto.RegisterRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private RateLimitService rateLimitService;

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Auth controller is reachable!");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest, jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        if (!rateLimitService.isAllowed(ip, 5, 60000)) { // 5 per minute
            return ResponseEntity.status(429).body("Too many registration attempts. Please try again later.");
        }
        return ResponseEntity.ok(authService.register(registerRequest));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        if (!rateLimitService.isAllowed(ip, 10, 60000)) { // 10 per minute
            return ResponseEntity.status(429).body("Too many login attempts. Please try again later.");
        }
        return ResponseEntity.ok(authService.login(loginRequest));
    }

}
