import { useState, useEffect, useCallback, useRef } from 'react';
import { createWebsocketClient } from '../services/websocket';
import { getUsername } from '../services/auth';

const useChat = (channelId) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);

  const onConnect = () => {
    setIsConnected(true);
    console.log('Connected to WebSocket and subscribing to channel:', channelId);
    
    // Subscribe to channel messages
    clientRef.current.subscribe(`/topic/channel/${channelId}`, (message) => {
      const receivedMessage = JSON.parse(message.body);
      setMessages((prevMessages) => [...prevMessages, receivedMessage]);
      console.log('New message received:', receivedMessage);
    });

    // Subscribe to presence
    clientRef.current.subscribe('/topic/presence', (message) => {
      const presenceUpdate = JSON.parse(message.body);
      console.log('Presence update:', presenceUpdate);
    });
    
    // Subscribe to notifications
    clientRef.current.subscribe('/topic/notifications', (message) => {
      const notification = JSON.parse(message.body);
      console.log('Notification received:', notification);
    });
  };

  const onDisconnect = () => {
    setIsConnected(false);
    console.log('Disconnected from WebSocket');
  };

  const onError = (error) => {
    console.error('WebSocket Error:', error);
  };

  useEffect(() => {
    const client = createWebsocketClient(onConnect, onDisconnect, onError);
    clientRef.current = client;
    client.activate();

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [channelId]);

  const sendMessage = useCallback((content) => {
    if (clientRef.current && isConnected) {
      const payload = {
        channelId: channelId,
        senderId: getUsername(),
        content: content
      };
      
      console.log('Sending message to server:', payload);
      clientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(payload)
      });
    } else {
      console.error('Cannot send message, WebSocket not connected');
    }
  }, [channelId, isConnected]);

  return { messages, sendMessage, isConnected };
};

export default useChat;
