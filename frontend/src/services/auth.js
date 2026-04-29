import { API_BASE_URL, AUTH_BASE_URL } from '../config';

export const register = async (username, password) => {
  const resp = await fetch(`${AUTH_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return resp;
};

export const login = async (username, password) => {
  const response = await fetch(`${AUTH_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Login failed');
  }

  const data = await response.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', username);
    if (data.userId) {
      localStorage.setItem('userId', data.userId.toString());
    }
    if (data.avatarUrl) {
      localStorage.setItem('avatarUrl', data.avatarUrl);
    }
    if (data.status) {
      localStorage.setItem('status', data.status);
    }
    if (data.customStatus) {
      localStorage.setItem('customStatus', data.customStatus);
    }
  }
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userId');
  localStorage.removeItem('avatarUrl');
  localStorage.removeItem('status');
  localStorage.removeItem('customStatus');
};

export const getToken = () => localStorage.getItem('token');
export const getUsername = () => localStorage.getItem('username');
export const getUserId = () => localStorage.getItem('userId');
export const getAvatarUrl = () => localStorage.getItem('avatarUrl');
export const getStatus = () => localStorage.getItem('status');
export const getCustomStatus = () => localStorage.getItem('customStatus');
