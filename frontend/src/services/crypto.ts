// @ts-ignore
import { getToken } from './auth';
import { API_BASE_URL } from '../config';

// In-memory caches
const channelKeysCache = new Map<string, CryptoKey>();
let userPrivateKey: CryptoKey | null = null;
let userPublicKey: CryptoKey | null = null;

// Convert buffer to Base64 (accepts both ArrayBuffer and ArrayBufferViews like Uint8Array)
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
  const buf = ArrayBuffer.isView(buffer) ? buffer.buffer : buffer;
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA-OAEP Key Pair
export async function generateRSAKeyPair(): Promise<{ publicKey: CryptoKey, privateKey: CryptoKey }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return keyPair;
}

// PBKDF2 wrapping key derivation
async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// Generate symmetric AES key for a channel
export async function generateChannelKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Decrypt message with AES-GCM channel key
export async function decryptMessage(encryptedJSON: string, channelKey: CryptoKey): Promise<string> {
  let payload;
  try {
    payload = JSON.parse(encryptedJSON);
  } catch (e) {
    return encryptedJSON; // Plaintext (JSON parse error)
  }
  
  if (!payload || !payload.ciphertext || !payload.iv) {
    return encryptedJSON; // Plaintext
  }
  
  try {
    const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const ciphertext = base64ToArrayBuffer(payload.ciphertext);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      channelKey,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    console.error("E2EE Decryption failed (payload exists but could not be decrypted):", payload, e);
    return encryptedJSON;
  }
}

// Encrypt message with AES-GCM channel key
export async function encryptMessage(plaintext: string, channelKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    channelKey,
    encoder.encode(plaintext)
  );
  
  const payload = {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
  return JSON.stringify(payload);
}

// Setters and getters for RSA keys
export function setUserKeys(pub: CryptoKey | null, priv: CryptoKey | null) {
  userPublicKey = pub;
  userPrivateKey = priv;
}

export function getUserPrivateKey(): CryptoKey | null {
  return userPrivateKey;
}

export function getUserPublicKey(): CryptoKey | null {
  return userPublicKey;
}

// Load keys from sessionStorage (survives refreshes in the same tab)
export async function loadKeysFromSessionStorage(): Promise<boolean> {
  try {
    const privBase64 = sessionStorage.getItem('e2e_private_key');
    const pubBase64 = sessionStorage.getItem('e2e_public_key');
    
    if (privBase64 && pubBase64) {
      const privBuffer = base64ToArrayBuffer(privBase64);
      const pubBuffer = base64ToArrayBuffer(pubBase64);
      
      userPrivateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );
      
      userPublicKey = await window.crypto.subtle.importKey(
        "spki",
        pubBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
      );
      
      return true;
    }
  } catch (e) {
    console.error('Failed to load keys from sessionStorage:', e);
  }
  return false;
}

// Sync keys to sessionStorage
async function saveKeysToSessionStorage(publicKey: CryptoKey, privateKey: CryptoKey) {
  try {
    const pubBuffer = await window.crypto.subtle.exportKey("spki", publicKey);
    const privBuffer = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    
    sessionStorage.setItem('e2e_public_key', arrayBufferToBase64(pubBuffer));
    sessionStorage.setItem('e2e_private_key', arrayBufferToBase64(privBuffer));
  } catch (e) {
    console.error('Failed to save keys to sessionStorage:', e);
  }
}

// Clear keys
export function clearE2EEKeys() {
  userPrivateKey = null;
  userPublicKey = null;
  channelKeysCache.clear();
  sessionStorage.removeItem('e2e_public_key');
  sessionStorage.removeItem('e2e_private_key');
}

// Initialize user keypair (either fetch + decrypt, or generate + encrypt + save)
export async function initializeE2EEKeys(password: string): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) return false;
    
    // 1. Fetch user keys from server
    const resp = await fetch(`${API_BASE_URL}/api/users/keys`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (resp.ok) {
      const keyData = await resp.json();
      
      if (keyData.publicKey && keyData.encryptedPrivateKey) {
        // User already has keys! Decrypt them
        const salt = new Uint8Array(base64ToArrayBuffer(keyData.keySalt));
        const iv = new Uint8Array(base64ToArrayBuffer(keyData.keyIv));
        const encryptedPrivKeyData = base64ToArrayBuffer(keyData.encryptedPrivateKey);
        
        const wrappingKey = await deriveWrappingKey(password, salt);
        
        const decryptedPrivBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv },
          wrappingKey,
          encryptedPrivKeyData
        );
        
        userPrivateKey = await window.crypto.subtle.importKey(
          "pkcs8",
          decryptedPrivBuffer,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["decrypt"]
        );
        
        userPublicKey = await window.crypto.subtle.importKey(
          "spki",
          base64ToArrayBuffer(keyData.publicKey),
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["encrypt"]
        );
        
        await saveKeysToSessionStorage(userPublicKey, userPrivateKey);
        return true;
      }
    }
    
    // 2. Generate new keypair if not found (legacy user or registration)
    const keyPair = await generateRSAKeyPair();
    userPublicKey = keyPair.publicKey;
    userPrivateKey = keyPair.privateKey;
    
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const wrappingKey = await deriveWrappingKey(password, salt);
    const privExported = await window.crypto.subtle.exportKey("pkcs8", userPrivateKey);
    const encryptedPrivBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      wrappingKey,
      privExported
    );
    
    const pubExported = await window.crypto.subtle.exportKey("spki", userPublicKey);
    
    const body = {
      publicKey: arrayBufferToBase64(pubExported),
      encryptedPrivateKey: arrayBufferToBase64(encryptedPrivBuffer),
      keySalt: arrayBufferToBase64(salt),
      keyIv: arrayBufferToBase64(iv)
    };
    
    const saveResp = await fetch(`${API_BASE_URL}/api/users/keys`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (saveResp.ok) {
      await saveKeysToSessionStorage(userPublicKey, userPrivateKey);
      return true;
    }
  } catch (e) {
    console.error('E2EE key initialization failed:', e);
  }
  return false;
}

