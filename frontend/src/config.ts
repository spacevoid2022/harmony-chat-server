export const isProd = true;
const CLOUD_IP = '64.181.206.113';

export const API_BASE_URL = isProd 
  ? `http://${CLOUD_IP}:8082` 
  : 'http://localhost:8082';

export const WS_URL = `${API_BASE_URL}/ws`;

export const AUTH_BASE_URL = `${API_BASE_URL}/auth`;
