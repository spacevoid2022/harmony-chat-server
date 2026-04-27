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

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private ReactionRepository reactionRepository;

    @Transactional
    public Message toggleReaction(Long messageId, String username, String emoji) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        java.util.Optional<Reaction> existing = reactionRepository.findByMessageAndUserAndEmoji(message, user, emoji);
        if (existing.isPresent()) {
            Reaction r = existing.get();
            message.getReactions().remove(r);
            reactionRepository.delete(r);
        } else {
            Reaction reaction = new Reaction(message, user, emoji);
            reactionRepository.save(reaction);
            message.getReactions().add(reaction);
        }
        return messageRepository.saveAndFlush(message);
    }

    @Transactional
    public Message saveMessage(Long channelId, String username, String content, String imageUrl) {
        Channel channel = channelRepository.findById(channelId)
                .orElseGet(() -> {
                    Server ucm = serverRepository.findByName("UCM").orElse(null);
                    return channelRepository.save(new Channel("Channel " + channelId, ucm));
                });

        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        Message message = new Message(channel, sender, content, imageUrl);
        return messageRepository.saveAndFlush(message);
    }
    @Transactional
    public boolean deleteMessage(Long messageId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return messageRepository.findById(messageId)
                .map(message -> {
                    boolean isSender = message.getSender().getUsername().equals(username);
                    boolean isServerOwner = message.getChannel().getServer().getOwnerId().equals(user.getId());

                    if (isSender || isServerOwner) {
                        messageRepository.delete(message);
                        return true;
                    }
                    return false;
                }).orElse(false);
    }

    @Transactional
    public void deleteChannel(Long channelId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new RuntimeException("Channel not found"));
        
        if (!channel.getServer().getOwnerId().equals(user.getId())) {
            throw new RuntimeException("Only the server owner can delete channels");
        }
        
        channelRepository.delete(channel);
    }
}
