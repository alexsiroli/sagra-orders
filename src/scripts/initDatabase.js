import { db } from '../config/firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Inizializza le statistiche del database
 * Questo script deve essere eseguito una sola volta per inizializzare le statistiche
 */
export async function initializeDatabaseStats() {
  try {
    // Verifica se le stats esistono già
    const statsRef = doc(db, 'stats', 'system');
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
      console.log('⚠️ Le statistiche del database esistono già');
      return;
    }

    // Crea le statistiche iniziali
    const initialStats = {
      ultimo_progressivo_creato: 0,
      ultimo_progressivo_pronto: 0,
      totale_ordini_oggi: 0,
      totale_ordini_completati_oggi: 0,
      totale_ordini_cancellati_oggi: 0,
      ultimo_aggiornamento: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    await setDoc(statsRef, initialStats);
    console.log('✅ Statistiche del database inizializzate con successo');

    // Crea anche le statistiche per le categorie
    const categoriesStatsRef = doc(db, 'stats', 'categories');
    const categoriesStats = {
      totale_categorie: 0,
      categorie_attive: 0,
      ultimo_aggiornamento: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    await setDoc(categoriesStatsRef, categoriesStats);
    console.log('✅ Statistiche categorie inizializzate');
  } catch (error) {
    console.error(
      "❌ Errore durante l'inizializzazione delle statistiche:",
      error
    );
    throw error;
  }
}

/**
 * Aggiorna il progressivo degli ordini
 */
export async function updateOrderProgressivo() {
  try {
    const statsRef = doc(db, 'stats', 'system');
    const statsDoc = await getDoc(statsRef);

    if (!statsDoc.exists()) {
      throw new Error(
        'Le statistiche del database non sono state inizializzate'
      );
    }

    const currentStats = statsDoc.data();
    const newProgressivo = currentStats.ultimo_progressivo_creato + 1;

    await setDoc(
      statsRef,
      {
        ...currentStats,
        ultimo_progressivo_creato: newProgressivo,
        updated_at: new Date(),
      },
      { merge: true }
    );

    return newProgressivo;
  } catch (error) {
    console.error("❌ Errore durante l'aggiornamento del progressivo:", error);
    throw error;
  }
}

/**
 * Aggiorna il progressivo degli ordini pronti
 */
export async function updateReadyProgressivo() {
  try {
    const statsRef = doc(db, 'stats', 'system');
    const statsDoc = await getDoc(statsRef);

    if (!statsDoc.exists()) {
      throw new Error(
        'Le statistiche del database non sono state inizializzate'
      );
    }

    const currentStats = statsDoc.data();
    const newProgressivo = currentStats.ultimo_progressivo_pronto + 1;

    await setDoc(
      statsRef,
      {
        ...currentStats,
        ultimo_progressivo_pronto: newProgressivo,
        updated_at: new Date(),
      },
      { merge: true }
    );

    return newProgressivo;
  } catch (error) {
    console.error(
      "❌ Errore durante l'aggiornamento del progressivo pronti:",
      error
    );
    throw error;
  }
}

/**
 * Resetta le statistiche giornaliere (da eseguire ogni giorno)
 */
export async function resetDailyStats() {
  try {
    const statsRef = doc(db, 'stats', 'system');

    await setDoc(
      statsRef,
      {
        totale_ordini_oggi: 0,
        totale_ordini_completati_oggi: 0,
        totale_ordini_cancellati_oggi: 0,
        ultimo_aggiornamento: new Date(),
        updated_at: new Date(),
      },
      { merge: true }
    );

    console.log('✅ Statistiche giornaliere resettate');
  } catch (error) {
    console.error(
      '❌ Errore durante il reset delle statistiche giornaliere:',
      error
    );
    throw error;
  }
}
