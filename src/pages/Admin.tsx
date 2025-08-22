import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  MenuComponent,
  MenuItem,
  Category,
  SystemStats,
} from '../types/dataModel';
import './Admin.css';

interface AdminStats {
  totalItems: number;
  activeItems: number;
  totalComponents: number;
  activeComponents: number;
  lowStockItems: number;
}

const Admin: React.FC = () => {
  // State per dati
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuComponents, setMenuComponents] = useState<MenuComponent[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalItems: 0,
    activeItems: 0,
    totalComponents: 0,
    activeComponents: 0,
    lowStockItems: 0,
  });

  // State per UI
  const [activeTab, setActiveTab] = useState<
    'items' | 'components' | 'inventory' | 'stats'
  >('items');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State per modali/form
  const [showItemModal, setShowItemModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingComponent, setEditingComponent] =
    useState<MenuComponent | null>(null);

  // State per form
  const [itemForm, setItemForm] = useState({
    nome: '',
    descrizione: '',
    prezzo: '',
    categoria_id: '',
    is_attivo: true,
    allergeni: [] as string[],
    componenti: [] as { component_id: string; quantita: number }[],
  });

  const [componentForm, setComponentForm] = useState({
    nome: '',
    descrizione: '',
    prezzo: '',
    categoria_id: '',
    unita_misura: 'pezzo' as const,
    giacenza: '',
    giacenza_minima: '',
    is_attivo: true,
    is_disponibile: true,
  });

  // Carica dati iniziali
  useEffect(() => {
    loadInitialData();
    setupRealtimeListeners();
  }, []);

  // Aggiorna statistiche quando cambiano i dati
  useEffect(() => {
    updateAdminStats();
  }, [menuItems, menuComponents]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica tutte le collezioni in parallelo
      const [
        categoriesSnapshot,
        componentsSnapshot,
        itemsSnapshot,
        statsSnapshot,
      ] = await Promise.all([
        getDocs(query(collection(db, 'categories'), orderBy('ordine', 'asc'))),
        getDocs(
          query(collection(db, 'menu_components'), orderBy('nome', 'asc'))
        ),
        getDocs(query(collection(db, 'menu_items'), orderBy('nome', 'asc'))),
        getDocs(collection(db, 'stats')),
      ]);

      setCategories(
        categoriesSnapshot.docs.map(
          doc => ({ ...doc.data(), id: doc.id }) as Category
        )
      );
      setMenuComponents(
        componentsSnapshot.docs.map(
          doc => ({ ...doc.data(), id: doc.id }) as MenuComponent
        )
      );
      setMenuItems(
        itemsSnapshot.docs.map(
          doc => ({ ...doc.data(), id: doc.id }) as MenuItem
        )
      );

      // Trova statistiche sistema
      const systemStatsDoc = statsSnapshot.docs.find(
        doc => doc.id === 'system'
      );
      if (systemStatsDoc) {
        setSystemStats({
          ...systemStatsDoc.data(),
          id: systemStatsDoc.id,
        } as SystemStats);
      }
    } catch (err) {
      console.error('Errore durante il caricamento dati:', err);
      setError('Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    // Listener per menu components
    const componentsQuery = query(
      collection(db, 'menu_components'),
      orderBy('nome', 'asc')
    );
    const unsubscribeComponents = onSnapshot(componentsQuery, snapshot => {
      const componentsData = snapshot.docs.map(
        doc => ({ ...doc.data(), id: doc.id }) as MenuComponent
      );
      setMenuComponents(componentsData);
    });

    // Listener per menu items
    const itemsQuery = query(
      collection(db, 'menu_items'),
      orderBy('nome', 'asc')
    );
    const unsubscribeItems = onSnapshot(itemsQuery, snapshot => {
      const itemsData = snapshot.docs.map(
        doc => ({ ...doc.data(), id: doc.id }) as MenuItem
      );
      setMenuItems(itemsData);
    });

    // Cleanup
    return () => {
      unsubscribeComponents();
      unsubscribeItems();
    };
  };

  const updateAdminStats = () => {
    const totalItems = menuItems.length;
    const activeItems = menuItems.filter(item => item.is_attivo).length;
    const totalComponents = menuComponents.length;
    const activeComponents = menuComponents.filter(
      comp => comp.is_attivo
    ).length;
    const lowStockItems = menuComponents.filter(
      comp => comp.giacenza <= comp.giacenza_minima && comp.is_attivo
    ).length;

    setAdminStats({
      totalItems,
      activeItems,
      totalComponents,
      activeComponents,
      lowStockItems,
    });
  };

  // CRUD Functions per Menu Items
  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        nome: item.nome,
        descrizione: item.descrizione || '',
        prezzo: (item.prezzo / 100).toString(),
        categoria_id: item.categoria_id,
        is_attivo: item.is_attivo,
        allergeni: item.allergeni || [],
        componenti: item.componenti || [],
      });
    } else {
      setEditingItem(null);
      setItemForm({
        nome: '',
        descrizione: '',
        prezzo: '',
        categoria_id: categories[0]?.id || '',
        is_attivo: true,
        allergeni: [],
        componenti: [],
      });
    }
    setShowItemModal(true);
  };

  const saveMenuItem = async () => {
    try {
      const itemData = {
        nome: itemForm.nome.trim(),
        descrizione: itemForm.descrizione.trim(),
        prezzo: Math.round(parseFloat(itemForm.prezzo) * 100),
        categoria_id: itemForm.categoria_id,
        is_attivo: itemForm.is_attivo,
        allergeni: itemForm.allergeni,
        componenti: itemForm.componenti,
        updated_at: Timestamp.now(),
      };

      if (editingItem) {
        // Update existing item
        await updateDoc(doc(db, 'menu_items', editingItem.id), itemData);
      } else {
        // Create new item
        await addDoc(collection(db, 'menu_items'), {
          ...itemData,
          created_at: Timestamp.now(),
        });
      }

      setShowItemModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Errore durante il salvataggio menu item:', err);
      setError('Errore durante il salvataggio');
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo menu item?')) {
      try {
        await deleteDoc(doc(db, 'menu_items', itemId));
      } catch (err) {
        console.error("Errore durante l'eliminazione menu item:", err);
        setError("Errore durante l'eliminazione");
      }
    }
  };

  const toggleItemStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'menu_items', itemId), {
        is_attivo: !currentStatus,
        updated_at: Timestamp.now(),
      });
    } catch (err) {
      console.error("Errore durante l'aggiornamento stato:", err);
      setError("Errore durante l'aggiornamento dello stato");
    }
  };

  // CRUD Functions per Menu Components
  const openComponentModal = (component?: MenuComponent) => {
    if (component) {
      setEditingComponent(component);
      setComponentForm({
        nome: component.nome,
        descrizione: component.descrizione || '',
        prezzo: (component.prezzo / 100).toString(),
        categoria_id: component.categoria_id,
        unita_misura: component.unita_misura,
        giacenza: component.giacenza.toString(),
        giacenza_minima: component.giacenza_minima.toString(),
        is_attivo: component.is_attivo,
        is_disponibile: component.is_disponibile,
      });
    } else {
      setEditingComponent(null);
      setComponentForm({
        nome: '',
        descrizione: '',
        prezzo: '',
        categoria_id: categories[0]?.id || '',
        unita_misura: 'pezzo',
        giacenza: '0',
        giacenza_minima: '5',
        is_attivo: true,
        is_disponibile: true,
      });
    }
    setShowComponentModal(true);
  };

  const saveMenuComponent = async () => {
    try {
      const componentData = {
        nome: componentForm.nome.trim(),
        descrizione: componentForm.descrizione.trim(),
        prezzo: Math.round(parseFloat(componentForm.prezzo) * 100),
        categoria_id: componentForm.categoria_id,
        unita_misura: componentForm.unita_misura,
        giacenza: parseInt(componentForm.giacenza),
        giacenza_minima: parseInt(componentForm.giacenza_minima),
        is_attivo: componentForm.is_attivo,
        is_disponibile: componentForm.is_disponibile,
        updated_at: Timestamp.now(),
      };

      if (editingComponent) {
        // Update existing component
        await updateDoc(
          doc(db, 'menu_components', editingComponent.id),
          componentData
        );
      } else {
        // Create new component
        await addDoc(collection(db, 'menu_components'), {
          ...componentData,
          created_at: Timestamp.now(),
        });
      }

      setShowComponentModal(false);
      setEditingComponent(null);
    } catch (err) {
      console.error('Errore durante il salvataggio componente:', err);
      setError('Errore durante il salvataggio');
    }
  };

  const deleteMenuComponent = async (componentId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo componente?')) {
      try {
        await deleteDoc(doc(db, 'menu_components', componentId));
      } catch (err) {
        console.error("Errore durante l'eliminazione componente:", err);
        setError("Errore durante l'eliminazione");
      }
    }
  };

  const toggleComponentStatus = async (
    componentId: string,
    currentStatus: boolean
  ) => {
    try {
      await updateDoc(doc(db, 'menu_components', componentId), {
        is_attivo: !currentStatus,
        updated_at: Timestamp.now(),
      });
    } catch (err) {
      console.error("Errore durante l'aggiornamento stato:", err);
      setError("Errore durante l'aggiornamento dello stato");
    }
  };

  const updateComponentStock = async (
    componentId: string,
    newStock: number
  ) => {
    try {
      await updateDoc(doc(db, 'menu_components', componentId), {
        giacenza: newStock,
        is_disponibile: newStock > 0,
        updated_at: Timestamp.now(),
      });
    } catch (err) {
      console.error("Errore durante l'aggiornamento giacenza:", err);
      setError("Errore durante l'aggiornamento della giacenza");
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Caricamento pannello admin...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error-container">
          <h2>❌ Errore</h2>
          <p>{error}</p>
          <button onClick={loadInitialData} className="retry-button">
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <h1>🛠️ Pannello Admin</h1>
        <p>Gestione catalogo e configurazioni</p>
      </div>

      {/* Statistiche rapide */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-content">
            <div className="stat-number">
              {adminStats.activeItems}/{adminStats.totalItems}
            </div>
            <div className="stat-label">Menu Items Attivi</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🥘</div>
          <div className="stat-content">
            <div className="stat-number">
              {adminStats.activeComponents}/{adminStats.totalComponents}
            </div>
            <div className="stat-label">Componenti Attivi</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-number">{adminStats.lowStockItems}</div>
            <div className="stat-label">Scorte Basse</div>
          </div>
        </div>
        {systemStats && (
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">
                {systemStats.totale_ordini_oggi}
              </div>
              <div className="stat-label">Ordini Oggi</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          🍽️ Menu Items
        </button>
        <button
          className={`tab-button ${activeTab === 'components' ? 'active' : ''}`}
          onClick={() => setActiveTab('components')}
        >
          🥘 Componenti
        </button>
        <button
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Giacenze
        </button>
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistiche
        </button>
      </div>

      {/* Contenuto tab */}
      <div className="admin-content">
        {activeTab === 'items' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Gestione Menu Items</h2>
              <button className="add-button" onClick={() => openItemModal()}>
                ➕ Nuovo Item
              </button>
            </div>
            <div className="items-grid">
              {menuItems.map(item => (
                <div
                  key={item.id}
                  className={`item-card ${!item.is_attivo ? 'inactive' : ''}`}
                >
                  <div className="item-header">
                    <h3>{item.nome}</h3>
                    <div className="item-actions">
                      <button
                        className="edit-button"
                        onClick={() => openItemModal(item)}
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        className={`toggle-button ${item.is_attivo ? 'active' : 'inactive'}`}
                        onClick={() =>
                          toggleItemStatus(item.id, item.is_attivo)
                        }
                        title={item.is_attivo ? 'Disattiva' : 'Attiva'}
                      >
                        {item.is_attivo ? '👁️' : '🚫'}
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => deleteMenuItem(item.id)}
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="item-details">
                    <p>
                      <strong>Prezzo:</strong> €{(item.prezzo / 100).toFixed(2)}
                    </p>
                    <p>
                      <strong>Categoria:</strong>{' '}
                      {categories.find(c => c.id === item.categoria_id)?.nome ||
                        'N/A'}
                    </p>
                    <p>
                      <strong>Stato:</strong>
                      <span
                        className={`status ${item.is_attivo ? 'active' : 'inactive'}`}
                      >
                        {item.is_attivo ? 'Attivo' : 'Disattivato'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Gestione Componenti</h2>
              <button
                className="add-button"
                onClick={() => openComponentModal()}
              >
                ➕ Nuovo Componente
              </button>
            </div>
            <div className="components-grid">
              {menuComponents.map(component => (
                <div
                  key={component.id}
                  className={`component-card ${!component.is_attivo ? 'inactive' : ''}`}
                >
                  <div className="component-header">
                    <h3>{component.nome}</h3>
                    <div className="component-actions">
                      <button
                        className="edit-button"
                        onClick={() => openComponentModal(component)}
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        className={`toggle-button ${component.is_attivo ? 'active' : 'inactive'}`}
                        onClick={() =>
                          toggleComponentStatus(
                            component.id,
                            component.is_attivo
                          )
                        }
                        title={component.is_attivo ? 'Disattiva' : 'Attiva'}
                      >
                        {component.is_attivo ? '👁️' : '🚫'}
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => deleteMenuComponent(component.id)}
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="component-details">
                    <p>
                      <strong>Prezzo:</strong> €
                      {(component.prezzo / 100).toFixed(2)}
                    </p>
                    <p>
                      <strong>Categoria:</strong>{' '}
                      {categories.find(c => c.id === component.categoria_id)
                        ?.nome || 'N/A'}
                    </p>
                    <div className="inventory-info">
                      <p>
                        <strong>Giacenza:</strong>
                        <span
                          className={`stock ${component.giacenza <= component.giacenza_minima ? 'low' : 'ok'}`}
                        >
                          {component.giacenza} {component.unita_misura}
                        </span>
                      </p>
                      <p>
                        <strong>Minimo:</strong> {component.giacenza_minima}{' '}
                        {component.unita_misura}
                      </p>
                    </div>
                    <p>
                      <strong>Stato:</strong>
                      <span
                        className={`status ${component.is_attivo ? 'active' : 'inactive'}`}
                      >
                        {component.is_attivo ? 'Attivo' : 'Disattivato'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Gestione Giacenze</h2>
              <button className="bulk-update-button">
                📦 Aggiornamento Massivo
              </button>
            </div>
            <div className="inventory-table">
              <div className="table-header">
                <div>Componente</div>
                <div>Giacenza Attuale</div>
                <div>Giacenza Minima</div>
                <div>Stato</div>
                <div>Azioni</div>
              </div>
              {menuComponents.map(component => (
                <div key={component.id} className="table-row">
                  <div className="component-name">{component.nome}</div>
                  <div
                    className={`current-stock ${component.giacenza <= component.giacenza_minima ? 'low' : ''}`}
                  >
                    {component.giacenza} {component.unita_misura}
                  </div>
                  <div className="min-stock">
                    {component.giacenza_minima} {component.unita_misura}
                  </div>
                  <div className="stock-status">
                    {component.giacenza <= component.giacenza_minima ? (
                      <span className="status-low">⚠️ Scorte Basse</span>
                    ) : (
                      <span className="status-ok">✅ OK</span>
                    )}
                  </div>
                  <div className="table-actions">
                    <button className="stock-button">📦 Gestisci</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Statistiche Sistema</h2>
            </div>
            {systemStats ? (
              <div className="stats-grid">
                <div className="stats-card">
                  <h3>📊 Ordini</h3>
                  <div className="stats-details">
                    <p>
                      <strong>Totali:</strong> {systemStats.totale_ordini}
                    </p>
                    <p>
                      <strong>Oggi:</strong> {systemStats.totale_ordini_oggi}
                    </p>
                    <p>
                      <strong>Completati Oggi:</strong>{' '}
                      {systemStats.totale_ordini_completati_oggi}
                    </p>
                    <p>
                      <strong>Cancellati Oggi:</strong>{' '}
                      {systemStats.totale_ordini_cancellati_oggi}
                    </p>
                  </div>
                </div>
                <div className="stats-card">
                  <h3>💰 Fatturato</h3>
                  <div className="stats-details">
                    <p>
                      <strong>Oggi:</strong> €
                      {(systemStats.fatturato_oggi / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="stats-card">
                  <h3>🔢 Progressivi</h3>
                  <div className="stats-details">
                    <p>
                      <strong>Ultimo Creato:</strong> #
                      {systemStats.ultimo_progressivo_creato}
                    </p>
                    <p>
                      <strong>Ultimo Pronto:</strong> #
                      {systemStats.ultimo_progressivo_pronto}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p>Nessuna statistica disponibile</p>
            )}
          </div>
        )}
      </div>

      {/* Modal Menu Item */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Modifica' : 'Nuovo'} Menu Item</h3>
              <button
                className="close-button"
                onClick={() => setShowItemModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={e => {
                e.preventDefault();
                saveMenuItem();
              }}
            >
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={itemForm.nome}
                  onChange={e =>
                    setItemForm({ ...itemForm, nome: e.target.value })
                  }
                  required
                  placeholder="Nome del menu item"
                />
              </div>

              <div className="form-group">
                <label>Descrizione</label>
                <textarea
                  value={itemForm.descrizione}
                  onChange={e =>
                    setItemForm({ ...itemForm, descrizione: e.target.value })
                  }
                  placeholder="Descrizione del piatto"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prezzo (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.prezzo}
                    onChange={e =>
                      setItemForm({ ...itemForm, prezzo: e.target.value })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Categoria *</label>
                  <select
                    value={itemForm.categoria_id}
                    onChange={e =>
                      setItemForm({ ...itemForm, categoria_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={itemForm.is_attivo}
                    onChange={e =>
                      setItemForm({ ...itemForm, is_attivo: e.target.checked })
                    }
                  />
                  <span>Attivo nel menu</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowItemModal(false)}
                >
                  Annulla
                </button>
                <button type="submit" className="save-button">
                  {editingItem ? 'Aggiorna' : 'Crea'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Menu Component */}
      {showComponentModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowComponentModal(false)}
        >
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingComponent ? 'Modifica' : 'Nuovo'} Componente</h3>
              <button
                className="close-button"
                onClick={() => setShowComponentModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              className="modal-form"
              onSubmit={e => {
                e.preventDefault();
                saveMenuComponent();
              }}
            >
              <div className="form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={componentForm.nome}
                  onChange={e =>
                    setComponentForm({ ...componentForm, nome: e.target.value })
                  }
                  required
                  placeholder="Nome del componente"
                />
              </div>

              <div className="form-group">
                <label>Descrizione</label>
                <textarea
                  value={componentForm.descrizione}
                  onChange={e =>
                    setComponentForm({
                      ...componentForm,
                      descrizione: e.target.value,
                    })
                  }
                  placeholder="Descrizione del componente"
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prezzo (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={componentForm.prezzo}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        prezzo: e.target.value,
                      })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Categoria *</label>
                  <select
                    value={componentForm.categoria_id}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        categoria_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unità di Misura *</label>
                  <select
                    value={componentForm.unita_misura}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        unita_misura: e.target.value as any,
                      })
                    }
                    required
                  >
                    <option value="pezzo">Pezzo</option>
                    <option value="kg">Chilogrammo</option>
                    <option value="litro">Litro</option>
                    <option value="bottiglia">Bottiglia</option>
                    <option value="lattina">Lattina</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Giacenza Attuale *</label>
                  <input
                    type="number"
                    min="0"
                    value={componentForm.giacenza}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        giacenza: e.target.value,
                      })
                    }
                    required
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Giacenza Minima *</label>
                  <input
                    type="number"
                    min="0"
                    value={componentForm.giacenza_minima}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        giacenza_minima: e.target.value,
                      })
                    }
                    required
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={componentForm.is_attivo}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        is_attivo: e.target.checked,
                      })
                    }
                  />
                  <span>Attivo nel catalogo</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={componentForm.is_disponibile}
                    onChange={e =>
                      setComponentForm({
                        ...componentForm,
                        is_disponibile: e.target.checked,
                      })
                    }
                  />
                  <span>Disponibile per la vendita</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowComponentModal(false)}
                >
                  Annulla
                </button>
                <button type="submit" className="save-button">
                  {editingComponent ? 'Aggiorna' : 'Crea'} Componente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
