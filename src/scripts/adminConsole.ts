import { seedDatabase, checkDatabaseStatus } from './seedDatabase.js';
import {
  getInventoryItems,
  getSoldOutItems,
  getAvailableMenuItems,
  updateComponentStock,
  simulateOrder,
  restockComponent,
  printInventoryReport,
  printDetailedInventory,
  getInventoryReport,
} from './manageInventory.js';
import { db } from '../config/firebase.js';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { MenuItem, Category, MenuComponent } from '../types/dataModel';

// ============================================================================
// INTERFACCE PER LA CONSOLE AMMINISTRATIVA
// ============================================================================

interface AdminCommand {
  command: string;
  description: string;
  execute: () => Promise<void>;
}

interface MenuItemWithCategory extends MenuItem {
  categoria_nome: string;
}

// ============================================================================
// FUNZIONI DELLA CONSOLE AMMINISTRATIVA
// ============================================================================

/**
 * Mostra il menu principale della console amministrativa
 */
function showMainMenu(): void {
  console.log('\n🔧 Console Amministrativa - Sagra Orders');
  console.log('==========================================\n');
  console.log('Comandi disponibili:');
  console.log('  1. seed          - Popola il database con dati iniziali');
  console.log('  2. status        - Verifica lo stato del database');
  console.log('  3. inventory     - Mostra report inventario');
  console.log('  4. menu          - Mostra menu completo');
  console.log('  5. soldout       - Mostra elementi sold-out');
  console.log('  6. restock       - Rifornisci un componente');
  console.log('  7. simulate      - Simula un ordine');
  console.log('  8. toggle        - Attiva/disattiva menu item');
  console.log('  9. categories    - Gestisci categorie');
  console.log('  10. help         - Mostra questo menu');
  console.log('  11. exit         - Esci dalla console');
  console.log('');
}

/**
 * Popola il database con dati iniziali
 */
async function seedDatabaseCommand(): Promise<void> {
  console.log('🌱 Avvio popolamento database...\n');

  try {
    await seedDatabase();
    console.log('\n✅ Database popolato con successo!');
  } catch (error) {
    console.error('❌ Errore durante il popolamento:', error);
  }
}

/**
 * Verifica lo stato del database
 */
async function checkStatusCommand(): Promise<void> {
  console.log('🔍 Verifica stato database...\n');

  try {
    await checkDatabaseStatus();
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

/**
 * Mostra report inventario
 */
async function showInventoryCommand(): Promise<void> {
  console.log('📊 Report Inventario...\n');

  try {
    await printInventoryReport();
  } catch (error) {
    console.error('❌ Errore durante recupero inventario:', error);
  }
}

/**
 * Mostra menu completo
 */
async function showMenuCommand(): Promise<void> {
  console.log('🍽️ Menu Completo...\n');

  try {
    const menuItems = await getAvailableMenuItems();
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));

    // Crea mappa categorie
    const categoriesMap = new Map<string, string>();
    categoriesSnapshot.forEach(doc => {
      const category = doc.data() as Category;
      categoriesMap.set(category.id, category.nome);
    });

    // Raggruppa per categoria
    const menuByCategory = new Map<string, MenuItem[]>();
    menuItems.forEach(item => {
      const categoria_nome =
        categoriesMap.get(item.categoria_id) || 'Sconosciuta';
      if (!menuByCategory.has(categoria_nome)) {
        menuByCategory.set(categoria_nome, []);
      }
      menuByCategory.get(categoria_nome)!.push(item);
    });

    // Stampa menu organizzato
    menuByCategory.forEach((items, categoria) => {
      console.log(`\n📂 ${categoria.toUpperCase()}`);
      console.log('-'.repeat(categoria.length + 2));

      items.forEach(item => {
        const status = item.is_attivo ? '✅' : '❌';
        const prezzo = (item.prezzo / 100).toFixed(2);
        const flags = [];

        if (item.is_vegetariano) flags.push('🌱');
        if (item.is_vegano) flags.push('🌿');
        if (item.tempo_preparazione)
          flags.push(`⏱️ ${item.tempo_preparazione}min`);

        console.log(`${status} ${item.nome} - €${prezzo} ${flags.join(' ')}`);
        if (item.descrizione) {
          console.log(`   ${item.descrizione}`);
        }
      });
    });

    console.log(`\n📊 Totale: ${menuItems.length} elementi nel menu`);
  } catch (error) {
    console.error('❌ Errore durante recupero menu:', error);
  }
}

/**
 * Mostra elementi sold-out
 */
async function showSoldOutCommand(): Promise<void> {
  console.log('🚫 Elementi Sold-Out...\n');

  try {
    const soldOutItems = await getSoldOutItems();

    if (soldOutItems.length === 0) {
      console.log('✅ Nessun elemento sold-out!');
      return;
    }

    soldOutItems.forEach(item => {
      const prezzo = (item.prezzo / 100).toFixed(2);
      console.log(`❌ ${item.nome} (${item.categoria_nome}) - €${prezzo}`);
      console.log(`   Motivo: ${item.motivo_sold_out}`);
      console.log(`   Data: ${item.data_sold_out.toLocaleDateString()}`);
      console.log('');
    });

    console.log(`📊 Totale elementi sold-out: ${soldOutItems.length}`);
  } catch (error) {
    console.error('❌ Errore durante recupero elementi sold-out:', error);
  }
}

