import { auth, db } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

// ============================================================================
// FUNZIONI UTILITY
// ============================================================================

/**
 * Attiva l'utente corrente
 */
async function activateCurrentUser(): Promise<void> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log('❌ Nessun utente autenticato');
      console.log('💡 Fai prima il login con Firebase Auth');
      return;
    }

    console.log('🚀 Attivazione utente:', currentUser.email);
    console.log('   UID:', currentUser.uid);

    // Verifica lo stato attuale
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log('❌ Utente non trovato in Firestore');
      console.log('💡 Crea prima il documento utente');
      return;
    }

    const userData = userDoc.data();
    console.log('📊 Stato attuale utente:');
    console.log('   Nome:', userData.nome);
    console.log('   Ruolo:', userData.role);
    console.log('   Attivo:', userData.is_attivo);

    if (userData.is_attivo) {
      console.log('✅ Utente già attivo!');
      return;
    }

    // Attiva l'utente
    await updateDoc(userDocRef, {
      is_attivo: true,
      updated_at: new Date(),
    });

    console.log('✅ Utente attivato con successo!');
    console.log("💡 Ora puoi fare login nell'applicazione");
  } catch (error: any) {
    console.error("❌ Errore durante l'attivazione:", error);

    if (error.code === 'permission-denied') {
      console.log('\n🔐 Problema di permessi Firestore');
      console.log('💡 Verifica che le regole permettano la scrittura');
    }
  }
}

/**
 * Verifica lo stato dell'utente corrente
 */
async function checkCurrentUserStatus(): Promise<void> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log('❌ Nessun utente autenticato');
      return;
    }

    console.log('🔍 Verifica stato utente corrente...');
    console.log('   Email:', currentUser.email);
    console.log('   UID:', currentUser.uid);

    // Verifica stato in Firestore
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✅ Utente trovato in Firestore:');
      console.log('   Nome:', userData.nome);
      console.log('   Ruolo:', userData.role);
      console.log('   Attivo:', userData.is_attivo);

      if (!userData.is_attivo) {
        console.log(
          '⚠️ Utente DISATTIVATO - usa activateCurrentUser() per attivarlo'
        );
      } else {
        console.log('✅ Utente ATTIVO - puoi fare login!');
      }
    } else {
      console.log('❌ Utente non trovato in Firestore');
      console.log('💡 Crea prima il documento utente');
    }
  } catch (error: any) {
    console.error('❌ Errore durante la verifica:', error);
  }
}

// ============================================================================
// ESECUZIONE
// ============================================================================

if (import.meta.url === `file://${import.meta.url}`) {
  console.log('🎯 Script attivazione utente corrente...\n');

  // Prima verifica
  checkCurrentUserStatus()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      // Poi attiva se necessario
      return activateCurrentUser();
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

export { activateCurrentUser, checkCurrentUserStatus };
