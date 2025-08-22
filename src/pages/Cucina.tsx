import React from 'react';
import './Cucina.css';

const Cucina: React.FC = () => {
  return (
    <div className="cucina-page">
      <div className="cucina-header">
        <h1>👨‍🍳 Vista Cucina</h1>
        <p>Gestione preparazione ordini</p>
      </div>

      <div className="cucina-content">
        <div className="coming-soon">
          <div className="coming-soon-icon">🚧</div>
          <h2>In Sviluppo</h2>
          <p>Questa vista sarà implementata nell'Issue #7</p>
          <div className="features-preview">
            <h3>Funzionalità pianificate:</h3>
            <ul>
              <li>📋 Lista ordini in tempo reale</li>
              <li>⏱️ Timer di preparazione</li>
              <li>🔄 Gestione stati ordini</li>
              <li>📱 Notifiche per nuovi ordini</li>
              <li>👥 Assegnazione cuochi</li>
              <li>📊 Statistiche preparazione</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cucina;
