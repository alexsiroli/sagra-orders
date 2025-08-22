// ============================================================================
// SISTEMA VALIDAZIONI E CALCOLI - SAGRA ORDERS
// ============================================================================

import {
  Order,
  OrderLine,
  MenuItem,
  MenuComponent,
  Category,
} from '../types/dataModel';

// ============================================================================
// INTERFACCE VALIDAZIONE
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface QuantityValidationResult extends ValidationResult {
  maxQuantity?: number;
  availableStock?: number;
}

export interface NoteValidationResult extends ValidationResult {
  charCount: number;
  maxChars: number;
}

export interface StockValidationResult extends ValidationResult {
  missingComponents: Array<{
    componentId: string;
    componentName: string;
    required: number;
    available: number;
  }>;
}

export interface CalculationResult {
  subtotal: number; // Subtotale prima di sconti
  discount: number; // Sconto applicato
  total: number; // Totale finale
  itemsCount: number; // Numero articoli
  breakdown: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isStaff: boolean;
  }>;
}

export interface ChangeCalculationResult {
  received: number;
  total: number;
  change: number;
  isValid: boolean;
  error?: string;
}

// ============================================================================
// VALIDAZIONI QUANTITÀ
// ============================================================================

/**
 * Valida la quantità per un articolo specifico
 */
export function validateQuantity(
  quantity: number,
  menuItem: MenuItem,
  components: MenuComponent[],
  currentCartQuantity: number = 0
): QuantityValidationResult {
  const result: QuantityValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validazione base quantità
  if (quantity <= 0) {
    result.isValid = false;
    result.errors.push('La quantità deve essere maggiore di 0');
    return result;
  }

  if (!Number.isInteger(quantity)) {
    result.isValid = false;
    result.errors.push('La quantità deve essere un numero intero');
    return result;
  }

  if (quantity > 999) {
    result.isValid = false;
    result.errors.push('La quantità non può superare 999');
    return result;
  }

  // Validazione stock per i componenti
  let maxQuantityAllowed = Infinity;
  const componentIssues: string[] = [];

  for (const component of menuItem.componenti) {
    const componentData = components.find(c => c.id === component.component_id);

    if (!componentData) {
      result.errors.push(`Componente ${component.nome_snapshot} non trovato`);
      result.isValid = false;
      continue;
    }

    // Skip validazione stock per componenti illimitati
    if (componentData.is_illimitato) {
      continue;
    }

    // Componente non disponibile
    if (!componentData.is_disponibile) {
      result.errors.push(`Componente ${componentData.nome} non disponibile`);
      result.isValid = false;
      continue;
    }

    // Calcola quantità disponibile
    const requiredPerItem = component.quantita;
    const totalRequired = quantity * requiredPerItem;
    const currentlyUsed = currentCartQuantity * requiredPerItem;
    const availableStock = componentData.giacenza - currentlyUsed;

    if (availableStock <= 0) {
      result.errors.push(`Stock esaurito per ${componentData.nome}`);
      result.isValid = false;
      continue;
    }

    if (totalRequired > availableStock) {
      const maxForThisComponent = Math.floor(availableStock / requiredPerItem);
      maxQuantityAllowed = Math.min(maxQuantityAllowed, maxForThisComponent);
      componentIssues.push(
        `${componentData.nome}: richiesti ${totalRequired}, disponibili ${availableStock}`
      );
    }

    // Warning per stock basso
    if (availableStock <= componentData.giacenza_minima) {
      result.warnings.push(`Stock basso per ${componentData.nome}`);
    }
  }

  // Se ci sono problemi di stock, aggiungi errori
  if (componentIssues.length > 0) {
    result.isValid = false;
    result.errors.push(...componentIssues);
    result.maxQuantity =
      maxQuantityAllowed === Infinity ? 0 : maxQuantityAllowed;
  }

  return result;
}

/**
 * Valida l'intero carrello per problemi di stock
 */
