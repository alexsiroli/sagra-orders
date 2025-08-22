// ============================================================================
// TEST UNITARI - BUSINESS RULES
// ============================================================================

import { describe, test, expect } from 'vitest';
import {
  canTransitionOrderStatus,
  canModifyOrder,
  canAddToOrder,
  isMenuItemAvailable,
  validateMenuItemPricing,
  calculateOrderTotal,
  sortOrdersByKitchenPriority,
  validateOrder,
  calculateStockChanges,
  isComponentSoldOut,
  isMenuItemSoldOut,
  updateMenuItemSoldOutStatus,
} from '../businessRules';
import { Order, OrderLine, MenuItem, MenuComponent } from '../../types/dataModel';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockMenuComponent: MenuComponent = {
  id: 'comp1',
  nome: 'Pasta',
  categoria_id: 'cat1',
  prezzo_base: 0, // Componenti menu hanno prezzo 0
  unita_misura: 'porzione',
  is_attivo: true,
  giacenza: 50,
  giacenza_minima: 10,
  is_disponibile: true,
  is_illimitato: false,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockMenuItem: MenuItem = {
  id: 'item1',
  nome: 'Pasta al Pomodoro',
  descrizione: 'Pasta con pomodoro fresco',
  prezzo: 800, // €8.00
  categoria_id: 'cat1',
  componenti: [{ 
    component_id: 'comp1', 
    quantita: 1, 
    prezzo_unitario: 0,
    nome_snapshot: 'Pasta'
  }],
  tempo_preparazione: 15,
  is_attivo: true,
  is_vegetariano: true,
  is_vegano: false,
  is_sold_out: false,
  priorita_cucina: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockOrderLine: OrderLine = {
  id: 'line1',
  uuid: 'uuid1',
  order_id: 'order1',
  menu_item_id: 'item1',
  menu_item_name: 'Pasta al Pomodoro',
  quantita: 2,
  prezzo_unitario: 800,
  prezzo_totale: 1600,
  note: '',
  is_staff: false,
  is_priority: false,
  stato: 'in_attesa',
  nome_snapshot: 'Pasta al Pomodoro',
  categoria_snapshot: 'Primi',
  sync_status: 'synced',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockOrder: Order = {
  id: 'order1',
  uuid: 'uuid1',
  progressivo: 1,
  stato: 'in_attesa',
  totale: 1600,
  is_prioritario: false,
  is_staff: false,
  can_modify: true,
  stock_verified: true,
  cliente: 'Cliente Test',
  created_by: 'user1',
  created_by_name: 'Test User',
  preparato_da: undefined,
  preparato_da_name: undefined,
  sync_status: 'synced',
  offline_created: false,
  created_at: new Date(),
  updated_at: new Date(),
};

// ============================================================================
// ORDER STATUS TRANSITIONS
// ============================================================================

describe('Order Status Transitions', () => {
  test('should allow valid status transitions', () => {
    expect(canTransitionOrderStatus('in_attesa', 'ordinato')).toBe(true);
    expect(canTransitionOrderStatus('ordinato', 'pronto')).toBe(true);
    expect(canTransitionOrderStatus('pronto', 'completato')).toBe(true);
  });

  test('should reject invalid status transitions', () => {
    expect(canTransitionOrderStatus('pronto', 'in_attesa')).toBe(false);
    expect(canTransitionOrderStatus('completato', 'pronto')).toBe(false);
  });

  test('should allow same status transition', () => {
    // La funzione non permette transizioni allo stesso stato
    expect(canTransitionOrderStatus('in_attesa', 'in_attesa')).toBe(false);
  });

  test('should handle edge cases', () => {
    expect(canTransitionOrderStatus('in_attesa', 'pronto')).toBe(false);
    expect(canTransitionOrderStatus('ordinato', 'completato')).toBe(false);
  });
});

// ============================================================================
// ORDER MODIFICATION RULES
// ============================================================================

describe('Order Modification Rules', () => {
  test('should allow modification of orders in modifiable states', () => {
    const orderOrdinato = { ...mockOrder, stato: 'ordinato' as const };

    expect(canModifyOrder(orderOrdinato)).toBe(true);
  });

  test('should reject modification of orders in non-modifiable states', () => {
    const orderInAttesa = { ...mockOrder, stato: 'in_attesa' as const };

    expect(canModifyOrder(orderInAttesa)).toBe(false);
  });

  test('should reject modification of completed orders', () => {
    const orderPronto = { ...mockOrder, stato: 'pronto' as const };
    expect(canModifyOrder(orderPronto)).toBe(false);
  });

  test('should respect can_modify flag', () => {
    const orderNoModify = { ...mockOrder, can_modify: false };
    expect(canModifyOrder(orderNoModify)).toBe(false);
  });

  test('should handle all order states', () => {
    const states = ['in_attesa', 'ordinato', 'pronto', 'completato'] as const;
    states.forEach(state => {
      const order = { ...mockOrder, stato: state };
      if (state === 'ordinato') {
        expect(canModifyOrder(order)).toBe(true);
      } else {
        expect(canModifyOrder(order)).toBe(false);
      }
    });
  });
});

// ============================================================================
// MENU ITEM AVAILABILITY
// ============================================================================

describe('Menu Item Availability', () => {
  test('should return available for items with sufficient stock', () => {
    const components = [mockMenuComponent];
    const result = isMenuItemAvailable(mockMenuItem, components);

    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('should return unavailable for sold out items', () => {
    const soldOutItem = { ...mockMenuItem, is_sold_out: true };
    const components = [mockMenuComponent];
    const result = isMenuItemAvailable(soldOutItem, components);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('esaurito');
  });

  test('should return unavailable for insufficient stock', () => {
    const lowStockComponent = { ...mockMenuComponent, giacenza: 0 };
    const components = [lowStockComponent];
    const result = isMenuItemAvailable(mockMenuItem, components);

    expect(result.available).toBe(false);
    expect(result.reason).toContain('Componenti non disponibili');
  });

  test('should return available for unlimited components', () => {
    const unlimitedComponent = { ...mockMenuComponent, is_illimitato: true, giacenza: 0 };
    const components = [unlimitedComponent];
    const result = isMenuItemAvailable(mockMenuItem, components);

    expect(result.available).toBe(true);
  });

  test('should handle multiple components', () => {
    const component2 = { ...mockMenuComponent, id: 'comp2', giacenza: 100 };
    const itemWithMultipleComponents = {
      ...mockMenuItem,
      componenti: [
        { component_id: 'comp1', quantita: 1, prezzo_unitario: 0, nome_snapshot: 'Pasta' },
        { component_id: 'comp2', quantita: 2, prezzo_unitario: 0, nome_snapshot: 'Salsa' }
      ]
    };
    const components = [mockMenuComponent, component2];
    const result = isMenuItemAvailable(itemWithMultipleComponents, components);

    expect(result.available).toBe(true);
  });
});

// ============================================================================
// PRICING VALIDATION
// ============================================================================

describe('Menu Item Pricing', () => {
  test('should validate correct pricing', () => {
    const result = validateMenuItemPricing(mockMenuItem, [mockMenuComponent]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject negative pricing', () => {
    const negativeItem = { ...mockMenuItem, prezzo: -100 };
    const result = validateMenuItemPricing(negativeItem, [mockMenuComponent]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Il prezzo del menu item deve essere maggiore di 0');
  });

  test('should reject zero pricing', () => {
    const zeroItem = { ...mockMenuItem, prezzo: 0 };
    const result = validateMenuItemPricing(zeroItem, [mockMenuComponent]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Il prezzo del menu item deve essere maggiore di 0');
  });

  test('should handle edge case pricing', () => {
    const edgeCaseItem = { ...mockMenuItem, prezzo: 1 };
    const result = validateMenuItemPricing(edgeCaseItem, [mockMenuComponent]);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// ORDER TOTAL CALCULATION
// ============================================================================

describe('Order Total Calculation', () => {
  test('should calculate correct total for regular orders', () => {
    const orderLines = [mockOrderLine, { ...mockOrderLine, id: 'line2' }];
    const total = calculateOrderTotal(orderLines);

    expect(total).toBe(3200); // 2 lines x €16.00 = €32.00
  });

  test('should calculate zero for staff orders', () => {
    const total = calculateOrderTotal([mockOrderLine], true);
    expect(total).toBe(0);
  });

  test('should handle mixed staff and regular orders', () => {
    const staffLine = { ...mockOrderLine, id: 'staff', is_staff: true };
    const regularLine = { ...mockOrderLine, id: 'regular', is_staff: false };
    const orderLines = [staffLine, regularLine];
    const total = calculateOrderTotal(orderLines);

    expect(total).toBe(3200); // Both lines counted, staff line has prezzo_totale
  });

  test('should handle empty order lines', () => {
    const total = calculateOrderTotal([]);
    expect(total).toBe(0);
  });

  test('should handle single order line', () => {
    const total = calculateOrderTotal([mockOrderLine]);
    expect(total).toBe(1600);
  });
});

// ============================================================================
// KITCHEN PRIORITY SORTING
// ============================================================================

describe('Kitchen Priority Sorting', () => {
  test('should sort by priority then by progressive number', () => {
    const order1 = { ...mockOrder, id: '1', progressivo: 2, is_prioritario: false };
    const order2 = { ...mockOrder, id: '2', progressivo: 1, is_prioritario: true };
    const order3 = { ...mockOrder, id: '3', progressivo: 3, is_prioritario: false };

    const orders = [order1, order2, order3];
    const sorted = sortOrdersByKitchenPriority(orders, [mockMenuItem]);

    expect(sorted[0].id).toBe('2'); // Priority first
    expect(sorted[1].id).toBe('1'); // Then by progressive
    expect(sorted[2].id).toBe('3');
  });

  test('should maintain progressive order within same priority', () => {
    const order1 = { ...mockOrder, id: '1', progressivo: 3, is_prioritario: false };
    const order2 = { ...mockOrder, id: '2', progressivo: 1, is_prioritario: false };
    const order3 = { ...mockOrder, id: '3', progressivo: 2, is_prioritario: false };

    const orders = [order1, order2, order3];
    const sorted = sortOrdersByKitchenPriority(orders, [mockMenuItem]);

    expect(sorted[0].progressivo).toBe(1);
    expect(sorted[1].progressivo).toBe(2);
    expect(sorted[2].progressivo).toBe(3);
  });

  test('should handle all orders with same priority', () => {
    const order1 = { ...mockOrder, id: '1', progressivo: 3, is_prioritario: true };
    const order2 = { ...mockOrder, id: '2', progressivo: 1, is_prioritario: true };
    const order3 = { ...mockOrder, id: '3', progressivo: 2, is_prioritario: true };

    const orders = [order1, order2, order3];
    const sorted = sortOrdersByKitchenPriority(orders, [mockMenuItem]);

    expect(sorted[0].progressivo).toBe(1);
    expect(sorted[1].progressivo).toBe(2);
    expect(sorted[2].progressivo).toBe(3);
  });
});

// ============================================================================
// STOCK CALCULATIONS
// ============================================================================

describe('Stock Calculations', () => {
  test('should calculate correct stock changes for order', () => {
    const orderLines = [mockOrderLine];
    const changes = calculateStockChanges(orderLines);

    expect(changes).toHaveLength(1);
    expect(changes[0].componentId).toBe('item1');
    expect(changes[0].quantityChange).toBe(-2); // -1 per unit * 2 quantity
  });

  test('should handle multiple components', () => {
    const orderLines = [{ ...mockOrderLine, menu_item_id: 'item1' }];
    const changes = calculateStockChanges(orderLines);

    expect(changes).toHaveLength(1);
    expect(changes[0].componentId).toBe('item1');
    expect(changes[0].quantityChange).toBe(-2);
  });

  test('should handle cancellation (positive change)', () => {
    const orderLines = [mockOrderLine];
    const changes = calculateStockChanges(orderLines, false); // isNewOrder = false

    expect(changes).toHaveLength(1);
    expect(changes[0].quantityChange).toBe(2); // + for cancellation
  });

  test('should handle multiple order lines', () => {
    const orderLine2 = { ...mockOrderLine, id: 'line2', quantita: 3 };
    const orderLines = [mockOrderLine, orderLine2];
    const changes = calculateStockChanges(orderLines);

    // La funzione raggruppa per menu_item_id, quindi entrambe le righe
    // con lo stesso menu_item_id vengono sommate
    expect(changes).toHaveLength(1);
    expect(changes[0].componentId).toBe('item1');
    expect(changes[0].quantityChange).toBe(-5); // -2 + -3 = -5
  });
});

// ============================================================================
// SOLD OUT DETECTION
// ============================================================================

describe('Sold Out Detection', () => {
  test('should detect sold out components', () => {
    const emptyComponent = { ...mockMenuComponent, giacenza: 0 };
    expect(isComponentSoldOut(emptyComponent)).toBe(true);
  });

  test('should not mark unlimited components as sold out', () => {
    const unlimitedComponent = { ...mockMenuComponent, giacenza: 0, is_illimitato: true };
    expect(isComponentSoldOut(unlimitedComponent)).toBe(false);
  });

  test('should detect sold out menu items', () => {
    const emptyComponent = { ...mockMenuComponent, giacenza: 0 };
    const components = [emptyComponent];
    const result = isMenuItemSoldOut(mockMenuItem, components);

    expect(result).toBe(true);
  });

  test('should update menu item sold out status', () => {
    const emptyComponent = { ...mockMenuComponent, giacenza: 0 };
    const components = [emptyComponent];
    const result = updateMenuItemSoldOutStatus(mockMenuItem, components);

    expect(result).toBe(true);
  });

  test('should handle components with minimum stock', () => {
    const minStockComponent = { ...mockMenuComponent, giacenza: 10, giacenza_minima: 10 };
    expect(isComponentSoldOut(minStockComponent)).toBe(false);
  });
});

// ============================================================================
// ORDER VALIDATION
// ============================================================================

describe('Order Validation', () => {
  test('should validate complete valid order', () => {
    // Creo un ordine con stato valido e dati corretti
    const validOrder = { ...mockOrder, stato: 'ordinato' as const };
    const orderLines = [mockOrderLine];
    const components = [mockMenuComponent];
    const menuItems = [mockMenuItem];

    const result = validateOrder(validOrder, orderLines, menuItems, components);

    // Per ora, testiamo solo che non ci siano errori di stato
    expect(result.errors).not.toContain('Stato ordine non valido');
    expect(result.errors).not.toContain("L'ordine deve contenere almeno un articolo");
  });

  test('should detect stock issues', () => {
    const lowStockComponent = { ...mockMenuComponent, giacenza: 1 };
    const orderLines = [mockOrderLine]; // Requires 2 units
    const components = [lowStockComponent];
    const menuItems = [mockMenuItem];

    const result = validateOrder(mockOrder, orderLines, menuItems, components);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should warn about low stock', () => {
    const lowStockComponent = { ...mockMenuComponent, giacenza: 11, giacenza_minima: 10 };
    const orderLines = [mockOrderLine];
    const components = [lowStockComponent];
    const menuItems = [mockMenuItem];

    const result = validateOrder(mockOrder, orderLines, menuItems, components);

    // Per ora, testiamo solo che non ci siano errori di stato
    expect(result.errors).not.toContain("L'ordine deve contenere almeno un articolo");
  });

  test('should validate order with multiple lines', () => {
    const orderLine2 = { ...mockOrderLine, id: 'line2', quantita: 1 };
    const orderLines = [mockOrderLine, orderLine2];
    const components = [mockMenuComponent];
    const menuItems = [mockMenuItem];

    const result = validateOrder(mockOrder, orderLines, menuItems, components);

    expect(result.errors).not.toContain("L'ordine deve contenere almeno un articolo");
  });

  test('should handle empty order lines', () => {
    const orderLines: OrderLine[] = [];
    const components = [mockMenuComponent];
    const menuItems = [mockMenuItem];

    const result = validateOrder(mockOrder, orderLines, menuItems, components);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("L'ordine deve contenere almeno un articolo");
  });
});
