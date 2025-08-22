import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import {
  collection,
  query,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import {
  Category,
  MenuItem,
  MenuComponent,
  Order,
  OrderLine,
} from '../types/dataModel';
import { offlineQueueManager } from '../utils/offlineQueue';
import './Cassa.css';

// ============================================================================
// INTERFACCE LOCALI
// ============================================================================

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
  isStaff: boolean;
  isPriority: boolean;
}

interface CartState {
  items: CartItem[];
  total: number;
  received: number;
  change: number;
}

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

const Cassa: React.FC = () => {
  const { user } = useAuth();

  // ============================================================================
  // STATI LOCALI
  // ============================================================================

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuComponents, setMenuComponents] = useState<MenuComponent[]>([]);
  const [cart, setCart] = useState<CartState>({
    items: [],
    total: 0,
    received: 0,
    change: 0,
  });
  const [currentOrderNumber, setCurrentOrderNumber] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueStatus, setOfflineQueueStatus] = useState<{
    pendingOrders: number;
    failedOrders: number;
    lastSync: number;
  }>({ pendingOrders: 0, failedOrders: 0, lastSync: Date.now() });

  // ============================================================================
  // EFFETTI INIZIALI
  // ============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    calculateCartTotal();
  }, [cart.items]);

  useEffect(() => {
    calculateChange();
  }, [cart.total, cart.received]);

  useEffect(() => {
    // Monitora stato connessione
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Aggiorna stato coda offline periodicamente
    const updateQueueStatus = async () => {
      try {
        const status = await offlineQueueManager.getQueueStatus();
        setOfflineQueueStatus({
          pendingOrders: status.pendingOrders,
          failedOrders: status.failedOrders,
          lastSync: status.lastSync,
        });
      } catch (error) {
        console.warn('Impossibile aggiornare stato coda offline:', error);
      }
    };

    const interval = setInterval(updateQueueStatus, 5000);
    updateQueueStatus(); // Prima chiamata immediata

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // ============================================================================
  // FUNZIONI DI CARICAMENTO DATI
  // ============================================================================

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Carica categorie
      const categoriesQuery = query(collection(db, 'categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Category[];
      setCategories(categoriesData.sort((a, b) => a.ordine - b.ordine));

      // Carica menu items
      const menuItemsQuery = query(collection(db, 'menu_items'));
      const menuItemsSnapshot = await getDocs(menuItemsQuery);
      const menuItemsData = menuItemsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as MenuItem[];
      setMenuItems(menuItemsData);

      // Carica componenti menu
      const componentsQuery = query(collection(db, 'menu_components'));
      const componentsSnapshot = await getDocs(componentsQuery);
      const componentsData = componentsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as MenuComponent[];
      setMenuComponents(componentsData);

      // Carica progressivo corrente
      await loadCurrentOrderNumber();
    } catch (error) {
      console.error('Errore durante il caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentOrderNumber = async () => {
    try {
      const statsDoc = await getDoc(doc(db, 'stats', 'system'));
      if (statsDoc.exists()) {
        const data = statsDoc.data();
        setCurrentOrderNumber(data.ultimo_progressivo_creato || 0);
      }
    } catch (error) {
      console.error('Errore nel caricamento progressivo:', error);
    }
  };

  // ============================================================================
  // FUNZIONI DEL CARRELLO
  // ============================================================================

  const addToCart = (menuItem: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.items.find(
        item =>
          item.menuItem.id === menuItem.id && !item.isStaff && !item.isPriority
      );

      if (existingItem) {
        // Incrementa quantità
        const updatedItems = prevCart.items.map(item =>
          item === existingItem
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        return { ...prevCart, items: updatedItems };
      } else {
        // Aggiunge nuovo item
        const newItem: CartItem = {
          menuItem,
          quantity: 1,
          notes: '',
          isStaff: false,
          isPriority: false,
        };
        return { ...prevCart, items: [...prevCart.items, newItem] };
      }
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter((_, i) => i !== index),
    }));
  };

  const updateCartItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item, i) =>
        i === index ? { ...item, quantity } : item
      ),
    }));
  };

  const updateCartItemNotes = (index: number, notes: string) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item, i) =>
        i === index ? { ...item, notes } : item
      ),
    }));
  };

  const toggleCartItemFlag = (index: number, flag: 'staff' | 'priority') => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [flag === 'staff' ? 'isStaff' : 'isPriority']:
                !item[flag === 'staff' ? 'isStaff' : 'isPriority'],
            }
          : item
      ),
    }));
  };

  const clearCart = () => {
    setCart({
      items: [],
      total: 0,
      received: 0,
      change: 0,
    });
  };

  const calculateCartTotal = () => {
    const total = cart.items.reduce((sum, item) => {
      const itemTotal = item.isStaff ? 0 : item.menuItem.prezzo * item.quantity;
      return sum + itemTotal;
    }, 0);

    setCart(prevCart => ({ ...prevCart, total }));
  };

  const calculateChange = () => {
    const change = Math.max(0, cart.received - cart.total);
    setCart(prevCart => ({ ...prevCart, change }));
  };

  // ============================================================================
  // FUNZIONI DI FILTRAGGIO E RICERCA
  // ============================================================================

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch =
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descrizione?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.categoria_id === selectedCategory;
    return matchesSearch && matchesCategory && item.is_attivo;
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.nome || 'Sconosciuta';
  };

  const getItemAvailability = (menuItem: MenuItem) => {
    // Verifica disponibilità basandosi sui componenti
    const unavailableComponents = menuItem.componenti.filter(comp => {
      const component = menuComponents.find(c => c.id === comp.component_id);
      return component && !component.is_disponibile;
    });

    if (unavailableComponents.length > 0) {
      return { available: false, reason: 'Componenti non disponibili' };
    }

    return { available: true, reason: '' };
  };

  // ============================================================================
  // FUNZIONI DI GESTIONE ORDINI
  // ============================================================================

  const processOrder = async () => {
    if (cart.items.length === 0) return;

    try {
      setIsProcessingOrder(true);

      // Verifica stock e calcola differenze
      const stockCheck = await verifyStock();
      if (!stockCheck.success) {
        alert(`❌ Stock insufficiente: ${stockCheck.message}`);
        return;
      }

      // Prepara dati ordine per il sistema offline
      const orderData: Omit<Order, 'id' | 'progressivo'> = {
        cliente: 'Cliente generico',
        totale: cart.total,
        stato: 'in_attesa',
        is_prioritario: cart.items.some(item => item.isPriority),
        note: cart.items
          .map(
            item =>
              `${item.menuItem.nome} x${item.quantity}${item.notes ? ` - ${item.notes}` : ''}`
          )
          .join('; '),
        created_at: new Date(),
        updated_at: new Date(),
        created_by: user?.id || '',
        created_by_name: user?.nome || '',
        can_modify: true,
        stock_verified: true,
        uuid: crypto.randomUUID(),
        sync_status: 'pending',
        offline_created: !navigator.onLine,
      };

      // Prepara righe ordine per il sistema offline
      const orderLinesData: Omit<OrderLine, 'id' | 'order_id'>[] =
        cart.items.map((item, index) => ({
          menu_item_id: item.menuItem.id,
          menu_item_name: item.menuItem.nome,
          quantita: item.quantity,
          prezzo_unitario: item.isStaff ? 0 : item.menuItem.prezzo,
          prezzo_totale: item.isStaff
            ? 0
            : item.menuItem.prezzo * item.quantity,
          note: item.notes,
          is_staff: item.isStaff,
          is_priority: item.isPriority,
          stato: 'in_attesa',
          nome_snapshot: item.menuItem.nome,
          categoria_snapshot:
            categories.find(c => c.id === item.menuItem.categoria_id)?.nome ||
            '',
          allergeni_snapshot: item.menuItem.allergeni,
          created_at: new Date(),
          updated_at: new Date(),
          uuid: crypto.randomUUID(),
          sync_status: 'pending',
        }));

      // Utilizza il sistema di transazioni batch offline
      const result = await offlineQueueManager.createOrderWithBatch(
        orderData,
        orderLinesData,
        menuComponents
      );

      if (result.success) {
        // Ordine creato con successo
        setCurrentOrderNumber(prev => prev + 1);

        // Genera e scarica JSON solo se online
        if (navigator.onLine) {
          const tempOrder: Order = {
            ...orderData,
            id: result.orderId || 'temp',
            progressivo: currentOrderNumber + 1,
          } as Order;

          const tempOrderLines: OrderLine[] = orderLinesData.map(
            (line, index) => ({
              ...line,
              id: `temp_${index}`,
              order_id: result.orderId || 'temp',
            })
          ) as OrderLine;

          await downloadOrderJSON(tempOrder, tempOrderLines);
        }

        // Reset carrello
        clearCart();
        setShowPaymentModal(false);

        if (navigator.onLine) {
          alert(`✅ Ordine #${currentOrderNumber + 1} creato con successo!`);
        } else {
          alert(
            `✅ Ordine #${currentOrderNumber + 1} aggiunto alla coda offline!`
          );
        }
      } else {
        // Errore nella creazione
        alert(`❌ Errore durante la creazione ordine: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore durante la creazione ordine:', error);
      alert('❌ Errore durante la creazione ordine. Controlla la console.');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const verifyStock = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      for (const cartItem of cart.items) {
        for (const component of cartItem.menuItem.componenti) {
          const componentDoc = await getDoc(
            doc(db, 'menu_components', component.component_id)
          );
          if (componentDoc.exists()) {
            const componentData = componentDoc.data() as MenuComponent;
            const requiredQuantity = component.quantita * cartItem.quantity;

            if (componentData.giacenza < requiredQuantity) {
              return {
                success: false,
                message: `${componentData.nome} insufficiente (richiesto: ${requiredQuantity}, disponibile: ${componentData.giacenza})`,
              };
            }
          }
        }
      }
      return { success: true, message: '' };
    } catch (error) {
      console.error('Errore verifica stock:', error);
      return { success: false, message: 'Errore durante verifica stock' };
    }
  };

  const updateStockLevels = async (batch: any) => {
    try {
      for (const cartItem of cart.items) {
        for (const component of cartItem.menuItem.componenti) {
          const componentRef = doc(
            db,
            'menu_components',
            component.component_id
          );
          const requiredQuantity = component.quantita * cartItem.quantity;

          batch.update(componentRef, {
            giacenza: increment(-requiredQuantity),
            is_disponibile: increment(-requiredQuantity) > 0,
            updated_at: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Errore aggiornamento stock:', error);
      throw error;
    }
  };

  const downloadOrderJSON = async (order: Order, orderLines: OrderLine[]) => {
    try {
      const orderData = {
        order,
        orderLines,
        timestamp: new Date().toISOString(),
        total: cart.total,
        received: cart.received,
        change: cart.change,
      };

      const jsonString = JSON.stringify(orderData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ordine_${order.progressivo}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore download JSON:', error);
    }
  };

  // ============================================================================
  // RENDERIZZAZIONE
  // ============================================================================

  if (loading) {
    return (
      <div className="cassa-loading">
        <div className="loading-spinner">⏳</div>
        <p>Caricamento vista cassa...</p>
      </div>
    );
  }

  return (
    <div className="cassa-page">
      {/* Header */}
      <div className="cassa-header">
        <h1>💳 Vista Cassa</h1>
        <div className="order-info">
          <span className="order-number">Ordine #{currentOrderNumber + 1}</span>
          <span className="order-total">
            Totale: €{(cart.total / 100).toFixed(2)}
          </span>
        </div>
        <div className="connection-status">
          <div
            className={`status-indicator ${isOnline ? 'online' : 'offline'}`}
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          {offlineQueueStatus.pendingOrders > 0 && (
            <div className="queue-status">
              📋 Coda: {offlineQueueStatus.pendingOrders} ordini
            </div>
          )}
          {offlineQueueStatus.failedOrders > 0 && (
            <div className="queue-status error">
              ❌ Falliti: {offlineQueueStatus.failedOrders} ordini
            </div>
          )}
        </div>
      </div>

      <div className="cassa-content">
        <div className="cassa-main">
          {/* Barra di Ricerca e Filtri */}
          <div className="search-filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Cerca piatti, bevande..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="category-filters">
              <button
                className={`category-filter ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                🍽️ Tutto
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`category-filter ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.icona} {category.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Catalogo Menu */}
          <div className="menu-catalog">
            <h2>📋 Catalogo Menu</h2>
            <div className="menu-grid">
              {filteredMenuItems.map(item => {
                const availability = getItemAvailability(item);
                const categoryName = getCategoryName(item.categoria_id);

                return (
                  <div
                    key={item.id}
                    className={`menu-item-card ${!availability.available ? 'unavailable' : ''}`}
                    onClick={() => availability.available && addToCart(item)}
                  >
                    <div className="item-header">
                      <h3 className="item-name">{item.nome}</h3>
                      <span className="item-price">
                        €{(item.prezzo / 100).toFixed(2)}
                      </span>
                    </div>

                    <p className="item-description">{item.descrizione}</p>

                    <div className="item-meta">
                      <span className="item-category">{categoryName}</span>
                      <span className="item-time">
                        ⏱️ {item.tempo_preparazione}min
                      </span>
                    </div>

                    <div className="item-flags">
                      {item.is_vegetariano && (
                        <span className="flag veg">🌱 Veg</span>
                      )}
                      {item.is_vegano && (
                        <span className="flag vegan">🌿 Vegan</span>
                      )}
                    </div>

                    {!availability.available && (
                      <div className="unavailable-badge">
                        ❌ {availability.reason}
                      </div>
                    )}

                    {availability.available && (
                      <button className="add-to-cart-btn">➕ Aggiungi</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Carrello */}
        <div className="cassa-sidebar">
          <div className="cart-section">
            <h2>🛒 Carrello</h2>

            {cart.items.length === 0 ? (
              <div className="empty-cart">
                <p>🛒 Carrello vuoto</p>
                <small>Aggiungi piatti dal catalogo</small>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map((item, index) => (
                    <div key={index} className="cart-item">
                      <div className="cart-item-header">
                        <h4>{item.menuItem.nome}</h4>
                        <div className="cart-item-flags">
                          {item.isStaff && (
                            <span className="flag staff">👥 Staff</span>
                          )}
                          {item.isPriority && (
                            <span className="flag priority">⚡ Priorità</span>
                          )}
                        </div>
                      </div>

                      <div className="cart-item-controls">
                        <div className="quantity-controls">
                          <button
                            onClick={() =>
                              updateCartItemQuantity(index, item.quantity - 1)
                            }
                            className="quantity-btn"
                          >
                            ➖
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateCartItemQuantity(index, item.quantity + 1)
                            }
                            className="quantity-btn"
                          >
                            ➕
                          </button>
                        </div>

                        <span className="item-total">
                          €
                          {(
                            (item.isStaff
                              ? 0
                              : item.menuItem.prezzo * item.quantity) / 100
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="cart-item-notes">
                        <input
                          type="text"
                          placeholder="📝 Note..."
                          value={item.notes}
                          onChange={e =>
                            updateCartItemNotes(index, e.target.value)
                          }
                          className="notes-input"
                        />
                      </div>

                      <div className="cart-item-actions">
                        <button
                          onClick={() => toggleCartItemFlag(index, 'staff')}
                          className={`flag-btn ${item.isStaff ? 'active' : ''}`}
                        >
                          👥 Staff
                        </button>
                        <button
                          onClick={() => toggleCartItemFlag(index, 'priority')}
                          className={`flag-btn ${item.isPriority ? 'active' : ''}`}
                        >
                          ⚡ Priorità
                        </button>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="remove-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="cart-total">
                    <span>Totale:</span>
                    <span className="total-amount">
                      €{(cart.total / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="cart-actions">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="checkout-btn"
                      disabled={cart.items.length === 0}
                    >
                      💳 Procedi al Pagamento
                    </button>

                    <button
                      onClick={clearCart}
                      className="clear-cart-btn"
                      disabled={cart.items.length === 0}
                    >
                      🗑️ Svuota Carrello
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modale Pagamento */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <div className="modal-header">
              <h2>💳 Conferma Ordine</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="order-summary">
                <h3>📋 Riepilogo Ordine</h3>
                <div className="order-items">
                  {cart.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span>
                        {item.menuItem.nome} x{item.quantity}
                      </span>
                      <span>
                        €
                        {(
                          (item.isStaff
                            ? 0
                            : item.menuItem.prezzo * item.quantity) / 100
                        ).toFixed(2)}
                      </span>
                      {item.isStaff && (
                        <span className="staff-badge">👥 Staff</span>
                      )}
                      {item.isPriority && (
                        <span className="priority-badge">⚡ Priorità</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  <strong>Totale: €{(cart.total / 100).toFixed(2)}</strong>
                </div>
              </div>

              <div className="payment-inputs">
                <div className="input-group">
                  <label>💰 Ricevuto:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={(cart.received / 100).toFixed(2)}
                    onChange={e =>
                      setCart(prev => ({
                        ...prev,
                        received:
                          Math.round(parseFloat(e.target.value) * 100) || 0,
                      }))
                    }
                    className="payment-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="change-display">
                  <span>🔄 Resto:</span>
                  <span className="change-amount">
                    €{(cart.change / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="cancel-btn"
                disabled={isProcessingOrder}
              >
                ❌ Annulla
              </button>

              <button
                onClick={processOrder}
                className="confirm-btn"
                disabled={cart.received < cart.total || isProcessingOrder}
              >
                {isProcessingOrder
                  ? '⏳ Elaborazione...'
                  : '✅ Conferma Ordine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cassa;
