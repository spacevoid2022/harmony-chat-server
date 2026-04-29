package com.app.friends;

import com.app.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    List<Friendship> findByUser(User user);
    List<Friendship> findByFriendAndStatus(User friend, FriendshipStatus status);
    Optional<Friendship> findByUserAndFriend(User user, User friend);
    List<Friendship> findByUserAndStatus(User user, FriendshipStatus status);
}
