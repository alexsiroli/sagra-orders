# Database Seed e Gestione Inventario

## 🌱 Panoramica

Questo documento descrive il sistema di seed del database e la gestione dell'inventario per Sagra Orders, inclusi script per amministratori e funzionalità di controllo giacenze.

## 📊 Script di Seed

### 1. `seedDatabase.ts` - Popolamento Database

Script principale per popolare il database con dati iniziali:

```typescript
import { seedDatabase } from './src/scripts/seedDatabase.js';

// Popola il database con dati iniziali
await seedDatabase();
```

**Funzionalità:**

- ✅ Crea 5 categorie (Primi, Secondi, Contorni, Bevande, Dolci)
- ✅ Crea 12 componenti base del menu
- ✅ Crea 12 menu items completi
- ✅ Inizializza statistiche sistema
- ✅ Verifica duplicati prima dell'inserimento
- ✅ Usa batch Firestore per transazioni atomiche

**Dati Iniziali Creati:**

#### Categorie

- **Primi Piatti** - Pasta, riso e primi piatti tradizionali
- **Secondi Piatti** - Carne, pesce e secondi
- **Contorni** - Verdure, patate e contorni
- **Bevande** - Acqua, bibite, vino e birra
- **Dolci** - Dolci tradizionali e dessert

#### Menu Items Principali

- **Spaghetti al Pomodoro** - €4.50 (con parmigiano)
- **Spaghetti al Pomodoro (Senza Parmigiano)** - €3.50 (vegano)
- **Risotto al Pomodoro** - €4.30
- **Pollo Grigliato** - €4.50 (con insalata)
- **Salsiccia alla Griglia** - €4.20 (con patate)
- **Patate al Forno** - €1.20
- **Insalata Mista** - €1.00
- **Acqua Naturale** - €0.80
- **Coca Cola** - €1.20
- **Vino Rosso della Casa** - €2.00
- **Tiramisù** - €2.50

### 2. `manageInventory.ts` - Gestione Inventario

Script per gestire giacenze e disponibilità:

```typescript
import {
  getInventoryItems,
  getSoldOutItems,
  simulateOrder,
  restockComponent,
} from './src/scripts/manageInventory.js';

// Ottieni stato inventario
const inventory = await getInventoryItems();

// Simula un ordine
await simulateOrder('item-spaghetti-pomodoro', 2);

// Rifornisci un componente
await restockComponent('comp-spaghetti', 50, 'Rifornimento magazzino');
```

**Funzionalità:**

- 📦 **Gestione Giacenze** - Controllo quantità disponibili
- 🚫 **Sistema Sold-Out** - Articoli non ordinabili
- 📊 **Report Inventario** - Statistiche complete
- 🔄 **Aggiornamento Automatico** - Disponibilità menu items
- 📈 **Valorizzazione** - Calcolo valore inventario

### 3. `adminConsole.ts` - Console Amministrativa

Console completa per amministratori:

```typescript
import { startAdminConsole } from './src/scripts/adminConsole.js';

// Avvia console amministrativa
await startAdminConsole();
```

**Comandi Disponibili:**

- `seed` - Popola database con dati iniziali
- `status` - Verifica stato database
- `inventory` - Report inventario
- `menu` - Menu completo
- `soldout` - Elementi sold-out
- `restock` - Rifornisci componente
- `simulate` - Simula ordine
- `toggle` - Attiva/disattiva menu item
- `categories` - Gestisci categorie
- `help` - Mostra aiuto
- `exit` - Esci dalla console

## 🚀 Utilizzo

### Popolamento Iniziale Database

```bash
# Popola il database con dati iniziali
npm run seed:database

# Verifica lo stato del database
npm run seed:status
```

### Gestione Inventario

```bash
# Report inventario
npm run inventory:report

# Inventario dettagliato
npm run inventory:detailed

# Console amministrativa completa
npm run admin:console
```

### Test Modello Dati

```bash
# Test invarianti e validazioni
npm run test:datamodel

# Test funzioni di validazione
npm run test:validation
```

## 🔒 Sistema Sold-Out

### Logica di Controllo

```typescript
// Un menu item è disponibile se:
1. is_attivo === true
2. Tutti i componenti hanno giacenza > giacenza_minima
3. Tutti i componenti sono is_attivo === true
```

### Aggiornamento Automatico

```typescript
// Quando la giacenza di un componente scende sotto la minima:
1. Il componente diventa is_disponibile = false
2. Tutti i menu items che lo usano diventano is_attivo = false
3. Gli elementi non sono più ordinabili dalla cassa
```

### Gestione Giacenze

```typescript
interface InventoryItem {
  giacenza: number; // Quantità attuale
  giacenza_minima: number; // Soglia minima (default: 5)
  is_disponibile: boolean; // Calcolato automaticamente
}
```

## 📋 Criteri di Accettazione

### ✅ Catalogo Iniziale Visibile in Cassa

- **5 categorie** con colori e icone
- **12 menu items** completi e pronti
- **Prezzi realistici** in centesimi
- **Flag dietetici** (vegetariano, vegano)
- **Tempi di preparazione** stimati
- **Descrizioni dettagliate** per ogni piatto

### ✅ Articoli a 0 Giacenza Non Ordinabili

