package com.app.chat;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
public class ServerService {

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private ServerMemberRepository serverMemberRepository;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        // Drop legacy unique constraint on channel name if it exists (fixes 400 Bad Request on server creation)
        try {
            List<java.util.Map<String, Object>> constraints = jdbcTemplate.queryForList(
                "SELECT constraint_name FROM information_schema.table_constraints " +
                "WHERE table_name = 'channels' AND constraint_type = 'UNIQUE'"
            );
            for (java.util.Map<String, Object> constraint : constraints) {
                String constraintName = (String) constraint.get("constraint_name");
                // Don't drop primary key constraints, just in case
                if (!constraintName.toLowerCase().contains("pkey")) {
                    jdbcTemplate.execute("ALTER TABLE channels DROP CONSTRAINT " + constraintName);
                }
            }
        } catch (Exception e) {
            System.out.println("No unique constraints to drop or DB error: " + e.getMessage());
        }

        createDefaultUcmServer();

        // Migrate missing invite codes for pre-existing servers
        List<Server> allServers = serverRepository.findAll();
        for (Server server : allServers) {
            if (server.getInviteCode() == null) {
                if ("UCM".equals(server.getName())) {
                    server.setInviteCode("UCM-HUB");
                } else {
                    server.setInviteCode(UUID.randomUUID().toString().substring(0, 8));
                }
                serverRepository.save(server);
            }
        }
    }

    @Transactional
    public void createDefaultUcmServer() {
        if (serverRepository.findByName("UCM").isEmpty()) {
            Server ucm = new Server("UCM", 1L); // Default owner ID 1
            ucm.setIconUrl("/ucm-default-icon.png");
            ucm.setInviteCode("UCM-HUB");
            serverRepository.save(ucm);

            // Move all existing channels that don't have a server to UCM
            List<Channel> orphans = channelRepository.findAll().stream()
                    .filter(c -> c.getServer() == null)
                    .collect(Collectors.toList());
            
            for (Channel channel : orphans) {
                channel.setServer(ucm);
                channelRepository.save(channel);
            }
        }
    }

    @Transactional
    public Server createServer(String name, Long ownerId, String iconUrl) {
        Server server = new Server(name, ownerId);
        server.setIconUrl(iconUrl);
        server.setInviteCode(UUID.randomUUID().toString().substring(0, 8));
        Server savedServer = serverRepository.save(server);

        // Add owner as a member
        userRepository.findById(ownerId).ifPresent(user -> {
            serverMemberRepository.save(new ServerMember(savedServer, user, "OWNER"));
        });

        // Create a default "general" channel
        channelRepository.save(new Channel("general", savedServer));

        return savedServer;
    }

    @Transactional
    public void joinServer(Long serverId, Long userId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!serverMemberRepository.existsByServerAndUser(server, user)) {
            serverMemberRepository.save(new ServerMember(server, user, "MEMBER"));
        }
    }

    @Transactional
    public Server joinServerByInvite(String inviteCode, Long userId) {
        Server server = serverRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new RuntimeException("Invalid invite code"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!serverMemberRepository.existsByServerAndUser(server, user)) {
            serverMemberRepository.save(new ServerMember(server, user, "MEMBER"));
        }
        return server;
    }

    @Transactional
    public Server updateServer(Long serverId, String name, String iconUrl, Long userId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        
        if (!server.getOwnerId().equals(userId)) {
            throw new RuntimeException("Only the server owner can update settings");
        }

        if (name != null && !name.trim().isEmpty()) {
            server.setName(name.trim());
        }
        if (iconUrl != null) {
            server.setIconUrl(iconUrl);
        }
        
        return serverRepository.save(server);
    }

    public List<Server> getServersForUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Auto-join UCM if not a member
        serverRepository.findByName("UCM").ifPresent(ucm -> {
            if (!serverMemberRepository.existsByServerAndUser(ucm, user)) {
                joinServer(ucm.getId(), user.getId());
            }
        });

        return serverMemberRepository.findByUser(user).stream()
                .map(ServerMember::getServer)
                .collect(Collectors.toList());
    }

    public List<Channel> getChannelsForServer(Long serverId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        return server.getChannels();
    }
}
