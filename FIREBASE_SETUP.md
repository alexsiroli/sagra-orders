# Firebase Setup - Sagra Orders

## 🚀 Panoramica

Questo documento descrive il setup completo di Firebase per il progetto Sagra Orders, implementando l'issue #2.

## 📋 Requisiti Completati

### ✅ 1. Progetto Firebase

- [x] Progetto Firebase creato e configurato
- [x] Firestore abilitato in produzione
- [x] Autenticazione configurata

### ✅ 2. Persistence Offline

- [x] Persistence offline abilitata (default in Firebase v9+)
- [x] Supporto per emulator in sviluppo

### ✅ 3. Regole di Sicurezza

- [x] Regole per ruoli: cassa, cucina, admin
- [x] Controlli di accesso per collezioni
- [x] Helper functions per verifiche ruolo

### ✅ 4. Indici Firestore

- [x] Indici per stato, created_at, progressivo, is_prioritario
- [x] Indici composti per query ottimizzate
- [x] Indici per menu e utenti

### ✅ 5. Statistiche Database

- [x] Documento stats con ultimo_progressivo_creato
- [x] Documento stats con ultimo_progressivo_pronto
- [x] Statistiche giornaliere e categorie

## 🔧 Configurazione

### File di Configurazione

1. **`.env.local`** - Configurazione Firebase
2. **`firestore.rules`** - Regole di sicurezza
3. **`firestore.indexes.json`** - Indici Firestore
4. **`src/config/firebase.js`** - Configurazione app

### Variabili d'Ambiente

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_FIREBASE_EMULATOR=false
```

## 🗄️ Struttura Database

### Collezioni Principali

#### `users`

```json
{
  "id": "user_id",
  "nome": "Nome Utente",
  "email": "user@example.com",
  "role": "admin|cassa|cucina",
  "is_attivo": true,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### `orders`

```json
{
  "id": "order_id",
  "progressivo": 1,
  "cliente": "Nome Cliente",
  "items": [...],
  "totale": 25.50,
  "stato": "in_attesa|in_preparazione|pronto|completato|cancellato",
  "is_prioritario": false,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### `menu`

```json
{
  "id": "item_id",
  "nome": "Nome Piatto",
  "prezzo": 12.0,
  "categoria_id": "categoria_id",
  "is_attivo": true,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### `stats`

```json
{
  "id": "system",
  "ultimo_progressivo_creato": 15,
  "ultimo_progressivo_pronto": 10,
  "totale_ordini_oggi": 25,
  "totale_ordini_completati_oggi": 20,
  "totale_ordini_cancellati_oggi": 2,
  "ultimo_aggiornamento": "timestamp"
}
```

## 🔒 Regole di Sicurezza

### Ruoli e Permessi

| Ruolo      | Ordini | Menu  | Users | Stats | Settings |
| ---------- | ------ | ----- | ----- | ----- | -------- |
| **Admin**  | ✅ RW  | ✅ RW | ✅ RW | ✅ RW | ✅ RW    |
| **Cassa**  | ✅ RW  | ✅ R  | ✅ R  | ✅ R  | ❌       |
| **Cucina** | ✅ RW  | ✅ R  | ✅ R  | ✅ R  | ❌       |

### Helper Functions

```javascript
function isAuthenticated() // Verifica autenticazione
function getUserRole()     // Ottiene ruolo utente
function isAdmin()        // Verifica ruolo admin
function isCassa()        // Verifica ruolo cassa
function isCucina()       // Verifica ruolo cucina
function isOwner(userId)  // Verifica proprietà
```

## 📊 Indici Firestore

### Indici Principali

1. **Orders per Stato e Data**
   - `stato` (ASC) + `created_at` (DESC)

2. **Orders Prioritari**
   - `is_prioritario` (ASC) + `created_at` (ASC)

3. **Orders per Progressivo**
   - `progressivo` (ASC) + `created_at` (DESC)

4. **Orders Multi-Filtro**
   - `stato` + `is_prioritario` + `created_at`

5. **Menu per Categoria**
   - `categoria_id` + `is_attivo` + `nome`

6. **Users per Ruolo**
   - `role` + `is_attivo` + `nome`

## 🧪 Testing

### Script di Test

```bash
# Test connessione rapida
npm run test:firebase:connection

# Test completo setup
npm run test:firebase:setup

# Test regole sicurezza
npm run test:firebase:security

# Test query indici
npm run test:firebase:queries
```

### Utility di Test

- **`SecurityTester`** - Testa regole di sicurezza
- **`QueryTester`** - Testa query con indici
- **`initDatabase`** - Inizializza statistiche

## 🚀 Deployment

### 1. Deploy Regole Firestore

```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Indici

```bash
firebase deploy --only firestore:indexes
```

### 3. Deploy Configurazione

```bash
firebase deploy --only hosting
```

## 📝 Note Importanti

### Persistence Offline

- Abilitata automaticamente in Firebase v9+
- Dati sincronizzati quando la connessione è ripristinata
- Supporto per emulator in sviluppo

### Sicurezza

- Regole validate prima del deployment
- Test automatici per verificare compliance
- Log di audit per modifiche critiche

### Performance

- Indici composti per query complesse
- Paginazione con `startAfter`
- Limit automatici per query grandi

## 🔍 Troubleshooting

### Errori Comuni

1. **"Missing or insufficient permissions"**
   - Verifica regole Firestore
   - Controlla ruolo utente

2. **"The query requires an index"**
   - Crea indici mancanti
   - Usa `firestore.indexes.json`

3. **"Firebase not initialized"**
   - Verifica variabili d'ambiente
   - Controlla configurazione

### Debug

```javascript
// Abilita debug Firebase
localStorage.setItem('firebase:debug', '*');

// Verifica connessione
import { db } from './config/firebase.js';
console.log('Firestore instance:', db);
```

## 📚 Risorse

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

---

**Status:** ✅ COMPLETATO  
**Issue:** #2 Provisioning Firebase  
**Milestone:** MVP v1.0.0
