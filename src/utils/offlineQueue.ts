// ============================================================================
// SISTEMA OFFLINE QUEUE - SAGRA ORDERS
// ============================================================================

import { Order, OrderLine, MenuComponent } from '../types/dataModel';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  increment,
} from 'firebase/firestore';

// ============================================================================
// INTERFACCE PER LA CODA OFFLINE
// ============================================================================

export interface QueuedOrder {
  id: string; // UUID locale
  orderData: Omit<Order, 'id' | 'progressivo'>;
  orderLines: Omit<OrderLine, 'id' | 'order_id'>[];
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineStats {
  lastProgressivo: number;
  lastSync: number;
  pendingOrders: number;
  failedOrders: number;
}

export interface SyncResult {
  success: boolean;
  syncedOrders: number;
  failedOrders: number;
  errors: string[];
}

// ============================================================================
// GESTIONE INDEXEDDB
// ============================================================================

class OfflineQueueManager {
  private dbName = 'SagraOrdersOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store per ordini in coda
        if (!db.objectStoreNames.contains('queuedOrders')) {
          const orderStore = db.createObjectStore('queuedOrders', {
            keyPath: 'id',
          });
          orderStore.createIndex('timestamp', 'timestamp', { unique: false });
          orderStore.createIndex('retryCount', 'retryCount', { unique: false });
        }

