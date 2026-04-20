import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { getUsername } from '../services/auth';
import { createWebsocketClient } from '../services/websocket';

const useChat = (channelId) => {
  const [messages, setMessages] = useState([]);
  
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
  }, [channelId]);

  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Fetch history when channel changes
  useEffect(() => {
    if (!channelId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}/messages`);
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

  const deleteMessage = useCallback((messageId) => {
    if (clientRef.current && isConnected && channelId) {
      console.log('DEBUG: Sending DELETE request for messageId:', messageId);
      const payload = {
        id: messageId.toString(),
        channelId: channelId,
        senderId: getUsername(),
        type: 'DELETE'
      };
      
      clientRef.current.publish({
        destination: '/app/chat.deleteMessage',
        body: JSON.stringify(payload)
      });
    }
  }, [channelId, isConnected]);

  return { messages, sendMessage, deleteMessage, isConnected };
};

export default useChat;
