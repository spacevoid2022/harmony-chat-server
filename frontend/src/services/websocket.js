import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from './auth';

import { WS_URL } from '../config';

const WEBSOCKET_URL = WS_URL;

export const createWebsocketClient = (onConnect, onDisconnect, onError) => {
  const client = new Client({
    webSocketFactory: () => new SockJS(WEBSOCKET_URL),
    debug: (str) => {
      console.log('STOMP: ' + str);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  client.onConnect = (frame) => {
    console.log('Connected: ' + frame);
    if (onConnect) onConnect(frame);
  };

  client.onStompError = (frame) => {
    console.error('Broker reported error: ' + frame.headers['message']);
    console.error('Additional details: ' + frame.body);
    if (onError) onError(frame);
  };

  client.onWebSocketError = (event) => {
    console.error('WebSocket Error: ', event);
    if (onError) onError(event);
  };

  client.onWebSocketClose = () => {
    console.log('WebSocket connection closed');
    if (onDisconnect) onDisconnect();
  };

  // Add JWT token to connection headers
  const token = getToken();
  if (token) {
    client.connectHeaders = {
      Authorization: `Bearer ${token}`,
      'user-id': localStorage.getItem('username')
    };
  } else {
    console.warn('No token found, connecting anonymously');
  }

  return client;
};
