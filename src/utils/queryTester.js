import { db } from '../config/firebase.js';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
} from 'firebase/firestore';

/**
 * Testa le query con gli indici Firestore
 * Questo file è utile per verificare che gli indici funzionino correttamente
 */
export class QueryTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Testa la query per ordini per stato e data
   */
  async testOrdersByStatusAndDate() {
    try {
      console.log('🔍 Test query: ordini per stato e data');

      const ordersQuery = query(
        collection(db, 'orders'),
        where('stato', '==', 'in_attesa'),
        orderBy('created_at', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(ordersQuery);
      console.log(`✅ Query riuscita: ${snapshot.size} ordini trovati`);

      this.testResults.push({
        test: 'Orders by Status and Date',
        status: 'PASS',
        result: `${snapshot.size} ordini`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore query ordini per stato e data:', error);

      this.testResults.push({
        test: 'Orders by Status and Date',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Testa la query per ordini prioritari
   */
  async testPriorityOrders() {
    try {
      console.log('🔍 Test query: ordini prioritari');

      const priorityQuery = query(
        collection(db, 'orders'),
        where('is_prioritario', '==', true),
        orderBy('created_at', 'asc'),
        limit(10)
      );

      const snapshot = await getDocs(priorityQuery);
      console.log(
        `✅ Query riuscita: ${snapshot.size} ordini prioritari trovati`
      );

      this.testResults.push({
        test: 'Priority Orders',
        status: 'PASS',
        result: `${snapshot.size} ordini prioritari`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore query ordini prioritari:', error);

      this.testResults.push({
        test: 'Priority Orders',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Testa la query per ordini per progressivo
   */
  async testOrdersByProgressivo() {
    try {
      console.log('🔍 Test query: ordini per progressivo');

      const progressivoQuery = query(
        collection(db, 'orders'),
        orderBy('progressivo', 'asc'),
        limit(10)
      );

      const snapshot = await getDocs(progressivoQuery);
      console.log(`✅ Query riuscita: ${snapshot.size} ordini per progressivo`);

      this.testResults.push({
        test: 'Orders by Progressivo',
        status: 'PASS',
        result: `${snapshot.size} ordini`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore query ordini per progressivo:', error);

      this.testResults.push({
        test: 'Orders by Progressivo',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Testa la query per ordini con filtri multipli
   */
  async testOrdersMultipleFilters() {
    try {
      console.log('🔍 Test query: ordini con filtri multipli');

      const multiFilterQuery = query(
        collection(db, 'orders'),
        where('stato', '==', 'in_preparazione'),
        where('is_prioritario', '==', false),
        orderBy('created_at', 'asc'),
        limit(15)
      );

      const snapshot = await getDocs(multiFilterQuery);
      console.log(
        `✅ Query riuscita: ${snapshot.size} ordini con filtri multipli`
      );

      this.testResults.push({
        test: 'Orders Multiple Filters',
        status: 'PASS',
        result: `${snapshot.size} ordini`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore query filtri multipli:', error);

      this.testResults.push({
        test: 'Orders Multiple Filters',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Testa la query per menu per categoria
   */
  async testMenuByCategory() {
    try {
      console.log('🔍 Test query: menu per categoria');

      const menuQuery = query(
        collection(db, 'menu'),
        where('categoria_id', '==', 'primi'),
        where('is_attivo', '==', true),
        orderBy('nome', 'asc')
      );

      const snapshot = await getDocs(menuQuery);
      console.log(`✅ Query riuscita: ${snapshot.size} elementi menu trovati`);

      this.testResults.push({
        test: 'Menu by Category',
        status: 'PASS',
        result: `${snapshot.size} elementi`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore query menu per categoria:', error);

      this.testResults.push({
        test: 'Menu by Category',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Testa la query per utenti per ruolo
   */
  async testUsersByRole() {
    try {
      console.log('🔍 Test query: utenti per ruolo');

      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'cucina'),
        where('is_attivo', '==', true),
        orderBy('nome', 'asc')
      );

      const snapshot = await getDocs(usersQuery);
      console.log(`✅ Query riuscita: ${snapshot.size} utenti trovati`);

      this.testResults.push({
        test: 'Users by Role',
        status: 'PASS',
        result: `${snapshot.size} utenti`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore query utenti per ruolo:', error);

      this.testResults.push({
        test: 'Users by Role',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Testa la paginazione con startAfter
   */
  async testPagination() {
    try {
      console.log('🔍 Test query: paginazione');

      // Prima pagina
      const firstPageQuery = query(
        collection(db, 'orders'),
        orderBy('created_at', 'desc'),
        limit(5)
      );

      const firstPageSnapshot = await getDocs(firstPageQuery);

      if (firstPageSnapshot.empty) {
        console.log('⚠️ Nessun ordine trovato per testare la paginazione');
        this.testResults.push({
          test: 'Pagination',
          status: 'SKIP',
          result: 'Nessun dato disponibile',
        });
        return true;
      }

      // Seconda pagina
      const lastDoc = firstPageSnapshot.docs[firstPageSnapshot.docs.length - 1];
      const secondPageQuery = query(
        collection(db, 'orders'),
        orderBy('created_at', 'desc'),
        startAfter(lastDoc),
        limit(5)
      );

      const secondPageSnapshot = await getDocs(secondPageQuery);
      console.log(
        `✅ Paginazione riuscita: prima pagina ${firstPageSnapshot.size}, seconda pagina ${secondPageSnapshot.size}`
      );

      this.testResults.push({
        test: 'Pagination',
        status: 'PASS',
        result: `Pagina 1: ${firstPageSnapshot.size}, Pagina 2: ${secondPageSnapshot.size}`,
      });

      return true;
    } catch (error) {
      console.error('❌ Errore test paginazione:', error);

      this.testResults.push({
        test: 'Pagination',
        status: 'FAIL',
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Esegue tutti i test delle query
   */
  async runAllTests() {
    console.log('🚀 Avvio test delle query con indici...\n');

    await this.testOrdersByStatusAndDate();
    await this.testPriorityOrders();
    await this.testOrdersByProgressivo();
    await this.testOrdersMultipleFilters();
    await this.testMenuByCategory();
    await this.testUsersByRole();
    await this.testPagination();

    console.log('\n📊 Risultati test query:');
    console.log('-------------------------');

    this.testResults.forEach(result => {
      const status =
        result.status === 'PASS'
          ? '✅'
          : result.status === 'FAIL'
            ? '❌'
            : '⚠️';
      console.log(`${status} ${result.test}: ${result.result || result.error}`);
    });

    const passedTests = this.testResults.filter(
      r => r.status === 'PASS'
    ).length;
    const totalTests = this.testResults.length;

    console.log(`\n🎯 Test superati: ${passedTests}/${totalTests}`);

    return this.testResults;
  }
}

export default QueryTester;
