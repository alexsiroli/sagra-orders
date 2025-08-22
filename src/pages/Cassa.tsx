import React from 'react';
import './Cassa.css';

const Cassa: React.FC = () => {
  return (
    <div className="cassa-page">
      <div className="cassa-header">
        <h1>💳 Vista Cassa</h1>
        <p>Gestione ordini e pagamenti</p>
      </div>

      <div className="cassa-content">
        <div className="coming-soon">
          <div className="coming-soon-icon">🚧</div>
          <h2>In Sviluppo</h2>
          <p>Questa vista sarà implementata nell'Issue #6</p>
          <div className="features-preview">
            <h3>Funzionalità pianificate:</h3>
            <ul>
              <li>🍽️ Menu con categorie e prezzi</li>
              <li>🛒 Carrello interattivo</li>
              <li>💰 Calcolo totale e resto</li>
              <li>📊 Progressivo ordini</li>
              <li>📝 Gestione note e modifiche</li>
              <li>🔄 Sistema sold-out integrato</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cassa;
