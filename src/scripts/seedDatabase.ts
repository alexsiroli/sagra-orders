import { db, auth } from '../config/firebase.js';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import {
  User,
  Category,
  MenuComponent,
  MenuItem,
  SystemStats,
  CategoryStats,
} from '../types/dataModel';

// ============================================================================
// DATI INIZIALI PER IL SEED
// ============================================================================

/**
 * Crea le categorie iniziali del menu
 */
function createInitialCategories(): Category[] {
  const now = new Date();

  return [
    {
      id: 'cat-primi',
      nome: 'Primi Piatti',
      descrizione: 'Pasta, riso e primi piatti tradizionali',
      ordine: 1,
      is_attiva: true,
      colore: '#FF6B6B',
      icona: 'pasta',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'cat-secondi',
      nome: 'Secondi Piatti',
      descrizione: 'Carne, pesce e secondi piatti',
      ordine: 2,
      is_attiva: true,
      colore: '#4ECDC4',
      icona: 'meat',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'cat-contorni',
      nome: 'Contorni',
      descrizione: 'Verdure, patate e contorni',
      ordine: 3,
      is_attiva: true,
      colore: '#45B7D1',
      icona: 'vegetables',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'cat-bevande',
      nome: 'Bevande',
      descrizione: 'Acqua, bibite, vino e birra',
      ordine: 4,
      is_attiva: true,
      colore: '#96CEB4',
      icona: 'drink',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'cat-dolci',
      nome: 'Dolci',
      descrizione: 'Dolci tradizionali e dessert',
      ordine: 5,
      is_attiva: true,
      colore: '#FFEAA7',
      icona: 'dessert',
      created_at: now,
      updated_at: now,
    },
  ];
}

/**
 * Crea i componenti base del menu
 */
