package com.app.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChannelRepository extends JpaRepository<Channel, Long> {
    Optional<Channel> findByName(String name);
    java.util.List<Channel> findByType(String type);
    
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT c FROM Channel c LEFT JOIN FETCH c.participants WHERE c.type = :type")
    java.util.List<Channel> findByTypeWithParticipants(@org.springframework.data.repository.query.Param("type") String type);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT c FROM Channel c LEFT JOIN FETCH c.participants WHERE c.id = :id")
    Optional<Channel> findByIdWithParticipants(@org.springframework.data.repository.query.Param("id") Long id);

    java.util.List<Channel> findByServerId(Long serverId);
}
