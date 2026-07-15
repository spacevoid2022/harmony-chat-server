package com.app.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ChannelKeyRepository extends JpaRepository<ChannelKey, Long> {
    Optional<ChannelKey> findByChannelIdAndUserId(Long channelId, Long userId);
    List<ChannelKey> findByChannelId(Long channelId);
}