/**
 * Rifornisci un componente
 */
async function restockCommand(): Promise<void> {
  console.log('📦 Rifornimento Componente...\n');

  try {
    const inventoryItems = await getInventoryItems();

    if (inventoryItems.length === 0) {
      console.log('❌ Nessun componente trovato nel database');
      return;
    }

    // Mostra lista componenti
    console.log('Componenti disponibili:');
    inventoryItems.forEach((item, index) => {
      const status = item.is_disponibile ? '✅' : '❌';
      const prezzo = (item.prezzo_base / 100).toFixed(2);
      console.log(
        `${index + 1}. ${status} ${item.nome} (${item.categoria_nome}) - €${prezzo}`
      );
      console.log(`   Giacenza attuale: ${item.giacenza} ${item.unita_misura}`);
    });

    // In un sistema reale, qui si chiederebbero input all'utente
    console.log(
      '\n⚠️ Funzionalità di input non implementata in questa versione'
    );
    console.log('Usa la funzione restockComponent() direttamente nel codice');
  } catch (error) {
    console.error('❌ Errore durante rifornimento:', error);
  }
}

/**
 * Simula un ordine
 */
async function simulateOrderCommand(): Promise<void> {
  console.log('🛒 Simulazione Ordine...\n');

  try {
    const availableItems = await getAvailableMenuItems();

    if (availableItems.length === 0) {
      console.log('❌ Nessun menu item disponibile');
      return;
    }

    // Mostra menu items disponibili
    console.log('Menu items disponibili:');
    availableItems.forEach((item, index) => {
      const prezzo = (item.prezzo / 100).toFixed(2);
      console.log(`${index + 1}. ${item.nome} - €${prezzo}`);
    });

    // In un sistema reale, qui si chiederebbero input all'utente
    console.log(
      '\n⚠️ Funzionalità di input non implementata in questa versione'
    );
    console.log('Usa la funzione simulateOrder() direttamente nel codice');
  } catch (error) {
    console.error('❌ Errore durante simulazione ordine:', error);
  }
}

/**
 * Attiva/disattiva menu item
 */
async function toggleMenuItemCommand(): Promise<void> {
  console.log('🔄 Toggle Menu Item...\n');

  try {
    const menuItemsSnapshot = await getDocs(collection(db, 'menu_items'));

    if (menuItemsSnapshot.empty) {
      console.log('❌ Nessun menu item trovato');
      return;
    }

    // Mostra menu items
    console.log('Menu items disponibili:');
    menuItemsSnapshot.forEach((doc, index) => {
      const item = doc.data() as MenuItem;
      const status = item.is_attivo ? '✅' : '❌';
      const prezzo = (item.prezzo / 100).toFixed(2);
      console.log(`${index + 1}. ${status} ${item.nome} - €${prezzo}`);
    });

    // In un sistema reale, qui si chiederebbero input all'utente
    console.log(
      '\n⚠️ Funzionalità di input non implementata in questa versione'
    );
    console.log(
      'Usa updateDoc() direttamente nel codice per modificare is_attivo'
    );
  } catch (error) {
    console.error('❌ Errore durante toggle menu item:', error);
  }
}

/**
 * Gestisci categorie
 */
async function manageCategoriesCommand(): Promise<void> {
  console.log('📂 Gestione Categorie...\n');

  try {
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));

    if (categoriesSnapshot.empty) {
      console.log('❌ Nessuna categoria trovata');
      return;
    }

    // Mostra categorie
    console.log('Categorie disponibili:');
    categoriesSnapshot.forEach((doc, index) => {
      const category = doc.data() as Category;
      const status = category.is_attiva ? '✅' : '❌';
      console.log(
        `${index + 1}. ${status} ${category.nome} (Ordine: ${category.ordine})`
      );
      if (category.descrizione) {
        console.log(`   ${category.descrizione}`);
      }
    });

    // In un sistema reale, qui si chiederebbero input all'utente
    console.log(
      '\n⚠️ Funzionalità di input non implementata in questa versione'
    );
    console.log(
      'Usa updateDoc() direttamente nel codice per modificare le categorie'
    );
  } catch (error) {
    console.error('❌ Errore durante gestione categorie:', error);
  }
}

/**
 * Mostra aiuto
 */
function showHelpCommand(): void {
  showMainMenu();
}

/**
 * Esci dalla console
 */
function exitCommand(): void {
  console.log('\n👋 Arrivederci! Console amministrativa chiusa.');
  process.exit(0);
}

// ============================================================================
// GESTIONE COMANDI
// ============================================================================

/**
 * Esegue un comando
 */
