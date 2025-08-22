// ============================================================================
// REGOLE DI BUSINESS - SISTEMA SAGRA ORDERS
// ============================================================================

import { Order, OrderLine, MenuItem, MenuComponent, OrderStatus } from '../types/dataModel';

// ============================================================================
// REGOLE STATI ORDINE
// ============================================================================

/**
 * Regole di transizione stati ordine
 * ORDINATO → PRONTO → (ANNULLATO solo da ORDINATO)
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  in_attesa: ['ordinato', 'cancellato'],
  ordinato: ['pronto', 'cancellato'],
  pronto: ['completato'],
  completato: [], // Stato finale
  cancellato: [], // Stato finale
};

/**
 * Verifica se una transizione di stato è valida
 */
export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  return ORDER_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Verifica se un ordine può essere modificato
 * Solo se è in stato ORDINATO
 */
export function canModifyOrder(order: Order): boolean {
  return order.stato === 'ordinato';
}

// ============================================================================
// REGOLE GESTIONE SCORTE
// ============================================================================

/**
 * Verifica se è possibile aggiungere una quantità a un ordine
 * Controlla che non si superi la scorta disponibile
 */
export function canAddToOrder(
  component: MenuComponent,
  requestedQuantity: number,
  currentOrderQuantity: number = 0
): { canAdd: boolean; availableQuantity: number; reason?: string } {
  // Se il componente è illimitato, sempre disponibile
  if (component.is_illimitato) {
    return { canAdd: true, availableQuantity: Infinity };
  }

  // Se il componente non è disponibile, non si può aggiungere
  if (!component.is_disponibile) {
    return { 
      canAdd: false, 
      availableQuantity: 0, 
      reason: 'Componente non disponibile' 
    };
  }

  // Calcola quantità disponibile
  const availableQuantity = component.giacenza - currentOrderQuantity;

  if (availableQuantity <= 0) {
    return { 
      canAdd: false, 
      availableQuantity: 0, 
      reason: 'Scorte esaurite' 
    };
  }

  if (requestedQuantity > availableQuantity) {
    return { 
      canAdd: false, 
      availableQuantity, 
      reason: `Quantità richiesta (${requestedQuantity}) supera disponibilità (${availableQuantity})` 
    };
  }

  return { canAdd: true, availableQuantity };
}

/**
 * Verifica se un menu item è disponibile per l'ordine
 * Controlla che tutti i componenti abbiano scorte sufficienti
 */
export function isMenuItemAvailable(
  menuItem: MenuItem,
  components: MenuComponent[],
  currentOrderQuantities: Record<string, number> = {}
): { available: boolean; missingComponents: string[]; reason?: string } {
  if (!menuItem.is_attivo || menuItem.is_sold_out) {
    return { 
      available: false, 
      missingComponents: [], 
      reason: 'Menu item non attivo o esaurito' 
    };
  }

  const missingComponents: string[] = [];

  for (const component of menuItem.componenti) {
    const componentData = components.find(c => c.id === component.component_id);
    if (!componentData) {
      missingComponents.push(component.nome_snapshot || 'Componente sconosciuto');
      continue;
    }

    const currentQuantity = currentOrderQuantities[component.component_id] || 0;
    const check = canAddToOrder(componentData, component.quantita, currentQuantity);
    
    if (!check.canAdd) {
      missingComponents.push(componentData.nome);
    }
  }

  if (missingComponents.length > 0) {
    return { 
      available: false, 
      missingComponents, 
      reason: `Componenti non disponibili: ${missingComponents.join(', ')}` 
    };
  }

  return { available: true, missingComponents: [] };
}

// ============================================================================
// REGOLE PREZZI
// ============================================================================

/**
 * Verifica che i prezzi dei menu item non sommino i componenti
 * I componenti devono avere prezzo 0 quando usati nei menu
 */
