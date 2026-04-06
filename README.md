# Harmony Chat

A modern, Discord-inspired real-time chat application built with Spring Boot, PostgreSQL, React, and Electron.

## 🚀 Current Features

- **JWT Authentication**: Secure login and registration with BCrypt password hashing.
- **Real-Time Messaging**: WebSocket-based chat using STOMP and SockJS.
- **Message Persistence**: All chat history is saved in a PostgreSQL database.
- **Presence Tracking**: Real-time "Online/Offline" status indicators for users.
- **Global Notifications**: Instant notifications when new messages arrive.
- **Premium UI**: Dark-themed, glassmorphism design with smooth animations.

## 🛠️ Tech Stack

- **Backend**: Java 17, Spring Boot 3.2.x, Spring Security, Spring Data JPA, WebSockets (STOMP).
- **Frontend**: React 19, TypeScript, Vite, CSS Modules.
- **Database**: PostgreSQL.
- **Desktop**: Electron (Integrated via concurrently).

## 📋 Future Roadmap

- [ ] **Separate Channels**: Support for multiple text channels within a server.
- [ ] **Tenor GIF Support**: Integrated GIF picker and rendering.
- [ ] **File Sharing**: Upload and share images, videos, and documents.
- [ ] **Screen Sharing**: Real-time video streaming and screen capture.
- [ ] **Voice Chat**: Low-latency voice channels using WebRTC.
- [ ] **Direct Messages**: One-on-one private conversations.
- [ ] **Server Management**: Create, join, and manage custom chat servers.

## 🏃 Running Locally

### Backend
1. Ensure Docker is running.
2. Run `docker compose up --build -d` from the root directory.
3. Backend will be available at `http://localhost:8088`.

### Frontend
1. Navigate to `frontend/`.
2. Run `npm install`.
3. Run `npm start` to launch the Vite dev server and Electron app.

---
Developed with ❤️ by the Harmony Team.
