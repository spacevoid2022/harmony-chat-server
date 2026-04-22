package com.app.chat;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.stream.Collectors;

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

    @PostConstruct
    public void init() {
        createDefaultUcmServer();
    }

    @Transactional
    public void createDefaultUcmServer() {
        if (serverRepository.findByName("UCM").isEmpty()) {
            Server ucm = new Server("UCM", 1L); // Default owner ID 1
            ucm.setIconUrl("/ucm-default-icon.png");
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

    public List<Server> getServersForUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
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
