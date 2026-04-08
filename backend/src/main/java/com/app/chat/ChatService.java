package com.app.chat;

import com.app.auth.User;
import com.app.auth.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ChannelRepository channelRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Message saveMessage(Long channelId, String username, String content, String imageUrl) {
        Channel channel = channelRepository.findById(channelId)
                .orElseGet(() -> {
                    return channelRepository.save(new Channel("Channel " + channelId));
                });

        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        Message message = new Message(channel, sender, content, imageUrl);
        return messageRepository.saveAndFlush(message);
    }
}
