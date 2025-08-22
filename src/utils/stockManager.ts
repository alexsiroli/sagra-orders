// ============================================================================
// GESTIONE STOCK RACE-SAFE - SAGRA ORDERS
// ============================================================================

import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  runTransaction,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { MenuComponent } from '../types/dataModel';

// ============================================================================
// INTERFACCE
// ============================================================================

export interface StockUpdateRequest {
  componentId: string;
  quantityChange: number; // Negativo per decrementare, positivo per incrementare
  orderId?: string; // Per logging
  reason?: string; // Motivo dell'aggiornamento
}

export interface StockUpdateResult {
  success: boolean;
  componentId: string;
  oldQuantity: number;
  newQuantity: number;
  actualChange: number;
  error?: string;
}

export interface BatchStockUpdateResult {
  success: boolean;
  results: StockUpdateResult[];
  failedUpdates: string[];
  errors: string[];
}

// ============================================================================
// AGGIORNAMENTO STOCK SINGOLO (RACE-SAFE)
// ============================================================================

/**
 * Aggiorna lo stock di un singolo componente in modo race-safe
 * Usa una transazione per garantire consistenza
 */
export async function updateComponentStock(
  request: StockUpdateRequest
): Promise<StockUpdateResult> {
  const result: StockUpdateResult = {
    success: false,
    componentId: request.componentId,
    oldQuantity: 0,
    newQuantity: 0,
    actualChange: 0,
  };

  try {
    await runTransaction(db, async (transaction) => {
      const componentRef = doc(db, 'menu_components', request.componentId);
      const componentDoc = await transaction.get(componentRef);

      if (!componentDoc.exists()) {
        throw new Error(`Componente ${request.componentId} non trovato`);
      }

      const componentData = componentDoc.data() as MenuComponent;
      
      // Se il componente è illimitato, non aggiornare stock
      if (componentData.is_illimitato) {
        result.success = true;
        result.oldQuantity = Infinity;
        result.newQuantity = Infinity;
        result.actualChange = 0;
        return;
      }

      const oldQuantity = componentData.giacenza;
      const newQuantity = oldQuantity + request.quantityChange;

      // Validazione: non permettere stock negativo
      if (newQuantity < 0) {
        throw new Error(
          `Stock insufficiente per ${componentData.nome}: richiesto ${Math.abs(request.quantityChange)}, disponibile ${oldQuantity}`
        );
      }

      // Aggiorna il documento
      const updateData: Partial<MenuComponent> = {
        giacenza: newQuantity,
        is_disponibile: newQuantity > 0,
        updated_at: Timestamp.now(),
      };

      transaction.update(componentRef, updateData);

      // Aggiorna risultato
      result.success = true;
      result.oldQuantity = oldQuantity;
      result.newQuantity = newQuantity;
      result.actualChange = request.quantityChange;
    });

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Errore sconosciuto';
    return result;
  }
}

// ============================================================================
// AGGIORNAMENTO STOCK BATCH (RACE-SAFE)
// ============================================================================

/**
 * Aggiorna lo stock di più componenti in un'unica transazione
 * Garantisce atomicità: o tutti gli aggiornamenti riescono o nessuno
 */
export async function updateComponentsStockBatch(
  requests: StockUpdateRequest[]
): Promise<BatchStockUpdateResult> {
  const result: BatchStockUpdateResult = {
    success: false,
    results: [],
    failedUpdates: [],
    errors: [],
  };

  if (requests.length === 0) {
    result.success = true;
    return result;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const componentRefs = requests.map(req => 
        doc(db, 'menu_components', req.componentId)
      );

      // Leggi tutti i componenti
      const componentDocs = await Promise.all(
        componentRefs.map(ref => transaction.get(ref))
      );

      // Valida che tutti i componenti esistano
      for (let i = 0; i < componentDocs.length; i++) {
        const componentDoc = componentDocs[i];
        const request = requests[i];

        if (!componentDoc.exists()) {
          throw new Error(`Componente ${request.componentId} non trovato`);
        }
      }

      // Calcola tutti gli aggiornamenti e valida
      const updates: Array<{
        ref: any;
        oldQuantity: number;
        newQuantity: number;
        componentData: MenuComponent;
        request: StockUpdateRequest;
      }> = [];

      for (let i = 0; i < componentDocs.length; i++) {
        const componentDoc = componentDocs[i];
        const request = requests[i];
        const componentData = componentDoc.data() as MenuComponent;

        // Skip componenti illimitati
        if (componentData.is_illimitato) {
          result.results.push({
            success: true,
            componentId: request.componentId,
            oldQuantity: Infinity,
            newQuantity: Infinity,
            actualChange: 0,
          });
          continue;
        }

        const oldQuantity = componentData.giacenza;
        const newQuantity = oldQuantity + request.quantityChange;

        // Validazione stock
        if (newQuantity < 0) {
          throw new Error(
            `Stock insufficiente per ${componentData.nome}: richiesto ${Math.abs(request.quantityChange)}, disponibile ${oldQuantity}`
          );
        }

        updates.push({
          ref: componentRefs[i],
          oldQuantity,
          newQuantity,
          componentData,
          request,
        });
      }

      // Applica tutti gli aggiornamenti
      for (const update of updates) {
        const updateData: Partial<MenuComponent> = {
          giacenza: update.newQuantity,
          is_disponibile: update.newQuantity > 0,
          updated_at: Timestamp.now(),
        };

        transaction.update(update.ref, updateData);

        result.results.push({
          success: true,
          componentId: update.request.componentId,
          oldQuantity: update.oldQuantity,
          newQuantity: update.newQuantity,
          actualChange: update.request.quantityChange,
        });
      }
    });

    result.success = true;
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    result.errors.push(errorMessage);
    
    // Aggiungi failed updates per tutti i componenti
    for (const request of requests) {
      result.failedUpdates.push(request.componentId);
      result.results.push({
        success: false,
        componentId: request.componentId,
        oldQuantity: 0,
        newQuantity: 0,
        actualChange: 0,
        error: errorMessage,
      });
    }

    return result;
  }
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/**
 * Converte un ordine in richieste di aggiornamento stock
 * Usato per scalare le scorte quando viene creato un ordine
 */
