# Modello Dati - Sagra Orders

## 🗄️ Panoramica

Questo documento definisce il modello dati completo per il sistema Sagra Orders, includendo schemi delle collezioni, invarianti di business e helper di serializzazione.

## 📊 Schema Collezioni

### 1. `users` - Utenti del Sistema

```typescript
interface User {
  id: string; // ID documento (Firebase Auth UID)
  nome: string; // Nome completo utente
  email: string; // Email (unica)
  role: 'admin' | 'cassa' | 'cucina'; // Ruolo nel sistema
  is_attivo: boolean; // Stato attivo/inattivo
  pin?: string; // PIN per accesso rapido (hashato)
  ultimo_accesso?: Date; // Timestamp ultimo accesso
  created_at: Date; // Data creazione account
  updated_at: Date; // Data ultimo aggiornamento
}
```

**Indici:**

- `role` + `is_attivo` + `nome`
- `email` (unico)

### 2. `categories` - Categorie Menu

```typescript
interface Category {
  id: string; // ID documento
  nome: string; // Nome categoria (es: "Primi", "Secondi")
  descrizione?: string; // Descrizione opzionale
  ordine: number; // Ordine di visualizzazione
  is_attiva: boolean; // Categoria attiva/non attiva
  colore?: string; // Colore per UI (hex)
  icona?: string; // Nome icona
  created_at: Date;
  updated_at: Date;
}
```

**Indici:**

- `is_attiva` + `ordine`
- `nome` (unico)

### 3. `menu_components` - Componenti Base Menu

```typescript
interface MenuComponent {
  id: string; // ID documento
  nome: string; // Nome componente
  descrizione?: string; // Descrizione opzionale
  prezzo_base: number; // Prezzo base (in centesimi)
  unita_misura: 'pezzo' | 'porzione' | 'kg' | 'litro';
  allergeni?: string[]; // Lista allergeni
  ingredienti?: string[]; // Lista ingredienti principali
  is_attivo: boolean; // Componente disponibile
  categoria_id: string; // Riferimento categoria
  created_at: Date;
  updated_at: Date;
}
```

**Indici:**

- `categoria_id` + `is_attivo` + `nome`
- `is_attivo` + `prezzo_base`

### 4. `menu_items` - Elementi Menu Completati

```typescript
interface MenuItem {
  id: string; // ID documento
  nome: string; // Nome piatto
  descrizione?: string; // Descrizione dettagliata
  prezzo: number; // Prezzo finale (in centesimi)
  categoria_id: string; // Riferimento categoria
  componenti: MenuItemComponent[]; // Lista componenti
  is_attivo: boolean; // Piatto disponibile
  is_vegetariano: boolean; // Flag vegetariano
  is_vegano: boolean; // Flag vegano
  tempo_preparazione?: number; // Minuti per preparazione
  immagine_url?: string; // URL immagine piatto
  created_at: Date;
  updated_at: Date;
}

interface MenuItemComponent {
  component_id: string; // Riferimento MenuComponent
  quantita: number; // Quantità utilizzata
  prezzo_unitario: number; // Prezzo unitario al momento
  nome_snapshot: string; // Nome componente al momento
}
```

**Indici:**

- `categoria_id` + `is_attivo` + `nome`
- `is_attivo` + `prezzo`
- `is_vegetariano` + `is_attivo`
- `is_vegano` + `is_attivo`

### 5. `orders` - Ordini

```typescript
interface Order {
  id: string; // ID documento
  progressivo: number; // Numero progressivo giornaliero
  cliente: string; // Nome cliente
  note?: string; // Note speciali ordine
  items: OrderLine[]; // Lista elementi ordinati
  subtotale: number; // Subtotale (in centesimi)
  sconto: number; // Sconto applicato (in centesimi)
  totale: number; // Totale finale (in centesimi)
  stato: OrderStatus; // Stato ordine
  is_prioritario: boolean; // Flag priorità
  is_asporto: boolean; // Flag asporto vs consumo in loco
  tavolo?: string; // Numero tavolo (se consumo in loco)
  created_at: Date; // Data creazione ordine
  updated_at: Date; // Data ultimo aggiornamento
  completato_at?: Date; // Data completamento
  preparato_da?: string; // ID utente cucina
  servito_da?: string; // ID utente cassa
}

type OrderStatus =
  | 'in_attesa' // Ordine creato, in attesa di preparazione
  | 'in_preparazione' // Ordine in preparazione in cucina
  | 'pronto' // Ordine pronto per la consegna
  | 'consegnato' // Ordine consegnato al cliente
  | 'completato' // Ordine completato e pagato
  | 'cancellato'; // Ordine cancellato
```

**Indici:**

