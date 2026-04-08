import { useState, useRef, useEffect } from 'react'
import './App.css'
// @ts-ignore
import { login, logout, getToken, getUsername } from './services/auth'
// @ts-ignore
import useChat from './hooks/useChat'
import GifPicker from './components/GifPicker'
import { API_BASE_URL } from './config'

interface LogEntry {
  type: 'info' | 'success' | 'error'
  message: string
  timestamp: string
}

function App() {
  const [token, setToken] = useState<string | null>(getToken())
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [serverStatus, setServerStatus] = useState<'connecting' | 'online' | 'offline'>('connecting')
  
  const logEndRef = useRef<HTMLDivElement>(null)

  // Periodically check if the backend is alive
  useEffect(() => {
    const checkServer = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/channels`)
        if (resp.ok) setServerStatus('online')
        else setServerStatus('offline')
      } catch (err) {
        setServerStatus('offline')
      }
    }
    checkServer()
    const interval = setInterval(checkServer, 5000)
    return () => clearInterval(interval)
  }, [])

  const addLog = (type: 'info' | 'success' | 'error', message: string) => {
    const newLog: LogEntry = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }
    setLogs(prev => [...prev, newLog])
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    addLog('info', `Attempting ${isLogin ? 'Login' : 'Registration'} for user: ${username}...`)

    try {
      if (isLogin) {
        const data = await login(username, password)
        setToken(data.token)
        addLog('success', 'Login successful!')
      } else {
        const resp = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        })
        if (resp.ok) {
          addLog('success', 'Registration successful! You can now login.')
          setIsLogin(true)
        } else {
          const text = await resp.text()
          addLog('error', `Registration failed: ${text}`)
        }
      }
    } catch (error: any) {
      addLog('error', `Authentication error: ${error.message}`)
    }
  }

  const handleLogout = () => {
    logout()
    setToken(null)
    addLog('info', 'Logged out successfully.')
  }

  if (token) {
    return (
      <div className="container">
        <ChatView onLogout={handleLogout} addLog={addLog} />
        <LogWindow logs={logs} logEndRef={logEndRef} />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="auth-card">
        <div className={`server-status ${serverStatus}`}>
          <div className="status-dot"></div>
          <span>Server: {serverStatus.toUpperCase()}</span>
        </div>

        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <form onSubmit={handleAuthSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter your username"
              required 
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email"
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              required 
            />
          </div>

          <button type="submit" disabled={serverStatus !== 'online'}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span className="link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register here' : 'Login here'}
          </span>
        </div>
      </div>

      <LogWindow logs={logs} logEndRef={logEndRef} />
    </div>
  )
}

function ChatView({ onLogout, addLog }: { onLogout: () => void, addLog: (type: 'info' | 'success' | 'error', message: string) => void }) {
  // Load initial state from localStorage for "instant" feel
  const [channels, setChannels] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('last_channels');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse cached channels:', e);
      return [];
    }
  })
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('last_channel_id');
    } catch (e) {
      return null;
    }
  })
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [inputText, setInputText] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)
  
  const safeId = (id: any) => (id !== null && id !== undefined ? id.toString() : '');

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentChannelId) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      addLog('error', 'File too large (Max 10MB)');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        // No Content-Type header needed, browser handles multipart boundaries
      });

      if (resp.ok) {
        const imageUrl = await resp.text();
        sendMessage('', imageUrl); // Send message with empty content but with imageUrl
        addLog('success', 'Image uploaded successfully');
      } else {
        const error = await resp.text();
        addLog('error', `Upload failed: ${error}`);
      }
    } catch (err) {
      addLog('error', 'Network error during upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const { messages, sendMessage, isConnected } = useChat(currentChannelId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUsername = getUsername()

  const fetchChannels = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/channels`)
      if (resp.ok) {
        const data = await resp.json()
        if (Array.isArray(data)) {
          setChannels(data)
          localStorage.setItem('last_channels', JSON.stringify(data));
          
          // Improved Sync: Check if current IDs still match database names
          if (data.length > 0) {
            const currentObj = data.find(c => safeId(c.id) === currentChannelId);
            
            // If the ID exists but the name is different, or it's a fresh start
            if (!currentObj || !currentChannelId) {
              const firstId = safeId(data[0].id);
              setCurrentChannelId(firstId);
              localStorage.setItem('last_channel_id', firstId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels, retrying...', err)
      setTimeout(fetchChannels, 5000);
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (inputText.trim()) {
      sendMessage(inputText)
      setInputText('')
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    sendMessage(gifUrl)
    setShowGifPicker(false)
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return
    try {
      const resp = await fetch(`${API_BASE_URL}/api/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName })
      })
      if (resp.ok) {
        const created = await resp.json()
        const newId = safeId(created.id);
        const updatedChannels = [...channels, created];
        setChannels(updatedChannels);
        localStorage.setItem('last_channels', JSON.stringify(updatedChannels));
        setCurrentChannelId(newId);
        localStorage.setItem('last_channel_id', newId);
        setIsModalOpen(false)
        setNewChannelName('')
      }
    } catch (err) {
      console.error('Failed to create channel:', err)
    }
  }

  const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.includes('giphy.com/media');
  }

  const currentChannelName = channels.find(c => safeId(c.id) === currentChannelId)?.name || 'General'

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Channels</h3>
          <button className="btn-add-channel" onClick={() => setIsModalOpen(true)}>+</button>
        </div>
        <div className="channel-list">
          {channels.map(channel => {
            const cid = safeId(channel.id);
            return (
              <div 
                key={channel.id} 
                className={`channel-item ${currentChannelId === cid ? 'active' : ''}`}
                onClick={() => {
                  setCurrentChannelId(cid);
                  localStorage.setItem('last_channel_id', cid);
                }}
              >
                {channel.name}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button className="btn-logout" onClick={onLogout} style={{ width: '100%' }}>Logout</button>
        </div>
      </div>

      <div className="main-chat">
        <div className="chat-header">
          <div>
            <h3># {currentChannelName}</h3>
            <div className="status-indicator">
              <div className="status-dot"></div>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>

        <div className="message-list">
          {(!Array.isArray(messages) || messages.length === 0) && (
            <div style={{ textAlign: 'center', color: '#8899af', marginTop: '20px' }}>
              {Array.isArray(messages) ? 'No messages yet in this channel.' : 'Loading messages...'}
            </div>
          )}
          {Array.isArray(messages) && messages.map((m: any, i: number) => {
            const sender = m.senderId || 'Unknown';
            const isOwn = sender === currentUsername;
            return (
              <div key={i} className={`message-item ${isOwn ? 'own' : ''}`}>
                <span className="message-sender">{sender}</span>
                <div className="message-bubble">
                  {isImageUrl(m.content) ? (
                    <img src={m.content} alt="GIF" className="chat-image" />
                  ) : (
                    m.content || '(Empty message)'
                  )}
                  {m.imageUrl && (
                    <div className="mt-2 rounded overflow-hidden border border-gray-700 max-w-sm">
                      <img 
                        src={`${API_BASE_URL}${m.imageUrl}`} 
                        alt="Uploaded content" 
                        className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(`${API_BASE_URL}${m.imageUrl}`, '_blank')}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <button type="button" className="btn-gif" onClick={() => setShowGifPicker(true)}>GIF</button>
          <button 
            type="button"
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? '⌛' : '📎'}
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)} 
            placeholder={`Message #${currentChannelName}`}
          />
          <button type="submit" disabled={!isConnected}>Send</button>
        </form>
      </div>

      {showGifPicker && (
        <GifPicker 
          onSelect={handleGifSelect} 
          onClose={() => setShowGifPicker(false)} 
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Create Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Channel Name</label>
                <input 
                  type="text" 
                  value={newChannelName} 
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. gaming"
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function LogWindow({ logs, logEndRef }: { logs: LogEntry[], logEndRef: React.RefObject<HTMLDivElement | null> }) {
  if (logs.length === 0) return null
  return (
    <div className="logs">
      {logs.map((log, index) => (
        <div key={index} className={`log-entry log-${log.type}`}>
          [{log.timestamp}] {log.message}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  )
}

export default App
