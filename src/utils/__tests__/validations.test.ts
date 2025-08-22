// ============================================================================
// TEST UNITARI - VALIDAZIONI E CALCOLI
// ============================================================================

import { describe, test, expect } from 'vitest';
import {
  validateQuantity,
  validateCartStock,
  validateNote,
  calculateOrderTotal,
  calculateChange,
  validateCompleteOrder,
  formatPrice,
  parsePrice,
  validatePriceString,
} from '../validations';
import { MenuItem, MenuComponent } from '../../types/dataModel';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockComponents: MenuComponent[] = [
  {
    id: 'comp1',
    nome: 'Pasta',
    descrizione: 'Pasta fresca',
    prezzo_base: 100,
    categoria_id: 'cat1',
    unita_misura: 'grammi',
    giacenza: 10,
    giacenza_minima: 2,
    is_attivo: true,
    is_disponibile: true,
    is_illimitato: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'comp2',
    nome: 'Sugo',
    descrizione: 'Sugo di pomodoro',
    prezzo_base: 0,
    categoria_id: 'cat1',
    unita_misura: 'porzioni',
    giacenza: 5,
    giacenza_minima: 1,
    is_attivo: true,
    is_disponibile: true,
    is_illimitato: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'comp3',
    nome: 'Acqua',
    descrizione: 'Acqua illimitata',
    prezzo_base: 0,
    categoria_id: 'cat2',
    unita_misura: 'litri',
    giacenza: 0,
    giacenza_minima: 0,
    is_attivo: true,
    is_disponibile: true,
    is_illimitato: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockMenuItem: MenuItem = {
  id: 'item1',
  nome: 'Pasta al Pomodoro',
  descrizione: 'Deliziosa pasta al pomodoro',
  prezzo: 800,
  categoria_id: 'cat1',
  componenti: [
    {
      component_id: 'comp1',
      quantita: 1,
      nome_snapshot: 'Pasta',
      unita_misura: 'grammi',
    },
    {
      component_id: 'comp2',
      quantita: 1,
      nome_snapshot: 'Sugo',
      unita_misura: 'porzioni',
    },
  ],
  is_attivo: true,
  is_sold_out: false,
  priorita_cucina: 3,
  is_vegetariano: true,
  is_vegano: false,
  allergeni: [],
  tempo_preparazione: 15,
  created_at: new Date(),
  updated_at: new Date(),
};

// ============================================================================
// TEST VALIDAZIONE QUANTITÀ
// ============================================================================

describe('validateQuantity', () => {
  test('dovrebbe validare quantità positive', () => {
    const result = validateQuantity(2, mockMenuItem, mockComponents);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('dovrebbe rifiutare quantità <= 0', () => {
    const result = validateQuantity(0, mockMenuItem, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('La quantità deve essere maggiore di 0');
  });

  test('dovrebbe rifiutare quantità non intere', () => {
    const result = validateQuantity(2.5, mockMenuItem, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('La quantità deve essere un numero intero');
  });

  test('dovrebbe rifiutare quantità troppo grandi', () => {
    const result = validateQuantity(1000, mockMenuItem, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('La quantità non può superare 999');
  });

  test('dovrebbe controllare stock disponibile', () => {
    const result = validateQuantity(15, mockMenuItem, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('disponibili'))).toBe(true);
  });

  test('dovrebbe permettere componenti illimitati', () => {
    const unlimitedItem: MenuItem = {
      ...mockMenuItem,
      componenti: [
        {
          component_id: 'comp3',
          quantita: 1,
          nome_snapshot: 'Acqua',
          unita_misura: 'litri',
        },
      ],
    };
    
    const result = validateQuantity(100, unlimitedItem, mockComponents);
    expect(result.isValid).toBe(true);
  });

  test('dovrebbe considerare quantità già nel carrello', () => {
    const result = validateQuantity(8, mockMenuItem, mockComponents, 5);
    expect(result.isValid).toBe(false);
    expect(result.maxQuantity).toBeLessThan(8);
  });
});

// ============================================================================
// TEST VALIDAZIONE STOCK CARRELLO
// ============================================================================

describe('validateCartStock', () => {
  test('dovrebbe validare carrello con stock sufficiente', () => {
    const cartItems = [
      { menuItem: mockMenuItem, quantity: 2 },
    ];
    
    const result = validateCartStock(cartItems, mockComponents);
    expect(result.isValid).toBe(true);
    expect(result.missingComponents).toHaveLength(0);
  });

  test('dovrebbe rilevare stock insufficiente', () => {
    const cartItems = [
      { menuItem: mockMenuItem, quantity: 15 },
    ];
    
    const result = validateCartStock(cartItems, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.missingComponents.length).toBeGreaterThan(0);
  });

  test('dovrebbe aggregare uso componenti tra items', () => {
    const cartItems = [
      { menuItem: mockMenuItem, quantity: 3 },
      { menuItem: mockMenuItem, quantity: 3 },
    ];
    
    const result = validateCartStock(cartItems, mockComponents);
    expect(result.isValid).toBe(false); // 6 > 5 per comp2
  });
});

// ============================================================================
// TEST VALIDAZIONE NOTE
// ============================================================================

describe('validateNote', () => {
  test('dovrebbe validare note normali', () => {
    const result = validateNote('Nota normale');
    expect(result.isValid).toBe(true);
    expect(result.charCount).toBe(12);
  });

  test('dovrebbe rifiutare note troppo lunghe', () => {
    const longNote = 'x'.repeat(2001);
    const result = validateNote(longNote);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Note troppo lunghe: 2001/2000 caratteri');
  });

  test('dovrebbe avvisare per note quasi al limite', () => {
    const nearLimitNote = 'x'.repeat(1900);
    const result = validateNote(nearLimitNote);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('quasi al limite'))).toBe(true);
  });

  test('dovrebbe rilevare caratteri speciali', () => {
    const result = validateNote('Nota con <script> pericoloso');
    expect(result.warnings.some(w => w.includes('Caratteri speciali'))).toBe(true);
  });
});

// ============================================================================
// TEST CALCOLI
// ============================================================================

describe('calculateOrderTotal', () => {
  test('dovrebbe calcolare totale corretto', () => {
    const cartItems = [
      {
        menuItem: mockMenuItem,
        quantity: 2,
        isStaff: false,
      },
    ];
    
    const result = calculateOrderTotal(cartItems);
    expect(result.total).toBe(1600); // 800 * 2
    expect(result.subtotal).toBe(1600);
    expect(result.discount).toBe(0);
    expect(result.itemsCount).toBe(2);
  });

  test('dovrebbe applicare sconto staff', () => {
    const cartItems = [
      {
        menuItem: mockMenuItem,
        quantity: 2,
        isStaff: true,
      },
    ];
    
    const result = calculateOrderTotal(cartItems);
    expect(result.total).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.discount).toBe(1600); // 800 * 2
  });

  test('dovrebbe gestire mix staff e normali', () => {
    const cartItems = [
      {
        menuItem: mockMenuItem,
        quantity: 1,
        isStaff: false,
      },
      {
        menuItem: mockMenuItem,
        quantity: 1,
        isStaff: true,
      },
    ];
    
    const result = calculateOrderTotal(cartItems);
    expect(result.total).toBe(800);
    expect(result.discount).toBe(800);
    expect(result.breakdown).toHaveLength(2);
  });
});

describe('calculateChange', () => {
  test('dovrebbe calcolare resto corretto', () => {
    const result = calculateChange(850, 1000);
    expect(result.isValid).toBe(true);
    expect(result.change).toBe(150);
  });

  test('dovrebbe arrotondare a numeri interi', () => {
    const result = calculateChange(849, 1000);
    expect(result.change).toBe(151);
  });

  test('dovrebbe rifiutare importo insufficiente', () => {
    const result = calculateChange(1000, 500);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('insufficiente');
  });

  test('dovrebbe rifiutare valori negativi', () => {
    const totalResult = calculateChange(-100, 1000);
    expect(totalResult.isValid).toBe(false);
    
    const receivedResult = calculateChange(1000, -100);
    expect(receivedResult.isValid).toBe(false);
  });
});

// ============================================================================
// TEST VALIDAZIONE ORDINE COMPLETO
// ============================================================================

describe('validateCompleteOrder', () => {
  const validOrderData = {
    cliente: 'Mario Rossi',
    note: 'Nota ordine',
    cartItems: [
      {
        menuItem: mockMenuItem,
        quantity: 2,
        notes: 'Extra formaggio',
        isStaff: false,
        isPriority: false,
      },
    ],
  };

  test('dovrebbe validare ordine completo valido', () => {
    const result = validateCompleteOrder(validOrderData, mockComponents);
    expect(result.isValid).toBe(true);
  });

  test('dovrebbe rifiutare ordine senza cliente', () => {
    const invalidOrder = { ...validOrderData, cliente: '' };
    const result = validateCompleteOrder(invalidOrder, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Nome cliente richiesto');
  });

  test('dovrebbe rifiutare carrello vuoto', () => {
    const invalidOrder = { ...validOrderData, cartItems: [] };
    const result = validateCompleteOrder(invalidOrder, mockComponents);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Il carrello non può essere vuoto');
  });

  test('dovrebbe validare note ordine', () => {
    const invalidOrder = {
      ...validOrderData,
      note: 'x'.repeat(2001),
    };
    const result = validateCompleteOrder(invalidOrder, mockComponents);
    expect(result.isValid).toBe(false);
  });
});

// ============================================================================
// TEST UTILITY HELPER
// ============================================================================

describe('formatPrice', () => {
  test('dovrebbe formattare prezzi correttamente', () => {
    expect(formatPrice(850)).toBe('€8.50');
    expect(formatPrice(1000)).toBe('€10.00');
    expect(formatPrice(0)).toBe('€0.00');
  });
});

describe('parsePrice', () => {
  test('dovrebbe parsare prezzi correttamente', () => {
    expect(parsePrice('€8.50')).toBe(850);
    expect(parsePrice('10,00')).toBe(1000);
    expect(parsePrice('5')).toBe(500);
  });

  test('dovrebbe gestire input malformati', () => {
    expect(parsePrice('')).toBe(0);
    expect(parsePrice('abc')).toBe(0);
  });
});

describe('validatePriceString', () => {
  test('dovrebbe validare prezzi validi', () => {
    const result = validatePriceString('€8.50');
    expect(result.isValid).toBe(true);
  });

  test('dovrebbe rifiutare prezzi vuoti', () => {
    const result = validatePriceString('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Prezzo richiesto');
  });

  test('dovrebbe rifiutare prezzi negativi', () => {
    const result = validatePriceString('-5.00');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Il prezzo non può essere negativo');
  });

  test('dovrebbe rifiutare prezzi troppo alti', () => {
    const result = validatePriceString('99999.99');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Prezzo troppo alto (max €9999.99)');
  });
});
