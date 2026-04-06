import { useState, useRef, useEffect } from 'react'
import './App.css'
// @ts-ignore
import { login, logout, getToken, getUsername } from './services/auth'
// @ts-ignore
import useChat from './hooks/useChat'

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
  
  const logEndRef = useRef<HTMLDivElement>(null)

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
        const resp = await fetch('http://localhost:8088/auth/register', {
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
        <ChatView onLogout={handleLogout} />
        <LogWindow logs={logs} logEndRef={logEndRef} />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="auth-card">
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

          <button type="submit">
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

function ChatView({ onLogout }: { onLogout: () => void }) {
  const [inputText, setInputText] = useState('')
  const { messages, sendMessage, isConnected } = useChat('1') // Hardcoded channel 1
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUsername = getUsername()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      sendMessage(inputText)
      setInputText('')
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h3>Harmony Chat</h3>
          <div className="status-indicator">
            <div className="status-dot"></div>
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>

      <div className="message-list">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8899af', marginTop: '20px' }}>
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((m: any, i: number) => (
          <div key={i} className={`message-item ${m.senderId === currentUsername ? 'own' : ''}`}>
            <span className="message-sender">{m.senderId}</span>
            <div className="message-bubble">
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)} 
          placeholder="Type a message..."
        />
        <button type="submit" disabled={!isConnected}>Send</button>
      </form>
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
