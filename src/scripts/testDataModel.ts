import {
  MockData,
  User,
  Category,
  MenuComponent,
  MenuItem,
  Order,
  OrderLine,
  TestResults,
  TestResult,
} from '../types/dataModel';
import {
  validateOrderInvariants,
  validateOrderLineInvariants,
  validateMenuItemInvariants,
  validateUserInvariants,
  validateCategoryInvariants,
  validateCompleteOrder,
  calculateOrderTotal,
  calculateOrderLineTotal,
  calculateMenuItemPrice,
  createOrderLine,
} from '../utils/validation';

// ============================================================================
// DATI MOCK PER TEST
// ============================================================================

/**
 * Crea dati fittizi per testare le invarianti
 */
function createMockData(): MockData {
  const now = new Date();

  return {
    users: [
      {
        id: 'user1',
        nome: 'Admin User',
        email: 'admin@sagra.com',
        role: 'admin',
        is_attivo: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user2',
        nome: 'Cassa User',
        email: 'cassa@sagra.com',
        role: 'cassa',
        is_attivo: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user3',
        nome: 'Cucina User',
        email: 'cucina@sagra.com',
        role: 'cucina',
        is_attivo: true,
        created_at: now,
        updated_at: now,
      },
    ],
    categories: [
      {
        id: 'cat1',
        nome: 'Primi Piatti',
        descrizione: 'Pasta, riso e primi piatti',
        ordine: 1,
        is_attiva: true,
        colore: '#FF6B6B',
        icona: 'pasta',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cat2',
        nome: 'Secondi Piatti',
        descrizione: 'Carne, pesce e secondi',
        ordine: 2,
        is_attiva: true,
        colore: '#4ECDC4',
        icona: 'meat',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cat3',
        nome: 'Contorni',
        descrizione: 'Verdure e contorni',
        ordine: 3,
        is_attiva: true,
        colore: '#45B7D1',
        icona: 'vegetables',
        created_at: now,
        updated_at: now,
      },
    ],
    menu_components: [
      {
        id: 'comp1',
        nome: 'Spaghetti',
        descrizione: 'Spaghetti di semola di grano duro',
        prezzo_base: 200, // 2.00 EUR
        unita_misura: 'porzione',
        allergeni: ['glutine'],
        ingredienti: ['semola di grano duro'],
        is_attivo: true,
        categoria_id: 'cat1',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'comp2',
        nome: 'Sugo al Pomodoro',
        descrizione: 'Sugo di pomodoro con basilico',
        prezzo_base: 150, // 1.50 EUR
        unita_misura: 'porzione',
        allergeni: [],
        ingredienti: ['pomodoro', 'basilico', "olio d'oliva"],
        is_attivo: true,
        categoria_id: 'cat1',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'comp3',
        nome: 'Parmigiano Reggiano',
        descrizione: 'Parmigiano Reggiano DOP grattugiato',
        prezzo_base: 100, // 1.00 EUR
        unita_misura: 'porzione',
        allergeni: ['latte'],
        ingredienti: ['latte di mucca'],
        is_attivo: true,
        categoria_id: 'cat1',
        created_at: now,
        updated_at: now,
      },
    ],
    menu_items: [
      {
        id: 'item1',
        nome: 'Spaghetti al Pomodoro',
        descrizione: 'Spaghetti con sugo al pomodoro e parmigiano',
        prezzo: 450, // 4.50 EUR (200 + 150 + 100)
        categoria_id: 'cat1',
        componenti: [
          {
            component_id: 'comp1',
            quantita: 1,
            prezzo_unitario: 200,
            nome_snapshot: 'Spaghetti',
          },
          {
            component_id: 'comp2',
            quantita: 1,
            prezzo_unitario: 150,
            nome_snapshot: 'Sugo al Pomodoro',
          },
          {
            component_id: 'comp3',
            quantita: 1,
            prezzo_unitario: 100,
            nome_snapshot: 'Parmigiano Reggiano',
          },
        ],
        is_attivo: true,
        is_vegetariano: true,
        is_vegano: false,
        tempo_preparazione: 15,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'item2',
        nome: 'Spaghetti al Pomodoro Senza Parmigiano',
        descrizione: 'Spaghetti con sugo al pomodoro (senza parmigiano)',
        prezzo: 350, // 3.50 EUR (200 + 150)
        categoria_id: 'cat1',
        componenti: [
          {
            component_id: 'comp1',
            quantita: 1,
            prezzo_unitario: 200,
            nome_snapshot: 'Spaghetti',
          },
          {
            component_id: 'comp2',
            quantita: 1,
            prezzo_unitario: 150,
            nome_snapshot: 'Sugo al Pomodoro',
          },
        ],
        is_attivo: true,
        is_vegetariano: true,
        is_vegano: true,
        tempo_preparazione: 15,
        created_at: now,
        updated_at: now,
      },
    ],
    orders: [
      {
        id: 'order1',
        progressivo: 1,
        cliente: 'Mario Rossi',
        note: 'Senza parmigiano per allergia',
        items: [
          {
            id: 'line1',
            order_id: 'order1',
            menu_item_id: 'item2',
            quantita: 2,
            prezzo_unitario: 350,
            prezzo_totale: 700,
            stato: 'in_attesa',
            nome_snapshot: 'Spaghetti al Pomodoro Senza Parmigiano',
            categoria_snapshot: 'Primi Piatti',
            allergeni_snapshot: ['glutine'],
            created_at: now,
            updated_at: now,
          },
        ],
        subtotale: 700,
        sconto: 0,
        totale: 700,
        stato: 'in_attesa',
        is_prioritario: false,
        is_asporto: false,
        tavolo: '5',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'order2',
        progressivo: 2,
        cliente: 'Giulia Bianchi',
        items: [
          {
            id: 'line2',
            order_id: 'order2',
            menu_item_id: 'item1',
            quantita: 1,
            prezzo_unitario: 450,
            prezzo_totale: 450,
            stato: 'in_attesa',
            nome_snapshot: 'Spaghetti al Pomodoro',
            categoria_snapshot: 'Primi Piatti',
            allergeni_snapshot: ['glutine', 'latte'],
            created_at: now,
            updated_at: now,
          },
        ],
        subtotale: 450,
        sconto: 50, // 0.50 EUR di sconto
        totale: 400,
        stato: 'in_attesa',
        is_prioritario: true,
        is_asporto: true,
        created_at: now,
        updated_at: now,
      },
    ],
  };
}

