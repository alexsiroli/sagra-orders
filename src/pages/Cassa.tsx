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
import {
  validateQuantity,
  validateCartStock,
  validateNote,
  calculateOrderTotal,
  calculateChange,
  validateCompleteOrder,
  formatPrice,
} from '../utils/validations';
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
    calculateChangeAmount();
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
    // Calcola quantità attuale nel carrello per questo item
    const existingItem = cart.items.find(
      item =>
        item.menuItem.id === menuItem.id && !item.isStaff && !item.isPriority
    );
    const currentQuantity = existingItem?.quantity || 0;

    // Valida se è possibile aggiungere una unità
    const validation = validateQuantity(
      1,
      menuItem,
      menuComponents,
      currentQuantity
    );

    if (!validation.isValid) {
      alert(`❌ Impossibile aggiungere: ${validation.errors.join(', ')}`);
      return;
    }

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
    const cartItems = cart.items.map(item => ({
      menuItem: item.menuItem,
      quantity: item.quantity,
      notes: item.notes,
      isStaff: item.isStaff,
      isPriority: item.isPriority,
    }));

    const calculation = calculateOrderTotal(cartItems);
    setCart(prevCart => ({ ...prevCart, total: calculation.total }));
  };

  const calculateChangeAmount = () => {
    const changeResult = calculateChange(cart.total, cart.received);
    setCart(prevCart => ({
      ...prevCart,
      change: changeResult.isValid ? changeResult.change : 0,
    }));
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

      // Validazione completa ordine
      const orderValidation = validateCompleteOrder(
        {
          cliente: 'Cliente generico',
          note: cart.items
            .map(
              item =>
                `${item.menuItem.nome} x${item.quantity}${item.notes ? ` - ${item.notes}` : ''}`
            )
            .join('; '),
          cartItems: cart.items.map(item => ({
            menuItem: item.menuItem,
            quantity: item.quantity,
            notes: item.notes,
            isStaff: item.isStaff,
            isPriority: item.isPriority,
          })),
        },
        menuComponents
      );

      if (!orderValidation.isValid) {
        alert(`❌ Validazione fallita: ${orderValidation.errors.join(', ')}`);
        return;
      }

      // Mostra warnings se presenti
      if (orderValidation.warnings.length > 0) {
        const proceed = confirm(
          `⚠️ Attenzione: ${orderValidation.warnings.join(', ')}\nProcedere comunque?`
        );
        if (!proceed) return;
      }

      // Verifica stock aggiornato (backup check)
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
    <div className="cassa-page" role="main">
      {/* Skip Link */}
      <a href="#main-content" className="skip-link">
        Salta al contenuto principale
      </a>
      
      {/* Header */}
      <header className="cassa-header">
        <h1>💳 Vista Cassa</h1>
        <div className="order-info" role="region" aria-label="Informazioni ordine corrente">
          <span className="order-number" aria-label={`Numero ordine corrente: ${currentOrderNumber + 1}`}>
            Ordine #{currentOrderNumber + 1}
          </span>
          <span className="order-total" aria-label={`Totale ordine: ${formatPrice(cart.total)}`}>
            Totale: €{(cart.total / 100).toFixed(2)}
          </span>
        </div>
        <div className="connection-status" role="region" aria-label="Stato connessione">
          <div 
            className={`status-badge ${isOnline ? 'online' : 'offline'}`}
            aria-label={`Stato connessione: ${isOnline ? 'Online' : 'Offline'}`}
          >
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          {offlineQueueStatus.pendingOrders > 0 && (
            <div 
              className="status-badge pending"
              aria-label={`Ordini in coda: ${offlineQueueStatus.pendingOrders}`}
            >
              📋 Coda: {offlineQueueStatus.pendingOrders} ordini
            </div>
          )}
          {offlineQueueStatus.failedOrders > 0 && (
            <div 
              className="status-badge error"
              aria-label={`Ordini falliti: ${offlineQueueStatus.failedOrders}`}
            >
              ❌ Falliti: {offlineQueueStatus.failedOrders} ordini
            </div>
          )}
        </div>
      </header>

      <div className="cassa-content" id="main-content">
        <main className="cassa-main">
          {/* Barra di Ricerca e Filtri */}
          <section className="search-filters" role="search" aria-label="Ricerca e filtri menu">
            <div className="search-box">
              <label htmlFor="search-input" className="sr-only">
                Cerca piatti e bevande
              </label>
              <input
                id="search-input"
                type="text"
                placeholder="🔍 Cerca piatti, bevande..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
                aria-describedby="search-hint"
              />
              <div id="search-hint" className="sr-only">
                Digita per cercare tra piatti e bevande disponibili
              </div>
            </div>

            <div className="category-filters" role="tablist" aria-label="Filtri per categoria">
              <button
                role="tab"
                aria-selected={selectedCategory === 'all'}
                aria-controls="menu-catalog"
                className={`category-filter btn-large ${selectedCategory === 'all' ? 'active btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory('all')}
              >
                🍽️ Tutto
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  role="tab"
                  aria-selected={selectedCategory === category.id}
                  aria-controls="menu-catalog"
                  className={`category-filter btn-large ${selectedCategory === category.id ? 'active btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.icona} {category.nome}
                </button>
              ))}
            </div>
          </section>

          {/* Catalogo Menu */}
          <section className="menu-catalog" aria-label="Catalogo menu">
            <h2>📋 Catalogo Menu</h2>
            <div 
              id="menu-catalog" 
              className="menu-grid" 
              role="tabpanel"
              aria-label={`Menu categoria: ${selectedCategory === 'all' ? 'Tutte' : categories.find(c => c.id === selectedCategory)?.nome || 'Sconosciuta'}`}
            >
              {filteredMenuItems.map(item => {
                const availability = getItemAvailability(item);
                const categoryName = getCategoryName(item.categoria_id);
                const isUnlimited = item.componenti.some(comp => 
                  menuComponents.find(mc => mc.id === comp.component_id)?.is_illimitato
                );
                const isSoldOut = !availability.available;

                // Determina le classi CSS per gli stati visivi
                const cardClasses = [
                  'menu-item-card',
                  isSoldOut && 'item-sold-out',
                  isUnlimited && 'item-unlimited',
                ].filter(Boolean).join(' ');

                return (
                  <article
                    key={item.id}
                    className={cardClasses}
                    role="button"
                    tabIndex={availability.available ? 0 : -1}
                    aria-label={`${item.nome}, ${formatPrice(item.prezzo)}, ${availability.available ? 'Disponibile' : 'Non disponibile'}`}
                    aria-describedby={`item-desc-${item.id}`}
                    onClick={() => availability.available && addToCart(item)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && availability.available) {
                        e.preventDefault();
                        addToCart(item);
                      }
                    }}
                  >
                    {/* Badge stati speciali */}
                    {isUnlimited && (
                      <div className="unlimited-badge" aria-label="Componenti illimitati">
                        ∞ Illimitato
                      </div>
                    )}

                    <div className="item-header">
                      <h3 className="item-name">{item.nome}</h3>
                      <span className="item-price" aria-label={`Prezzo: ${formatPrice(item.prezzo)}`}>
                        €{(item.prezzo / 100).toFixed(2)}
                      </span>
                    </div>

                    <p id={`item-desc-${item.id}`} className="item-description">
                      {item.descrizione}
                    </p>

                    <div className="item-meta">
                      <span className="item-category" aria-label={`Categoria: ${categoryName}`}>
                        {categoryName}
                      </span>
                      <span className="item-time" aria-label={`Tempo di preparazione: ${item.tempo_preparazione} minuti`}>
                        ⏱️ {item.tempo_preparazione}min
                      </span>
                    </div>

                    <div className="item-flags" role="list" aria-label="Caratteristiche dietetiche">
                      {item.is_vegetariano && (
                        <span className="flag veg" role="listitem" aria-label="Vegetariano">
                          🌱 Veg
                        </span>
                      )}
                      {item.is_vegano && (
                        <span className="flag vegan" role="listitem" aria-label="Vegano">
                          🌿 Vegan
                        </span>
                      )}
                    </div>

                    {!availability.available && (
                      <div className="unavailable-badge" aria-label={`Non disponibile: ${availability.reason}`}>
                        ❌ {availability.reason}
                      </div>
                    )}

                    {availability.available && (
                      <button 
                        className="add-to-cart-btn btn-large btn-success"
                        aria-label={`Aggiungi ${item.nome} al carrello`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                      >
                        ➕ Aggiungi
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            
            {filteredMenuItems.length === 0 && (
              <div className="no-items" role="status" aria-live="polite">
                <p>Nessun articolo trovato per la ricerca o categoria selezionata.</p>
              </div>
            )}
          </section>
        </main>

        {/* Sidebar Carrello */}
        <aside className="cassa-sidebar" role="complementary" aria-label="Carrello della spesa">
          <section className="cart-section">
            <h2>🛒 Carrello ({cart.items.length})</h2>

            {cart.items.length === 0 ? (
              <div className="empty-cart" role="status">
                <p>🛒 Carrello vuoto</p>
                <small>Aggiungi piatti dal catalogo</small>
              </div>
            ) : (
              <>
                <div className="cart-items" role="list" aria-label="Articoli nel carrello">
                  {cart.items.map((item, index) => {
                    // Determina le classi CSS per gli stati visivi
                    const itemClasses = [
                      'cart-item',
                      item.isStaff && 'item-staff',
                      item.isPriority && 'item-priority',
                    ].filter(Boolean).join(' ');

                    const itemPrice = item.isStaff ? 0 : item.menuItem.prezzo;
                    const lineTotal = itemPrice * item.quantity;

                    return (
                      <article 
                        key={index} 
                        className={itemClasses}
                        role="listitem"
                        aria-label={`${item.menuItem.nome}, quantità ${item.quantity}, totale ${formatPrice(lineTotal)}`}
                      >
                        <div className="cart-item-header">
                          <h4>{item.menuItem.nome}</h4>
                          <div className="cart-item-flags">
                            {item.isStaff && (
                              <span className="staff-badge" aria-label="Ordine staff">
                                👥 Staff
                              </span>
                            )}
                            {item.isPriority && (
                              <span className="priority-badge" aria-label="Ordine prioritario">
                                ⚡ Priorità
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="cart-item-controls" role="group" aria-label={`Controlli per ${item.menuItem.nome}`}>
                          <div className="quantity-controls">
                            <button
                              onClick={() =>
                                updateCartItemQuantity(index, item.quantity - 1)
                              }
                              className="quantity-btn btn-large btn-secondary"
                              disabled={item.quantity <= 1}
                              aria-label={`Rimuovi una unità di ${item.menuItem.nome}`}
                            >
                              ➖
                            </button>
                            <span className="quantity" aria-label={`Quantità: ${item.quantity}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartItemQuantity(index, item.quantity + 1)
                              }
                              className="quantity-btn btn-large btn-secondary"
                              aria-label={`Aggiungi una unità di ${item.menuItem.nome}`}
                            >
                              ➕
                            </button>
                          </div>

                          <span className="item-total" aria-label={`Totale riga: ${formatPrice(lineTotal)}`}>
                            €{(lineTotal / 100).toFixed(2)}
                          </span>
                        </div>

                        <div className="cart-item-notes">
                          <label htmlFor={`notes-${index}`} className="sr-only">
                            Note per {item.menuItem.nome}
                          </label>
                          <input
                            id={`notes-${index}`}
                            type="text"
                            placeholder="📝 Note..."
                            value={item.notes}
                            onChange={e =>
                              updateCartItemNotes(index, e.target.value)
                            }
                            className="notes-input"
                            maxLength={200}
                            aria-describedby={`notes-help-${index}`}
                          />
                          <div id={`notes-help-${index}`} className="sr-only">
                            Aggiungi note speciali per questo articolo (max 200 caratteri)
                          </div>
                        </div>

                        <div className="cart-item-actions" role="group" aria-label={`Opzioni per ${item.menuItem.nome}`}>
                          <button
                            onClick={() => toggleCartItemFlag(index, 'staff')}
                            className={`flag-btn btn-large ${item.isStaff ? 'active btn-warning' : 'btn-secondary'}`}
                            aria-pressed={item.isStaff}
                            aria-label={`${item.isStaff ? 'Rimuovi' : 'Aggiungi'} flag staff per ${item.menuItem.nome}`}
                          >
                            👥 Staff
                          </button>
                          <button
                            onClick={() => toggleCartItemFlag(index, 'priority')}
                            className={`flag-btn btn-large ${item.isPriority ? 'active btn-warning' : 'btn-secondary'}`}
                            aria-pressed={item.isPriority}
                            aria-label={`${item.isPriority ? 'Rimuovi' : 'Aggiungi'} flag priorità per ${item.menuItem.nome}`}
                          >
                            ⚡ Priorità
                          </button>
                          
                          <button
                            onClick={() => removeFromCart(index)}
                            className="remove-btn btn-large btn-danger"
                            aria-label={`Rimuovi ${item.menuItem.nome} dal carrello`}
                          >
                            🗑️
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <footer className="cart-summary" role="contentinfo" aria-label="Riepilogo carrello">
                  <div className="cart-total" aria-live="polite">
                    <span>Totale:</span>
                    <span className="total-amount" aria-label={`Totale carrello: ${formatPrice(cart.total)}`}>
                      €{(cart.total / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="cart-actions">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="checkout-btn btn-large btn-primary"
                      disabled={cart.items.length === 0}
                      aria-label={`Procedi al pagamento per ${formatPrice(cart.total)}`}
                    >
                      💳 Procedi al Pagamento
                    </button>

                    <button
                      onClick={clearCart}
                      className="clear-cart-btn btn-large btn-secondary"
                      disabled={cart.items.length === 0}
                      aria-label="Svuota completamente il carrello"
                    >
                      🗑️ Svuota Carrello
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </aside>
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
