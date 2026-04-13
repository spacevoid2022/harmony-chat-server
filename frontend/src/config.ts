export const isProd = true;

export const API_BASE_URL = isProd 
  ? 'https://harmonychat.duckdns.org' 
  : 'http://localhost:8082';

export const WS_URL = `${API_BASE_URL}/ws`;

export const AUTH_BASE_URL = `${API_BASE_URL}/auth`;
