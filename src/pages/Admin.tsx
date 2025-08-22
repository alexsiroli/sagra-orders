import React from 'react';
import './Admin.css';

const Admin: React.FC = () => {
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ Vista Admin</h1>
        <p>Gestione sistema e configurazione</p>
      </div>

      <div className="admin-content">
        <div className="coming-soon">
          <div className="coming-soon-icon">🚧</div>
          <h2>In Sviluppo</h2>
          <p>Questa vista sarà implementata nelle Issue #8 e #9</p>
          <div className="features-preview">
            <h3>Funzionalità pianificate:</h3>
            <ul>
              <li>🍽️ Gestione catalogo e menu</li>
              <li>📊 Report e statistiche</li>
              <li>👥 Gestione utenti e ruoli</li>
              <li>💰 Gestione prezzi e sconti</li>
              <li>📈 Analytics e performance</li>
              <li>⚙️ Configurazione sistema</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
