import {
  Order,
  OrderLine,
  MenuItem,
  User,
  Category,
  ValidationResult,
  PriceCalculation,
  PriceSnapshot,
  NameSnapshot,
} from '../types/dataModel';

// ============================================================================
// VALIDAZIONE ORDINI
// ============================================================================

/**
 * Valida le invarianti di un ordine
 */
export function validateOrderInvariants(order: Order): ValidationResult {
  const errors: string[] = [];

  // Verifica che ci siano items
  if (order.items.length === 0) {
    errors.push("L'ordine deve contenere almeno un elemento");
  }

  // Verifica calcolo subtotale
  const calculatedSubtotal = order.items.reduce(
    (sum, item) => sum + item.prezzo_totale,
    0
  );

  if (calculatedSubtotal !== order.subtotale) {
    errors.push(
      `Il subtotale (${order.subtotale}) non corrisponde alla somma delle righe (${calculatedSubtotal})`
    );
  }

  // Verifica calcolo totale
  const calculatedTotal = order.subtotale - order.sconto;
  if (calculatedTotal !== order.totale) {
    errors.push(
      `Il totale (${order.totale}) non corrisponde al calcolo (subtotale ${order.subtotale} - sconto ${order.sconto} = ${calculatedTotal})`
    );
  }

  // Verifica che lo sconto non sia negativo
  if (order.sconto < 0) {
    errors.push('Lo sconto non può essere negativo');
  }

  // Verifica che il totale sia positivo
  if (order.totale <= 0) {
    errors.push('Il totale deve essere positivo');
  }

  // Verifica che il progressivo sia positivo
  if (order.progressivo <= 0) {
    errors.push('Il progressivo deve essere positivo');
  }

  // Verifica che il cliente non sia vuoto
  if (!order.cliente || order.cliente.trim() === '') {
    errors.push('Il nome del cliente è obbligatorio');
  }

  // Verifica che le date siano valide
  if (order.created_at > order.updated_at) {
    errors.push(
      'La data di creazione non può essere successiva alla data di aggiornamento'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida le invarianti di una riga ordine
 */
export function validateOrderLineInvariants(
  orderLine: OrderLine
): ValidationResult {
  const errors: string[] = [];

  // Verifica che la quantità sia positiva
  if (orderLine.quantita <= 0) {
    errors.push('La quantità deve essere positiva');
  }

  // Verifica che il prezzo unitario sia positivo
  if (orderLine.prezzo_unitario <= 0) {
    errors.push('Il prezzo unitario deve essere positivo');
  }

  // Verifica calcolo prezzo totale
  const calculatedTotal = orderLine.quantita * orderLine.prezzo_unitario;
  if (calculatedTotal !== orderLine.prezzo_totale) {
    errors.push(
      `Il prezzo totale (${orderLine.prezzo_totale}) non corrisponde al calcolo (quantità ${orderLine.quantita} × prezzo ${orderLine.prezzo_unitario} = ${calculatedTotal})`
    );
  }

  // Verifica che il nome snapshot non sia vuoto
  if (!orderLine.nome_snapshot || orderLine.nome_snapshot.trim() === '') {
    errors.push('Il nome snapshot è obbligatorio');
  }

  // Verifica che la categoria snapshot non sia vuota
  if (
    !orderLine.categoria_snapshot ||
    orderLine.categoria_snapshot.trim() === ''
  ) {
    errors.push('La categoria snapshot è obbligatoria');
  }

  // Verifica che l'order_id non sia vuoto
  if (!orderLine.order_id || orderLine.order_id.trim() === '') {
    errors.push("L'ID ordine è obbligatorio");
  }

  // Verifica che il menu_item_id non sia vuoto
  if (!orderLine.menu_item_id || orderLine.menu_item_id.trim() === '') {
    errors.push("L'ID menu item è obbligatorio");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida le invarianti di un menu item
 */
export function validateMenuItemInvariants(
  menuItem: MenuItem
): ValidationResult {
  const errors: string[] = [];

  // Verifica che il prezzo sia positivo
  if (menuItem.prezzo <= 0) {
    errors.push('Il prezzo deve essere positivo');
  }

  // Verifica che ci siano componenti
  if (menuItem.componenti.length === 0) {
    errors.push('Il menu item deve avere almeno un componente');
  }

  // Verifica calcolo prezzo dai componenti
  const calculatedPrice = menuItem.componenti.reduce(
    (sum, comp) => sum + comp.quantita * comp.prezzo_unitario,
    0
  );

  if (calculatedPrice !== menuItem.prezzo) {
    errors.push(
      `Il prezzo (${menuItem.prezzo}) non corrisponde alla somma dei componenti (${calculatedPrice})`
    );
  }

  // Verifica che il nome non sia vuoto
  if (!menuItem.nome || menuItem.nome.trim() === '') {
    errors.push('Il nome è obbligatorio');
  }

  // Verifica che la categoria_id non sia vuota
  if (!menuItem.categoria_id || menuItem.categoria_id.trim() === '') {
    errors.push('La categoria è obbligatoria');
  }

  // Verifica che i componenti abbiano quantità positive
  menuItem.componenti.forEach((comp, index) => {
    if (comp.quantita <= 0) {
      errors.push(
        `Il componente ${index + 1} deve avere una quantità positiva`
      );
    }
    if (comp.prezzo_unitario <= 0) {
      errors.push(`Il componente ${index + 1} deve avere un prezzo positivo`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida le invarianti di un utente
 */
export function validateUserInvariants(user: User): ValidationResult {
  const errors: string[] = [];

  // Verifica che il nome non sia vuoto
  if (!user.nome || user.nome.trim() === '') {
    errors.push('Il nome è obbligatorio');
  }

  // Verifica che l'email sia valida
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!user.email || !emailRegex.test(user.email)) {
    errors.push("L'email deve essere valida");
  }

  // Verifica che il ruolo sia valido
  const validRoles = ['admin', 'cassa', 'cucina'];
  if (!validRoles.includes(user.role)) {
    errors.push(
      `Il ruolo deve essere uno dei seguenti: ${validRoles.join(', ')}`
    );
  }

  // Verifica che le date siano valide
  if (user.created_at > user.updated_at) {
    errors.push(
      'La data di creazione non può essere successiva alla data di aggiornamento'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida le invarianti di una categoria
 */
export function validateCategoryInvariants(
  category: Category
): ValidationResult {
  const errors: string[] = [];

  // Verifica che il nome non sia vuoto
  if (!category.nome || category.nome.trim() === '') {
    errors.push('Il nome è obbligatorio');
  }

  // Verifica che l'ordine sia positivo
  if (category.ordine < 0) {
    errors.push("L'ordine deve essere positivo o zero");
  }

  // Verifica che le date siano valide
  if (category.created_at > category.updated_at) {
    errors.push(
      'La data di creazione non può essere successiva alla data di aggiornamento'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// CALCOLI PREZZI
// ============================================================================

/**
 * Calcola il prezzo totale di un ordine
 */
export function calculateOrderTotal(order: Order): PriceCalculation {
  const subtotale = order.items.reduce(
    (sum, item) => sum + item.prezzo_totale,
    0
  );
  const sconto = order.sconto;
  const totale = subtotale - sconto;

  return {
    subtotale,
    sconto,
    totale,
  };
}

/**
 * Calcola il prezzo totale di una riga ordine
 */
export function calculateOrderLineTotal(orderLine: OrderLine): number {
  return orderLine.quantita * orderLine.prezzo_unitario;
}

/**
 * Calcola il prezzo totale di un menu item dai componenti
 */
export function calculateMenuItemPrice(menuItem: MenuItem): number {
  return menuItem.componenti.reduce(
    (sum, comp) => sum + comp.quantita * comp.prezzo_unitario,
    0
  );
}

// ============================================================================
// SNAPSHOT E SERIALIZZAZIONE
// ============================================================================

/**
 * Crea uno snapshot dei prezzi al momento dell'ordine
 */
export function createPriceSnapshot(menuItem: MenuItem): PriceSnapshot {
  return {
    prezzo_unitario: menuItem.prezzo,
    prezzo_componenti: menuItem.componenti.map(comp => ({
      component_id: comp.component_id,
      prezzo_unitario: comp.prezzo_unitario,
      nome: comp.nome_snapshot,
    })),
    timestamp: new Date(),
  };
}

/**
 * Crea uno snapshot dei nomi al momento dell'ordine
 */
export function createNameSnapshot(menuItem: MenuItem): NameSnapshot {
  return {
    nome_piatto: menuItem.nome,
    nome_categoria: menuItem.categoria_id,
    descrizione: menuItem.descrizione,
    allergeni: menuItem.allergeni,
    timestamp: new Date(),
  };
}

/**
 * Crea una riga ordine con snapshot
 */
export function createOrderLine(
  orderId: string,
  menuItem: MenuItem,
  quantita: number,
  note?: string
): OrderLine {
  const prezzo_unitario = menuItem.prezzo;
  const prezzo_totale = quantita * prezzo_unitario;

  return {
    id: '', // Sarà generato da Firestore
    order_id: orderId,
    menu_item_id: menuItem.id,
    quantita,
    prezzo_unitario,
    prezzo_totale,
    note,
    stato: 'in_attesa',
    nome_snapshot: menuItem.nome,
    categoria_snapshot: menuItem.categoria_id,
    allergeni_snapshot: menuItem.allergeni,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// ============================================================================
// VALIDAZIONE COMPLETA
// ============================================================================

/**
 * Valida tutte le invarianti di un ordine completo
 */
export function validateCompleteOrder(order: Order): ValidationResult {
  const errors: string[] = [];

  // Valida l'ordine principale
  const orderValidation = validateOrderInvariants(order);
  if (!orderValidation.isValid) {
    errors.push(...orderValidation.errors);
  }

  // Valida ogni riga ordine
  order.items.forEach((item, index) => {
    const lineValidation = validateOrderLineInvariants(item);
    if (!lineValidation.isValid) {
      errors.push(`Riga ${index + 1}: ${lineValidation.errors.join(', ')}`);
    }
  });

  // Verifica che tutti gli items abbiano lo stesso order_id
  const invalidItems = order.items.filter(item => item.order_id !== order.id);
  if (invalidItems.length > 0) {
    errors.push('Tutte le righe ordine devono riferirsi allo stesso ordine');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valida un'entità generica
 */
export function validateEntity(
  entity: any,
  entityType: string
): ValidationResult {
  switch (entityType) {
    case 'order':
      return validateOrderInvariants(entity as Order);
    case 'orderLine':
      return validateOrderLineInvariants(entity as OrderLine);
    case 'menuItem':
      return validateMenuItemInvariants(entity as MenuItem);
    case 'user':
      return validateUserInvariants(entity as User);
    case 'category':
      return validateCategoryInvariants(entity as Category);
    default:
      return {
        isValid: false,
        errors: [`Tipo entità non supportato: ${entityType}`],
      };
  }
}