async function executeCommand(command: string): Promise<void> {
  const commands: AdminCommand[] = [
    {
      command: 'seed',
      description: 'Popola database',
      execute: seedDatabaseCommand,
    },
    {
      command: 'status',
      description: 'Verifica stato',
      execute: checkStatusCommand,
    },
    {
      command: 'inventory',
      description: 'Report inventario',
      execute: showInventoryCommand,
    },
    { command: 'menu', description: 'Menu completo', execute: showMenuCommand },
    {
      command: 'soldout',
      description: 'Elementi sold-out',
      execute: showSoldOutCommand,
    },
    {
      command: 'restock',
      description: 'Rifornisci componente',
      execute: restockCommand,
    },
    {
      command: 'simulate',
      description: 'Simula ordine',
      execute: simulateOrderCommand,
    },
    {
      command: 'toggle',
      description: 'Toggle menu item',
      execute: toggleMenuItemCommand,
    },
    {
      command: 'categories',
      description: 'Gestisci categorie',
      execute: manageCategoriesCommand,
    },
    { command: 'help', description: 'Mostra aiuto', execute: showHelpCommand },
    { command: 'exit', description: 'Esci', execute: exitCommand },
  ];

  const commandObj = commands.find(cmd => cmd.command === command);

  if (commandObj) {
    try {
      await commandObj.execute();
    } catch (error) {
      console.error('❌ Errore durante esecuzione comando:', error);
    }
  } else {
    console.log(`❌ Comando non riconosciuto: ${command}`);
    console.log('Digita "help" per vedere i comandi disponibili');
  }
}

/**
 * Avvia la console amministrativa
 */
export async function startAdminConsole(): Promise<void> {
  console.log('🚀 Avvio Console Amministrativa...\n');

  // Mostra menu iniziale
  showMainMenu();

  // In un sistema reale, qui si implementerebbe un loop di input
  // Per ora, esegue alcuni comandi di esempio
  console.log('🔄 Esecuzione comandi di esempio...\n');

  try {
    // Verifica stato database
    await executeCommand('status');

    console.log('\n' + '='.repeat(50) + '\n');

    // Mostra inventario
    await executeCommand('inventory');

    console.log('\n' + '='.repeat(50) + '\n');

    // Mostra menu
    await executeCommand('menu');

    console.log('\n' + '='.repeat(50) + '\n');

    // Mostra elementi sold-out
    await executeCommand('soldout');
  } catch (error) {
    console.error('❌ Errore durante esecuzione comandi:', error);
  }

  console.log('\n✅ Console amministrativa completata');
  console.log(
    'Per usare comandi specifici, chiama le funzioni direttamente nel codice'
  );
}

// ============================================================================
// FUNZIONI DI UTILITY PER AMMINISTRATORI
// ============================================================================

/**
 * Attiva/disattiva un menu item
 */
export async function toggleMenuItem(menuItemId: string): Promise<void> {
  try {
    const menuItemRef = doc(db, 'menu_items', menuItemId);
    const menuItemDoc = await getDocs(collection(db, 'menu_items'));

    if (menuItemDoc.empty) {
      throw new Error(`Menu item ${menuItemId} non trovato`);
    }

    const currentStatus = menuItemDoc.docs[0].data().is_attivo;
    const newStatus = !currentStatus;

    await updateDoc(menuItemRef, {
      is_attivo: newStatus,
      updated_at: new Date(),
    });

    console.log(
      `✅ Menu item ${menuItemId} ${newStatus ? 'attivato' : 'disattivato'}`
    );
  } catch (error) {
    console.error('❌ Errore durante toggle menu item:', error);
    throw error;
  }
}

/**
 * Aggiorna l'ordine di una categoria
 */
export async function updateCategoryOrder(
  categoryId: string,
  newOrder: number
): Promise<void> {
  try {
    const categoryRef = doc(db, 'categories', categoryId);

    await updateDoc(categoryRef, {
      ordine: newOrder,
      updated_at: new Date(),
    });

    console.log(`✅ Ordine categoria ${categoryId} aggiornato a ${newOrder}`);
  } catch (error) {
    console.error('❌ Errore durante aggiornamento ordine categoria:', error);
    throw error;
  }
}

/**
 * Ottiene statistiche complete del sistema
 */
export async function getSystemStats(): Promise<{
  totale_categorie: number;
  totale_componenti: number;
  totale_menu_items: number;
  menu_items_attivi: number;
  menu_items_inattivi: number;
  valore_inventario: number;
}> {
  try {
    const [categories, components, menuItems, inventoryReport] =
      await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'menu_components')),
        getDocs(collection(db, 'menu_items')),
        getInventoryReport(),
      ]);

    const menuItemsData = menuItems.docs.map(doc => doc.data() as MenuItem);

    return {
      totale_categorie: categories.size,
      totale_componenti: components.size,
      totale_menu_items: menuItems.size,
      menu_items_attivi: menuItemsData.filter(item => item.is_attivo).length,
      menu_items_inattivi: menuItemsData.filter(item => !item.is_attivo).length,
      valore_inventario: inventoryReport.valore_totale,
    };
  } catch (error) {
    console.error('❌ Errore durante recupero statistiche sistema:', error);
    throw error;
  }
}

// ============================================================================
// ESECUZIONE
// ============================================================================

// Avvia la console se chiamato direttamente
if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🚀 Avvio Console Amministrativa...\n');
  startAdminConsole();
}
