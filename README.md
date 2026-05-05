# Harmony Chat 🚀

A professional, Discord-inspired real-time communication platform built for Web, Desktop, and **now Android Mobile**.

## ✨ Recent Major Updates
- **📱 Native Mobile Support**: Integrated Capacitor for a seamless Android experience.
- **🛡️ Security Hardening**: Implemented Rate Limiting, CORS Protection, and JWT-secured API endpoints.
- **🎙️ Voice Chat**: Low-latency voice channels with join/leave sound effects.
- **💬 Direct Messaging**: One-on-one private conversations with real-time status.
- **🎨 Premium UX**: Dark-themed UI with Haptic Feedback and custom native branding.

## 🚀 Key Features
- **JWT Authentication**: Secure login/registration with BCrypt hashing and Rate Limiting.
- **Real-Time Messaging**: WebSocket-based chat with typing indicators and notifications.
- **Message Persistence**: Reliable PostgreSQL storage for all history.
- **Cross-Platform**: Run on Browser, Desktop (Electron), or Mobile (Android).
- **File Sharing**: Support for image and media uploads.

## 🛠️ Tech Stack
- **Backend**: Java 17, Spring Boot 3.x, Spring Security, WebSockets (STOMP).
- **Frontend**: React 19, TypeScript, Vite, **Capacitor**.
- **Database**: PostgreSQL.
- **Infrastructure**: Docker Compose, GitHub Actions (CI/CD for Android).

## 📋 Roadmap
- [ ] **Push Notifications**: Real-time alerts via Firebase (FCM).
- [ ] **Play Store Release**: Setting up production signing and assets.
- [ ] **Screen Sharing**: Mobile-compatible screen capture service.
- [ ] **Tenor GIF Support**: Integrated GIF picker.

## 🏃 Running Locally

### Backend (Docker)
1. Ensure Docker is running.
2. Run `docker compose up --build -d`.
3. Backend: `http://localhost:8080`.

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Web) or `npm run electron` (Desktop).

### Mobile (Android)
1. `cd frontend`
2. `npx cap open android` (Requires Android Studio).

---
Developed with ❤️ by the Harmony Team.
