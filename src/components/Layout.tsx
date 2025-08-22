import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Layout.css';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/cassa')) return 'cassa';
    if (path.startsWith('/cucina')) return 'cucina';
    if (path.startsWith('/admin')) return 'admin';
    return 'home';
  };

  const canAccessRoute = (route: string) => {
    if (!user) return false;

    switch (route) {
      case 'cassa':
        return user.role === 'cassa' || user.role === 'admin';
      case 'cucina':
        return user.role === 'cucina' || user.role === 'admin';
      case 'admin':
        return user.role === 'admin';
      default:
        return true;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'cassa':
        return '💳 Cassa';
      case 'cucina':
        return '👨‍🍳 Cucina';
      case 'admin':
        return '⚙️ Admin';
      default:
        return '🏠 Home';
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'cassa':
        return '💳';
      case 'cucina':
        return '👨‍🍳';
      case 'admin':
        return '⚙️';
      default:
        return '🏠';
    }
  };

  if (!user) {
    return <Outlet />;
  }

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">🍕 Sagra Orders</h1>
            <span className="user-info">
              {user.nome} ({user.role})
            </span>
          </div>
          <div className="header-right">
            <button className="logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="layout-nav">
        <div className="nav-tabs">
          {canAccessRoute('cassa') && (
            <button
              className={`nav-tab ${getActiveTab() === 'cassa' ? 'active' : ''}`}
              onClick={() => navigate('/cassa')}
            >
              <span className="tab-icon">{getTabIcon('cassa')}</span>
              <span className="tab-label">{getTabLabel('cassa')}</span>
            </button>
          )}

          {canAccessRoute('cucina') && (
            <button
              className={`nav-tab ${getActiveTab() === 'cucina' ? 'active' : ''}`}
              onClick={() => navigate('/cucina')}
            >
              <span className="tab-icon">{getTabIcon('cucina')}</span>
              <span className="tab-label">{getTabLabel('cucina')}</span>
            </button>
          )}

          {canAccessRoute('admin') && (
            <button
              className={`nav-tab ${getActiveTab() === 'admin' ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <span className="tab-icon">{getTabIcon('admin')}</span>
              <span className="tab-label">{getTabLabel('admin')}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="layout-main">
        <div className="main-content">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="layout-footer">
        <div className="footer-content">
          <span className="footer-text">
            🍕 Sagra Orders - Sistema Gestione Ordini
          </span>
          <span className="footer-version">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
