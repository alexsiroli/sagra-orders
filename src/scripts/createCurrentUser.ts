import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '../types/dataModel';

// ============================================================================
// FUNZIONI UTILITY
// ============================================================================

/**
 * Crea il documento utente corrente in Firestore
 */
async function createCurrentUser(): Promise<void> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log('❌ Nessun utente autenticato');
      console.log('💡 Fai prima il login con Firebase Auth');
      return;
    }

    console.log('🚀 Creazione documento utente per:', currentUser.email);
    console.log('   UID:', currentUser.uid);

    // Verifica se l'utente esiste già
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      console.log('✅ Utente già esistente in Firestore');
      console.log('   Dati:', userDoc.data());
      return;
    }

    // Crea nuovo utente
    const now = new Date();
    const newUser: User = {
      id: currentUser.uid,
      email: currentUser.email || '',
      nome:
        currentUser.displayName || currentUser.email?.split('@')[0] || 'Utente',
      role: 'admin', // Default role
      is_attivo: true,
      pin: '1234', // Default PIN
      created_at: now,
      updated_at: now,
    };

    await setDoc(userDocRef, newUser);

    console.log('✅ Documento utente creato con successo!');
    console.log('   Nome:', newUser.nome);
    console.log('   Ruolo:', newUser.role);
    console.log('   PIN:', newUser.pin);

    console.log("\n💡 Ora puoi fare login nell'applicazione!");
  } catch (error: any) {
    console.error('❌ Errore durante la creazione utente:', error);

    if (error.code === 'permission-denied') {
      console.log('\n🔐 Problema di permessi Firestore');
      console.log(
        '💡 Verifica che le regole Firestore permettano la scrittura'
      );
      console.log(
        '   Oppure crea manualmente il documento in Firebase Console'
      );
    }
  }
}

/**
 * Verifica lo stato dell'utente corrente
 */
async function checkCurrentUser(): Promise<void> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log('❌ Nessun utente autenticato');
      return;
    }

    console.log('🔍 Verifica utente corrente...');
    console.log('   Email:', currentUser.email);
    console.log('   UID:', currentUser.uid);

    // Verifica se esiste in Firestore
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      console.log('✅ Utente trovato in Firestore:');
      console.log('   Nome:', userData.nome);
      console.log('   Ruolo:', userData.role);
      console.log('   Attivo:', userData.is_attivo);
    } else {
      console.log('❌ Utente non trovato in Firestore');
      console.log('💡 Usa createCurrentUser() per crearlo');
    }
  } catch (error: any) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

// ============================================================================
// ESECUZIONE
// ============================================================================

if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🎯 Script gestione utente corrente...\n');

  // Prima verifica
  checkCurrentUser()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      // Poi crea se necessario
      return createCurrentUser();
    })
    .then(() => {
      console.log('\n✅ Script completato');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script fallito:', error);
      process.exit(1);
    });
}

export { createCurrentUser, checkCurrentUser };
