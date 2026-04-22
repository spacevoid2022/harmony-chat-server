package com.app.chat;

import com.app.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServerMemberRepository extends JpaRepository<ServerMember, Long> {
    List<ServerMember> findByUser(User user);
    boolean existsByServerAndUser(Server server, User user);
}