// Fetch the symmetric key for a channel
export async function getOrFetchChannelKey(channelId: string | number): Promise<CryptoKey | null> {
  const chIdStr = channelId.toString();
  if (channelKeysCache.has(chIdStr)) {
    return channelKeysCache.get(chIdStr)!;
  }
  
  if (!userPrivateKey) {
    // Try to load from session storage
    const loaded = await loadKeysFromSessionStorage();
    if (!loaded) return null;
  }
  
  const token = getToken();
  if (!token) return null;
  
  try {
    // 1. Query backend for this user's key
    const resp = await fetch(`${API_BASE_URL}/api/channels/${chIdStr}/key`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (resp.ok) {
      const channelKeyData = await resp.json();
      
      if (resp.status === 202 || (channelKeyData && channelKeyData.status === 'pending_sync')) {
        console.log(`Channel key for ${chIdStr} exists but is pending sync from another member.`);
        return null;
      }
      
      const decryptedKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        userPrivateKey!,
        base64ToArrayBuffer(channelKeyData.encryptedKey)
      );
      
      const channelKey = await window.crypto.subtle.importKey(
        "raw",
        decryptedKey,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"]
      );
      
      channelKeysCache.set(chIdStr, channelKey);
      
      // Perform background key sharing sync (for members who are missing keys)
      syncChannelKeysInBackground(chIdStr, channelKey);
      
      return channelKey;
    } else if (resp.status === 404) {
      // 2. Generate a new symmetric key if none exists
      const newChannelKey = await generateChannelKey();
      
      // Encrypt for self
      const rawChannelKey = await window.crypto.subtle.exportKey("raw", newChannelKey);
      const encryptedForSelf = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        userPublicKey!,
        rawChannelKey
      );
      
      const myIdStr = localStorage.getItem('userId');
      if (!myIdStr) return null;
      
      const payload = [{
        userId: parseInt(myIdStr),
        encryptedKey: arrayBufferToBase64(encryptedForSelf)
      }];
      
      // Save it on server
      await fetch(`${API_BASE_URL}/api/channels/${chIdStr}/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      channelKeysCache.set(chIdStr, newChannelKey);
      
      // Perform background key sharing sync
      syncChannelKeysInBackground(chIdStr, newChannelKey);
      
      return newChannelKey;
    }
  } catch (e) {
    console.error('Failed to get or fetch channel key:', e);
  }
  return null;
}

// Background sync: identify members missing keys, encrypt the channel key for them, and save
async function syncChannelKeysInBackground(channelId: string, channelKey: CryptoKey) {
  try {
    const token = getToken();
    const resp = await fetch(`${API_BASE_URL}/api/channels/${channelId}/members-missing-keys`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (resp.ok) {
      const missingMembers = await resp.json(); // Array of { userId, username, publicKey }
      if (missingMembers && missingMembers.length > 0) {
        const payload = [];
        const rawKey = await window.crypto.subtle.exportKey("raw", channelKey);
        
        for (const member of missingMembers) {
          try {
            const memberPubKey = await window.crypto.subtle.importKey(
              "spki",
              base64ToArrayBuffer(member.publicKey),
              { name: "RSA-OAEP", hash: "SHA-256" },
              true,
              ["encrypt"]
            );
            
            const encryptedKey = await window.crypto.subtle.encrypt(
              { name: "RSA-OAEP" },
              memberPubKey,
              rawKey
            );
            
            payload.push({
              userId: member.userId,
              encryptedKey: arrayBufferToBase64(encryptedKey)
            });
          } catch (err) {
            console.error(`Failed to encrypt channel key for missing member ${member.username}:`, err);
          }
        }
        
        if (payload.length > 0) {
          await fetch(`${API_BASE_URL}/api/channels/${channelId}/keys`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          console.log(`Synced E2EE channel keys for ${payload.length} members in channel ${channelId}`);
        }
      }
    }
  } catch (e) {
    console.error('Background key sync failed:', e);
  }
}