export function validateCartStock(
  cartItems: Array<{
    menuItem: MenuItem;
    quantity: number;
  }>,
  components: MenuComponent[]
): StockValidationResult {
  const result: StockValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    missingComponents: [],
  };

  // Raggruppa utilizzo componenti per item del carrello
  const componentUsage = new Map<string, number>();

  for (const cartItem of cartItems) {
    for (const component of cartItem.menuItem.componenti) {
      const currentUsage = componentUsage.get(component.component_id) || 0;
      const additionalUsage = cartItem.quantity * component.quantita;
      componentUsage.set(
        component.component_id,
        currentUsage + additionalUsage
      );
    }
  }

  // Verifica stock per ogni componente utilizzato
  for (const [componentId, totalUsage] of componentUsage) {
    const componentData = components.find(c => c.id === componentId);

    if (!componentData) {
      result.errors.push(`Componente con ID ${componentId} non trovato`);
      result.isValid = false;
      continue;
    }

    // Skip per componenti illimitati
    if (componentData.is_illimitato) {
      continue;
    }

    if (totalUsage > componentData.giacenza) {
      result.isValid = false;
      result.missingComponents.push({
        componentId: componentData.id,
        componentName: componentData.nome,
        required: totalUsage,
        available: componentData.giacenza,
      });
    }
  }

  if (result.missingComponents.length > 0) {
    result.errors.push(
      `Stock insufficiente per: ${result.missingComponents
        .map(c => c.componentName)
        .join(', ')}`
    );
  }

  return result;
}

// ============================================================================
// VALIDAZIONI NOTE
// ============================================================================

/**
 * Valida le note di un ordine o riga
 */