function createInitialMenuComponents(): MenuComponent[] {
  const now = new Date();

  return [
    // Componenti per primi piatti
    {
      id: 'comp-spaghetti',
      nome: 'Spaghetti',
      descrizione: 'Spaghetti di semola di grano duro',
      prezzo_base: 200, // 2.00 EUR
      unita_misura: 'porzione',
      allergeni: ['glutine'],
      ingredienti: ['semola di grano duro'],
      is_attivo: true,
      categoria_id: 'cat-primi',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-sugo-pomodoro',
      nome: 'Sugo al Pomodoro',
      descrizione: 'Sugo di pomodoro con basilico e aglio',
      prezzo_base: 150, // 1.50 EUR
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['pomodoro', 'basilico', 'aglio', "olio d'oliva"],
      is_attivo: true,
      categoria_id: 'cat-primi',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-parmigiano',
      nome: 'Parmigiano Reggiano',
      descrizione: 'Parmigiano Reggiano DOP grattugiato',
      prezzo_base: 100, // 1.00 EUR
      unita_misura: 'porzione',
      allergeni: ['latte'],
      ingredienti: ['latte di mucca'],
      is_attivo: true,
      categoria_id: 'cat-primi',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-riso',
      nome: 'Riso Carnaroli',
      descrizione: 'Riso Carnaroli per risotti',
      prezzo_base: 180, // 1.80 EUR
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['riso Carnaroli'],
      is_attivo: true,
      categoria_id: 'cat-primi',
      created_at: now,
      updated_at: now,
    },

    // Componenti per secondi piatti
    {
      id: 'comp-pollo',
      nome: 'Pollo Grigliato',
      descrizione: 'Pollo intero grigliato',
      prezzo_base: 350, // 3.50 EUR
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['pollo', "olio d'oliva", 'sale', 'pepe'],
      is_attivo: true,
      categoria_id: 'cat-secondi',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-salsiccia',
      nome: 'Salsiccia alla Griglia',
      descrizione: 'Salsiccia di maiale alla griglia',
      prezzo_base: 300, // 3.00 EUR
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['carne di maiale', 'sale', 'pepe', 'spezie'],
      is_attivo: true,
      categoria_id: 'cat-secondi',
      created_at: now,
      updated_at: now,
    },

    // Componenti per contorni
    {
      id: 'comp-patate',
      nome: 'Patate al Forno',
      descrizione: 'Patate tagliate e cotte al forno',
      prezzo_base: 120, // 1.20 EUR
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['patate', "olio d'oliva", 'sale', 'rosmarino'],
      is_attivo: true,
      categoria_id: 'cat-contorni',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-insalata',
      nome: 'Insalata Mista',
      descrizione: 'Insalata mista con verdure di stagione',
      prezzo_base: 100, // 1.00 EUR
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['lattuga', 'pomodori', 'carote', "olio d'oliva"],
      is_attivo: true,
      categoria_id: 'cat-contorni',
      created_at: now,
      updated_at: now,
    },

    // Componenti per bevande
    {
      id: 'comp-acqua',
      nome: 'Acqua Naturale',
      descrizione: 'Acqua minerale naturale 50cl',
      prezzo_base: 80, // 0.80 EUR
      unita_misura: 'bottiglia',
      allergeni: [],
      ingredienti: ['acqua minerale'],
      is_attivo: true,
      categoria_id: 'cat-bevande',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-coca-cola',
      nome: 'Coca Cola',
      descrizione: 'Coca Cola 33cl',
      prezzo_base: 120, // 1.20 EUR
      unita_misura: 'lattina',
      allergeni: [],
      ingredienti: ['acqua', 'zucchero', 'anidride carbonica', 'colorante'],
      is_attivo: true,
      categoria_id: 'cat-bevande',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-vino-rosso',
      nome: 'Vino Rosso della Casa',
      descrizione: 'Vino rosso della casa 25cl',
      prezzo_base: 200, // 2.00 EUR
      unita_misura: 'bicchiere',
      allergeni: ['solfiti'],
      ingredienti: ['uva rossa'],
      is_attivo: true,
      categoria_id: 'cat-bevande',
      created_at: now,
      updated_at: now,
    },

    // Componenti per dolci
    {
      id: 'comp-tiramisu',
      nome: 'Tiramisù',
      descrizione: 'Tiramisù tradizionale',
      prezzo_base: 250, // 2.50 EUR
      unita_misura: 'porzione',
      allergeni: ['glutine', 'latte', 'uova'],
      ingredienti: ['mascarpone', 'uova', 'zucchero', 'caffè', 'savoiardi'],
      is_attivo: true,
      categoria_id: 'cat-dolci',
      created_at: now,
      updated_at: now,
    },
  ];
}

/**
 * Crea i menu items completi
 */
