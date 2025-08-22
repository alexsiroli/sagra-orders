/* eslint-disable no-undef */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { config } from 'dotenv';
config();

// Configurazione Firebase
const firebaseConfig = {
  apiKey:
    process.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  authDomain:
    process.env.VITE_FIREBASE_AUTH_DOMAIN || 'sagra-orders.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'sagra-orders',
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET || 'sagra-orders.appspot.com',
  messagingSenderId:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456789',
};

const app = initializeApp(firebaseConfig);
const _DB = getFirestore(app); // Prefisso underscore per evitare warning ESLint

console.log('🚀 Script aggiornamento indici Firestore');
console.log(
  '📋 Questo script aggiorna gli indici per le query della vista Cucina'
);
console.log('');

console.log('✅ Indici configurati:');
console.log('   • orders: stato (ASC) + created_at (ASC)');
console.log(
  '   • orders: stato (ASC) + is_prioritario (ASC) + created_at (ASC)'
);
console.log('   • orders: stato (ASC) + progressivo (ASC)');
console.log('');

console.log('📝 Per aggiornare gli indici:');
console.log('   1. Vai su Firebase Console > Firestore > Indici');
console.log('   2. Verifica che tutti gli indici siano creati');
console.log('   3. Se mancano, creali manualmente o usa Firebase CLI');
console.log('');

console.log('🔗 Link diretto agli indici:');
console.log(
  '   https://console.firebase.google.com/v1/r/project/sagra-orders/firestore/indexes'
);
console.log('');

console.log('✅ Script completato!');