export function validateNote(note: string): NoteValidationResult {
  const maxChars = 2000;
  const charCount = note.length;

  const result: NoteValidationResult = {
    isValid: charCount <= maxChars,
    errors: [],
    warnings: [],
    charCount,
    maxChars,
  };

  if (charCount > maxChars) {
    result.errors.push(
      `Note troppo lunghe: ${charCount}/${maxChars} caratteri`
    );
  }

  if (charCount > maxChars * 0.9) {
    result.warnings.push(
      `Note quasi al limite: ${charCount}/${maxChars} caratteri`
    );
  }

  // Validazione caratteri speciali
  const invalidChars = note.match(/[<>\"'&]/g);
  if (invalidChars) {
    result.warnings.push(
      `Caratteri speciali rilevati: ${[...new Set(invalidChars)].join(', ')}`
    );
  }

  return result;
}

// ============================================================================
// CALCOLI TOTALI
// ============================================================================

/**
 * Calcola il totale di un ordine con breakdown dettagliato
 */
export function calculateOrderTotal(
  cartItems: Array<{
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
    isStaff?: boolean;
    isPriority?: boolean;
  }>
): CalculationResult {
  const result: CalculationResult = {
    subtotal: 0,
    discount: 0,
    total: 0,
    itemsCount: 0,
    breakdown: [],
  };

  for (const item of cartItems) {
    const isStaff = item.isStaff || false;
    const unitPrice = isStaff ? 0 : item.menuItem.prezzo;
    const lineTotal = unitPrice * item.quantity;

    result.breakdown.push({
      itemName: item.menuItem.nome,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      isStaff,
    });

    result.subtotal += lineTotal;
    result.itemsCount += item.quantity;

    // Calcola sconto staff
    if (isStaff) {
      result.discount += item.menuItem.prezzo * item.quantity;
    }
  }

  result.total = result.subtotal;

  return result;
}

/**
 * Calcola il resto con arrotondamento corretto
 */
export function calculateChange(
  total: number,
  received: number
): ChangeCalculationResult {
  const result: ChangeCalculationResult = {
    received,
    total,
    change: 0,
    isValid: true,
  };

  // Validazioni input
  if (total < 0) {
    result.isValid = false;
    result.error = 'Il totale non può essere negativo';
    return result;
  }

  if (received < 0) {
    result.isValid = false;
    result.error = "L'importo ricevuto non può essere negativo";
    return result;
  }

  if (received < total) {
    result.isValid = false;
    result.error = 'Importo ricevuto insufficiente';
    return result;
  }

  // Calcola resto con arrotondamento a 2 decimali
  const changeRaw = received - total;
  result.change = Math.round(changeRaw);

  return result;
}

// ============================================================================
// VALIDAZIONI ORDINE COMPLETO
// ============================================================================

/**
 * Valida un ordine completo prima del salvataggio
 */
export function validateCompleteOrder(
  orderData: {
    cliente: string;
    note?: string;
    cartItems: Array<{
      menuItem: MenuItem;
      quantity: number;
      notes?: string;
      isStaff?: boolean;
      isPriority?: boolean;
    }>;
  },
  components: MenuComponent[]
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Validazione cliente
  if (!orderData.cliente || orderData.cliente.trim().length === 0) {
    result.errors.push('Nome cliente richiesto');
    result.isValid = false;
  }

  if (orderData.cliente && orderData.cliente.length > 100) {
    result.errors.push('Nome cliente troppo lungo (max 100 caratteri)');
    result.isValid = false;
  }

  // Validazione carrello non vuoto
  if (!orderData.cartItems || orderData.cartItems.length === 0) {
    result.errors.push('Il carrello non può essere vuoto');
    result.isValid = false;
    return result;
  }

  // Validazione note ordine
  if (orderData.note) {
    const noteValidation = validateNote(orderData.note);
    if (!noteValidation.isValid) {
      result.errors.push(...noteValidation.errors);
      result.isValid = false;
    }
    result.warnings.push(...noteValidation.warnings);
  }

  // Validazione ogni item del carrello
  for (let i = 0; i < orderData.cartItems.length; i++) {
    const item = orderData.cartItems[i];

    // Validazione quantità
    const qtyValidation = validateQuantity(
      item.quantity,
      item.menuItem,
      components
    );

    if (!qtyValidation.isValid) {
      result.errors.push(`Riga ${i + 1}: ${qtyValidation.errors.join(', ')}`);
      result.isValid = false;
    }
    result.warnings.push(...qtyValidation.warnings);

    // Validazione note riga
    if (item.notes) {
      const lineNoteValidation = validateNote(item.notes);
      if (!lineNoteValidation.isValid) {
        result.errors.push(
          `Riga ${i + 1} note: ${lineNoteValidation.errors.join(', ')}`
        );
        result.isValid = false;
      }
    }
  }

  // Validazione stock complessiva carrello
  const stockValidation = validateCartStock(
    orderData.cartItems.map(item => ({
      menuItem: item.menuItem,
      quantity: item.quantity,
    })),
    components
  );

  if (!stockValidation.isValid) {
    result.errors.push(...stockValidation.errors);
    result.isValid = false;
  }

  return result;
}

// ============================================================================
// UTILITY HELPER
// ============================================================================

/**
 * Formatta un prezzo in centesimi come stringa Euro
 */
export function formatPrice(priceInCents: number): string {
  return `€${(priceInCents / 100).toFixed(2)}`;
}

/**
 * Converte un prezzo Euro in centesimi
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[€\s]/g, '').replace(',', '.');
  const price = parseFloat(cleaned);

  if (isNaN(price)) return 0;

  // Se non ci sono decimali, assume che sia in euro e converte in centesimi
  if (!cleaned.includes('.')) {
    return Math.round(price * 100);
  }

  // Se ci sono decimali, assume che sia già nel formato corretto
  return Math.round(price * 100);
}

/**
 * Valida un prezzo in formato stringa
 */
export function validatePriceString(priceString: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!priceString || priceString.trim().length === 0) {
    result.errors.push('Prezzo richiesto');
    result.isValid = false;
    return result;
  }

  const price = parsePrice(priceString);

  if (price < 0) {
    result.errors.push('Il prezzo non può essere negativo');
    result.isValid = false;
  }

  if (price > 999999) {
    result.errors.push('Prezzo troppo alto (max €9999.99)');
    result.isValid = false;
  }

  return result;
}
