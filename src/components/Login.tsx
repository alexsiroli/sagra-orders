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
  const [isPopulating, setIsPopulating] = useState(false);

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

  const handlePopulateDatabase = async () => {
    try {
      setIsPopulating(true);

      // Importa e esegue lo script di popolamento
      const { populateDatabase } = await import(
        '../scripts/populateDatabase.ts'
      );
      await populateDatabase();

      alert('✅ Database popolato con successo! Ora puoi fare login.');
    } catch (error) {
      console.error('Errore durante il popolamento:', error);
      alert(
        '❌ Errore durante il popolamento del database. Controlla la console.'
      );
    } finally {
      setIsPopulating(false);
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

        {/* Populate Database Button */}
        <div className="populate-database-section">
          <button
            type="button"
            className="populate-db-btn"
            onClick={handlePopulateDatabase}
            disabled={isPopulating}
          >
            {isPopulating ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span>🗄️ Popola Database</span>
            )}
          </button>
          <small className="populate-help">
            💡 Clicca qui per popolare il database con utenti e menu demo
          </small>
        </div>

        {/* Demo Info */}
        <div className="demo-info">
          <h3>🧪 Account Demo</h3>
          <div className="demo-accounts">
            <div className="demo-account">
              <strong>👑 Admin:</strong> admin@locale.test / 000000
            </div>
            <div className="demo-account">
              <strong>💳 Cassa:</strong> cassa@locale.test / 000000
            </div>
            <div className="demo-account">
              <strong>👨‍🍳 Cucina:</strong> cucina@locale.test / 000000
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