export function validateMenuItemPricing(
  menuItem: MenuItem,
  components: MenuComponent[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verifica che il prezzo del menu item sia indipendente dai componenti
  if (menuItem.prezzo <= 0) {
    errors.push('Il prezzo del menu item deve essere maggiore di 0');
  }

  // Verifica che i componenti usati nei menu abbiano prezzo 0
  for (const component of menuItem.componenti) {
    const componentData = components.find(c => c.id === component.component_id);
    if (componentData && componentData.prezzo_base > 0) {
      errors.push(`Il componente "${componentData.nome}" ha prezzo > 0 ma è usato in un menu`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calcola il prezzo totale di un ordine
 * Esclude gli ordini staff (prezzo 0)
 */
export function calculateOrderTotal(
  orderLines: OrderLine[],
  isStaff: boolean = false
): number {
  if (isStaff) {
    return 0; // Ordini staff sono gratuiti
  }

  return orderLines.reduce((total, line) => {
    return total + line.prezzo_totale;
  }, 0);
}

// ============================================================================
// REGOLE PRIORITÀ CUCINA
// ============================================================================

/**
 * Ordina gli ordini per priorità in cucina
 * 1. Ordini prioritari (is_prioritario = true)
 * 2. Per priorità cucina (priorita_cucina: 1=alta, 5=bassa)
 * 3. Per progressivo (FIFO)
 */
export function sortOrdersByKitchenPriority(
  orders: Order[],
  menuItems: MenuItem[]
): Order[] {
  return [...orders].sort((a, b) => {
    // 1. Priorità ordine (staff e prioritari prima)
    if (a.is_prioritario && !b.is_prioritario) return -1;
    if (!a.is_prioritario && b.is_prioritario) return 1;

    // 2. Priorità cucina (1=alta, 5=bassa)
    const aMenuItem = menuItems.find(item => 
      item.id === a.id || a.componenti?.some(c => c.component_id === item.id)
    );
    const bMenuItem = menuItems.find(item => 
      item.id === b.id || b.componenti?.some(c => c.component_id === item.id)
    );

    if (aMenuItem && bMenuItem) {
      if (aMenuItem.priorita_cucina !== bMenuItem.priorita_cucina) {
        return aMenuItem.priorita_cucina - bMenuItem.priorita_cucina;
      }
    }

    // 3. Progressivo (FIFO)
    return a.progressivo - b.progressivo;
  });
}

// ============================================================================
// REGOLE VALIDAZIONE ORDINE COMPLETO
// ============================================================================

/**
 * Valida un ordine completo prima del salvataggio
 */
export function validateOrder(
  order: Order,
  orderLines: OrderLine[],
  menuItems: MenuItem[],
  components: MenuComponent[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verifica stato ordine
  if (!order.stato || !Object.values(ORDER_STATUS_TRANSITIONS).flat().includes(order.stato)) {
    errors.push('Stato ordine non valido');
  }

  // Verifica che l'ordine abbia almeno una riga
  if (orderLines.length === 0) {
    errors.push('L\'ordine deve contenere almeno un articolo');
  }

  // Verifica disponibilità componenti
  for (const line of orderLines) {
    const menuItem = menuItems.find(item => item.id === line.menu_item_id);
    if (menuItem) {
      const availability = isMenuItemAvailable(menuItem, components);
      if (!availability.available) {
        errors.push(`Menu item "${menuItem.nome}": ${availability.reason}`);
      }
    }
  }

  // Verifica prezzo totale
  const calculatedTotal = calculateOrderTotal(orderLines, order.is_staff);
  if (Math.abs(calculatedTotal - order.totale) > 1) { // Tolleranza 1 centesimo
    warnings.push(`Prezzo totale calcolato (${calculatedTotal}) differisce da quello specificato (${order.totale})`);
  }

  // Verifica modificabilità
  if (order.stato === 'pronto' && order.can_modify) {
    warnings.push('Ordini in stato "pronto" non dovrebbero essere modificabili');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// REGOLE AGGIORNAMENTO SCORTE
// ============================================================================

/**
 * Calcola le nuove scorte dopo un ordine
 * Considera le modifiche e le cancellazioni
 */
export function calculateStockChanges(
  orderLines: OrderLine[],
  isNewOrder: boolean = true
): Array<{ componentId: string; quantityChange: number; newStock: number }> {
  const stockChanges: Record<string, number> = {};

  for (const line of orderLines) {
    const quantity = isNewOrder ? -line.quantita : line.quantita; // - per nuovo ordine, + per cancellazione
    
    if (stockChanges[line.menu_item_id]) {
      stockChanges[line.menu_item_id] += quantity;
    } else {
      stockChanges[line.menu_item_id] = quantity;
    }
  }

  return Object.entries(stockChanges).map(([componentId, quantityChange]) => ({
    componentId,
    quantityChange,
    newStock: 0 // Sarà calcolato dal chiamante
  }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Verifica se un componente è in sold-out
 */
export function isComponentSoldOut(component: MenuComponent): boolean {
  if (component.is_illimitato) return false;
  return component.giacenza <= 0 || !component.is_disponibile;
}

/**
 * Verifica se un menu item è in sold-out
 */
export function isMenuItemSoldOut(
  menuItem: MenuItem,
  components: MenuComponent[]
): boolean {
  if (menuItem.is_sold_out) return true;
  
  for (const component of menuItem.componenti) {
    const componentData = components.find(c => c.id === component.component_id);
    if (componentData && isComponentSoldOut(componentData)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Aggiorna lo stato sold-out di un menu item
 */
export function updateMenuItemSoldOutStatus(
  menuItem: MenuItem,
  components: MenuComponent[]
): boolean {
  return isMenuItemSoldOut(menuItem, components);
}