- `stato` + `created_at` (DESC)
- `is_prioritario` + `created_at` (ASC)
- `progressivo` + `created_at` (DESC)
- `stato` + `is_prioritario` + `created_at`
- `stato` + `progressivo`
- `created_at` (DESC)
- `tavolo` + `stato` (se consumo in loco)

### 6. `order_lines` - Righe Ordine

```typescript
interface OrderLine {
  id: string; // ID documento
  order_id: string; // Riferimento ordine
  menu_item_id: string; // Riferimento menu item
  quantita: number; // Quantità ordinata
  prezzo_unitario: number; // Prezzo unitario al momento (in centesimi)
  prezzo_totale: number; // Prezzo totale riga (in centesimi)
  note?: string; // Note specifiche per questa riga
  stato: OrderLineStatus; // Stato singola riga
  nome_snapshot: string; // Nome piatto al momento
  categoria_snapshot: string; // Nome categoria al momento
  allergeni_snapshot?: string[]; // Allergeni al momento
  created_at: Date;
  updated_at: Date;
}

type OrderLineStatus =
  | 'in_attesa' // Riga in attesa di preparazione
  | 'in_preparazione' // Riga in preparazione
  | 'pronta' // Riga pronta
  | 'consegnata' // Riga consegnata
  | 'completata'; // Riga completata
```

**Indici:**

- `order_id` + `stato`
- `menu_item_id` + `stato`
- `stato` + `created_at`

### 7. `stats` - Statistiche Sistema

```typescript
interface SystemStats {
  id: 'system'; // ID fisso per stats sistema
  ultimo_progressivo_creato: number; // Ultimo progressivo ordini
  ultimo_progressivo_pronto: number; // Ultimo progressivo pronti
  totale_ordini_oggi: number; // Totale ordini oggi
  totale_ordini_completati_oggi: number; // Ordini completati oggi
  totale_ordini_cancellati_oggi: number; // Ordini cancellati oggi
  fatturato_oggi: number; // Fatturato oggi (in centesimi)
  ultimo_aggiornamento: Date;
  created_at: Date;
  updated_at: Date;
}

interface CategoryStats {
  id: 'categories'; // ID fisso per stats categorie
  totale_categorie: number; // Totale categorie
  categorie_attive: number; // Categorie attive
  ultimo_aggiornamento: Date;
  created_at: Date;
  updated_at: Date;
}
```

**Indici:**

- Nessun indice necessario (documenti singoli)

## 🔒 Invarianti di Business

### 1. Invarianti Ordini

```typescript
// L'ordine deve avere almeno una riga
orders.items.length > 0;

// Il totale deve essere calcolato correttamente
orders.totale === orders.subtotale - orders.sconto;

// Il subtotale deve essere la somma delle righe
orders.subtotale ===
  orders.items.reduce((sum, item) => sum + item.prezzo_totale, 0);

// Il progressivo deve essere unico per giorno
// (gestito a livello applicativo)

// Lo stato deve seguire il flusso corretto
// in_attesa → in_preparazione → pronto → consegnato → completato
```

### 2. Invarianti Righe Ordine

```typescript
// La quantità deve essere positiva
order_lines.quantita > 0;

// Il prezzo totale deve essere calcolato correttamente
order_lines.prezzo_totale ===
  order_lines.quantita * order_lines.prezzo_unitario;

// Il prezzo unitario deve essere positivo
order_lines.prezzo_unitario > 0;
```

### 3. Invarianti Menu

```typescript
// Il prezzo deve essere positivo
menu_items.prezzo > 0;

// Deve avere almeno un componente
menu_items.componenti.length > 0;

// Il prezzo deve essere la somma dei componenti
menu_items.prezzo ===
  menu_items.componenti.reduce(
    (sum, comp) => sum + comp.quantita * comp.prezzo_unitario,
    0
  );
```

### 4. Invarianti Utenti

```typescript
// L'email deve essere unica
// (gestito a livello database con regole Firestore)

// Il ruolo deve essere valido
users.role in ['admin', 'cassa', 'cucina'];

// L'utente deve essere attivo per operare
users.is_attivo === true;
```

## 📸 Helper di Serializzazione

### 1. Snapshot Prezzi

```typescript
/**
 * Crea uno snapshot dei prezzi al momento dell'ordine
 * per preservare la storicità anche se i prezzi cambiano
 */
function createPriceSnapshot(menuItem: MenuItem): PriceSnapshot {
  return {
    prezzo_unitario: menuItem.prezzo,
    prezzo_componenti: menuItem.componenti.map(comp => ({
      component_id: comp.component_id,
      prezzo_unitario: comp.prezzo_unitario,
      nome: comp.nome_snapshot,
    })),
    timestamp: new Date(),
  };
}
```

### 2. Snapshot Nomi

