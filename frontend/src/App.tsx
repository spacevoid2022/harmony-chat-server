import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8088/auth'

interface LogEntry {
  type: 'info' | 'success' | 'error'
  message: string
  timestamp: string
}

function App() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const endpoint = isLogin ? '/login' : '/register'
    const payload = isLogin ? { username, password } : { username, email, password }

    addLog('info', `Attempting ${isLogin ? 'Login' : 'Registration'} for user: ${username}...`)

    try {
      const resp = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      addLog('info', `Response status: ${resp.status} ${resp.statusText}`)

      if (resp.ok) {
        const data = await resp.json()
        addLog('success', `${isLogin ? 'Login' : 'Registration'} successful!`)
        addLog('success', `Token received: ${data.token.substring(0, 20)}...`)
        if (!isLogin) {
          addLog('info', 'Switching to login mode...')
          setIsLogin(true)
        }
      } else {
        const text = await resp.text()
        addLog('error', `Error (${resp.status}): ${text || 'Authentication failed'}`)
        if (resp.status === 404) {
          addLog('error', 'The endpoint was not found. Please check if the backend is running on the correct port (8080 or 8088).')
        }
      }
    } catch (error: any) {
      addLog('error', `Network error: ${error.message}`)
      addLog('error', `Make sure the backend is running at ${API_BASE_URL}`)
    }
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <form onSubmit={handleSubmit}>
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

      {logs.length > 0 && (
        <div className="logs">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry log-${log.type}`}>
              [{log.timestamp}] {log.message}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  )
}

export default App
