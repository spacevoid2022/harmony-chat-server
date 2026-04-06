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

    @GetMapping
    public List<Channel> getAllChannels() {
        // Ensure at least one channel exists
        List<Channel> channels = channelRepository.findAll();
        if (channels.isEmpty()) {
            Channel general = new Channel();
            general.setName("general");
            channelRepository.save(general);
            return List.of(general);
        }
        return channels;
    }

    @PostMapping
    public Channel createChannel(@RequestBody Channel channel) {
        return channelRepository.save(channel);
    }

    @GetMapping("/{id}/messages")
    public List<Message> getChannelMessages(@PathVariable Long id) {
        return messageRepository.findByChannelIdOrderByTimestampAsc(id);
    }
}
