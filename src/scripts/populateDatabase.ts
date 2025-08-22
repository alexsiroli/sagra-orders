import { db } from '../config/firebase.js';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import {
  User,
  Category,
  MenuComponent,
  MenuItem,
  SystemStats,
  CategoryStats,
} from '../types/dataModel.js';

// ============================================================================
// CONFIGURAZIONE UTENTI
// ============================================================================

// SOSTITUISCI QUESTI UID CON QUELLI REALI DEI TUOI UTENTI FIREBASE AUTH
const USER_UIDS = {
  admin: 'Mix7mQcBvqWSmJJbNkkmNR4jPmA3',
  cassa: 'e0z4gbQ4yYa6z2QJUya8Xb0vnyt1',
  cucina: 'JNatf8Jd88OhDAnf9a0J90VFkg83',
};

// ============================================================================
// FUNZIONI DI CREAZIONE DATI
// ============================================================================

function createUsers(): User[] {
  const now = new Date();

  return [
    {
      id: USER_UIDS.admin,
      email: 'admin@locale.test',
      nome: 'Admin',
      role: 'admin',
      is_attivo: true,
      pin: '1234',
      created_at: now,
      updated_at: now,
    },
    {
      id: USER_UIDS.cassa,
      email: 'cassa@locale.test',
      nome: 'Cassa',
      role: 'cassa',
      is_attivo: true,
      pin: '5678',
      created_at: now,
      updated_at: now,
    },
    {
      id: USER_UIDS.cucina,
      email: 'cucina@locale.test',
      nome: 'Cucina',
      role: 'cucina',
      is_attivo: true,
      pin: '9012',
      created_at: now,
      updated_at: now,
    },
  ];
}

function createCategories(): Category[] {
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
      descrizione: 'Verdure, patate e contorni vari',
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
      descrizione: 'Acqua, bibite e vini',
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
      descrizione: 'Dessert e dolci tradizionali',
      ordine: 5,
      is_attiva: true,
      colore: '#FFEAA7',
      icona: 'dessert',
      created_at: now,
      updated_at: now,
    },
  ];
}

