import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { config } from 'dotenv';
config();

// Configurazione Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "sagra-orders.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "sagra-orders",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "sagra-orders.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🚀 Script creazione indice Firestore mancante');
console.log('📋 Questo script aiuta a creare l\'indice per la query della vista Cucina');
console.log('');

console.log('❌ Errore attuale:');
console.log('   FirebaseError: [code=failed-precondition]: The query requires an index');
console.log('');

console.log('🔧 Soluzione:');
console.log('   1. Vai su Firebase Console > Firestore > Indici');
console.log('   2. Clicca "Crea indice"');
console.log('   3. Configura:');
console.log('      • Collection ID: orders');
console.log('      • Fields:');
console.log('        - stato (Ascending)');
console.log('        - created_at (Ascending)');
console.log('   4. Clicca "Crea"');
console.log('');

console.log('🔗 Link diretto per creare l\'indice:');
console.log('   https://console.firebase.google.com/v1/r/project/sagra-orders/firestore/indexes?create_composite=Cktwcm9qZWN0cy9zYWdyYS1vcmRlcnMvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL29yZGVycy9pbmRleGVzL18QARoJCgVzdGF0bxABGg4KCmNyZWF0ZWRfYXQQARoMCghfX25hbWVfXxAB');
console.log('');

console.log('📝 Configurazione indice:');
console.log('   Collection: orders');
console.log('   Fields:');
console.log('     - stato: Ascending');
console.log('     - created_at: Ascending');
console.log('   Query scope: Collection');
console.log('');

console.log('⏱️ Tempo di creazione:');
console.log('   L\'indice richiede alcuni minuti per essere creato');
console.log('   Una volta creato, la vista Cucina funzionerà correttamente');
console.log('');

console.log('✅ Script completato!');
console.log('   Crea l\'indice e riavvia l\'applicazione per testare');