- **Controllo automatico** disponibilità
- **Aggiornamento in tempo reale** stato menu
- **Sistema sold-out** integrato
- **Report inventario** completo
- **Gestione giacenze** per componente

## 🛠️ Funzionalità Avanzate

### 1. Batch Operations

```typescript
// Inserimento atomico di tutti i dati
const batch = writeBatch(db);

categories.forEach(category => {
  const docRef = doc(db, 'categories', category.id);
  batch.set(docRef, category);
});

await batch.commit();
```

### 2. Validazione Dati

```typescript
// Verifica duplicati prima dell'inserimento
async function isDatabasePopulated(): Promise<boolean> {
  const categoriesSnapshot = await getDocs(collection(db, 'categories'));
  return !categoriesSnapshot.empty;
}
```

### 3. Gestione Errori

```typescript
try {
  await seedDatabase();
  console.log('✅ Database popolato con successo!');
} catch (error) {
  console.error('❌ Errore durante il seed:', error);
  // Gestione errori specifici
}
```

### 4. Report e Statistiche

```typescript
// Report completo inventario
const report = await getInventoryReport();
console.log(`📦 Totale componenti: ${report.totale_componenti}`);
console.log(`✅ Disponibili: ${report.componenti_disponibili}`);
console.log(`❌ Sold-out: ${report.componenti_sold_out}`);
console.log(`💰 Valore totale: €${(report.valore_totale / 100).toFixed(2)}`);
```

## 🔧 Personalizzazione

### Aggiungere Nuove Categorie

```typescript
function createInitialCategories(): Category[] {
  return [
    // ... categorie esistenti
    {
      id: 'cat-nuova',
      nome: 'Nuova Categoria',
      descrizione: 'Descrizione categoria',
      ordine: 6,
      is_attiva: true,
      colore: '#FF0000',
      icona: 'nuova-icona',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];
}
```

### Aggiungere Nuovi Menu Items

```typescript
function createInitialMenuItems(): MenuItem[] {
  return [
    // ... menu items esistenti
    {
      id: 'item-nuovo',
      nome: 'Nuovo Piatto',
      descrizione: 'Descrizione piatto',
      prezzo: 600, // 6.00 EUR
      categoria_id: 'cat-nuova',
      componenti: [
        {
          component_id: 'comp-esistente',
          quantita: 1,
          prezzo_unitario: 600,
          nome_snapshot: 'Nome Componente',
        },
      ],
      is_attivo: true,
      is_vegetariano: false,
      is_vegano: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];
}
```

## 📊 Monitoraggio e Manutenzione

### Verifica Stato Database

```bash
npm run seed:status
```

**Output:**

```
🔍 Verifica stato database...
📊 Categorie: 5
🍽️ Componenti menu: 12
🍕 Menu items: 12
👥 Utenti: 3
📝 Ordini: 0
📈 Documenti statistiche: 2
```

### Report Inventario

```bash
npm run inventory:report
```

**Output:**

```
📊 Report Inventario
===================

📦 Totale componenti: 12
✅ Disponibili: 10
❌ Sold-out: 2
💰 Valore totale: €45.60

📂 Per categoria:
   • Primi Piatti: 4 componenti
   • Secondi Piatti: 2 componenti
   • Contorni: 2 componenti
   • Bevande: 3 componenti
   • Dolci: 1 componente

🚫 Elementi Sold-Out:
   • Spaghetti: Giacenza insufficiente (3/5)
   • Parmigiano: Giacenza insufficiente (2/5)
```

## 🚨 Troubleshooting

### Problemi Comuni

1. **Database già popolato**

   ```
   ⚠️ Il database è già popolato con categorie
   Saltando il seed.
   ```

2. **Errore connessione Firebase**

   ```
   ❌ Errore durante il seed del database: FirebaseError
   Verifica configurazione .env.local
   ```

3. **Permessi insufficienti**
   ```
   ❌ Errore durante inserimento: Permission denied
   Verifica regole Firestore per ruolo admin
   ```

### Soluzioni

1. **Reset database** (solo se necessario)
   - Usa Firebase Console per cancellare collezioni
   - Riavvia seed: `npm run seed:database`

2. **Verifica configurazione**
   - Controlla variabili d'ambiente
   - Verifica connessione Firebase
   - Controlla regole di sicurezza

3. **Log dettagliati**
   - Usa `npm run seed:status` per diagnostica
   - Controlla console per errori specifici

## 🔮 Prossimi Sviluppi

### Funzionalità Pianificate

1. **Input Interattivo** - Console con input utente
2. **Import/Export CSV** - Gestione dati esterna
3. **Backup/Ripristino** - Salvataggio configurazioni
4. **Sincronizzazione** - Aggiornamento automatico prezzi
5. **Analytics** - Statistiche vendite e popolarità

### Miglioramenti Tecnici

1. **WebSocket** - Aggiornamenti real-time
2. **Cache Redis** - Performance migliorata
3. **Queue System** - Gestione ordini asincrona
4. **API REST** - Interfacce esterne
5. **Webhook** - Notifiche automatiche

---

**Status:** ✅ COMPLETATO  
**Issue:** #4 Seed iniziale dati  
**Milestone:** MVP v1.0.0
