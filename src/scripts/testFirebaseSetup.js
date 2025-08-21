import { initializeDatabaseStats } from './initDatabase.js';
import SecurityTester from '../utils/securityTest.js';
import QueryTester from '../utils/queryTester.js';

/**
 * Script principale per testare il setup Firebase completo
 * Esegue tutti i test per verificare che l'issue #2 sia completata
 */
export async function testFirebaseSetup() {
  console.log('🔥 Test Setup Firebase Completo');
  console.log('================================\n');

  try {
    // 1. Test inizializzazione statistiche
    console.log('📊 1. Test inizializzazione statistiche database...');
    await initializeDatabaseStats();
    console.log('✅ Statistiche inizializzate con successo\n');

    // 2. Test regole di sicurezza
    console.log('🔒 2. Test regole di sicurezza...');
    const securityTester = new SecurityTester();

    // Test con ruolo admin
    console.log('\n--- Test con ruolo ADMIN ---');
    await securityTester.setCurrentUser('admin_user_id'); // Sostituisci con ID reale
    await securityTester.runAllTests();

    // Test con ruolo cassa
    console.log('\n--- Test con ruolo CASSA ---');
    await securityTester.setCurrentUser('cassa_user_id'); // Sostituisci con ID reale
    await securityTester.runAllTests();

    // Test con ruolo cucina
    console.log('\n--- Test con ruolo CUCINA ---');
    await securityTester.setCurrentUser('cucina_user_id'); // Sostituisci con ID reale
    await securityTester.runAllTests();

    // 3. Test query con indici
    console.log('\n🔍 3. Test query con indici...');
    const queryTester = new QueryTester();
    await queryTester.runAllTests();

    console.log('\n🎉 Tutti i test completati con successo!');
    console.log('✅ Issue #2: Provisioning Firebase - COMPLETATA');
  } catch (error) {
    console.error('\n❌ Errore durante i test:', error);
    console.log('⚠️ Verifica la configurazione Firebase e riprova');
  }
}

/**
 * Test rapido per verificare la connessione
 */
export async function quickConnectionTest() {
  console.log('🔌 Test connessione Firebase...');

  try {
    const { db } = await import('../config/firebase.js');
    console.log('✅ Connessione Firebase stabilita');

    // Test semplice lettura
    const { collection, getDocs } = await import('firebase/firestore');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(
      `✅ Lettura users riuscita: ${usersSnapshot.size} utenti trovati`
    );

    return true;
  } catch (error) {
    console.error('❌ Errore connessione Firebase:', error);
    return false;
  }
}

// Esegui i test se chiamato direttamente
if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🚀 Esecuzione test Firebase...\n');

  // Prima test connessione
  const connectionOk = await quickConnectionTest();

  if (connectionOk) {
    // Poi test completo
    await testFirebaseSetup();
  } else {
    console.log('❌ Impossibile procedere senza connessione Firebase');
  }
}
