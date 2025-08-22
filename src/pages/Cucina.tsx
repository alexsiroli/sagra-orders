import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy,
  where,
  onSnapshot,
  increment,
  writeBatch
} from 'firebase/firestore';
import { Order, OrderLine, MenuItem, MenuComponent, Category } from '../types/dataModel';
import './Cucina.css';

// ============================================================================
// INTERFACCE LOCALI
// ============================================================================

interface OrderWithDetails extends Order {
  orderLines: OrderLine[];
  foodItems: string[];
  totalItems: number;
  isPriority: boolean;
  timeSinceCreation: string;
}

interface KitchenStats {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  lastCompletedNumber: number;
}

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

const Cucina: React.FC = () => {
  const { user } = useAuth();
  
  // ============================================================================
  // STATI LOCALI
  // ============================================================================
  
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuComponents, setMenuComponents] = useState<MenuComponent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<KitchenStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    lastCompletedNumber: 0
  });
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  // ============================================================================
  // EFFETTI INIZIALI
  // ============================================================================

  useEffect(() => {
    loadInitialData();
    setupRealtimeListener();
  }, []);

  useEffect(() => {
    // Aggiorna il tempo solo quando necessario, non ad ogni cambio di orders
    const interval = setInterval(() => {
      setOrders(prevOrders => 
        prevOrders.map(order => ({
          ...order,
          timeSinceCreation: getTimeSinceCreation(order.created_at)
        }))
      );
    }, 30000); // Aggiorna ogni 30 secondi
    
    return () => clearInterval(interval);
  }, []); // Dipendenze vuote per evitare loop infiniti

  useEffect(() => {
    // Aggiorna pendingOrders quando cambia il numero di ordini
    setStats(prev => ({
      ...prev,
      pendingOrders: orders.length
    }));
  }, [orders.length]);

  // ============================================================================
  // FUNZIONI DI CARICAMENTO DATI
  // ============================================================================

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Carica menu items
      const menuItemsQuery = query(collection(db, 'menu_items'));
      const menuItemsSnapshot = await getDocs(menuItemsQuery);
      const menuItemsData = menuItemsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as MenuItem[];
      setMenuItems(menuItemsData);

      // Carica componenti menu
      const componentsQuery = query(collection(db, 'menu_components'));
      const componentsSnapshot = await getDocs(componentsQuery);
      const componentsData = componentsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as MenuComponent[];
      setMenuComponents(componentsData);

      // Carica categorie
      const categoriesQuery = query(collection(db, 'categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Category[];
      setCategories(categoriesData);

      // Carica statistiche
      await loadKitchenStats();
      
    } catch (error) {
      console.error('Errore durante il caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeListener = () => {
    // Listener per ordini in attesa (versione semplificata senza orderBy per evitare errori indice)
    const ordersQuery = query(
      collection(db, 'orders'),
      where('stato', '==', 'in_attesa')
      // Rimuovo temporaneamente orderBy('created_at', 'asc') fino a quando l'indice non è creato
    );

    const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
      const ordersData: OrderWithDetails[] = [];
      
      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data() as Order;
        
        // Carica le righe ordine per questo ordine
        const orderLinesQuery = query(
          collection(db, 'order_lines'),
          where('order_id', '==', orderData.id)
        );
        const orderLinesSnapshot = await getDocs(orderLinesQuery);
        const orderLines = orderLinesSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as OrderLine[];

        // Filtra solo piatti CIBO (esclude bevande)
        const foodOrderLines = orderLines.filter(line => {
          const menuItem = menuItems.find(item => item.id === line.menu_item_id);
          if (!menuItem) return false;
          
          const category = categories.find(cat => cat.id === menuItem.categoria_id);
          return category && category.nome !== 'Bevande';
        });

        if (foodOrderLines.length > 0) {
          const foodItems = foodOrderLines.map(line => {
            const menuItem = menuItems.find(item => item.id === line.menu_item_name);
            return `${line.menu_item_name} x${line.quantita}`;
          });

          const orderWithDetails: OrderWithDetails = {
            ...orderData,
            orderLines: foodOrderLines,
            foodItems,
            totalItems: foodOrderLines.reduce((sum, line) => sum + line.quantita, 0),
            isPriority: orderData.is_prioritario,
            timeSinceCreation: getTimeSinceCreation(orderData.created_at)
          };

          ordersData.push(orderWithDetails);
        }
      }

      // Ordina per priorità e poi per progressivo (ordinamento lato client)
      const sortedOrders = ordersData.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return a.progressivo - b.progressivo;
      });

      setOrders(sortedOrders);
    });

    return unsubscribe;
  };

  const loadKitchenStats = async () => {
    try {
      const statsDoc = await getDocs(collection(db, 'stats'));
      const systemStats = statsDoc.docs.find(doc => doc.data().id === 'system');
      
      if (systemStats) {
        const data = systemStats.data();
        setStats(prev => ({
          ...prev,
          totalOrders: data.totale_ordini || 0,
          completedToday: data.totale_ordini_completati_oggi || 0,
          lastCompletedNumber: data.ultimo_progressivo_pronto || 0
        }));
      }
    } catch (error) {
      console.error('Errore nel caricamento statistiche:', error);
    }
  };

  // ============================================================================
  // FUNZIONI UTILITY
  // ============================================================================

  const getTimeSinceCreation = (createdAt: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins}m fa`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h fa`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}g fa`;
  };



  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.nome || 'Sconosciuta';
  };

  const getCategoryIcon = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icona || '🍽️';
  };

  // ============================================================================
  // FUNZIONI DI GESTIONE ORDINI
  // ============================================================================

  const markOrderAsReady = async (orderId: string, progressivo: number) => {
    try {
      setProcessingOrder(orderId);
      
      // Aggiorna stato ordine
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        stato: 'pronto',
        updated_at: new Date(),
        preparato_da: user?.id || '',
        preparato_da_name: user?.nome || ''
      });

             // Aggiorna stato righe ordine
       const order = orders.find(o => o.id === orderId);
       if (order) {
         const batch = writeBatch(db);
         
         order.orderLines.forEach(line => {
           const lineRef = doc(db, 'order_lines', line.id);
           batch.update(lineRef, {
             stato: 'pronto',
             updated_at: new Date()
           });
         });

         await batch.commit();
       }

      // Aggiorna statistiche
      const statsRef = doc(db, 'stats', 'system');
      await updateDoc(statsRef, {
        ultimo_progressivo_pronto: progressivo,
        totale_ordini_completati_oggi: increment(1),
        ultimo_aggiornamento: new Date()
      });

      // Aggiorna stats locali
      setStats(prev => ({
        ...prev,
        completedToday: prev.completedToday + 1,
        lastCompletedNumber: progressivo
      }));

      // Rimuovi ordine dalla lista (scompare dalla coda)
      setOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Feedback utente
      alert(`✅ Ordine #${progressivo} segnato come PRONTO!`);
      
    } catch (error) {
      console.error('Errore durante aggiornamento ordine:', error);
      alert('❌ Errore durante aggiornamento ordine. Controlla la console.');
    } finally {
      setProcessingOrder(null);
    }
  };

  // ============================================================================
  // RENDERIZZAZIONE
  // ============================================================================

  if (loading) {
    return (
      <div className="cucina-loading">
        <div className="loading-spinner">⏳</div>
        <p>Caricamento vista cucina...</p>
      </div>
    );
  }

  return (
    <div className="cucina-page">
      {/* Header */}
      <div className="cucina-header">
        <h1>👨‍🍳 Vista Cucina</h1>
        <div className="kitchen-stats">
          <div className="stat-item">
            <span className="stat-label">📊 Totale Ordini</span>
            <span className="stat-value">{stats.totalOrders}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">⏳ In Coda</span>
            <span className="stat-value">{orders.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">✅ Completati Oggi</span>
            <span className="stat-value">{stats.completedToday}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">🔄 Ultimo Pronto</span>
            <span className="stat-value">#{stats.lastCompletedNumber}</span>
          </div>
        </div>
      </div>

      <div className="cucina-content">
        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">🎉</div>
            <h2>Tutti gli ordini sono pronti!</h2>
            <p>Non ci sono ordini in coda da preparare.</p>
            <small>La vista si aggiorna automaticamente quando arrivano nuovi ordini.</small>
          </div>
        ) : (
          <>
            {/* Filtri e Controlli */}
            <div className="orders-controls">
              <div className="orders-summary">
                <span className="orders-count">
                  {orders.length} ordine{orders.length !== 1 ? 'i' : ''} in coda
                </span>
                {orders.some(o => o.isPriority) && (
                  <span className="priority-indicator">
                    ⚡ {orders.filter(o => o.isPriority).length} prioritari
                  </span>
                )}
              </div>
              
              <div className="refresh-info">
                <small>🔄 Aggiornamento automatico ogni 30 secondi</small>
              </div>
            </div>

            {/* Lista Ordini */}
            <div className="orders-list">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className={`order-card ${order.isPriority ? 'priority' : ''}`}
                >
                  {/* Header Ordine */}
                  <div className="order-header">
                    <div className="order-progressivo">
                      <span className="progressivo-number">#{order.progressivo}</span>
                      {order.isPriority && (
                        <span className="priority-badge">⚡ PRIORITARIO</span>
                      )}
                    </div>
                    
                    <div className="order-meta">
                      <span className="order-time">
                        🕐 {order.timeSinceCreation}
                      </span>
                      <span className="order-items-count">
                        🍽️ {order.totalItems} piatto{order.totalItems !== 1 ? 'i' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Dettagli Piatti */}
                  <div className="order-details">
                    <div className="food-items">
                      {order.foodItems.map((item, index) => (
                        <div key={index} className="food-item">
                          <span className="item-name">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Note Ordine */}
                    {order.note && (
                      <div className="order-notes">
                        <span className="notes-label">📝 Note:</span>
                        <span className="notes-text">{order.note}</span>
                      </div>
                    )}

                    {/* Note Specifiche Piatti */}
                    {order.orderLines.some(line => line.note) && (
                      <div className="item-notes">
                        {order.orderLines
                          .filter(line => line.note)
                          .map((line, index) => (
                            <div key={index} className="item-note">
                              <span className="item-name">{line.menu_item_name}:</span>
                              <span className="note-text">{line.note}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Azioni */}
                  <div className="order-actions">
                    <button
                      onClick={() => markOrderAsReady(order.id, order.progressivo)}
                      className="ready-btn"
                      disabled={processingOrder === order.id}
                    >
                      {processingOrder === order.id ? (
                        <span className="processing-spinner">⏳</span>
                      ) : (
                        <span>✅ Segna PRONTO</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="cucina-footer">
        <div className="footer-info">
          <p>
            <strong>💡 Suggerimenti:</strong> Gli ordini prioritari sono evidenziati e appaiono in alto. 
            Dopo aver segnato un ordine come PRONTO, scompare automaticamente dalla coda.
          </p>
          <p>
            <small>
              <strong>⏰ Tempo:</strong> Il tempo viene aggiornato automaticamente ogni 30 secondi.
              <br />
              <strong>🍽️ Piatti:</strong> Vengono mostrati solo i piatti CIBO, le bevande non sono incluse.
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cucina;
