package com.app.chat;

import com.app.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {
    Optional<Reaction> findByMessageAndUserAndEmoji(Message message, User user, String emoji);
}
