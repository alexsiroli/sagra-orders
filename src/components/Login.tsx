import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      await login(email, password);
      navigate('/cassa'); // Redirect alla cassa dopo il login
    } catch (err) {
      // L'errore è gestito dall'hook useAuth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">🍕</div>
          <h1 className="login-title">Sagra Orders</h1>
          <p className="login-subtitle">Sistema Gestione Ordini</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="login-form">
          <div className="form-group">
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-input"
              placeholder="📧 Inserisci la tua email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
              placeholder="🔒 Inserisci la password"
              required
              disabled={isLoading}
            />
          </div>

          {/* Error Display */}
          {error && <div className="error-message">❌ {error}</div>}

          {/* Submit Button */}
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span>🚀 Accedi</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