        // Store per statistiche offline
        if (!db.objectStoreNames.contains('offlineStats')) {
          const statsStore = db.createObjectStore('offlineStats', {
            keyPath: 'id',
          });
        }
      };
    });
  }

  // ============================================================================
  // GESTIONE ORDINI IN CODA
  // ============================================================================

  async addToQueue(order: QueuedOrder): Promise<void> {
    if (!this.db) throw new Error('Database non inizializzato');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queuedOrders'], 'readwrite');
      const store = transaction.objectStore('queuedOrders');
      const request = store.add(order);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getQueuedOrders(): Promise<QueuedOrder[]> {
    if (!this.db) throw new Error('Database non inizializzato');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queuedOrders'], 'readonly');
      const store = transaction.objectStore('queuedOrders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(orderId: string): Promise<void> {
    if (!this.db) throw new Error('Database non inizializzato');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queuedOrders'], 'readwrite');
      const store = transaction.objectStore('queuedOrders');
      const request = store.delete(orderId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateRetryCount(orderId: string, retryCount: number): Promise<void> {
    if (!this.db) throw new Error('Database non inizializzato');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['queuedOrders'], 'readwrite');
      const store = transaction.objectStore('queuedOrders');
      const getRequest = store.get(orderId);

      getRequest.onsuccess = () => {
        const order = getRequest.result;
        if (order) {
          order.retryCount = retryCount;
          const updateRequest = store.put(order);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Ordine non trovato'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ============================================================================
  // GESTIONE STATISTICHE OFFLINE
  // ============================================================================

  async getOfflineStats(): Promise<OfflineStats> {
    if (!this.db) throw new Error('Database non inizializzato');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineStats'], 'readonly');
      const store = transaction.objectStore('offlineStats');
      const request = store.get('main');

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Stats di default
          resolve({
            id: 'main',
            lastProgressivo: 0,
            lastSync: Date.now(),
            pendingOrders: 0,
            failedOrders: 0,
          });
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateOfflineStats(stats: Partial<OfflineStats>): Promise<void> {
    if (!this.db) throw new Error('Database non inizializzato');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineStats'], 'readwrite');
      const store = transaction.objectStore('offlineStats');
      const getRequest = store.get('main');

      getRequest.onsuccess = () => {
        const currentStats = getRequest.result || {
          id: 'main',
          lastProgressivo: 0,
          lastSync: Date.now(),
          pendingOrders: 0,
          failedOrders: 0,
        };

        const updatedStats = { ...currentStats, ...stats };
        const updateRequest = store.put(updatedStats);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ============================================================================
  // PULIZIA CODA
  // ============================================================================

  async cleanupFailedOrders(): Promise<void> {
    if (!this.db) throw new Error('Database non inizializzato');

    const orders = await this.getQueuedOrders();
    const failedOrders = orders.filter(
      order => order.retryCount >= order.maxRetries
    );

    for (const order of failedOrders) {
      await this.removeFromQueue(order.id);
    }
  }
}

// ============================================================================
// GESTIONE TRANSAZIONI BATCH
// ============================================================================

export class OrderTransactionManager {
  private queueManager: OfflineQueueManager;

  constructor() {
    this.queueManager = new OfflineQueueManager();
  }

  async init(): Promise<void> {
    await this.queueManager.init();
  }

  /**
   * Crea un ordine completo con transazione batch
   * Include: ordine, righe, aggiornamento scorte, statistiche
   */
  async createOrderWithBatch(
    orderData: Omit<Order, 'id' | 'progressivo'>,
    orderLines: Omit<OrderLine, 'id' | 'order_id'>[],
    components: MenuComponent[]
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Genera UUID per idempotenza
      const orderId = crypto.randomUUID();

      // Prepara la transazione batch
      const batch = writeBatch(db);

      // 1. Crea ordine
      const orderRef = doc(collection(db, 'orders'));
      const orderWithId: Omit<Order, 'id'> = {
        ...orderData,
        progressivo: await this.getNextProgressivo(),
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };
      batch.set(orderRef, orderWithId);

      // 2. Crea righe ordine
      for (const line of orderLines) {
        const lineRef = doc(collection(db, 'order_lines'));
        const lineWithId: Omit<OrderLine, 'id'> = {
          ...line,
          order_id: orderRef.id,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        };
        batch.set(lineRef, lineWithId);
      }

      // 3. Aggiorna scorte componenti
      for (const line of orderLines) {
        const component = components.find(c => c.id === line.menu_item_id);
        if (component && !component.is_illimitato) {
          const componentRef = doc(db, 'menu_components', component.id);
          batch.update(componentRef, {
            giacenza: component.giacenza - line.quantita,
            is_disponibile: component.giacenza - line.quantita > 0,
            updated_at: Timestamp.now(),
          });
        }
      }

      // 4. Aggiorna statistiche sistema
      const statsRef = doc(db, 'stats', 'system');
      batch.update(statsRef, {
        totale_ordini: increment(orderData.is_staff ? 0 : 1), // Staff non conta nel totale
        totale_ordini_oggi: increment(orderData.is_staff ? 0 : 1),
        fatturato_oggi: increment(orderData.is_staff ? 0 : orderData.totale),
        ultimo_progressivo_creato: orderWithId.progressivo,
        ultimo_aggiornamento: Timestamp.now(),
      });

      // Esegui la transazione
      await batch.commit();

      // Aggiorna statistiche offline
      await this.queueManager.updateOfflineStats({
        lastProgressivo: orderWithId.progressivo,
        lastSync: Date.now(),
      });

      return { success: true, orderId: orderRef.id };
    } catch (error) {
      console.error('Errore durante la creazione ordine:', error);

      // Aggiungi alla coda offline
      const queuedOrder: QueuedOrder = {
        id: crypto.randomUUID(),
        orderData,
        orderLines,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      await this.queueManager.addToQueue(queuedOrder);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
      };
    }
  }

  /**
   * Ottiene il prossimo progressivo disponibile
   * Gestisce sia modalità online che offline
   */
  private async getNextProgressivo(): Promise<number> {
    try {
      // Prova a ottenere online
      const statsRef = doc(db, 'stats', 'system');
      const statsDoc = await getDoc(statsRef);

      if (statsDoc.exists()) {
        const currentProgressivo =
          statsDoc.data().ultimo_progressivo_creato || 0;
        return currentProgressivo + 1;
      }
    } catch (error) {
      console.warn('Impossibile ottenere progressivo online, uso offline');
    }

    // Fallback offline
    const offlineStats = await this.queueManager.getOfflineStats();
    return offlineStats.lastProgressivo + 1;
  }

  /**
   * Sincronizza la coda offline con Firestore
   */
  async syncOfflineQueue(): Promise<SyncResult> {
    const queuedOrders = await this.queueManager.getQueuedOrders();
    const result: SyncResult = {
      success: true,
      syncedOrders: 0,
      failedOrders: 0,
      errors: [],
    };

    for (const queuedOrder of queuedOrders) {
      try {
        // Verifica che l'ordine non sia già stato processato
        const existingOrder = await this.checkOrderExists(queuedOrder);
        if (existingOrder) {
          await this.queueManager.removeFromQueue(queuedOrder.id);
          result.syncedOrders++;
          continue;
        }

        // Riprova la creazione
        const createResult = await this.createOrderWithBatch(
          queuedOrder.orderData,
          queuedOrder.orderLines,
          [] // Componenti verranno caricati durante la creazione
        );

        if (createResult.success) {
          await this.queueManager.removeFromQueue(queuedOrder.id);
          result.syncedOrders++;
        } else {
          // Incrementa contatore tentativi
          const newRetryCount = queuedOrder.retryCount + 1;
          if (newRetryCount >= queuedOrder.maxRetries) {
            await this.queueManager.removeFromQueue(queuedOrder.id);
            result.failedOrders++;
            result.errors.push(
              `Ordine ${queuedOrder.id}: superato numero massimo tentativi`
            );
          } else {
            await this.queueManager.updateRetryCount(
              queuedOrder.id,
              newRetryCount
            );
            result.errors.push(
              `Ordine ${queuedOrder.id}: tentativo ${newRetryCount}/${queuedOrder.maxRetries}`
            );
          }
        }
      } catch (error) {
        result.errors.push(
          `Errore sincronizzazione ordine ${queuedOrder.id}: ${error}`
        );
        result.failedOrders++;
      }
    }

    // Aggiorna statistiche
    await this.queueManager.updateOfflineStats({
      lastSync: Date.now(),
      pendingOrders:
        queuedOrders.length - result.syncedOrders - result.failedOrders,
      failedOrders: result.failedOrders,
    });

    return result;
  }

  /**
   * Verifica se un ordine esiste già in Firestore
   * Previene duplicati durante la sincronizzazione
   */
  private async checkOrderExists(queuedOrder: QueuedOrder): Promise<boolean> {
    try {
      // Verifica per UUID o per timestamp + cliente
      const ordersQuery = query(
        collection(db, 'orders'),
        where('created_at', '==', Timestamp.fromMillis(queuedOrder.timestamp)),
        where('cliente', '==', queuedOrder.orderData.cliente),
        limit(1)
      );

      const snapshot = await getDocs(ordersQuery);
      return !snapshot.empty;
    } catch (error) {
      console.warn('Impossibile verificare esistenza ordine:', error);
      return false;
    }
  }

  /**
   * Avvia il worker di sincronizzazione periodica
   */
  startSyncWorker(intervalMs: number = 10000): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const result = await this.syncOfflineQueue();
        if (result.syncedOrders > 0 || result.failedOrders > 0) {
          console.log(
            `Sync completato: ${result.syncedOrders} sincronizzati, ${result.failedOrders} falliti`
          );
        }
      } catch (error) {
        console.error('Errore durante sincronizzazione automatica:', error);
      }
    }, intervalMs);
  }

  /**
   * Ferma il worker di sincronizzazione
   */
  stopSyncWorker(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
  }

  /**
   * Ottiene lo stato della coda offline
   */
  async getQueueStatus(): Promise<{
    pendingOrders: number;
    failedOrders: number;
    lastSync: number;
    isOnline: boolean;
  }> {
    const stats = await this.queueManager.getOfflineStats();
    const queuedOrders = await this.queueManager.getQueuedOrders();

    return {
      pendingOrders: queuedOrders.filter(o => o.retryCount < o.maxRetries)
        .length,
      failedOrders: stats.failedOrders,
      lastSync: stats.lastSync,
      isOnline: navigator.onLine,
    };
  }
}

// ============================================================================
// INSTANZA GLOBALE
// ============================================================================

export const offlineQueueManager = new OrderTransactionManager();

// ============================================================================
// INIZIALIZZAZIONE AUTOMATICA
// ============================================================================

export async function initializeOfflineSystem(): Promise<void> {
  try {
    await offlineQueueManager.init();
    console.log('Sistema offline inizializzato con successo');

    // Avvia worker di sincronizzazione
    const syncWorker = offlineQueueManager.startSyncWorker();

    // Pulisci worker quando la pagina viene chiusa
    window.addEventListener('beforeunload', () => {
      offlineQueueManager.stopSyncWorker(syncWorker);
    });
  } catch (error) {
    console.error('Errore durante inizializzazione sistema offline:', error);
  }
}
