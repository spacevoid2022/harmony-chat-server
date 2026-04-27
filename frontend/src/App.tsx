import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
// @ts-ignore
import { login, logout, getToken, getUsername, getUserId } from './services/auth'
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
          const data = await resp.json()
          addLog('error', `Registration failed: ${data.error || 'Unknown error'}`)
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

  const passwordRequirements = [
    { label: '8+ characters', test: password.length >= 8 },
    { label: 'Uppercase letter', test: /[A-Z]/.test(password) },
    { label: 'Number', test: /\d/.test(password) },
    { label: 'Special character', test: /[@$!%*?&]/.test(password) },
  ]

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
            {!isLogin && (
              <div className="password-checklist">
                {passwordRequirements.map((req, i) => (
                  <div key={i} className={`checklist-item ${req.test ? 'pass' : ''}`}>
                    {req.test ? '✓' : '○'} {req.label}
                  </div>
                ))}
              </div>
            )}
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
  const [servers, setServers] = useState<any[]>([])
  const [currentServerId, setCurrentServerId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('last_server_id');
    } catch (e) {
      return null;
    }
  })

  // Load initial state from localStorage for "instant" feel
  const [channels, setChannels] = useState<any[]>([])
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('last_channel_id');
    } catch (e) {
      return null;
    }
  })
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isServerModalOpen, setIsServerModalOpen] = useState(false)
  
  // Settings & Invites State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'overview' | 'invites'>('overview')
  const [editServerName, setEditServerName] = useState('')
  const [editServerIconUrl, setEditServerIconUrl] = useState('')
  const [serverTab, setServerTab] = useState<'create' | 'join'>('create')
  const [joinInviteCode, setJoinInviteCode] = useState('')

  const [newServerName, setNewServerName] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [inputText, setInputText] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  
  // Mentions State
  const [serverMembers, setServerMembers] = useState<any[]>([])
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  
  // Notification State
  const [unreadPings, setUnreadPings] = useState<Record<string, number>>({})

  const handleNotification = useCallback((notif: any) => {
    const currentUsername = getUsername();
    if (notif.content?.includes(`@${currentUsername}`)) {
      // Show badge if not in the specific channel where the ping happened
      if (notif.channelId !== currentChannelId) {
        setUnreadPings(prev => ({
          ...prev,
          [notif.serverId]: (prev[notif.serverId] || 0) + 1
        }));
      }
    }
  }, [currentChannelId]);
  
  const safeId = (id: any) => (id !== null && id !== undefined ? id.toString() : '');

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addLog('error', 'File too large (Max 10MB)');
      return;
    }

    setIsUploadingIcon(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (resp.ok) {
        const imageUrl = await resp.text();
        setEditServerIconUrl(imageUrl);
        addLog('success', 'Server icon uploaded successfully!');
      } else {
        const error = await resp.text();
        addLog('error', `Icon upload failed: ${error}`);
      }
    } catch (err) {
      addLog('error', 'Network error during icon upload');
    } finally {
      setIsUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = '';
    }
  };

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

  const { messages, sendMessage, deleteMessage, toggleReaction, isConnected } = useChat(currentChannelId, handleNotification)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchServers = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/servers`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (resp.status === 401) {
        onLogout()
        return
      }
      if (resp.ok) {
        const data = await resp.json()
        setServers(data)
        if (data.length > 0 && !currentServerId) {
          const firstId = safeId(data[0].id);
          setCurrentServerId(firstId);
          localStorage.setItem('last_server_id', firstId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err)
    }
  }

  const fetchChannels = async () => {
    if (!currentServerId) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/servers/${currentServerId}/channels`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (resp.status === 401) {
        onLogout()
        return
      }
      if (resp.ok) {
        const data = await resp.json()
        if (Array.isArray(data)) {
          setChannels(data)
          if (data.length > 0) {
            const currentObj = data.find(c => safeId(c.id) === currentChannelId);
            if (!currentObj) {
              const firstId = safeId(data[0].id);
              setCurrentChannelId(firstId);
              localStorage.setItem('last_channel_id', firstId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err)
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!window.confirm('Are you sure you want to delete this channel? All messages will be lost.')) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (resp.ok) {
        addLog('success', 'Channel deleted');
        fetchChannels();
      } else {
        const error = await resp.text();
        addLog('error', `Failed to delete channel: ${error}`);
      }
    } catch (err) {
      addLog('error', 'Network error deleting channel');
    }
  };

  const fetchServerMembers = async () => {
    if (!currentServerId) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/servers/${currentServerId}/members`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setServerMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  useEffect(() => {
    fetchServers()
  }, [])

  useEffect(() => {
    if (currentServerId) {
      fetchChannels()
      fetchServerMembers()
      // Clear pings for this server when we enter it
      setUnreadPings(prev => ({ ...prev, [currentServerId]: 0 }));
    }
  }, [currentServerId])

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

  const handleCreateServer = async (e: React.FormEvent, iconUrl: string = '') => {
    e.preventDefault()
    if (!newServerName.trim()) return
    try {
      const resp = await fetch(`${API_BASE_URL}/api/servers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ name: newServerName, iconUrl })
      })
      if (resp.ok) {
        const created = await resp.json()
        setServers(prev => [...prev, created])
        setCurrentServerId(safeId(created.id))
        localStorage.setItem('last_server_id', safeId(created.id))
        setIsServerModalOpen(false)
        setNewServerName('')
      }
    } catch (err) {
      console.error('Failed to create server:', err)
    }
  }

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinInviteCode.trim()) return
    try {
      const resp = await fetch(`${API_BASE_URL}/api/servers/join/${joinInviteCode}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (resp.ok) {
        const server = await resp.json()
        setServers(prev => {
          if (!prev.find(s => s.id === server.id)) return [...prev, server]
          return prev
        })
        setCurrentServerId(safeId(server.id))
        localStorage.setItem('last_server_id', safeId(server.id))
        setIsServerModalOpen(false)
        setJoinInviteCode('')
        addLog('success', `Joined server ${server.name}!`)
      } else {
        addLog('error', 'Invalid or expired invite code.')
      }
    } catch (err) {
      console.error('Failed to join server:', err)
    }
  }

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentServerId) return
    try {
      const resp = await fetch(`${API_BASE_URL}/api/servers/${currentServerId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ name: editServerName, iconUrl: editServerIconUrl })
      })
      if (resp.ok) {
        const updated = await resp.json()
        setServers(prev => prev.map(s => safeId(s.id) === currentServerId ? updated : s))
        setIsSettingsModalOpen(false)
        addLog('success', 'Server settings updated!')
      } else {
        addLog('error', 'Failed to update server settings.')
      }
    } catch (err) {
      console.error('Failed to update server:', err)
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim() || !currentServerId) return
    try {
      const resp = await fetch(`${API_BASE_URL}/api/channels?serverId=${currentServerId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ name: newChannelName })
      })
      if (resp.ok) {
        const created = await resp.json()
        setChannels(prev => [...prev, created])
        setCurrentChannelId(safeId(created.id))
        localStorage.setItem('last_channel_id', safeId(created.id))
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

  const currentServerObj = servers.find(s => safeId(s.id) === currentServerId)
  const isOwner = currentServerObj?.ownerId?.toString() === getUserId()

  return (
    <div className="chat-container">
      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />
      )}

      {/* 1. Server Dock (Far Left) */}
      <div className={`server-dock ${showSidebar ? 'sidebar-open' : ''}`}>
        {servers.map(server => {
          const sid = safeId(server.id);
          return (
            <div 
              key={server.id} 
              className={`server-icon ${currentServerId === sid ? 'active' : ''}`}
              onClick={() => {
                setCurrentServerId(sid);
                localStorage.setItem('last_server_id', sid);
              }}
              title={server.name}
            >
              <div className="server-indicator" />
              {unreadPings[sid] > 0 && (
                <div className="ping-badge">{unreadPings[sid]}</div>
              )}
              {server.iconUrl ? (
                <img src={server.iconUrl.startsWith('/') ? `${API_BASE_URL}${server.iconUrl}` : server.iconUrl} alt={server.name} />
              ) : (
                server.name.substring(0, 2).toUpperCase()
              )}
            </div>
          );
        })}
        <div className="server-icon add-server" onClick={() => setIsServerModalOpen(true)} title="Add Server">
          +
        </div>
      </div>

      {/* 2. Channel Sidebar (Middle) */}
      <div className={`sidebar ${showSidebar ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, paddingRight: '10px' }}>
            {currentServerObj?.name || 'Channels'}
          </h3>
          {currentServerId && (
            <button
              className="btn-settings"
              onClick={() => {
                setEditServerName(currentServerObj?.name || '')
                setEditServerIconUrl(currentServerObj?.iconUrl || '')
                setIsSettingsModalOpen(true)
              }}
              title="Server Settings"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1rem',
                color: '#8899af',
                flexShrink: 0,
                padding: '2px',
                lineHeight: 1,
                width: 'auto',
                display: 'inline-flex'
              }}
            >
              ⚙️
            </button>
          )}
        </div>
        <div className="sidebar-header" style={{ paddingTop: 0, paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: '0.8rem', color: '#8899af', textTransform: 'uppercase', letterSpacing: '1px' }}>Channels</span>
          <button className="btn-add-channel" onClick={() => setIsModalOpen(true)}>+</button>
        </div>
        <div className="channel-list">
          {channels.map(channel => {
            const cid = safeId(channel.id);
            return (
              <div 
                key={channel.id} 
                className={`channel-item ${currentChannelId === cid ? 'active' : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => {
                  setCurrentChannelId(cid);
                  localStorage.setItem('last_channel_id', cid);
                  setShowSidebar(false);
                }}
              >
                <span>{channel.name}</span>
                {isOwner && (
                  <button 
                    className="btn-delete-channel"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChannel(cid);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem', padding: '0 5px' }}
                    title="Delete Channel"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button className="btn-logout" onClick={onLogout} style={{ width: '100%' }}>Logout</button>
        </div>
      </div>

      {/* 3. Main Chat (Right) */}
      <div className="main-chat">
        <div className="chat-header">
          <button className="btn-menu" onClick={() => setShowSidebar(s => !s)}>☰</button>
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
            const currentUsername = getUsername();
            const isOwn = sender.toLowerCase() === (currentUsername || '').toLowerCase();
            const isSystem = m.content?.startsWith('➔');
            const isMentioned = m.content?.includes(`@${currentUsername}`);
            const reactions = m.reactions || [];
            const groupedReactions = reactions.reduce((acc: any, r: any) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {});

            if (isSystem) {
              return (
                <div key={i} className="system-message">
                  <span className="system-message-icon">➔</span>
                  {m.content.substring(1)}
                </div>
              );
            }

            return (
              <div key={i} className={`message-item ${isOwn ? 'own' : ''}`}>
                <span className="message-sender">{sender}</span>
                <div className={`message-bubble ${isMentioned ? 'mentioned' : ''}`}>
                  <div className="reaction-tray">
                    {['👍', '😂', '👎', '😢', '❤️'].map(emoji => (
                      <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}>{emoji}</button>
                    ))}
                  </div>
                  {(isOwn || isOwner) && (
                    <button 
                      className="btn-delete-message" 
                      onClick={() => {
                        if (m.id && window.confirm('Delete this message?')) {
                          deleteMessage(m.id);
                        }
                      }}
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}
                  {m.content ? (
                    isImageUrl(m.content) ? (
                      <img src={m.content} alt="GIF" className="chat-image" />
                    ) : (
                      m.content
                    )
                  ) : (
                    !m.imageUrl && '(Empty message)'
                  )}
                  {m.imageUrl && (
                    <div className="chat-image-container">
                      <img src={`${API_BASE_URL}${m.imageUrl}`} alt="Upload" className="chat-upload-image" />
                    </div>
                  )}
                  {Object.keys(groupedReactions).length > 0 && (
                    <div className="reactions-display">
                      {Object.entries(groupedReactions).map(([emoji, count]: any) => (
                        <div 
                          key={emoji} 
                          className={`reaction-badge ${reactions.some((r: any) => r.emoji === emoji && r.username === currentUsername) ? 'active' : ''}`}
                          onClick={() => toggleReaction(m.id, emoji)}
                        >
                          {emoji} <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend} style={{ position: 'relative' }}>
          {showMentions && (
            <div className="mentions-dropdown">
              {serverMembers
                .filter(m => m.username.toLowerCase().includes(mentionSearch.toLowerCase()))
                .slice(0, 8)
                .map((member, i) => (
                  <div 
                    key={member.id} 
                    className={`mention-item ${i === mentionIndex ? 'active' : ''}`}
                    onClick={() => {
                      const words = inputText.split(' ');
                      words.pop();
                      words.push(`@${member.username} `);
                      setInputText(words.join(' '));
                      setShowMentions(false);
                    }}
                  >
                    @{member.username}
                  </div>
                ))}
            </div>
          )}
          <button 
            type="button" 
            className="btn-upload" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? '⌛' : '📎'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
          <button type="button" className="btn-gif" onClick={() => setShowGifPicker(true)}>GIF</button>
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => {
              const val = e.target.value;
              setInputText(val);
              const lastWord = val.split(' ').pop();
              if (lastWord && lastWord.startsWith('@')) {
                setMentionSearch(lastWord.substring(1));
                setShowMentions(true);
                setMentionIndex(0);
              } else {
                setShowMentions(false);
              }
            }}
            onKeyDown={(e) => {
              if (showMentions) {
                const filtered = serverMembers.filter(m => m.username.toLowerCase().includes(mentionSearch.toLowerCase())).slice(0, 8);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setMentionIndex(prev => (prev + 1) % filtered.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setMentionIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                } else if (e.key === 'Enter') {
                  if (filtered[mentionIndex]) {
                    e.preventDefault();
                    const words = inputText.split(' ');
                    words.pop();
                    words.push(`@${filtered[mentionIndex].username} `);
                    setInputText(words.join(' '));
                    setShowMentions(false);
                  }
                } else if (e.key === 'Escape') {
                  setShowMentions(false);
                }
              }
            }}
            placeholder={`Message #${currentChannelName}`} 
          />
          <button type="submit">Send</button>
        </form>

        {showGifPicker && (
          <GifPicker 
            onSelect={handleGifSelect} 
            onClose={() => setShowGifPicker(false)} 
          />
        )}
      </div>

      {/* Modals */}
      {isSettingsModalOpen && currentServerObj && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Server Settings</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#8899af', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {isOwner && (
                <button 
                  style={{ background: 'transparent', border: 'none', padding: '10px', borderBottom: settingsTab === 'overview' ? '2px solid #646cff' : 'none', color: settingsTab === 'overview' ? '#fff' : '#8899af', cursor: 'pointer' }}
                  onClick={() => setSettingsTab('overview')}
                >
                  Overview
                </button>
              )}
              <button 
                style={{ background: 'transparent', border: 'none', padding: '10px', borderBottom: settingsTab === 'invites' ? '2px solid #646cff' : 'none', color: settingsTab === 'invites' ? '#fff' : '#8899af', cursor: 'pointer' }}
                onClick={() => setSettingsTab('invites')}
              >
                Invites
              </button>
            </div>

            {settingsTab === 'overview' && isOwner && (
              <form onSubmit={handleUpdateServer}>
                <div className="form-group">
                  <label>Server Name</label>
                  <input type="text" value={editServerName} onChange={(e) => setEditServerName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Server Icon</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" value={editServerIconUrl} onChange={(e) => setEditServerIconUrl(e.target.value)} placeholder="https://..." />
                    <button type="button" onClick={() => iconInputRef.current?.click()} disabled={isUploadingIcon} style={{ background: '#333', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', cursor: 'pointer', padding: '10px', width: '100%' }}>
                      {isUploadingIcon ? '⌛ Uploading...' : 'Upload Image File'}
                    </button>
                    <input type="file" ref={iconInputRef} onChange={handleIconUpload} accept="image/*" style={{ display: 'none' }} />
                  </div>
                  <small style={{ color: '#8899af', marginTop: '5px', display: 'block' }}>Paste an image URL above, or click upload to select a file.</small>
                </div>
                <div className="modal-footer" style={{ marginTop: '20px' }}>
                  <button type="submit">Save Changes</button>
                </div>
              </form>
            )}

            {settingsTab === 'invites' && (
              <div>
                <p style={{ color: '#8899af', marginBottom: '10px' }}>Share this code with others so they can join your server.</p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                  <code style={{ flex: 1, fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px' }}>
                    {currentServerObj.inviteCode || 'No code generated'}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentServerObj.inviteCode || '')
                      addLog('success', 'Invite code copied to clipboard!')
                    }}
                    style={{ padding: '8px 12px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isServerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                type="button"
                style={{ background: 'transparent', border: 'none', padding: '10px', borderBottom: serverTab === 'create' ? '2px solid #646cff' : 'none', color: serverTab === 'create' ? '#fff' : '#8899af', cursor: 'pointer', flex: 1 }}
                onClick={() => setServerTab('create')}
              >
                Create Server
              </button>
              <button 
                type="button"
                style={{ background: 'transparent', border: 'none', padding: '10px', borderBottom: serverTab === 'join' ? '2px solid #646cff' : 'none', color: serverTab === 'join' ? '#fff' : '#8899af', cursor: 'pointer', flex: 1 }}
                onClick={() => setServerTab('join')}
              >
                Join Server
              </button>
            </div>

            {serverTab === 'create' ? (
              <form onSubmit={(e) => handleCreateServer(e)}>
                <div className="form-group">
                  <label>Server Name</label>
                  <input type="text" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="e.g. My Cool Server" autoFocus />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={() => setIsServerModalOpen(false)}>Cancel</button>
                  <button type="submit">Create</button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => handleJoinServer(e)}>
                <div className="form-group">
                  <label>Invite Code</label>
                  <input type="text" value={joinInviteCode} onChange={(e) => setJoinInviteCode(e.target.value)} placeholder="e.g. 8a3f2b9c" autoFocus />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={() => setIsServerModalOpen(false)}>Cancel</button>
                  <button type="submit">Join</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Create Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Channel Name</label>
                <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="e.g. general" autoFocus />
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
