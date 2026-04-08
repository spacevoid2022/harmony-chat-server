package com.app.chat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
public class FileUploadController {

    private final String uploadDir = "uploads/";
    
    // Safety check: Only allow these image types
    private final List<String> allowedTypes = Arrays.asList("image/jpeg", "image/png", "image/gif", "image/webp");
    
    // Safety check: 10MB limit
    private final long maxFileSize = 10 * 1024 * 1024;

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("File is empty");
        }

        // 1. Check File Size
        if (file.getSize() > maxFileSize) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body("File too large (Max 10MB)");
        }

        // 2. Check File Type
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body("Only images (JPG, PNG, GIF, WebP) are allowed");
        }

        try {
            // Ensure directory exists
            Path path = Paths.get(uploadDir);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }

            // Generate unique filename to avoid collisions
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename().replaceAll("\\s+", "_");
            Path filePath = path.resolve(fileName);
            
            // Save file
            Files.copy(file.getInputStream(), filePath);

            // Return the public URL
            String fileUrl = "/uploads/" + fileName;
            return ResponseEntity.ok(fileUrl);
            
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload file: " + e.getMessage());
        }
    }
}
