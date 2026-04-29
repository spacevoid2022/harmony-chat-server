import { useState, useRef, useEffect, useCallback, memo } from 'react'
import './App.css'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// @ts-ignore
import { login, logout, getToken, getUsername, getUserId, getAvatarUrl, getStatus, getCustomStatus } from './services/auth'
// @ts-ignore
import useChat from './hooks/useChat'
// @ts-ignore
import useVoiceChat from './hooks/useVoiceChat'
import GifPicker from './components/GifPicker'
import { API_BASE_URL } from './config'

const isImageUrl = (url: string) => {
  if (!url || typeof url !== 'string') return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || url.includes('giphy.com/media');
}

const isAudioUrl = (url: string) => {
  if (!url || typeof url !== 'string') return false;
  return url.match(/\.(webm|mp3|ogg|wav|mp4)$/i) != null;
}

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
  const [userAvatar, setUserAvatar] = useState<string | null>(getAvatarUrl())
  const [userStatus, setUserStatus] = useState<string>(getStatus() || 'ONLINE')
  const [userCustomStatus, setUserCustomStatus] = useState<string | null>(getCustomStatus())
  
  const logEndRef = useRef<HTMLDivElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleStatusUpdate = async (status: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/users/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: status
      })
      if (resp.ok) {
        setUserStatus(status)
        localStorage.setItem('status', status)
      }
    } catch (err) {
      console.error('Status update failed', err)
    }
  }

  const handleCustomStatusUpdate = async (customStatus: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/users/custom-status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: customStatus
      })
      if (resp.ok) {
        setUserCustomStatus(customStatus)
        localStorage.setItem('customStatus', customStatus)
      }
    } catch (err) {
      console.error('Custom status update failed', err)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const uploadResp = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })

      if (!uploadResp.ok) throw new Error('Upload failed')
      const fileUrl = await uploadResp.text()

      // Update user profile
      const updateResp = await fetch(`${API_BASE_URL}/api/users/avatar`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: fileUrl
      })

      if (updateResp.ok) {
        setUserAvatar(fileUrl)
        localStorage.setItem('avatarUrl', fileUrl)
      }
    } catch (err) {
      console.error('Avatar upload failed', err)
    }
  }

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
        setUserAvatar(data.avatarUrl)
        setUserStatus(data.status || 'ONLINE')
        setUserCustomStatus(data.customStatus)
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
    setUserAvatar(null)
    setUserStatus('ONLINE')
    setUserCustomStatus(null)
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
        <ChatView 
          onLogout={handleLogout} 
          addLog={addLog} 
          userAvatar={userAvatar}
          userStatus={userStatus}
          userCustomStatus={userCustomStatus}
          handleAvatarUpload={handleAvatarUpload}
          handleStatusUpdate={handleStatusUpdate}
          handleCustomStatusUpdate={handleCustomStatusUpdate}
          avatarInputRef={avatarInputRef}
        />
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

