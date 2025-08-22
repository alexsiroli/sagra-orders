import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

const Login: React.FC = () => {
  const [loginMethod, setLoginMethod] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithPin, error } = useAuth();
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

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    try {
      setIsLoading(true);
      await loginWithPin(pin);
      navigate('/cassa'); // Redirect alla cassa dopo il login
    } catch (err) {
      // L'errore è gestito dall'hook useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (loginMethod === 'email') {
      handleEmailLogin(e);
    } else {
      handlePinLogin(e);
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

        {/* Toggle Login Method */}
        <div className="login-method-toggle">
          <button
            className={`toggle-btn ${loginMethod === 'email' ? 'active' : ''}`}
            onClick={() => setLoginMethod('email')}
          >
            📧 Email
          </button>
          <button
            className={`toggle-btn ${loginMethod === 'pin' ? 'active' : ''}`}
            onClick={() => setLoginMethod('pin')}
          >
            🔢 PIN
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {loginMethod === 'email' ? (
            <>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  📧 Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="Inserisci la tua email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  🔒 Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Inserisci la password"
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label htmlFor="pin" className="form-label">
                🔢 PIN di Accesso
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="form-input pin-input"
                placeholder="Inserisci il PIN"
                maxLength={4}
                pattern="[0-9]{4}"
                required
                disabled={isLoading}
              />
              <small className="form-help">
                Inserisci il PIN a 4 cifre per l'accesso rapido
              </small>
            </div>
          )}

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

        {/* Demo Info */}
        <div className="demo-info">
          <h3>🧪 Account Demo</h3>
          <div className="demo-accounts">
            <div className="demo-account">
              <strong>👑 Admin:</strong> admin@sagra.it / admin123
            </div>
            <div className="demo-account">
              <strong>💳 Cassa:</strong> cassa@sagra.it / cassa123
            </div>
            <div className="demo-account">
              <strong>👨‍🍳 Cucina:</strong> cucina@sagra.it / cucina123
            </div>
          </div>
          <p className="demo-note">
            <small>
              💡 Usa questi account per testare le diverse funzionalità
            </small>
          </p>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>🍕 Sagra Orders v1.0.0</p>
          <p>Sistema professionale per la gestione ordini</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