function createMenuComponents(): MenuComponent[] {
  const now = new Date();

  return [
    // Componenti per primi piatti
    {
      id: 'comp-spaghetti',
      nome: 'Spaghetti',
      descrizione: 'Spaghetti di semola di grano duro',
      prezzo_base: 200,
      unita_misura: 'porzione',
      allergeni: ['glutine'],
      ingredienti: ['semola di grano duro', 'acqua'],
      is_attivo: true,
      categoria_id: 'cat-primi',
      giacenza: 50,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-riso',
      nome: 'Riso Carnaroli',
      descrizione: 'Riso carnaroli per risotti',
      prezzo_base: 180,
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['riso carnaroli', 'acqua'],
      is_attivo: true,
      categoria_id: 'cat-primi',
      giacenza: 40,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-sugo-pomodoro',
      nome: 'Sugo al Pomodoro',
      descrizione: 'Sugo di pomodoro fresco',
      prezzo_base: 150,
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['pomodoro', 'basilico', 'aglio', "olio d'oliva"],
      is_attivo: true,
      categoria_id: 'cat-primi',
      giacenza: 60,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-parmigiano',
      nome: 'Parmigiano Reggiano',
      descrizione: 'Parmigiano Reggiano DOP grattugiato',
      prezzo_base: 100,
      unita_misura: 'porzione',
      allergeni: ['latte'],
      ingredienti: ['parmigiano reggiano'],
      is_attivo: true,
      categoria_id: 'cat-primi',
      giacenza: 80,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },

    // Componenti per secondi piatti
    {
      id: 'comp-pollo',
      nome: 'Pollo Grigliato',
      descrizione: 'Petto di pollo grigliato',
      prezzo_base: 350,
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['pollo', "olio d'oliva", 'sale', 'pepe'],
      is_attivo: true,
      categoria_id: 'cat-secondi',
      giacenza: 30,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-salsiccia',
      nome: 'Salsiccia alla Griglia',
      descrizione: 'Salsiccia di maiale alla griglia',
      prezzo_base: 300,
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['carne di maiale', 'sale', 'pepe', 'spezie'],
      is_attivo: true,
      categoria_id: 'cat-secondi',
      giacenza: 25,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },

    // Componenti per contorni
    {
      id: 'comp-patate',
      nome: 'Patate al Forno',
      descrizione: 'Patate al forno con rosmarino',
      prezzo_base: 120,
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['patate', "olio d'oliva", 'sale', 'rosmarino'],
      is_attivo: true,
      categoria_id: 'cat-contorni',
      giacenza: 45,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-insalata',
      nome: 'Insalata Mista',
      descrizione: 'Insalata mista di stagione',
      prezzo_base: 100,
      unita_misura: 'porzione',
      allergeni: [],
      ingredienti: ['lattuga', 'pomodori', 'carote', "olio d'oliva"],
      is_attivo: true,
      categoria_id: 'cat-contorni',
      giacenza: 35,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },

    // Componenti per bevande
    {
      id: 'comp-acqua',
      nome: 'Acqua Naturale',
      descrizione: 'Acqua naturale 50cl',
      prezzo_base: 80,
      unita_misura: 'bottiglia',
      allergeni: [],
      ingredienti: ['acqua'],
      is_attivo: true,
      categoria_id: 'cat-bevande',
      giacenza: 100,
      giacenza_minima: 10,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-coca',
      nome: 'Coca Cola',
      descrizione: 'Coca Cola 33cl',
      prezzo_base: 120,
      unita_misura: 'lattina',
      allergeni: [],
      ingredienti: ['acqua', 'zucchero', 'anidride carbonica', 'colorante'],
      is_attivo: true,
      categoria_id: 'cat-bevande',
      giacenza: 80,
      giacenza_minima: 10,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'comp-vino',
      nome: 'Vino Rosso della Casa',
      descrizione: 'Vino rosso della casa 75cl',
      prezzo_base: 200,
      unita_misura: 'bottiglia',
      allergeni: ['solfiti'],
      ingredienti: ['uva rossa'],
      is_attivo: true,
      categoria_id: 'cat-bevande',
      giacenza: 40,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },

    // Componenti per dolci
    {
      id: 'comp-tiramisu',
      nome: 'Tiramisù',
      descrizione: 'Tiramisù tradizionale',
      prezzo_base: 250,
      unita_misura: 'porzione',
      allergeni: ['uova', 'latte', 'glutine'],
      ingredienti: ['mascarpone', 'uova', 'caffè', 'cacao', 'savoiardi'],
      is_attivo: true,
      categoria_id: 'cat-dolci',
      giacenza: 20,
      giacenza_minima: 5,
      is_disponibile: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

function createMenuItems(): MenuItem[] {
  const now = new Date();

  return [
    // Primi piatti
    {
      id: 'item-spaghetti-pomodoro',
      nome: 'Spaghetti al Pomodoro',
      descrizione: 'Spaghetti con sugo di pomodoro fresco e parmigiano',
      prezzo: 450,
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
      is_vegetariano: false,
      is_vegano: false,
      tempo_preparazione: 15,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'item-spaghetti-pomodoro-vegano',
      nome: 'Spaghetti al Pomodoro (Senza Parmigiano)',
      descrizione: 'Spaghetti con sugo di pomodoro fresco - versione vegana',
      prezzo: 350,
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
      descrizione: 'Risotto carnaroli con sugo di pomodoro e parmigiano',
      prezzo: 430,
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
      is_vegetariano: false,
      is_vegano: false,
      tempo_preparazione: 20,
      created_at: now,
      updated_at: now,
    },

    // Secondi piatti
    {
      id: 'item-pollo-grigliato',
      nome: 'Pollo Grigliato',
      descrizione: 'Petto di pollo grigliato con insalata mista',
      prezzo: 450,
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
      descrizione: 'Salsiccia di maiale alla griglia con patate al forno',
      prezzo: 420,
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
      descrizione: "Patate al forno con rosmarino e olio d'oliva",
      prezzo: 120,
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
      descrizione: "Insalata mista di stagione con olio d'oliva",
      prezzo: 100,
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
      id: 'item-acqua',
      nome: 'Acqua Naturale',
      descrizione: 'Acqua naturale 50cl',
      prezzo: 80,
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
      prezzo: 120,
      categoria_id: 'cat-bevande',
      componenti: [
        {
          component_id: 'comp-coca',
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
      descrizione: 'Vino rosso della casa 75cl',
      prezzo: 200,
      categoria_id: 'cat-bevande',
      componenti: [
        {
          component_id: 'comp-vino',
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
      descrizione: 'Tiramisù tradizionale con mascarpone e caffè',
      prezzo: 250,
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
      is_vegetariano: false,
      is_vegano: false,
      tempo_preparazione: 5,
      created_at: now,
      updated_at: now,
    },
  ];
}

function createStats(): { system: SystemStats; categories: CategoryStats } {
  const now = new Date();

  return {
    system: {
      id: 'system',
      ultimo_progressivo_creato: 0,
      ultimo_progressivo_pronto: 0,
      totale_ordini: 0,
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
// FUNZIONE PRINCIPALE
// ============================================================================

async function populateDatabase(): Promise<void> {
  console.log('🚀 Popolamento database Sagra Orders...\n');

  // Verifica che gli UID siano stati configurati
  if (USER_UIDS.admin === 'SOSTITUISCI_CON_UID_ADMIN') {
    console.log('❌ ERRORE: Devi prima configurare gli UID degli utenti!');
    console.log('💡 Modifica la variabile USER_UIDS in questo file');
    console.log(
      '   Sostituisci i placeholder con gli UID reali di Firebase Auth'
    );
    return;
  }

  try {
    // Crea i dati
    const users = createUsers();
    const categories = createCategories();
    const menuComponents = createMenuComponents();
    const menuItems = createMenuItems();
    const stats = createStats();

    console.log('📊 Dati preparati:');
    console.log(`   • ${users.length} utenti`);
    console.log(`   • ${categories.length} categorie`);
    console.log(`   • ${menuComponents.length} componenti menu`);
    console.log(`   • ${menuItems.length} menu items`);
    console.log(`   • ${Object.keys(stats).length} documenti statistiche`);

    // Usa una batch per inserire tutti i dati in una transazione
    const batch = writeBatch(db);

    // Aggiungi utenti
    users.forEach(user => {
      const docRef = doc(db, 'users', user.id);
      batch.set(docRef, user);
    });

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
    console.log('\n💾 Salvataggio dati nel database...');
    await batch.commit();

    console.log('🎉 Database popolato con successo!');
    console.log('\n📋 Riepilogo:');
    console.log(`   • ${users.length} utenti creati e attivati`);
    console.log(`   • ${categories.length} categorie create`);
    console.log(`   • ${menuComponents.length} componenti menu creati`);
    console.log(`   • ${menuItems.length} menu items creati`);
    console.log(`   • Statistiche sistema inizializzate`);

    console.log('\n🔑 Account demo disponibili:');
    console.log('   👑 Admin: admin@sagra.it / admin123 (PIN: 1234)');
    console.log('   💳 Cassa: cassa@sagra.it / cassa123 (PIN: 5678)');
    console.log('   👨‍🍳 Cucina: cucina@sagra.it / cucina123 (PIN: 9012)');

    console.log('\n💡 Ora puoi fare login con questi account!');
  } catch (error) {
    console.error('❌ Errore durante il popolamento del database:', error);

    if (error.code === 'permission-denied') {
      console.log('\n🔐 Problema di permessi Firestore');
      console.log(
        '💡 Verifica che le regole Firestore permettano la scrittura'
      );
    }
  }
}

// ============================================================================
// ESECUZIONE
// ============================================================================

if (import.meta.url === `file://${import.meta.url}`) {
  populateDatabase()
    .then(() => {
      console.log('\n✅ Script completato');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script fallito:', error);
      process.exit(1);
    });
}

export { populateDatabase };
