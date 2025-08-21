import { db } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

/**
 * Testa le regole di sicurezza per i ruoli
 * Questo file è utile per verificare che le regole funzionino correttamente
 */
export class SecurityTester {
  constructor() {
    this.currentUser = null;
    this.currentRole = null;
  }

  /**
   * Imposta l'utente corrente per i test
   */
  async setCurrentUser(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        this.currentUser = userId;
        this.currentRole = userDoc.data().role;
        console.log(`👤 Utente corrente: ${userId} (${this.currentRole})`);
        return true;
      } else {
        console.error('❌ Utente non trovato');
        return false;
      }
    } catch (error) {
      console.error("❌ Errore durante il recupero dell'utente:", error);
      return false;
    }
  }

  /**
   * Testa la lettura degli ordini
   */
  async testOrdersRead() {
    try {
      console.log(`🔍 Test lettura ordini per ruolo: ${this.currentRole}`);

      const ordersQuery = query(
        collection(db, 'orders'),
        where('stato', '==', 'in_attesa'),
        orderBy('created_at', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(ordersQuery);
      console.log(
        `✅ Lettura ordini riuscita: ${snapshot.size} ordini trovati`
      );
      return true;
    } catch (error) {
      console.error('❌ Errore durante la lettura degli ordini:', error);
      return false;
    }
  }

  /**
   * Testa la creazione di ordini
   */
  async testOrdersCreate() {
    try {
      console.log(`📝 Test creazione ordini per ruolo: ${this.currentRole}`);

      if (this.currentRole !== 'cassa' && this.currentRole !== 'admin') {
        console.log('⚠️ Ruolo non autorizzato per la creazione ordini');
        return false;
      }

      const testOrder = {
        cliente: 'Test Cliente',
        items: [],
        totale: 0,
        stato: 'in_attesa',
        is_prioritario: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, testOrder);
      console.log('✅ Creazione ordine riuscita');

      // Pulisci il test
      await deleteDoc(orderRef);
      console.log('🧹 Ordine di test rimosso');

      return true;
    } catch (error) {
      console.error("❌ Errore durante la creazione dell'ordine:", error);
      return false;
    }
  }

  /**
   * Testa l'aggiornamento degli ordini
   */
  async testOrdersUpdate() {
    try {
      console.log(
        `✏️ Test aggiornamento ordini per ruolo: ${this.currentRole}`
      );

      if (
        this.currentRole !== 'cassa' &&
        this.currentRole !== 'cucina' &&
        this.currentRole !== 'admin'
      ) {
        console.log("⚠️ Ruolo non autorizzato per l'aggiornamento ordini");
        return false;
      }

      // Crea un ordine di test
      const testOrder = {
        cliente: 'Test Update',
        items: [],
        totale: 0,
        stato: 'in_attesa',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, testOrder);

      // Prova ad aggiornarlo
      await updateDoc(orderRef, {
        stato: 'in_preparazione',
        updated_at: new Date(),
      });

      console.log('✅ Aggiornamento ordine riuscito');

      // Pulisci il test
      await deleteDoc(orderRef);
      console.log('🧹 Ordine di test rimosso');

      return true;
    } catch (error) {
      console.error("❌ Errore durante l'aggiornamento dell'ordine:", error);
      return false;
    }
  }

  /**
   * Testa la lettura del menu
   */
  async testMenuRead() {
    try {
      console.log(`🍽️ Test lettura menu per ruolo: ${this.currentRole}`);

      const menuQuery = query(
        collection(db, 'menu'),
        where('is_attivo', '==', true),
        orderBy('nome')
      );

      const snapshot = await getDocs(menuQuery);
      console.log(
        `✅ Lettura menu riuscita: ${snapshot.size} elementi trovati`
      );
      return true;
    } catch (error) {
      console.error('❌ Errore durante la lettura del menu:', error);
      return false;
    }
  }

  /**
   * Testa la scrittura del menu (solo admin)
   */
  async testMenuWrite() {
    try {
      console.log(`✏️ Test scrittura menu per ruolo: ${this.currentRole}`);

      if (this.currentRole !== 'admin') {
        console.log('⚠️ Solo gli admin possono modificare il menu');
        return false;
      }

      const testItem = {
        nome: 'Test Item',
        prezzo: 5.0,
        categoria_id: 'test',
        is_attivo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const itemRef = doc(collection(db, 'menu'));
      await setDoc(itemRef, testItem);
      console.log('✅ Creazione item menu riuscita');

      // Pulisci il test
      await deleteDoc(itemRef);
      console.log('🧹 Item menu di test rimosso');

      return true;
    } catch (error) {
      console.error('❌ Errore durante la scrittura del menu:', error);
      return false;
    }
  }

  /**
   * Esegue tutti i test di sicurezza
   */
  async runAllTests() {
    console.log('🚀 Avvio test di sicurezza...\n');

    const results = {
      ordersRead: await this.testOrdersRead(),
      ordersCreate: await this.testOrdersCreate(),
      ordersUpdate: await this.testOrdersUpdate(),
      menuRead: await this.testMenuRead(),
      menuWrite: await this.testMenuWrite(),
    };

    console.log('\n📊 Risultati test di sicurezza:');
    console.log('--------------------------------');
    Object.entries(results).forEach(([test, result]) => {
      const status = result ? '✅ PASS' : '❌ FAIL';
      console.log(`${test}: ${status}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 Test superati: ${passedTests}/${totalTests}`);

    return results;
  }
}

export default SecurityTester;