// ============================================================================
// TEST INVARIANTI
// ============================================================================

/**
 * Testa le invarianti degli ordini
 */
function testOrderInvariants(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  mockData.orders.forEach(order => {
    const validation = validateOrderInvariants(order);
    results.push({
      test: `Invarianti ordine ${order.id} (${order.cliente})`,
      passed: validation.isValid,
      errors: validation.errors,
    });
  });

  return results;
}

/**
 * Testa le invarianti delle righe ordine
 */
function testOrderLineInvariants(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  mockData.orders.forEach(order => {
    order.items.forEach((item, index) => {
      const lineValidation = validateOrderLineInvariants(item);
      results.push({
        test: `Invarianti riga ${item.id} (ordine ${order.id}, riga ${index + 1})`,
        passed: lineValidation.isValid,
        errors: lineValidation.errors,
      });
    });
  });

  return results;
}

/**
 * Testa le invarianti dei menu items
 */
function testMenuItemInvariants(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  mockData.menu_items.forEach(item => {
    const validation = validateMenuItemInvariants(item);
    results.push({
      test: `Invarianti menu item ${item.id} (${item.nome})`,
      passed: validation.isValid,
      errors: validation.errors,
    });
  });

  return results;
}

/**
 * Testa le invarianti degli utenti
 */
function testUserInvariants(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  mockData.users.forEach(user => {
    const validation = validateUserInvariants(user);
    results.push({
      test: `Invarianti utente ${user.id} (${user.nome} - ${user.role})`,
      passed: validation.isValid,
      errors: validation.errors,
    });
  });

  return results;
}

/**
 * Testa le invarianti delle categorie
 */
function testCategoryInvariants(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  mockData.categories.forEach(category => {
    const validation = validateCategoryInvariants(category);
    results.push({
      test: `Invarianti categoria ${category.id} (${category.nome})`,
      passed: validation.isValid,
      errors: validation.errors,
    });
  });

  return results;
}

/**
 * Testa la validazione completa degli ordini
 */
function testCompleteOrderValidation(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  mockData.orders.forEach(order => {
    const validation = validateCompleteOrder(order);
    results.push({
      test: `Validazione completa ordine ${order.id} (${order.cliente})`,
      passed: validation.isValid,
      errors: validation.errors,
    });
  });

  return results;
}

// ============================================================================
// TEST CALCOLI
// ============================================================================

/**
 * Testa i calcoli dei prezzi
 */
