import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { getUsername, getToken } from '../services/auth';
import { createWebsocketClient } from '../services/websocket';

const useChat = (channelId, onNotification) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { username: timestamp }

  // Initial load from cache
  useEffect(() => {
    if (channelId) {
      try {
        const saved = localStorage.getItem(`cache_messages_${channelId}`);
        if (saved && saved !== 'undefined') {
          setMessages(JSON.parse(saved));
        } else {
          setMessages([]);
        }
      } catch (e) {
        setMessages([]);
      }
    }
    setTypingUsers({});
  }, [channelId]);

  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Clear typing users after timeout
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const user in updated) {
          if (now - updated[user] > 4000) {
            delete updated[user];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch history when channel changes
  useEffect(() => {
    if (!channelId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}/messages`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.ok) {
          const history = await response.json();
          const validHistory = Array.isArray(history) ? history : [];
          setMessages(validHistory);
          localStorage.setItem(`cache_messages_${channelId}`, JSON.stringify(validHistory));
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchHistory();
  }, [channelId]);

  const onNotificationRef = useRef(onNotification);
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const onConnect = useCallback(() => {
    setIsConnected(true);
    console.log('Connected to WebSocket');
    
    // Initial subscriptions ...
    clientRef.current.subscribe('/topic/presence', (message) => {
      const presenceUpdate = JSON.parse(message.body);
      console.log('Presence update:', presenceUpdate);
    });
    
    clientRef.current.subscribe('/topic/notifications', (message) => {
      const notification = JSON.parse(message.body);
      console.log('Notification received:', notification);
      if (onNotificationRef.current) {
        onNotificationRef.current(notification);
      }
    });
  }, []);

  const onDisconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  const onError = useCallback((error) => {
    console.error('WebSocket Error:', error);
  }, []);

  // Initialize client once
  useEffect(() => {
    const client = createWebsocketClient(onConnect, onDisconnect, onError);
    clientRef.current = client;
    client.activate();

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [onConnect, onDisconnect, onError]);

  // Handle channel specific subscription
  useEffect(() => {
    if (isConnected && clientRef.current && channelId) {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      console.log('Subscribing to channel:', channelId);
      subscriptionRef.current = clientRef.current.subscribe(`/topic/channel/${channelId}`, (msg) => {
        try {
          const received = JSON.parse(msg.body);
          
          if (received.type === 'DELETE') {
            console.log('DEBUG: DELETE event received via WebSocket for ID:', received.id);
            setMessages((prev) => {
              const updated = prev.filter(m => m.id?.toString() !== received.id?.toString());
              localStorage.setItem(`cache_messages_${channelId}`, JSON.stringify(updated.slice(-100)));
              return updated;
            });
            return;
          }

          if (received.type === 'REACTION') {
            setMessages((prev) => prev.map(m => {
              if (m.id?.toString() === received.id?.toString()) {
                return { ...m, reactions: received.reactions };
              }
              return m;
            }));
            return;
          }

          if (received.type === 'TYPING') {
            const username = received.senderId;
            if (username !== getUsername()) {
              setTypingUsers(prev => ({
                ...prev,
                [username]: Date.now()
              }));
            }
            return;
          }

          setMessages((prev) => {
            // deduplicate by id or content+timestamp
            const exists = prev.some(m => (m.id && received.id && m.id.toString() === received.id.toString()) || 
                                         (m.content === received.content && m.timestamp === received.timestamp));
            if (exists) return prev;
            
            const updated = [...prev, received];
            // Cache only the last 100 messages for speed
            localStorage.setItem(`cache_messages_${channelId}`, JSON.stringify(updated.slice(-100)));
            return updated;
          });
          
          // When a message is received, clear the typing indicator for that user
          setTypingUsers(prev => {
            const updated = { ...prev };
            if (updated[received.senderId]) {
              delete updated[received.senderId];
              return updated;
            }
            return prev;
          });
        } catch (e) {
          console.error('Error parsing websocket message:', e);
        }
      });
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [isConnected, channelId]);

  const sendMessage = useCallback((content, imageUrl = null) => {
    if (clientRef.current && isConnected && channelId) {
      const payload = {
        channelId: channelId,
        senderId: getUsername(),
        content: content,
        imageUrl: imageUrl,
        timestamp: new Date().toISOString()
      };
      
      clientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(payload)
      });
    }
  }, [channelId, isConnected]);

  const sendTyping = useCallback(() => {
    if (clientRef.current && isConnected && channelId) {
      const payload = {
        channelId: channelId,
        senderId: getUsername(),
        type: 'TYPING'
      };
      clientRef.current.publish({
        destination: '/app/chat.sendTyping',
        body: JSON.stringify(payload)
      });
    }
  }, [channelId, isConnected]);

  const deleteMessage = useCallback(async (messageId) => {
    if (clientRef.current && isConnected && channelId) {
      console.log('DEBUG: Sending DELETE request for messageId:', messageId);
      
      // OPTIONAL: Diagnostic alert to confirm UI trigger
      // window.alert('DEBUG: Deleting message ' + messageId);

      const payload = {
        id: messageId.toString(),
        channelId: channelId,
        senderId: getUsername(),
        type: 'DELETE'
      };
      
      // Try WebSocket first
      clientRef.current.publish({
        destination: '/app/chat.deleteMessage',
        body: JSON.stringify(payload)
      });

      // Fallback: Also try REST if the message is still there after 1s
      setTimeout(async () => {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });

          if (resp.ok) {
            console.log('DEBUG: REST Delete success for ID:', messageId);
            // Manually update state if REST succeeded (WebSocket might have missed it)
            setMessages(prev => prev.filter(m => m.id?.toString() !== messageId.toString()));
          }
        } catch (err) {
          console.error('DEBUG: REST Fallback failed:', err);
        }
      }, 1500);
    }
  }, [channelId, isConnected]);

  const toggleReaction = useCallback((messageId, emoji) => {
    if (!messageId) return;
    if (clientRef.current && isConnected && channelId) {
      const payload = {
        id: messageId.toString(),
        channelId: channelId,
        senderId: getUsername(),
        emoji: emoji,
        type: 'REACTION'
      };
      
      clientRef.current.publish({
        destination: '/app/chat.toggleReaction',
        body: JSON.stringify(payload)
      });
    }
  }, [channelId, isConnected]);

  return { messages, sendMessage, sendTyping, deleteMessage, toggleReaction, isConnected, typingUsers };
};

export default useChat;