```typescript
/**
 * Crea uno snapshot dei nomi al momento dell'ordine
 * per preservare la storicità anche se i nomi cambiano
 */
function createNameSnapshot(menuItem: MenuItem): NameSnapshot {
  return {
    nome_piatto: menuItem.nome,
    nome_categoria: menuItem.categoria_id, // ID categoria
    descrizione: menuItem.descrizione,
    allergeni: menuItem.allergeni,
    timestamp: new Date(),
  };
}
```

### 3. Validazione Invarianti

```typescript
/**
 * Valida le invarianti di un ordine
 */
function validateOrderInvariants(order: Order): ValidationResult {
  const errors: string[] = [];

  // Verifica che ci siano items
  if (order.items.length === 0) {
    errors.push("L'ordine deve contenere almeno un elemento");
  }

  // Verifica calcolo totale
  const calculatedSubtotal = order.items.reduce(
    (sum, item) => sum + item.prezzo_totale,
    0
  );

  if (calculatedSubtotal !== order.subtotale) {
    errors.push('Il subtotale non corrisponde alla somma delle righe');
  }

  const calculatedTotal = order.subtotale - order.sconto;
  if (calculatedTotal !== order.totale) {
    errors.push('Il totale non corrisponde al calcolo (subtotale - sconto)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

## 🧪 Script di Validazione

### 1. Validazione Dati Fittizi

```typescript
/**
 * Crea dati fittizi per testare le invarianti
 */
function createMockData(): MockData {
  return {
    users: [
      {
        id: 'user1',
        nome: 'Admin User',
        email: 'admin@sagra.com',
        role: 'admin',
        is_attivo: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    categories: [
      {
        id: 'cat1',
        nome: 'Primi Piatti',
        ordine: 1,
        is_attiva: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    menu_items: [
      {
        id: 'item1',
        nome: 'Spaghetti al Pomodoro',
        prezzo: 800, // 8.00 EUR
        categoria_id: 'cat1',
        componenti: [
          {
            component_id: 'comp1',
            quantita: 1,
            prezzo_unitario: 800,
            nome_snapshot: 'Spaghetti al Pomodoro',
          },
        ],
        is_attivo: true,
        is_vegetariano: true,
        is_vegano: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
    orders: [
      {
        id: 'order1',
        progressivo: 1,
        cliente: 'Mario Rossi',
        items: [
          {
            id: 'line1',
            order_id: 'order1',
            menu_item_id: 'item1',
            quantita: 2,
            prezzo_unitario: 800,
            prezzo_totale: 1600,
            stato: 'in_attesa',
            nome_snapshot: 'Spaghetti al Pomodoro',
            categoria_snapshot: 'Primi Piatti',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        subtotale: 1600,
        sconto: 0,
        totale: 1600,
        stato: 'in_attesa',
        is_prioritario: false,
        is_asporto: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  };
}
```

### 2. Test Invarianti

```typescript
/**
 * Esegue tutti i test delle invarianti
 */
function runInvariantTests(): TestResults {
  const mockData = createMockData();
  const results: TestResult[] = [];

  // Test invarianti ordini
  mockData.orders.forEach(order => {
    const validation = validateOrderInvariants(order);
    results.push({
      test: `Invarianti ordine ${order.id}`,
      passed: validation.isValid,
      errors: validation.errors,
    });
  });

  // Test invarianti righe ordine
  mockData.orders.forEach(order => {
    order.items.forEach(item => {
      const lineValidation = validateOrderLineInvariants(item);
      results.push({
        test: `Invarianti riga ${item.id}`,
        passed: lineValidation.isValid,
        errors: lineValidation.errors,
      });
    });
  });

  return {
    totalTests: results.length,
    passedTests: results.filter(r => r.passed).length,
    failedTests: results.filter(r => !r.passed).length,
    results,
  };
}
```

## 📋 Regole Firestore Aggiornate

Le regole Firestore devono essere aggiornate per supportare le nuove collezioni:

```javascript
// Aggiungi alle regole esistenti
match /categories/{categoryId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /menu_components/{componentId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /menu_items/{itemId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /order_lines/{lineId} {
  allow read: if isAuthenticated() && (isAdmin() || isCassa() || isCucina());
  allow write: if isAuthenticated() && (isAdmin() || isCassa() || isCucina());
}
```

## 🚀 Prossimi Step

1. **Implementazione schemi** - Creare le interfacce TypeScript
2. **Validazione runtime** - Implementare le funzioni di validazione
3. **Test automatici** - Creare test unitari per le invarianti
4. **UI per gestione** - Interfacce per amministratori
5. **Migrazione dati** - Script per migrare dati esistenti

---

**Status:** ✅ COMPLETATO  
**Issue:** #3 Modello dati (collezioni & invarianti)  
**Milestone:** MVP v1.0.0