export function createStockUpdateRequestsFromOrder(
  orderLines: Array<{
    menu_item_id: string;
    quantita: number;
  }>,
  menuItems: Array<{
    id: string;
    componenti: Array<{
      component_id: string;
      quantita: number;
    }>;
  }>,
  orderId: string
): StockUpdateRequest[] {
  const requests: StockUpdateRequest[] = [];

  for (const line of orderLines) {
    const menuItem = menuItems.find(item => item.id === line.menu_item_id);
    if (!menuItem) continue;

    for (const component of menuItem.componenti) {
      const existingRequest = requests.find(r => r.componentId === component.component_id);
      
      if (existingRequest) {
        // Accumula la quantità se il componente è già presente
        existingRequest.quantityChange -= component.quantita * line.quantita;
      } else {
        // Crea nuova richiesta
        requests.push({
          componentId: component.component_id,
          quantityChange: -(component.quantita * line.quantita), // Negativo per decrementare
          orderId,
          reason: `Ordine #${orderId}`,
        });
      }
    }
  }

  return requests;
}

/**
 * Converte un ordine cancellato in richieste di ripristino stock
 * Usato per riaccreditare le scorte quando viene cancellato un ordine
 */
export function createStockRestoreRequestsFromOrder(
  orderLines: Array<{
    menu_item_id: string;
    quantita: number;
  }>,
  menuItems: Array<{
    id: string;
    componenti: Array<{
      component_id: string;
      quantita: number;
    }>;
  }>,
  orderId: string
): StockUpdateRequest[] {
  const requests: StockUpdateRequest[] = [];

  for (const line of orderLines) {
    const menuItem = menuItems.find(item => item.id === line.menu_item_id);
    if (!menuItem) continue;

    for (const component of menuItem.componenti) {
      const existingRequest = requests.find(r => r.componentId === component.component_id);
      
      if (existingRequest) {
        // Accumula la quantità se il componente è già presente
        existingRequest.quantityChange += component.quantita * line.quantita;
      } else {
        // Crea nuova richiesta
        requests.push({
          componentId: component.component_id,
          quantityChange: component.quantita * line.quantita, // Positivo per incrementare
          orderId,
          reason: `Cancellazione ordine #${orderId}`,
        });
      }
    }
  }

  return requests;
}

/**
 * Verifica se uno stock update è possibile senza eseguirlo
 * Utile per validazioni preliminari
 */
export async function validateStockUpdate(
  request: StockUpdateRequest
): Promise<{ valid: boolean; availableStock?: number; error?: string }> {
  try {
    const componentRef = doc(db, 'menu_components', request.componentId);
    const componentDoc = await getDoc(componentRef);

    if (!componentDoc.exists()) {
      return { valid: false, error: `Componente ${request.componentId} non trovato` };
    }

    const componentData = componentDoc.data() as MenuComponent;

    // Componenti illimitati sono sempre validi
    if (componentData.is_illimitato) {
      return { valid: true, availableStock: Infinity };
    }

    const newQuantity = componentData.giacenza + request.quantityChange;

    if (newQuantity < 0) {
      return {
        valid: false,
        availableStock: componentData.giacenza,
        error: `Stock insufficiente: richiesto ${Math.abs(request.quantityChange)}, disponibile ${componentData.giacenza}`,
      };
    }

    return { valid: true, availableStock: componentData.giacenza };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Errore di validazione',
    };
  }
}

/**
 * Ottiene lo stock corrente di un componente
 */
export async function getCurrentStock(componentId: string): Promise<{
  success: boolean;
  stock?: number;
  isUnlimited?: boolean;
  error?: string;
}> {
  try {
    const componentRef = doc(db, 'menu_components', componentId);
    const componentDoc = await getDoc(componentRef);

    if (!componentDoc.exists()) {
      return { success: false, error: `Componente ${componentId} non trovato` };
    }

    const componentData = componentDoc.data() as MenuComponent;
    
    return {
      success: true,
      stock: componentData.giacenza,
      isUnlimited: componentData.is_illimitato,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore nel recupero stock',
    };
  }
}