function testPriceCalculations(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  // Test calcolo totale ordine
  mockData.orders.forEach(order => {
    const calculated = calculateOrderTotal(order);
    const isCorrect =
      calculated.subtotale === order.subtotale &&
      calculated.totale === order.totale;

    results.push({
      test: `Calcolo prezzi ordine ${order.id}`,
      passed: isCorrect,
      errors: isCorrect
        ? []
        : [
            `Subtotale calcolato: ${calculated.subtotale}, atteso: ${order.subtotale}`,
            `Totale calcolato: ${calculated.totale}, atteso: ${order.totale}`,
          ],
    });
  });

  // Test calcolo prezzo menu item
  mockData.menu_items.forEach(item => {
    const calculated = calculateMenuItemPrice(item);
    const isCorrect = calculated === item.prezzo;

    results.push({
      test: `Calcolo prezzo menu item ${item.id} (${item.nome})`,
      passed: isCorrect,
      errors: isCorrect
        ? []
        : [`Prezzo calcolato: ${calculated}, atteso: ${item.prezzo}`],
    });
  });

  return results;
}

// ============================================================================
// TEST UTILITY
// ============================================================================

/**
 * Testa le utility di creazione
 */
function testUtilityFunctions(mockData: MockData): TestResult[] {
  const results: TestResult[] = [];

  try {
    // Test creazione riga ordine
    const menuItem = mockData.menu_items[0];
    const orderLine = createOrderLine('test_order', menuItem, 3, 'Test note');

    const isCorrect =
      orderLine.quantita === 3 &&
      orderLine.prezzo_unitario === menuItem.prezzo &&
      orderLine.prezzo_totale === 3 * menuItem.prezzo &&
      orderLine.note === 'Test note';

    results.push({
      test: 'Creazione riga ordine',
      passed: isCorrect,
      errors: isCorrect ? [] : ['Errore nella creazione della riga ordine'],
    });
  } catch (error) {
    results.push({
      test: 'Creazione riga ordine',
      passed: false,
      errors: [`Errore: ${error}`],
    });
  }

  return results;
}

// ============================================================================
// TEST PRINCIPALE
// ============================================================================

/**
 * Esegue tutti i test del modello dati
 */
export function runDataModelTests(): TestResults {
  console.log('🧪 Test Modello Dati e Invarianti');
  console.log('==================================\n');

  const mockData = createMockData();
  const allResults: TestResult[] = [];

  // Esegui tutti i test
  console.log('📊 Esecuzione test invarianti...');
  allResults.push(...testOrderInvariants(mockData));
  allResults.push(...testOrderLineInvariants(mockData));
  allResults.push(...testMenuItemInvariants(mockData));
  allResults.push(...testUserInvariants(mockData));
  allResults.push(...testCategoryInvariants(mockData));

  console.log('🔢 Esecuzione test calcoli...');
  allResults.push(...testPriceCalculations(mockData));

  console.log('🛠️ Esecuzione test utility...');
  allResults.push(...testCompleteOrderValidation(mockData));
  allResults.push(...testUtilityFunctions(mockData));

  // Calcola risultati
  const totalTests = allResults.length;
  const passedTests = allResults.filter(r => r.passed).length;
  const failedTests = allResults.filter(r => !r.passed).length;

  // Stampa risultati
  console.log('\n📊 Risultati test:');
  console.log('-------------------');

  allResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.test}`);

    if (!result.passed && result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(`   ⚠️ ${error}`);
      });
    }
  });

  console.log(`\n🎯 Test superati: ${passedTests}/${totalTests}`);
  console.log(`❌ Test falliti: ${failedTests}/${totalTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 Tutti i test sono stati superati con successo!');
  } else {
    console.log('\n⚠️ Alcuni test sono falliti. Controlla gli errori sopra.');
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    results: allResults,
  };
}

// ============================================================================
// TEST SPECIFICI
// ============================================================================

/**
 * Testa un'entità specifica
 */
export function testSpecificEntity(
  entity: any,
  entityType: string
): TestResult {
  console.log(`🧪 Test entità specifica: ${entityType}`);

  let validation;
  switch (entityType) {
    case 'order':
      validation = validateOrderInvariants(entity as Order);
      break;
    case 'orderLine':
      validation = validateOrderLineInvariants(entity as OrderLine);
      break;
    case 'menuItem':
      validation = validateMenuItemInvariants(entity as MenuItem);
      break;
    case 'user':
      validation = validateUserInvariants(entity as User);
      break;
    case 'category':
      validation = validateCategoryInvariants(entity as Category);
      break;
    default:
      return {
        test: `Test entità ${entityType}`,
        passed: false,
        errors: [`Tipo entità non supportato: ${entityType}`],
      };
  }

  const result: TestResult = {
    test: `Test entità ${entityType}`,
    passed: validation.isValid,
    errors: validation.errors,
  };

  console.log(`Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!result.passed) {
    console.log('Errori:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  return result;
}

// Esegui i test se chiamato direttamente
if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🚀 Esecuzione test modello dati...\n');
  runDataModelTests();
}
