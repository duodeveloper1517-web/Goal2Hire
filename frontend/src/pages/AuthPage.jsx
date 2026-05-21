import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return toast.error('All fields required');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
        toast.success('Welcome back!');
      } else {
        await register(username, password);
        toast.success('Account created! Your journey begins 🚀');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">⚡</span>
          <h1>Goal2Hire</h1>
          <p>Master Computer Science in 90 Days</p>
        </div>

        <div className="auth-tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-group">
            <label>Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="field-group">
            <label>Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button id="auth-submit" type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : (mode === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>

        <p className="auth-footer">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
}
