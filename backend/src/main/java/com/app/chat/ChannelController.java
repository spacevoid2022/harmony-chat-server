package com.app.chat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/channels")
@CrossOrigin(origins = "*")
public class ChannelController {

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ServerRepository serverRepository;

    @GetMapping
    public List<Channel> getAllChannels() {
        return channelRepository.findAll();
    }

    @PostMapping
    public Channel createChannel(@RequestBody Channel channel, @RequestParam Long serverId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        channel.setServer(server);
        return channelRepository.save(channel);
    }

    @GetMapping("/{id}/messages")
    public List<Message> getChannelMessages(@PathVariable Long id) {
        return messageRepository.findByChannelIdOrderByTimestampAsc(id);
    }
}