function createInitialMenuItems(): MenuItem[] {
  const now = new Date();

  return [
    // Primi piatti
    {
      id: 'item-spaghetti-pomodoro',
      nome: 'Spaghetti al Pomodoro',
      descrizione: 'Spaghetti con sugo al pomodoro e parmigiano',
      prezzo: 450, // 4.50 EUR (200 + 150 + 100)
      categoria_id: 'cat-primi',
      componenti: [
        {
          component_id: 'comp-spaghetti',
          quantita: 1,
          prezzo_unitario: 200,
          nome_snapshot: 'Spaghetti',
        },
        {
          component_id: 'comp-sugo-pomodoro',
          quantita: 1,
          prezzo_unitario: 150,
          nome_snapshot: 'Sugo al Pomodoro',
        },
        {
          component_id: 'comp-parmigiano',
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
      id: 'item-spaghetti-pomodoro-no-parmigiano',
      nome: 'Spaghetti al Pomodoro (Senza Parmigiano)',
      descrizione: 'Spaghetti con sugo al pomodoro (senza parmigiano)',
      prezzo: 350, // 3.50 EUR (200 + 150)
      categoria_id: 'cat-primi',
      componenti: [
        {
          component_id: 'comp-spaghetti',
          quantita: 1,
          prezzo_unitario: 200,
          nome_snapshot: 'Spaghetti',
        },
        {
          component_id: 'comp-sugo-pomodoro',
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
    {
      id: 'item-risotto-pomodoro',
      nome: 'Risotto al Pomodoro',
      descrizione: 'Risotto con sugo al pomodoro e parmigiano',
      prezzo: 430, // 4.30 EUR (180 + 150 + 100)
      categoria_id: 'cat-primi',
      componenti: [
        {
          component_id: 'comp-riso',
          quantita: 1,
          prezzo_unitario: 180,
          nome_snapshot: 'Riso Carnaroli',
        },
        {
          component_id: 'comp-sugo-pomodoro',
          quantita: 1,
          prezzo_unitario: 150,
          nome_snapshot: 'Sugo al Pomodoro',
        },
        {
          component_id: 'comp-parmigiano',
          quantita: 1,
          prezzo_unitario: 100,
          nome_snapshot: 'Parmigiano Reggiano',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: false,
      tempo_preparazione: 20,
      created_at: now,
      updated_at: now,
    },

    // Secondi piatti
    {
      id: 'item-pollo-grigliato',
      nome: 'Pollo Grigliato',
      descrizione: 'Pollo intero grigliato con contorno',
      prezzo: 450, // 4.50 EUR (350 + 100)
      categoria_id: 'cat-secondi',
      componenti: [
        {
          component_id: 'comp-pollo',
          quantita: 1,
          prezzo_unitario: 350,
          nome_snapshot: 'Pollo Grigliato',
        },
        {
          component_id: 'comp-insalata',
          quantita: 1,
          prezzo_unitario: 100,
          nome_snapshot: 'Insalata Mista',
        },
      ],
      is_attivo: true,
      is_vegetariano: false,
      is_vegano: false,
      tempo_preparazione: 25,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-salsiccia-griglia',
      nome: 'Salsiccia alla Griglia',
      descrizione: 'Salsiccia di maiale alla griglia con patate',
      prezzo: 420, // 4.20 EUR (300 + 120)
      categoria_id: 'cat-secondi',
      componenti: [
        {
          component_id: 'comp-salsiccia',
          quantita: 1,
          prezzo_unitario: 300,
          nome_snapshot: 'Salsiccia alla Griglia',
        },
        {
          component_id: 'comp-patate',
          quantita: 1,
          prezzo_unitario: 120,
          nome_snapshot: 'Patate al Forno',
        },
      ],
      is_attivo: true,
      is_vegetariano: false,
      is_vegano: false,
      tempo_preparazione: 20,
      created_at: now,
      updated_at: now,
    },

    // Contorni
    {
      id: 'item-patate-forno',
      nome: 'Patate al Forno',
      descrizione: 'Patate tagliate e cotte al forno con rosmarino',
      prezzo: 120, // 1.20 EUR
      categoria_id: 'cat-contorni',
      componenti: [
        {
          component_id: 'comp-patate',
          quantita: 1,
          prezzo_unitario: 120,
          nome_snapshot: 'Patate al Forno',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: true,
      tempo_preparazione: 30,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-insalata-mista',
      nome: 'Insalata Mista',
      descrizione: 'Insalata mista con verdure di stagione',
      prezzo: 100, // 1.00 EUR
      categoria_id: 'cat-contorni',
      componenti: [
        {
          component_id: 'comp-insalata',
          quantita: 1,
          prezzo_unitario: 100,
          nome_snapshot: 'Insalata Mista',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: true,
      tempo_preparazione: 5,
      created_at: now,
      updated_at: now,
    },

    // Bevande
    {
      id: 'item-acqua-naturale',
      nome: 'Acqua Naturale',
      descrizione: 'Acqua minerale naturale 50cl',
      prezzo: 80, // 0.80 EUR
      categoria_id: 'cat-bevande',
      componenti: [
        {
          component_id: 'comp-acqua',
          quantita: 1,
          prezzo_unitario: 80,
          nome_snapshot: 'Acqua Naturale',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: true,
      tempo_preparazione: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-coca-cola',
      nome: 'Coca Cola',
      descrizione: 'Coca Cola 33cl',
      prezzo: 120, // 1.20 EUR
      categoria_id: 'cat-bevande',
      componenti: [
        {
          component_id: 'comp-coca-cola',
          quantita: 1,
          prezzo_unitario: 120,
          nome_snapshot: 'Coca Cola',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: true,
      tempo_preparazione: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-vino-rosso',
      nome: 'Vino Rosso della Casa',
      descrizione: 'Vino rosso della casa 25cl',
      prezzo: 200, // 2.00 EUR
      categoria_id: 'cat-bevande',
      componenti: [
        {
          component_id: 'comp-vino-rosso',
          quantita: 1,
          prezzo_unitario: 200,
          nome_snapshot: 'Vino Rosso della Casa',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: true,
      tempo_preparazione: 1,
      created_at: now,
      updated_at: now,
    },

    // Dolci
    {
      id: 'item-tiramisu',
      nome: 'Tiramisù',
      descrizione: 'Tiramisù tradizionale con mascarpone',
      prezzo: 250, // 2.50 EUR
      categoria_id: 'cat-dolci',
      componenti: [
        {
          component_id: 'comp-tiramisu',
          quantita: 1,
          prezzo_unitario: 250,
          nome_snapshot: 'Tiramisù',
        },
      ],
      is_attivo: true,
      is_vegetariano: true,
      is_vegano: false,
      tempo_preparazione: 5,
      created_at: now,
      updated_at: now,
    },
  ];
}

/**
 * Crea le statistiche iniziali del sistema
 */
function createInitialStats(): {
  system: SystemStats;
  categories: CategoryStats;
} {
  const now = new Date();

  return {
    system: {
      id: 'system',
      ultimo_progressivo_creato: 0,
      ultimo_progressivo_pronto: 0,
      totale_ordini_oggi: 0,
      totale_ordini_completati_oggi: 0,
      totale_ordini_cancellati_oggi: 0,
      fatturato_oggi: 0,
      ultimo_aggiornamento: now,
      created_at: now,
      updated_at: now,
    },
    categories: {
      id: 'categories',
      totale_categorie: 5,
      categorie_attive: 5,
      ultimo_aggiornamento: now,
      created_at: now,
      updated_at: now,
    },
  };
}

// ============================================================================
// FUNZIONI DI SEED
// ============================================================================

/**
 * Verifica se il database è già popolato
 */
async function isDatabasePopulated(): Promise<boolean> {
  try {
    // Controlla se esistono già le categorie
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    if (!categoriesSnapshot.empty) {
      console.log('⚠️ Il database è già popolato con categorie');
      return true;
    }

    // Controlla se esistono già i menu items
    const menuItemsSnapshot = await getDocs(collection(db, 'menu_items'));
    if (!menuItemsSnapshot.empty) {
      console.log('⚠️ Il database è già popolato con menu items');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Errore durante la verifica del database:', error);
    return false;
  }
}

/**
 * Popola il database con i dati iniziali
 */
export async function seedDatabase(): Promise<void> {
  console.log('🌱 Avvio seed del database...');

  try {
    // Verifica se il database è già popolato
    if (await isDatabasePopulated()) {
      console.log('⚠️ Database già popolato. Saltando il seed.');
      return;
    }

    console.log('📊 Creazione dati iniziali...');

    // Crea i dati
    const categories = createInitialCategories();
    const menuComponents = createInitialMenuComponents();
    const menuItems = createInitialMenuItems();
    const stats = createInitialStats();

    console.log(`✅ Creati ${categories.length} categorie`);
    console.log(`✅ Creati ${menuComponents.length} componenti menu`);
    console.log(`✅ Creati ${menuItems.length} menu items`);
    console.log(`✅ Creati ${Object.keys(stats).length} documenti statistiche`);

    // Usa una batch per inserire tutti i dati in una transazione
    const batch = writeBatch(db);

    // Aggiungi categorie
    categories.forEach(category => {
      const docRef = doc(db, 'categories', category.id);
      batch.set(docRef, category);
    });

    // Aggiungi componenti menu
    menuComponents.forEach(component => {
      const docRef = doc(db, 'menu_components', component.id);
      batch.set(docRef, component);
    });

    // Aggiungi menu items
    menuItems.forEach(item => {
      const docRef = doc(db, 'menu_items', item.id);
      batch.set(docRef, item);
    });

    // Aggiungi statistiche sistema
    const systemStatsRef = doc(db, 'stats', 'system');
    batch.set(systemStatsRef, stats.system);

    // Aggiungi statistiche categorie
    const categoryStatsRef = doc(db, 'stats', 'categories');
    batch.set(categoryStatsRef, stats.categories);

    // Esegui la batch
    console.log('💾 Salvataggio dati nel database...');
    await batch.commit();

    console.log('🎉 Database popolato con successo!');
    console.log('\n📋 Riepilogo:');
    console.log(`   • ${categories.length} categorie create`);
    console.log(`   • ${menuComponents.length} componenti menu creati`);
    console.log(`   • ${menuItems.length} menu items creati`);
    console.log(`   • Statistiche sistema inizializzate`);
  } catch (error) {
    console.error('❌ Errore durante il seed del database:', error);
    throw error;
  }
}

/**
 * Resetta il database (ATTENZIONE: cancella tutti i dati!)
 */
export async function resetDatabase(): Promise<void> {
  console.log('⚠️ ATTENZIONE: Reset completo del database...');
  console.log('Questo cancellerà TUTTI i dati esistenti!');

  try {
    // Implementa la logica per cancellare tutti i dati
    // ATTENZIONE: Questa è una funzione pericolosa!
    console.log('❌ Funzione reset non implementata per sicurezza');
    console.log('Usa Firebase Console per cancellare i dati se necessario');
  } catch (error) {
    console.error('❌ Errore durante il reset del database:', error);
    throw error;
  }
}

/**
 * Verifica lo stato del database
 */
export async function checkDatabaseStatus(): Promise<void> {
  console.log('🔍 Verifica stato database...');

  try {
    // Conta le categorie
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    console.log(`📊 Categorie: ${categoriesSnapshot.size}`);

    // Conta i componenti menu
    const componentsSnapshot = await getDocs(collection(db, 'menu_components'));
    console.log(`🍽️ Componenti menu: ${componentsSnapshot.size}`);

    // Conta i menu items
    const menuItemsSnapshot = await getDocs(collection(db, 'menu_items'));
    console.log(`🍕 Menu items: ${menuItemsSnapshot.size}`);

    // Conta gli utenti
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`👥 Utenti: ${usersSnapshot.size}`);

    // Conta gli ordini
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    console.log(`📝 Ordini: ${ordersSnapshot.size}`);

    // Verifica statistiche
    const statsSnapshot = await getDocs(collection(db, 'stats'));
    console.log(`📈 Documenti statistiche: ${statsSnapshot.size}`);

    console.log('\n✅ Verifica completata');
  } catch (error) {
    console.error('❌ Errore durante la verifica del database:', error);
  }
}

// ============================================================================
// ESECUZIONE
// ============================================================================

// Esegui il seed se chiamato direttamente
if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🚀 Esecuzione seed database...\n');

  // Prima verifica lo stato
  await checkDatabaseStatus();

  console.log('\n' + '='.repeat(50) + '\n');

  // Poi esegui il seed
  await seedDatabase();

  console.log('\n' + '='.repeat(50) + '\n');

  // Infine verifica di nuovo lo stato
  await checkDatabaseStatus();
}
