package com.app.chat;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
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
    
    // Safety check: 10MB limit (raw file size)
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
            
            // 3. Image Processing: Scale down if wider than 1000px
            // GIFs are tricky to resize with Thumbnailator without extra plugins, 
            // so we only resize non-GIF images or skip if it's already small.
            if (!"image/gif".equals(contentType)) {
                BufferedImage originalImage = ImageIO.read(file.getInputStream());
                if (originalImage != null) {
                    if (originalImage.getWidth() > 1000) {
                        Thumbnails.of(originalImage)
                                .width(1000)
                                .keepAspectRatio(true)
                                .toFile(filePath.toFile());
                    } else {
                        // Small enough, just save
                        Files.copy(file.getInputStream(), filePath);
                    }
                } else {
                    // Fallback if ImageIO fails
                    Files.copy(file.getInputStream(), filePath);
                }
            } else {
                // For GIFs, we just copy to preserve animation
                Files.copy(file.getInputStream(), filePath);
            }

            // Return the public URL
            String fileUrl = "/uploads/" + fileName;
            return ResponseEntity.ok(fileUrl);
            
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload file: " + e.getMessage());
        }
    }
}
