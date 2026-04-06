import { useState, useEffect, useCallback, useRef } from 'react';
import { createWebsocketClient } from '../services/websocket';
import { getUsername } from '../services/auth';

const useChat = (channelId) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Fetch history when channel changes
  useEffect(() => {
    if (!channelId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8088/api/channels/${channelId}/messages`);
        if (response.ok) {
          const history = await response.json();
          setMessages(Array.isArray(history) ? history : []);
        } else {
          setMessages([]);
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
    
    // Initial subscriptions that don't change with channel
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
    console.log('Disconnected from WebSocket');
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
      // Unsubscribe from previous channel if exists
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      console.log('Subscribing to channel:', channelId);
      subscriptionRef.current = clientRef.current.subscribe(`/topic/channel/${channelId}`, (message) => {
        const receivedMessage = JSON.parse(message.body);
        setMessages((prev) => {
          // Prevent duplicates if history fetch and websocket message collide
          if (prev.some(m => m.id === receivedMessage.id && m.id !== null)) return prev;
          return [...prev, receivedMessage];
        });
      });
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [isConnected, channelId]);

  const sendMessage = useCallback((content) => {
    if (clientRef.current && isConnected && channelId) {
      const payload = {
        channelId: channelId,
        senderId: getUsername(),
        content: content,
        timestamp: new Date().toISOString()
      };
      
      clientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(payload)
      });
    }
  }, [channelId, isConnected]);

  return { messages, sendMessage, isConnected };
};

export default useChat;
