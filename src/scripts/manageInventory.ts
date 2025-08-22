import { db } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { MenuComponent, MenuItem, Category } from '../types/dataModel';

// ============================================================================
// INTERFACCE PER GESTIONE INVENTARIO
// ============================================================================

export interface InventoryItem {
  id: string;
  nome: string;
  categoria_id: string;
  categoria_nome: string;
  giacenza: number;
  giacenza_minima: number;
  is_disponibile: boolean;
  prezzo_base: number;
  unita_misura: string;
  allergeni: string[];
  ingredienti: string[];
  is_attivo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryUpdate {
  component_id: string;
  quantita: number;
  operazione: 'add' | 'subtract' | 'set';
  motivo: string;
  timestamp: Date;
}

export interface SoldOutItem {
  id: string;
  nome: string;
  categoria_nome: string;
  prezzo: number;
  motivo_sold_out: string;
  data_sold_out: Date;
}

// ============================================================================
// FUNZIONI DI GESTIONE INVENTARIO
// ============================================================================

/**
 * Ottiene tutti gli elementi dell'inventario con giacenza
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const componentsSnapshot = await getDocs(collection(db, 'menu_components'));
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));

    // Crea una mappa delle categorie per lookup veloce
    const categoriesMap = new Map<string, string>();
    categoriesSnapshot.forEach(doc => {
      const category = doc.data() as Category;
      categoriesMap.set(category.id, category.nome);
    });

    const inventoryItems: InventoryItem[] = [];

    componentsSnapshot.forEach(doc => {
      const component = doc.data() as MenuComponent;
      const categoria_nome =
        categoriesMap.get(component.categoria_id) || 'Sconosciuta';

      // Per ora, simula giacenze (in un sistema reale queste verrebbero da un sistema di magazzino)
      const giacenza = Math.floor(Math.random() * 100) + 10; // 10-110 pezzi
      const giacenza_minima = 5;
      const is_disponibile = giacenza > giacenza_minima;

      inventoryItems.push({
        id: component.id,
        nome: component.nome,
        categoria_id: component.categoria_id,
        categoria_nome,
        giacenza,
        giacenza_minima,
        is_disponibile,
        prezzo_base: component.prezzo_base,
        unita_misura: component.unità_misura,
        allergeni: component.allergeni || [],
        ingredienti: component.ingredienti || [],
        is_attivo: component.is_attivo,
        created_at: component.created_at,
        updated_at: component.updated_at,
      });
    });

    return inventoryItems.sort((a, b) =>
      a.categoria_nome.localeCompare(b.categoria_nome)
    );
  } catch (error) {
    console.error('❌ Errore durante il recupero inventario:', error);
    throw error;
  }
}

/**
 * Aggiorna la giacenza di un componente
 */
export async function updateComponentStock(
  componentId: string,
  quantita: number,
  operazione: 'add' | 'subtract' | 'set',
  motivo: string
): Promise<void> {
  try {
    const componentRef = doc(db, 'menu_components', componentId);
    const componentDoc = await getDoc(componentRef);

    if (!componentDoc.exists()) {
      throw new Error(`Componente ${componentId} non trovato`);
    }

    let nuovaGiacenza: number;

    switch (operazione) {
      case 'add':
        nuovaGiacenza = (componentDoc.data().giacenza || 0) + quantita;
        break;
      case 'subtract':
        nuovaGiacenza = Math.max(
          0,
          (componentDoc.data().giacenza || 0) - quantita
        );
        break;
      case 'set':
        nuovaGiacenza = Math.max(0, quantita);
        break;
      default:
        throw new Error(`Operazione non valida: ${operazione}`);
    }

    // Aggiorna la giacenza
    await updateDoc(componentRef, {
      giacenza: nuovaGiacenza,
      is_disponibile:
        nuovaGiacenza > (componentDoc.data().giacenza_minima || 5),
      updated_at: new Date(),
    });

    console.log(
      `✅ Giacenza aggiornata per ${componentDoc.data().nome}: ${nuovaGiacenza}`
    );

    // Aggiorna anche i menu items che usano questo componente
    await updateMenuItemsAvailability(componentId, nuovaGiacenza > 0);
  } catch (error) {
    console.error('❌ Errore durante aggiornamento giacenza:', error);
    throw error;
  }
}

/**
 * Aggiorna la disponibilità dei menu items basandosi sulla giacenza dei componenti
 */
async function updateMenuItemsAvailability(
  componentId: string,
  isAvailable: boolean
): Promise<void> {
  try {
    const menuItemsQuery = query(
      collection(db, 'menu_items'),
      where('componenti', 'array-contains', { component_id: componentId })
    );

    const menuItemsSnapshot = await getDocs(menuItemsQuery);

    if (menuItemsSnapshot.empty()) {
      return; // Nessun menu item usa questo componente
    }

    const batch = writeBatch(db);

    menuItemsSnapshot.forEach(doc => {
      const menuItem = doc.data() as MenuItem;

      // Verifica se tutti i componenti sono disponibili
      const allComponentsAvailable = menuItem.componenti.every(comp => {
        // Per ora, assume che tutti i componenti siano disponibili
        // In un sistema reale, dovrebbe controllare la giacenza di ogni componente
        return true;
      });

      // Aggiorna la disponibilità del menu item
      batch.update(doc.ref, {
        is_attivo: allComponentsAvailable && isAvailable,
        updated_at: new Date(),
      });
    });

    await batch.commit();
    console.log(
      `✅ Aggiornata disponibilità per ${menuItemsSnapshot.size} menu items`
    );
  } catch (error) {
    console.error(
      '❌ Errore durante aggiornamento disponibilità menu items:',
      error
    );
  }
}

/**
 * Ottiene tutti gli elementi sold-out
 */
export async function getSoldOutItems(): Promise<SoldOutItem[]> {
  try {
    const inventoryItems = await getInventoryItems();
    const soldOutItems: SoldOutItem[] = [];

    inventoryItems.forEach(item => {
      if (!item.is_disponibile) {
        soldOutItems.push({
          id: item.id,
          nome: item.nome,
          categoria_nome: item.categoria_nome,
          prezzo: item.prezzo_base,
          motivo_sold_out: `Giacenza insufficiente (${item.giacenza}/${item.giacenza_minima})`,
          data_sold_out: item.updated_at,
        });
      }
    });

    return soldOutItems;
  } catch (error) {
    console.error('❌ Errore durante recupero elementi sold-out:', error);
    throw error;
  }
}

/**
 * Ottiene tutti i menu items disponibili per la cassa
 */
export async function getAvailableMenuItems(): Promise<MenuItem[]> {
  try {
    const menuItemsQuery = query(
      collection(db, 'menu_items'),
      where('is_attivo', '==', true),
      orderBy('categoria_id'),
      orderBy('nome')
    );

    const menuItemsSnapshot = await getDocs(menuItemsQuery);
    const menuItems: MenuItem[] = [];

    menuItemsSnapshot.forEach(doc => {
      menuItems.push(doc.data() as MenuItem);
    });

    return menuItems;
  } catch (error) {
    console.error('❌ Errore durante recupero menu items disponibili:', error);
    throw error;
  }
}

/**
 * Verifica se un menu item è ordinabile (tutti i componenti disponibili)
 */
export async function isMenuItemOrderable(
  menuItemId: string
): Promise<boolean> {
  try {
    const menuItemRef = doc(db, 'menu_items', menuItemId);
    const menuItemDoc = await getDoc(menuItemRef);

    if (!menuItemDoc.exists()) {
      return false;
    }

    const menuItem = menuItemDoc.data() as MenuItem;

    // Verifica che il menu item sia attivo
    if (!menuItem.is_attivo) {
      return false;
    }

    // Verifica che tutti i componenti siano disponibili
    for (const componente of menuItem.componenti) {
      const componentRef = doc(db, 'menu_components', componente.component_id);
      const componentDoc = await getDoc(componentRef);

      if (!componentDoc.exists()) {
        return false;
      }

      const component = componentDoc.data() as MenuComponent;
      if (
        !component.is_attivo ||
        (component.giacenza || 0) <= (component.giacenza_minima || 5)
      ) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Errore durante verifica ordinabilità menu item:', error);
    return false;
  }
}

/**
 * Simula un ordine e aggiorna le giacenze
 */
export async function simulateOrder(
  menuItemId: string,
  quantita: number
): Promise<boolean> {
  try {
    // Verifica se l'item è ordinabile
    if (!(await isMenuItemOrderable(menuItemId))) {
      console.log(`❌ Menu item ${menuItemId} non ordinabile`);
      return false;
    }

    const menuItemRef = doc(db, 'menu_items', menuItemId);
    const menuItemDoc = await getDoc(menuItemRef);

    if (!menuItemDoc.exists()) {
      throw new Error(`Menu item ${menuItemId} non trovato`);
    }

    const menuItem = menuItemDoc.data() as MenuItem;

    // Aggiorna le giacenze dei componenti
    const batch = writeBatch(db);

    for (const componente of menuItem.componenti) {
      const componentRef = doc(db, 'menu_components', componente.component_id);
      const componentDoc = await getDoc(componentRef);

      if (componentDoc.exists()) {
        const component = componentDoc.data() as MenuComponent;
        const nuovaGiacenza = Math.max(
          0,
          (component.giacenza || 0) - componente.quantita * quantita
        );

        batch.update(componentRef, {
          giacenza: nuovaGiacenza,
          is_disponibile: nuovaGiacenza > (component.giacenza_minima || 5),
          updated_at: new Date(),
        });
      }
    }

    await batch.commit();
    console.log(`✅ Ordine simulato per ${quantita}x ${menuItem.nome}`);

    // Aggiorna la disponibilità del menu item se necessario
    await updateMenuItemsAvailability(menuItemId, true);

    return true;
  } catch (error) {
    console.error('❌ Errore durante simulazione ordine:', error);
    return false;
  }
}

/**
 * Rifornisce un componente
 */
export async function restockComponent(
  componentId: string,
  quantita: number,
  motivo: string
): Promise<void> {
  await updateComponentStock(componentId, quantita, 'add', motivo);
}

/**
 * Ottiene il report dell'inventario
 */
export async function getInventoryReport(): Promise<{
  totale_componenti: number;
  componenti_disponibili: number;
  componenti_sold_out: number;
  valore_totale: number;
  categorie: { [key: string]: number };
}> {
  try {
    const inventoryItems = await getInventoryItems();

    const report = {
      totale_componenti: inventoryItems.length,
      componenti_disponibili: inventoryItems.filter(item => item.is_disponibile)
        .length,
      componenti_sold_out: inventoryItems.filter(item => !item.is_disponibile)
        .length,
      valore_totale: inventoryItems.reduce(
        (sum, item) => sum + item.prezzo_base * item.giacenza,
        0
      ),
      categorie: {} as { [key: string]: number },
    };

    // Raggruppa per categoria
    inventoryItems.forEach(item => {
      if (!report.categorie[item.categoria_nome]) {
        report.categorie[item.categoria_nome] = 0;
      }
      report.categorie[item.categoria_nome]++;
    });

    return report;
  } catch (error) {
    console.error('❌ Errore durante generazione report inventario:', error);
    throw error;
  }
}

// ============================================================================
// FUNZIONI DI UTILITY
// ============================================================================

/**
 * Stampa il report dell'inventario
 */
export async function printInventoryReport(): Promise<void> {
  console.log('📊 Report Inventario');
  console.log('===================\n');

  try {
    const report = await getInventoryReport();

    console.log(`📦 Totale componenti: ${report.totale_componenti}`);
    console.log(`✅ Disponibili: ${report.componenti_disponibili}`);
    console.log(`❌ Sold-out: ${report.componenti_sold_out}`);
    console.log(
      `💰 Valore totale: €${(report.valore_totale / 100).toFixed(2)}`
    );

    console.log('\n📂 Per categoria:');
    Object.entries(report.categorie).forEach(([categoria, count]) => {
      console.log(`   • ${categoria}: ${count} componenti`);
    });

    // Mostra elementi sold-out
    const soldOutItems = await getSoldOutItems();
    if (soldOutItems.length > 0) {
      console.log('\n🚫 Elementi Sold-Out:');
      soldOutItems.forEach(item => {
        console.log(
          `   • ${item.nome} (${item.categoria_nome}): ${item.motivo_sold_out}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Errore durante generazione report:', error);
  }
}

/**
 * Stampa lo stato dettagliato dell'inventario
 */
export async function printDetailedInventory(): Promise<void> {
  console.log('🔍 Inventario Dettagliato');
  console.log('========================\n');

  try {
    const inventoryItems = await getInventoryItems();

    inventoryItems.forEach(item => {
      const status = item.is_disponibile ? '✅' : '❌';
      const giacenzaColor = item.giacenza <= item.giacenza_minima ? '🔴' : '🟢';

      console.log(`${status} ${item.nome} (${item.categoria_nome})`);
      console.log(
        `   ${giacenzaColor} Giacenza: ${item.giacenza} ${item.unita_misura}`
      );
      console.log(`   💰 Prezzo: €${(item.prezzo_base / 100).toFixed(2)}`);
      console.log(`   📅 Aggiornato: ${item.updated_at.toLocaleDateString()}`);

      if (item.allergeni.length > 0) {
        console.log(`   ⚠️ Allergeni: ${item.allergeni.join(', ')}`);
      }

      console.log('');
    });
  } catch (error) {
    console.error('❌ Errore durante recupero inventario dettagliato:', error);
  }
}

// ============================================================================
// ESECUZIONE
// ============================================================================

// Esegui le funzioni se chiamato direttamente
if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🚀 Gestione Inventario - Test...\n');

  // Stampa report inventario
  await printInventoryReport();

  console.log('\n' + '='.repeat(50) + '\n');

  // Stampa inventario dettagliato
  await printDetailedInventory();
}
