package com.app.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChannelRepository extends JpaRepository<Channel, Long> {
    Optional<Channel> findByName(String name);
    java.util.List<Channel> findByType(String type);
    java.util.List<Channel> findByServerId(Long serverId);
}
