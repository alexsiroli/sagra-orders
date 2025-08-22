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
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  MenuComponent,
  MenuItem,
  Category,
  SystemStats,
  Order,
  OrderLine,
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
    'items' | 'components' | 'inventory' | 'stats' | 'orders' | 'reports'
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

  // State per ordini e ricerca
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [searchProgressivo, setSearchProgressivo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderAction, setOrderAction] = useState<'view' | 'edit' | 'cancel'>(
    'view'
  );

  // State per report e export
  const [reportDateRange, setReportDateRange] = useState<
    'today' | 'week' | 'month' | 'custom'
  >('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

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
        ordersSnapshot,
      ] = await Promise.all([
        getDocs(query(collection(db, 'categories'), orderBy('ordine', 'asc'))),
        getDocs(
          query(collection(db, 'menu_components'), orderBy('nome', 'asc'))
        ),
        getDocs(query(collection(db, 'menu_items'), orderBy('nome', 'asc'))),
        getDocs(collection(db, 'stats')),
        getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc'))),
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

      // Carica ordini e order lines
      setOrders(
        ordersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Order)
      );

      // Carica order lines per tutti gli ordini
      const orderIds = ordersSnapshot.docs.map(doc => doc.id);
      if (orderIds.length > 0) {
        const orderLinesQuery = query(
          collection(db, 'order_lines'),
          where('order_id', 'in', orderIds)
        );
        const orderLinesSnapshot = await getDocs(orderLinesQuery);
        setOrderLines(
          orderLinesSnapshot.docs.map(
            doc => ({ ...doc.data(), id: doc.id }) as OrderLine
          )
        );
      }

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

    // Listener per ordini
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('created_at', 'desc')
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, snapshot => {
      const ordersData = snapshot.docs.map(
        doc => ({ ...doc.data(), id: doc.id }) as Order
      );
      setOrders(ordersData);
    });

    // Cleanup
    return () => {
      unsubscribeComponents();
      unsubscribeItems();
      unsubscribeOrders();
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

  // Funzioni per gestione ordini
  const searchOrderByProgressivo = (progressivo: string) => {
    if (!progressivo.trim()) {
      setSearchProgressivo('');
      return;
    }
    setSearchProgressivo(progressivo.trim());
  };

  const getFilteredOrders = () => {
    if (!searchProgressivo) return orders;
    return orders.filter(order =>
      order.progressivo.toString().includes(searchProgressivo)
    );
  };

  const openOrderModal = (order: Order, action: 'view' | 'edit' | 'cancel') => {
    setSelectedOrder(order);
    setOrderAction(action);
    setShowOrderModal(true);
  };

  const getOrderLines = (orderId: string) => {
    return orderLines.filter(line => line.order_id === orderId);
  };

  const canModifyOrder = (order: Order) => {
    return order.stato === 'in_attesa' || order.stato === 'ordinato';
  };

  const cancelOrder = async (order: Order) => {
    if (!canModifyOrder(order)) {
      setError('Non è possibile annullare questo ordine');
      return;
    }

    try {
      const batch = writeBatch(db);

      // Aggiorna stato ordine
      batch.update(doc(db, 'orders', order.id), {
        stato: 'cancellato',
        updated_at: Timestamp.now(),
      });

      // Riaccredita scorte per ogni componente
      const orderLinesForOrder = getOrderLines(order.id);
      for (const line of orderLinesForOrder) {
        const component = menuComponents.find(c => c.id === line.menu_item_id);
        if (component) {
          batch.update(doc(db, 'menu_components', component.id), {
            giacenza: component.giacenza + line.quantita,
            is_disponibile: true,
            updated_at: Timestamp.now(),
          });
        }
      }

      // Aggiorna statistiche
      if (systemStats) {
        batch.update(doc(db, 'stats', 'system'), {
          totale_ordini_cancellati_oggi:
            systemStats.totale_ordini_cancellati_oggi + 1,
          updated_at: Timestamp.now(),
        });
      }

      await batch.commit();
      setShowOrderModal(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error("Errore durante l'annullamento ordine:", err);
      setError("Errore durante l'annullamento dell'ordine");
    }
  };

  // Funzioni per report e export
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (reportDateRange) {
      case 'today':
        return { start: today, end: now };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + 'T23:59:59'),
          };
        }
        return { start: today, end: now };
      default:
        return { start: today, end: now };
    }
  };

  const generateReport = () => {
    const { start, end } = getDateRange();

    // Filtra ordini per periodo
    const filteredOrders = orders.filter(order => {
      const orderDate = order.created_at.toDate();
      return orderDate >= start && orderDate <= end;
    });

    // Filtra order lines per periodo
    const filteredOrderLines = orderLines.filter(line => {
      const order = filteredOrders.find(o => o.id === line.order_id);
      return order !== undefined;
    });

    // Calcola statistiche
    const totalOrders = filteredOrders.length;
    const staffOrders = filteredOrders.filter(o => o.is_staff).length;
    const regularOrders = totalOrders - staffOrders;

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      if (!order.is_staff) {
        return sum + order.totale;
      }
      return sum;
    }, 0);

    const averageTicket = regularOrders > 0 ? totalRevenue / regularOrders : 0;

    // Raggruppa per articolo
    const itemsSold = new Map<
      string,
      { quantity: number; revenue: number; staffQuantity: number }
    >();

    filteredOrderLines.forEach(line => {
      const itemId = line.menu_item_id;
      const existing = itemsSold.get(itemId) || {
        quantity: 0,
        revenue: 0,
        staffQuantity: 0,
      };

      existing.quantity += line.quantita;

      if (line.is_staff) {
        existing.staffQuantity += line.quantita;
      } else {
        existing.revenue += line.prezzo_totale;
      }

      itemsSold.set(itemId, existing);
    });

    // Raggruppa per categoria
    const categoryStats = new Map<
      string,
      { quantity: number; revenue: number }
    >();

    itemsSold.forEach((stats, itemId) => {
      const item = menuItems.find(i => i.id === itemId);
      if (item) {
        const categoryId = item.categoria_id;
        const existing = categoryStats.get(categoryId) || {
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += stats.quantity;
        existing.revenue += stats.revenue;

        categoryStats.set(categoryId, existing);
      }
    });

    const report = {
      period: { start, end },
      summary: {
        totalOrders,
        staffOrders,
        regularOrders,
        totalRevenue,
        averageTicket,
      },
      itemsSold: Array.from(itemsSold.entries()).map(([itemId, stats]) => {
        const item = menuItems.find(i => i.id === itemId);
        return {
          itemId,
          itemName: item?.nome || 'Articolo sconosciuto',
          category:
            categories.find(c => c.id === item?.categoria_id)?.nome ||
            'Categoria sconosciuta',
          totalQuantity: stats.quantity,
          staffQuantity: stats.staffQuantity,
          regularQuantity: stats.quantity - stats.staffQuantity,
          revenue: stats.revenue,
        };
      }),
      categoryStats: Array.from(categoryStats.entries()).map(
        ([categoryId, stats]) => {
          const category = categories.find(c => c.id === categoryId);
          return {
            categoryId,
            categoryName: category?.nome || 'Categoria sconosciuta',
            totalQuantity: stats.quantity,
            revenue: stats.revenue,
          };
        }
      ),
      orders: filteredOrders,
      orderLines: filteredOrderLines,
    };

    setReportData(report);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllReports = async () => {
    if (!reportData) {
      setError('Genera prima un report');
      return;
    }

    setExporting(true);
    try {
      // Export orders.csv
      exportToCSV(
        reportData.orders.map(order => ({
          progressivo: order.progressivo,
          cliente: order.cliente,
          stato: order.stato,
          totale: (order.totale / 100).toFixed(2),
          is_staff: order.is_staff,
          is_prioritario: order.is_prioritario,
          note: order.note || '',
          created_at: order.created_at.toDate().toISOString(),
          created_by: order.created_by_name,
        })),
        'orders.csv'
      );

      // Export order_lines.csv
      exportToCSV(
        reportData.orderLines.map(line => ({
          order_id: line.order_id,
          menu_item_id: line.menu_item_id,
          menu_item_name: line.menu_item_name,
          quantita: line.quantita,
          prezzo_unitario: (line.prezzo_unitario / 100).toFixed(2),
          prezzo_totale: (line.prezzo_totale / 100).toFixed(2),
          is_staff: line.is_staff,
          is_priority: line.is_priority,
          note: line.note || '',
        })),
        'order_lines.csv'
      );

      // Export items_sold.csv
      exportToCSV(reportData.itemsSold, 'items_sold.csv');

      // Export revenue_by_item.csv
      exportToCSV(
        reportData.itemsSold.map(item => ({
          item_name: item.itemName,
          category: item.category,
          total_quantity: item.totalQuantity,
          staff_quantity: item.staffQuantity,
          regular_quantity: item.regularQuantity,
          revenue_eur: (item.revenue / 100).toFixed(2),
        })),
        'revenue_by_item.csv'
      );

      // Export summary.csv
      exportToCSV(
        [
          {
            period_start: reportData.period.start.toISOString(),
            period_end: reportData.period.end.toISOString(),
            total_orders: reportData.summary.totalOrders,
            staff_orders: reportData.summary.staffOrders,
            regular_orders: reportData.summary.regularOrders,
            total_revenue_eur: (reportData.summary.totalRevenue / 100).toFixed(
              2
            ),
            average_ticket_eur: (
              reportData.summary.averageTicket / 100
            ).toFixed(2),
          },
        ],
        'summary.csv'
      );

      // Crea ZIP con tutti i file
      // Nota: Per ora esportiamo i file singolarmente
      // In futuro si può implementare JSZip per creare un file ZIP
    } catch (err) {
      console.error("Errore durante l'export:", err);
      setError("Errore durante l'export dei report");
    } finally {
      setExporting(false);
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
        <button
          className={`tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Ordini
        </button>
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Report
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
                    <div className="stats-details">
                      <p>
                        <strong>Oggi:</strong> €
                        {(systemStats.fatturato_oggi / 100).toFixed(2)}
                      </p>
                    </div>
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

        {activeTab === 'orders' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Gestione Ordini</h2>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Cerca per progressivo..."
                  value={searchProgressivo}
                  onChange={e => searchOrderByProgressivo(e.target.value)}
                  className="search-input"
                />
                <button className="search-button">🔍 Cerca</button>
              </div>
            </div>

            <div className="orders-list">
              {getFilteredOrders().map(order => (
                <div key={order.id} className={`order-card ${order.stato}`}>
                  <div className="order-header">
                    <div className="order-info">
                      <h3>Ordine #{order.progressivo}</h3>
                      <div className="order-meta">
                        <span className={`status-badge ${order.stato}`}>
                          {order.stato === 'in_attesa' && '⏳ In Attesa'}
                          {order.stato === 'ordinato' && '📋 Ordinato'}
                          {order.stato === 'pronto' && '✅ Pronto'}
                          {order.stato === 'completato' && '🎉 Completato'}
                          {order.stato === 'cancellato' && '❌ Cancellato'}
                        </span>
                        <span className="order-time">
                          {new Date(order.created_at.toDate()).toLocaleString(
                            'it-IT'
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="order-actions">
                      <button
                        className="view-button"
                        onClick={() => openOrderModal(order, 'view')}
                        title="Visualizza dettagli"
                      >
                        👁️
                      </button>
                      {canModifyOrder(order) && (
                        <>
                          <button
                            className="edit-button"
                            onClick={() => openOrderModal(order, 'edit')}
                            title="Modifica ordine"
                          >
                            ✏️
                          </button>
                          <button
                            className="cancel-button"
                            onClick={() => openOrderModal(order, 'cancel')}
                            title="Annulla ordine"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="order-details">
                    <p>
                      <strong>Cliente:</strong> {order.cliente}
                    </p>
                    <p>
                      <strong>Totale:</strong> €
                      {(order.totale / 100).toFixed(2)}
                    </p>
                    {order.note && (
                      <p>
                        <strong>Note:</strong> {order.note}
                      </p>
                    )}
                    {order.is_prioritario && (
                      <span className="priority-badge">🚨 Priorità</span>
                    )}
                  </div>
                </div>
              ))}
              {getFilteredOrders().length === 0 && (
                <div className="no-orders">
                  <p>Nessun ordine trovato</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="tab-content">
            <div className="content-header">
              <h2>Report e Export</h2>
              <p>Genera report dettagliati ed esporta i dati in formato CSV</p>
            </div>

            {/* Controlli periodo */}
            <div className="report-controls">
              <div className="date-range-selector">
                <label>Periodo Report:</label>
                <select
                  value={reportDateRange}
                  onChange={e => setReportDateRange(e.target.value as any)}
                  className="period-select"
                >
                  <option value="today">Oggi</option>
                  <option value="week">Questa Settimana</option>
                  <option value="month">Questo Mese</option>
                  <option value="custom">Periodo Personalizzato</option>
                </select>
              </div>

              {reportDateRange === 'custom' && (
                <div className="custom-date-inputs">
                  <div className="date-input">
                    <label>Data Inizio:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="date-field"
                    />
                  </div>
                  <div className="date-input">
                    <label>Data Fine:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="date-field"
                    />
                  </div>
                </div>
              )}

              <div className="report-actions">
                <button
                  onClick={generateReport}
                  className="generate-button"
                  disabled={
                    reportDateRange === 'custom' &&
                    (!customStartDate || !customEndDate)
                  }
                >
                  📊 Genera Report
                </button>
              </div>
            </div>

            {/* Report generato */}
            {reportData && (
              <div className="report-results">
                <div className="report-summary">
                  <h3>📈 Riepilogo Periodo</h3>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="summary-number">
                        {reportData.summary.totalOrders}
                      </div>
                      <div className="summary-label">Totale Ordini</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        {reportData.summary.staffOrders}
                      </div>
                      <div className="summary-label">Ordini Staff</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        {reportData.summary.regularOrders}
                      </div>
                      <div className="summary-label">Ordini Clienti</div>
                    </div>
                    <div className="summary-card revenue">
                      <div className="summary-number">
                        €{(reportData.summary.totalRevenue / 100).toFixed(2)}
                      </div>
                      <div className="summary-label">Ricavo Totale</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        €{(reportData.summary.averageTicket / 100).toFixed(2)}
                      </div>
                      <div className="summary-label">Scontrino Medio</div>
                    </div>
                  </div>
                </div>

                {/* Articoli venduti */}
                <div className="report-section">
                  <h3>🍽️ Articoli Venduti</h3>
                  <div className="items-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Articolo</th>
                          <th>Categoria</th>
                          <th>Quantità Totale</th>
                          <th>Quantità Staff</th>
                          <th>Quantità Clienti</th>
                          <th>Ricavo (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.itemsSold.map(
                          (item: any, index: number) => (
                            <tr key={index}>
                              <td>{item.itemName}</td>
                              <td>{item.category}</td>
                              <td>{item.totalQuantity}</td>
                              <td>{item.staffQuantity}</td>
                              <td>{item.regularQuantity}</td>
                              <td className="revenue-cell">
                                {(item.revenue / 100).toFixed(2)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Statistiche per categoria */}
                <div className="report-section">
                  <h3>📂 Statistiche per Categoria</h3>
                  <div className="category-stats-grid">
                    {reportData.categoryStats.map((cat: any, index: number) => (
                      <div key={index} className="category-stat-card">
                        <h4>{cat.categoryName}</h4>
                        <div className="category-stat-details">
                          <div className="stat-item">
                            <span className="stat-label">Quantità:</span>
                            <span className="stat-value">
                              {cat.totalQuantity}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Ricavo:</span>
                            <span className="stat-value revenue">
                              €{(cat.revenue / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export */}
                <div className="export-section">
                  <h3>📤 Export Dati</h3>
                  <div className="export-buttons">
                    <button
                      onClick={() =>
                        exportToCSV(
                          reportData.orders.map(order => ({
                            progressivo: order.progressivo,
                            cliente: order.cliente,
                            stato: order.stato,
                            totale: (order.totale / 100).toFixed(2),
                            is_staff: order.is_staff,
                            is_prioritario: order.is_prioritario,
                            note: order.note || '',
                            created_at: order.created_at.toDate().toISOString(),
                            created_by: order.created_by_name,
                          })),
                          'orders.csv'
                        )
                      }
                      className="export-button"
                    >
                      📋 orders.csv
                    </button>
                    <button
                      onClick={() =>
                        exportToCSV(
                          reportData.orderLines.map(line => ({
                            order_id: line.order_id,
                            menu_item_id: line.menu_item_id,
                            menu_item_name: line.menu_item_name,
                            quantita: line.quantita,
                            prezzo_unitario: (
                              line.prezzo_unitario / 100
                            ).toFixed(2),
                            prezzo_totale: (line.prezzo_totale / 100).toFixed(
                              2
                            ),
                            is_staff: line.is_staff,
                            is_priority: line.is_priority,
                            note: line.note || '',
                          })),
                          'order_lines.csv'
                        )
                      }
                      className="export-button"
                    >
                      📊 order_lines.csv
                    </button>
                    <button
                      onClick={() =>
                        exportToCSV(reportData.itemsSold, 'items_sold.csv')
                      }
                      className="export-button"
                    >
                      🍽️ items_sold.csv
                    </button>
                    <button
                      onClick={() =>
                        exportToCSV(
                          reportData.itemsSold.map(item => ({
                            item_name: item.itemName,
                            category: item.category,
                            total_quantity: item.totalQuantity,
                            staff_quantity: item.staffQuantity,
                            regular_quantity: item.regularQuantity,
                            revenue_eur: (item.revenue / 100).toFixed(2),
                          })),
                          'revenue_by_item.csv'
                        )
                      }
                      className="export-button"
                    >
                      💰 revenue_by_item.csv
                    </button>
                    <button
                      onClick={() =>
                        exportToCSV(
                          [
                            {
                              period_start:
                                reportData.period.start.toISOString(),
                              period_end: reportData.period.end.toISOString(),
                              total_orders: reportData.summary.totalOrders,
                              staff_orders: reportData.summary.staffOrders,
                              regular_orders: reportData.summary.regularOrders,
                              total_revenue_eur: (
                                reportData.summary.totalRevenue / 100
                              ).toFixed(2),
                              average_ticket_eur: (
                                reportData.summary.averageTicket / 100
                              ).toFixed(2),
                            },
                          ],
                          'summary.csv'
                        )
                      }
                      className="export-button"
                    >
                      📈 summary.csv
                    </button>
                  </div>

                  <div className="export-all-section">
                    <button
                      onClick={exportAllReports}
                      className="export-all-button"
                      disabled={exporting}
                    >
                      {exporting
                        ? '⏳ Esportando...'
                        : '📦 Esporta Tutto (5 CSV)'}
                    </button>
                    <p className="export-note">
                      I file CSV verranno scaricati singolarmente. Staff escluso
                      dal ricavo ma contato nelle quantità.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stato iniziale */}
            {!reportData && (
              <div className="no-report">
                <div className="no-report-icon">📊</div>
                <h3>Nessun Report Generato</h3>
                <p>
                  Seleziona un periodo e genera un report per visualizzare le
                  statistiche e esportare i dati.
                </p>
              </div>
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

      {/* Modal Dettaglio Ordine */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div
            className="modal-content order-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {orderAction === 'view' && 'Dettaglio Ordine'}
                {orderAction === 'edit' && 'Modifica Ordine'}
                {orderAction === 'cancel' && 'Annulla Ordine'} #
                {selectedOrder.progressivo}
              </h3>
              <button
                className="close-button"
                onClick={() => setShowOrderModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <div className="order-summary">
                <div className="order-info-grid">
                  <div className="info-item">
                    <label>Stato:</label>
                    <span className={`status-badge ${selectedOrder.stato}`}>
                      {selectedOrder.stato === 'in_attesa' && '⏳ In Attesa'}
                      {selectedOrder.stato === 'ordinato' && '📋 Ordinato'}
                      {selectedOrder.stato === 'pronto' && '✅ Pronto'}
                      {selectedOrder.stato === 'completato' && '🎉 Completato'}
                      {selectedOrder.stato === 'cancellato' && '❌ Cancellato'}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Cliente:</label>
                    <span>{selectedOrder.cliente}</span>
                  </div>
                  <div className="info-item">
                    <label>Totale:</label>
                    <span className="total-amount">
                      €{(selectedOrder.totale / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Data Creazione:</label>
                    <span>
                      {new Date(
                        selectedOrder.created_at.toDate()
                      ).toLocaleString('it-IT')}
                    </span>
                  </div>
                  {selectedOrder.note && (
                    <div className="info-item full-width">
                      <label>Note:</label>
                      <span>{selectedOrder.note}</span>
                    </div>
                  )}
                </div>

                {selectedOrder.is_prioritario && (
                  <div className="priority-warning">
                    🚨 <strong>ORDINE PRIORITARIO</strong>
                  </div>
                )}
              </div>

              <div className="order-lines-section">
                <h4>Righe Ordine</h4>
                <div className="order-lines-list">
                  {getOrderLines(selectedOrder.id).map(line => (
                    <div key={line.id} className="order-line-item">
                      <div className="line-header">
                        <span className="item-name">{line.menu_item_name}</span>
                        <span className="line-total">
                          €{(line.prezzo_totale / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="line-details">
                        <span className="quantity">x{line.quantita}</span>
                        <span className="unit-price">
                          €{(line.prezzo_unitario / 100).toFixed(2)} cad.
                        </span>
                        {line.note && (
                          <span className="line-note">Note: {line.note}</span>
                        )}
                        {line.is_staff && (
                          <span className="staff-badge">👥 Staff</span>
                        )}
                        {line.is_priority && (
                          <span className="priority-badge">🚨 Priorità</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {orderAction === 'cancel' && canModifyOrder(selectedOrder) && (
                <div className="cancel-warning">
                  ⚠️ <strong>Attenzione:</strong> Annullando questo ordine, le
                  scorte verranno riaccreditate automaticamente.
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowOrderModal(false)}
                >
                  Chiudi
                </button>
                {orderAction === 'cancel' && canModifyOrder(selectedOrder) && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => cancelOrder(selectedOrder)}
                  >
                    🗑️ Conferma Annullamento
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