function ChatView({ 
  onLogout, 
  addLog, 
  userAvatar, 
  userStatus,
  userCustomStatus,
  handleAvatarUpload, 
  handleStatusUpdate,
  handleCustomStatusUpdate,
  avatarInputRef 
}: { 
  onLogout: () => void, 
  addLog: (type: 'info' | 'success' | 'error', message: string) => void,
  userAvatar: string | null,
  userStatus: string,
  userCustomStatus: string | null,
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  handleStatusUpdate: (status: string) => void,
  handleCustomStatusUpdate: (customStatus: string) => void,
  avatarInputRef: React.RefObject<HTMLInputElement | null>
}) {
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

  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const { 
    isConnected: isVoiceConnected, 
    remoteStreams, 
    participants, 
    isMuted,
    isDeafened,
    isCameraOn,
    speakingParticipants,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    joinChannel, 
    leaveChannel,
    startScreenShare,
    stopScreenShare,
    screenStream,
    localStream
  } = useVoiceChat(currentVoiceChannelId);
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isServerModalOpen, setIsServerModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newCustomStatus, setNewCustomStatus] = useState(userCustomStatus || '')
  
  // Settings & Invites State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'overview' | 'invites'>('overview')
  const [editServerName, setEditServerName] = useState('')
  const [editServerIconUrl, setEditServerIconUrl] = useState('')
  const [serverTab, setServerTab] = useState<'create' | 'join'>('create')
  const [joinInviteCode, setJoinInviteCode] = useState('')

  const [newServerName, setNewServerName] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState('TEXT')
  const [inputText, setInputText] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  
  // Mentions State
  const [serverMembers, setServerMembers] = useState<any[]>([])
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)

  // Home & DM State
  const [friends, setFriends] = useState<any[]>([])
  const [pendingFriends, setPendingFriends] = useState<any[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])
  const [dms, setDms] = useState<any[]>([])
  const [homeTab, setHomeTab] = useState<'online' | 'all' | 'pending' | 'add'>('online')
  const [friendSearch, setFriendSearch] = useState('')
  
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
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

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
        // Only log out if we are sure it's a permanent auth failure
        try {
          const text = await resp.text();
          if (text && (text.includes("Unauthorized") || text.includes("Expired"))) {
            onLogout()
            return
          }
        } catch (e) {
          // If we can't read the body, don't logout yet
          console.warn("Could not read auth error body", e);
        }
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
        try {
          const text = await resp.text();
          if (text && (text.includes("Unauthorized") || text.includes("Expired"))) {
            onLogout()
            return
          }
        } catch (e) {
          console.warn("Could not read auth error body", e);
        }
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

  const fetchFriends = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) setFriends(await resp.json());
    } catch (err) { console.error('Friends fetch failed', err); }
  };

  const fetchPendingFriends = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/friends/pending`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) setPendingFriends(await resp.json());

      const respOutgoing = await fetch(`${API_BASE_URL}/api/friends/pending/outgoing`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (respOutgoing.ok) setOutgoingRequests(await respOutgoing.json());
    } catch (err) { console.error('Pending fetch failed', err); }
  };

  const fetchDMs = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/dm`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) setDms(await resp.json());
    } catch (err) { console.error('DMs fetch failed', err); }
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendSearch.trim()) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/friends/request/${friendSearch}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) {
        addLog('success', `Friend request sent to ${friendSearch}`);
        setFriendSearch('');
        fetchPendingFriends();
      } else {
        const error = await resp.text();
        addLog('error', `Failed: ${error}`);
      }
    } catch (err) { addLog('error', 'Network error'); }
  };

  const handleAcceptFriend = async (username: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/friends/accept/${username}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) {
        addLog('success', `Accepted ${username}`);
        fetchFriends();
        fetchPendingFriends();
      }
    } catch (err) { addLog('error', 'Network error'); }
  };

  const handleOpenDM = async (username: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/dm/open/${username}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resp.ok) {
        const dmChannel = await resp.json();
        setCurrentServerId(null); // Home view
        setCurrentChannelId(dmChannel.id.toString());
        fetchDMs();
      }
    } catch (err) { addLog('error', 'Network error opening DM'); }
  };

  useEffect(() => {
    fetchServers()
    fetchFriends()
    fetchPendingFriends()
    fetchDMs()
  }, [])

  useEffect(() => {
    if (currentServerId) {
      fetchChannels()
      fetchServerMembers()
      // Clear pings for this server when we enter it
      setUnreadPings(prev => ({ ...prev, [currentServerId]: 0 }));
    } else {
      // Home view logic: refresh friends/DMs
      fetchFriends()
      fetchDMs()
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

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#313338';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 100, 255)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice_message.webm');

        try {
          const resp = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData,
          });

          if (resp.ok) {
            const url = await resp.text();
            sendMessage('', url);
            addLog('success', 'Voice message sent!');
          } else {
            addLog('error', 'Failed to send voice message');
          }
        } catch (err) {
          addLog('error', 'Network error sending voice message');
        } finally {
          setIsUploading(false);
        }
      };

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.start();
      setIsRecording(true);
      
      // Delay drawing slightly to ensure canvas is rendered
      setTimeout(drawWaveform, 50);

    } catch (err) {
      addLog('error', 'Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

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
        body: JSON.stringify({ name: newChannelName, type: newChannelType })
      })
      if (resp.ok) {
        const created = await resp.json()
        setChannels(prev => [...prev, created])
        
        // Only set as current channel if it's a TEXT channel
        if (created.type !== 'VOICE') {
          setCurrentChannelId(safeId(created.id))
          localStorage.setItem('last_channel_id', safeId(created.id))
        }
        
        setIsModalOpen(false)
        setNewChannelName('')
        setNewChannelType('TEXT')
      }
    } catch (err) {
      console.error('Failed to create channel:', err)
    }
  }



  const currentChannelObj = currentServerId 
    ? channels.find(c => safeId(c.id) === currentChannelId)
    : dms.find(d => safeId(d.id) === currentChannelId);

  const currentChannelName = currentChannelObj 
    ? (currentChannelObj.type === 'DM' 
        ? currentChannelObj.participants.find((p: any) => p.username !== getUsername())?.username || 'DM'
        : currentChannelObj.name)
    : 'Friends';

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
        <div 
          className={`server-icon home-icon ${currentServerId === null ? 'active' : ''}`}
          onClick={() => {
            setCurrentServerId(null);
            localStorage.setItem('last_server_id', '');
          }}
          title="Home"
        >
          <div className="server-indicator" />
          <span style={{ fontSize: '1.5rem' }}>🏠</span>
        </div>
        <div className="server-separator" />
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
            {currentServerId ? (currentServerObj?.name || 'Channels') : 'Home'}
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
        {currentServerId && (
          <div className="sidebar-header" style={{ paddingTop: 0, paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#8899af', textTransform: 'uppercase', letterSpacing: '1px' }}>Channels</span>
            <button className="btn-add-channel" onClick={() => setIsModalOpen(true)}>+</button>
          </div>
        )}
        <div className="channel-list">
          {!currentServerId ? (
            <>
              <div 
                className={`channel-item ${currentChannelId === null ? 'active' : ''}`}
                onClick={() => { setCurrentChannelId(null); setShowSidebar(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8899af', fontSize: '1.1rem' }}>👥</span>
                  <span>Friends</span>
                </div>
              </div>
              <div className="sidebar-header" style={{ paddingTop: '20px', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: '#8899af', textTransform: 'uppercase', letterSpacing: '1px' }}>Direct Messages</span>
              </div>
              {dms.map(dm => {
                const cid = safeId(dm.id);
                const otherUser = dm.participants?.find((p: any) => p.username !== getUsername()) || { username: 'Unknown' };
                return (
                  <div 
                    key={dm.id} 
                    className={`channel-item ${currentChannelId === cid ? 'active' : ''}`}
                    onClick={() => { setCurrentChannelId(cid); setShowSidebar(false); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="dm-avatar" style={{ position: 'relative', width: '32px', height: '32px' }}>
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl.startsWith('/') ? `${API_BASE_URL}${otherUser.avatarUrl}` : otherUser.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                          <div className="avatar-placeholder" style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#313338', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>{otherUser.username.substring(0, 1).toUpperCase()}</div>
                        )}
                        <div className={`user-status-dot ${otherUser.status?.toLowerCase() || 'offline'}`} />
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherUser.username}</span>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            channels.map(channel => {
              const cid = safeId(channel.id);
              const isVoice = channel.type === 'VOICE';
              const isActive = isVoice ? currentVoiceChannelId === cid : currentChannelId === cid;

              return (
                <div 
                  key={channel.id} 
                  className={`channel-item ${isActive ? 'active' : ''}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => {
                    if (isVoice) {
                      if (currentVoiceChannelId !== cid) {
                        setCurrentVoiceChannelId(cid);
                        joinChannel();
                      }
                    } else {
                      setCurrentChannelId(cid);
                      localStorage.setItem('last_channel_id', cid);
                    }
                    setShowSidebar(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#8899af', fontSize: '1.1rem' }}>{isVoice ? '🔊' : '#'}</span>
                    <span>{channel.name}</span>
                  </div>
                  {isVoice && isActive && participants.length > 0 && (
                    <div className="voice-participants">
                      {participants.map((p: string) => (
                        <div key={p} className="voice-participant">
                          <div className="voice-avatar" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
            })
          )}
        </div>
        <div className="voice-status-container">
          {currentVoiceChannelId && (
            <div className="voice-status">
              <div className="voice-info">
                <div className="voice-indicator">
                  <div className={`voice-dot ${isVoiceConnected ? 'active' : ''}`} />
                  <span>{isVoiceConnected ? 'Voice Connected' : 'Connecting...'}</span>
                </div>
                <div className="voice-channel-name">
                  {channels.find(c => safeId(c.id) === currentVoiceChannelId)?.name}
                </div>
              </div>
              <div className="voice-actions" style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`btn-voice-action ${isMuted ? 'active' : ''}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  style={{ background: isMuted ? '#f04747' : 'rgba(255,255,255,0.1)' }}
                >
                  {isMuted ? '🎙️' : '🎤'}
                </button>
                <button 
                  className={`btn-voice-action ${isDeafened ? 'active' : ''}`}
                  onClick={toggleDeafen}
                  title={isDeafened ? 'Undeafen' : 'Deafen'}
                  style={{ background: isDeafened ? '#f04747' : 'rgba(255,255,255,0.1)' }}
                >
                  {isDeafened ? '🎧' : '👂'}
                </button>
                <button 
                  className={`btn-voice-action ${isCameraOn ? 'active' : ''}`}
                  onClick={toggleCamera}
                  title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                  style={{ background: isCameraOn ? '#4ade80' : 'rgba(255,255,255,0.1)' }}
                >
                  📹
                </button>
                <button 
                  className={`btn-screen-share ${screenStream ? 'active' : ''}`}
                  onClick={() => screenStream ? stopScreenShare() : startScreenShare()}
                  title="Share Screen"
                  style={{
                    background: screenStream ? '#4ade80' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  🖥️
                </button>
                <button 
                  className="btn-hangup" 
                  onClick={() => {
                    leaveChannel();
                    setCurrentVoiceChannelId(null);
                  }}
                  title="Disconnect"
                >
                  📞
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
          <div 
            className="user-avatar-container" 
            onClick={() => avatarInputRef.current?.click()}
            style={{ position: 'relative', cursor: 'pointer' }}
          >
            {userAvatar ? (
              <img 
                src={userAvatar.startsWith('/') ? `${API_BASE_URL}${userAvatar}` : userAvatar} 
                alt="Avatar" 
                className="user-avatar-main" 
              />
            ) : (
              <div className="user-avatar-placeholder">{getUsername()?.substring(0, 1).toUpperCase()}</div>
            )}
            <div className={`user-status-dot ${userStatus.toLowerCase()}`} />
            <div className="avatar-edit-overlay">Edit</div>
            <input 
              type="file" 
              ref={avatarInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleAvatarUpload} 
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setIsStatusModalOpen(true)} title="Set Status">
            <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getUsername()}</div>
            <div style={{ fontSize: '0.75rem', color: '#8899af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userCustomStatus || 'Set Status...'}
            </div>
          </div>
          <button className="btn-logout-small" onClick={onLogout} title="Logout">
            ↪
          </button>
        </div>
      </div>

      {/* Remote Audio Streams (Hidden) */}
      <div style={{ display: 'none' }}>
        {Object.entries(remoteStreams).map(([uid, stream]: [string, any]) => (
          <audio 
            key={uid} 
            autoPlay 
            ref={el => { if (el) el.srcObject = stream; }} 
          />
        ))}
      </div>

      {/* 3. Main Chat (Right) */}
      <div className="main-chat">
        {currentServerId === null && currentChannelId === null ? (
          <div className="friends-view">
            <div className="friends-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '1.2rem', color: '#8899af' }}>👥</span>
                <span style={{ fontWeight: 600 }}>Friends</span>
                <div className="header-divider" />
                <button className={`friends-tab ${homeTab === 'online' ? 'active' : ''}`} onClick={() => setHomeTab('online')}>Online</button>
                <button className={`friends-tab ${homeTab === 'all' ? 'active' : ''}`} onClick={() => setHomeTab('all')}>All</button>
                <button className={`friends-tab ${homeTab === 'pending' ? 'active' : ''}`} onClick={() => setHomeTab('pending')}>Pending</button>
                <button className={`friends-tab add-friend ${homeTab === 'add' ? 'active' : ''}`} onClick={() => setHomeTab('add')}>Add Friend</button>
              </div>
            </div>
            <div className="friends-content">
              {homeTab === 'add' ? (
                <div className="add-friend-container" style={{ maxWidth: '600px' }}>
                  <h2>Add Friend</h2>
                  <p style={{ color: '#8899af', marginBottom: '15px' }}>You can add friends with their Harmony username. It's case sensitive!</p>
                  <form onSubmit={handleSendFriendRequest} className="add-friend-form" style={{ padding: '4px 12px' }}>
                    <input 
                      type="text" 
                      placeholder="Enter a username" 
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      style={{ fontSize: '1rem', padding: '12px 0' }}
                    />
                    <button type="submit" style={{ padding: '0 20px', height: '40px', borderRadius: '4px', whiteSpace: 'nowrap' }}>Send Friend Request</button>
                  </form>
                </div>
              ) : (
                <div className="friends-list">
                  <div className="friends-count">
                    {homeTab === 'pending' ? `Pending Requests — ${pendingFriends.length}` : 
                     homeTab === 'online' ? `Online — ${friends.filter(f => f.status !== 'OFFLINE').length}` : 
                     `All Friends — ${friends.length}`}
                  </div>
                  {homeTab === 'pending' ? (
                    <>
                      {pendingFriends.length === 0 && outgoingRequests.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#8899af', marginTop: '40px' }}>
                          There are no pending friend requests.
                        </div>
                      )}
                      
                      {pendingFriends.length > 0 && (
                        <div className="friends-count">Incoming — {pendingFriends.length}</div>
                      )}
                      {pendingFriends.map(user => (
                        <div key={user.id} className="friend-item">
                          <div className="friend-info">
                            <div className="friend-avatar">
                              {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : user.username[0].toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                          </div>
                          <div className="friend-actions">
                            <button className="btn-friend-action accept" onClick={() => handleAcceptFriend(user.username)} title="Accept">✓</button>
                          </div>
                        </div>
                      ))}

                      {outgoingRequests.length > 0 && (
                        <div className="friends-count" style={{ marginTop: '30px' }}>Outgoing — {outgoingRequests.length}</div>
                      )}
                      {outgoingRequests.map(user => (
                        <div key={user.id} className="friend-item" style={{ cursor: 'default', opacity: 0.8 }}>
                          <div className="friend-info">
                            <div className="friend-avatar">
                              {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : user.username[0].toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                          </div>
                          <div className="friend-actions">
                            <span style={{ color: '#8899af', fontSize: '0.8rem', paddingRight: '10px' }}>Request Sent</span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    friends.filter(f => homeTab === 'all' || f.status !== 'OFFLINE').map(user => (
                      <div key={user.id} className="friend-item" onClick={() => handleOpenDM(user.username)}>
                        <div className="friend-info">
                          <div className="friend-avatar">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : user.username[0].toUpperCase()}
                            <div className={`user-status-dot ${user.status?.toLowerCase() || 'offline'}`} />
                          </div>
                          <div className="friend-name-col">
                            <span className="friend-username">{user.username}</span>
                            <span className="friend-status-text">{user.status}</span>
                          </div>
                        </div>
                        <div className="friend-actions">
                          <button className="btn-chat" onClick={(e) => { e.stopPropagation(); handleOpenDM(user.username); }} title="Message">💬</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <button className="btn-menu" onClick={() => setShowSidebar(s => !s)}>☰</button>
              <div>
                <h3>
                  <span style={{ color: '#8899af', marginRight: '5px' }}>{currentChannelObj?.type === 'DM' ? '@' : '#'}</span>
                  {currentChannelName}
                </h3>
                <div className="status-indicator">
                  <div className="status-dot"></div>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </div>
              </div>
            </div>

        {currentVoiceChannelId && (
          <div className="video-stage">
            {participants.map((p: string) => {
              const isLocal = p === getUsername();
              const stream = isLocal ? localStream : remoteStreams[p];
              const hasVideo = stream && stream.getVideoTracks().length > 0;
              const isSpeaking = speakingParticipants[p];
              
              return (
                <div key={p} className={`video-container ${isSpeaking ? 'speaking' : ''}`}>
                  {hasVideo ? (
                    <video 
                      autoPlay 
                      muted={isLocal} 
                      ref={el => { if (el && stream && el.srcObject !== stream) el.srcObject = stream; }} 
                    />
                  ) : (
                    <div className="voice-avatar-placeholder">
                      {p.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="video-label">
                    {isSpeaking && <span className="speaking-icon">●</span>}
                    {p} {isLocal && '(You)'}
                  </div>
                </div>
              );
            })}
            {screenStream && (
              <div className="video-container screen-share">
                <video autoPlay muted ref={el => { if (el) el.srcObject = screenStream; }} />
                <div className="video-label">Screen Share</div>
              </div>
            )}
          </div>
        )}

        <div className="message-list">
          {(!Array.isArray(messages) || messages.length === 0) && (
            <div style={{ textAlign: 'center', color: '#8899af', marginTop: '20px' }}>
              {Array.isArray(messages) ? 'No messages yet in this channel.' : 'Loading messages...'}
            </div>
          )}
          {Array.isArray(messages) && (function() {
            const currentUsername = getUsername();
            return messages.map((m: any, i: number) => {
              const sender = m.senderId || 'Unknown';
              const isOwn = sender.toLowerCase() === (currentUsername || '').toLowerCase();
              
              return (
                <MessageItem 
                  key={m.id || `temp-${i}`}
                  m={m}
                  isOwn={isOwn}
                  isOwner={isOwner}
                  currentUsername={currentUsername}
                  toggleReaction={toggleReaction}
                  deleteMessage={deleteMessage}
                  API_BASE_URL={API_BASE_URL}
                />
              );
            });
          })()}
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
          
          {isRecording ? (
            <div className="recording-ui">
              <canvas ref={canvasRef} width="200" height="40" className="waveform-canvas" />
              <button type="button" className="btn-stop-record" onClick={stopRecording}>⏹️ Stop</button>
            </div>
          ) : (
            <>
              <button type="button" className="btn-mic" onClick={startRecording} title="Record Voice Message">🎤</button>
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
            </>
          )}
        </form>

        {showGifPicker && (
          <GifPicker 
            onSelect={handleGifSelect} 
            onClose={() => setShowGifPicker(false)} 
          />
        )}
          </>
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
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Channel Type</label>
                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="channelType" 
                      value="TEXT" 
                      checked={newChannelType === 'TEXT'} 
                      onChange={(e) => setNewChannelType(e.target.value)} 
                    />
                    # Text
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="channelType" 
                      value="VOICE" 
                      checked={newChannelType === 'VOICE'} 
                      onChange={(e) => setNewChannelType(e.target.value)} 
                    />
                    🔊 Voice
                  </label>
                </div>
              </div>
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

      {isStatusModalOpen && (
        <div className="modal-overlay" onClick={() => setIsStatusModalOpen(false)}>
          <div className="modal-card status-modal" onClick={e => e.stopPropagation()}>
            <h3>Set Status</h3>
            
            <div className="status-options">
              {[
                { id: 'ONLINE', label: 'Online', color: '#43b581' },
                { id: 'IDLE', label: 'Idle', color: '#faa61a' },
                { id: 'DND', label: 'Do Not Disturb', color: '#f04747' },
                { id: 'OFFLINE', label: 'Invisible', color: '#747f8d' }
              ].map(opt => (
                <div 
                  key={opt.id} 
                  className={`status-option ${userStatus === opt.id ? 'active' : ''}`}
                  onClick={() => handleStatusUpdate(opt.id)}
                >
                  <div className="status-dot-large" style={{ backgroundColor: opt.color }} />
                  <span>{opt.label}</span>
                  {userStatus === opt.id && <span className="check-mark">✓</span>}
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>Custom Status</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={newCustomStatus} 
                  onChange={(e) => setNewCustomStatus(e.target.value)} 
                  placeholder="What's on your mind?"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomStatusUpdate(newCustomStatus)
                  }}
                />
                <button onClick={() => handleCustomStatusUpdate(newCustomStatus)}>Save</button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setIsStatusModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const MessageItem = memo(({ m, isOwn, isOwner, currentUsername, toggleReaction, deleteMessage, API_BASE_URL }: any) => {
  const sender = m.senderId || 'Unknown';
  const isSystem = m.content?.startsWith('➔');
  const isMentioned = m.content?.includes(`@${currentUsername}`);
  const reactions = m.reactions || [];
  const groupedReactions = reactions.reduce((acc: any, r: any) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  if (isSystem) {
    return (
      <div className="system-message">
        <span className="system-message-icon">➔</span>
        {m.content.substring(1)}
      </div>
    );
  }

  return (
    <div className={`message-item ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <div className="message-avatar">
          {m.senderAvatarUrl ? (
            <img src={m.senderAvatarUrl.startsWith('/') ? `${API_BASE_URL}${m.senderAvatarUrl}` : m.senderAvatarUrl} alt="Avatar" />
          ) : (
            <div className="avatar-placeholder">{sender.substring(0, 1).toUpperCase()}</div>
          )}
          <div className={`user-status-dot ${m.senderStatus?.toLowerCase() || 'offline'}`} />
        </div>
      )}
      <div className="message-content-wrapper">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span className="message-sender">{sender}</span>
          {m.senderCustomStatus && (
            <span className="message-custom-status">— {m.senderCustomStatus}</span>
          )}
        </div>
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
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({node, ...props}) => {
                    const url = props.href || '';
                    const youtubeId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                    if (youtubeId) {
                      return (
                        <div className="youtube-preview-container">
                          <a href={url} target="_blank" rel="noreferrer" className="chat-link">{url}</a>
                          <div className="youtube-wrapper">
                            <iframe 
                              src={`https://www.youtube.com/embed/${youtubeId}`} 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen 
                            />
                          </div>
                        </div>
                      );
                    }
                    return <a {...props} target="_blank" rel="noreferrer" className="chat-link" />;
                  },
                  code: ({node, ...props}) => (
                    <code className="chat-code" {...props} />
                  ),
                  pre: ({node, ...props}) => (
                    <pre className="chat-pre" {...props} />
                  )
                }}
              >
                {m.content}
              </ReactMarkdown>
            )
          ) : (
            !m.imageUrl && '(Empty message)'
          )}
          {m.imageUrl && (
            <div className="chat-image-container">
              {isAudioUrl(m.imageUrl) ? (
                <audio controls src={`${API_BASE_URL}${m.imageUrl}`} className="chat-audio" />
              ) : (
                <img src={`${API_BASE_URL}${m.imageUrl}`} alt="Upload" className="chat-upload-image" />
              )}
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
      {isOwn && (
        <div className="message-avatar">
          {m.senderAvatarUrl ? (
            <img src={m.senderAvatarUrl.startsWith('/') ? `${API_BASE_URL}${m.senderAvatarUrl}` : m.senderAvatarUrl} alt="Avatar" />
          ) : (
            <div className="avatar-placeholder">{sender.substring(0, 1).toUpperCase()}</div>
          )}
          <div className={`user-status-dot ${m.senderStatus?.toLowerCase() || 'online'}`} />
        </div>
      )}
    </div>
  );
});

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
