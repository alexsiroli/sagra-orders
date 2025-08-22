// ============================================================================
// TIPI BASE
// ============================================================================

export type UserRole = 'admin' | 'cassa' | 'cucina';
export type OrderStatus =
  | 'in_attesa' // Ordine creato, in attesa di preparazione
  | 'in_preparazione' // Ordine in preparazione in cucina
  | 'pronto' // Ordine pronto per la consegna
  | 'consegnato' // Ordine consegnato al cliente
  | 'completato' // Ordine completato e pagato
  | 'cancellato'; // Ordine cancellato

export type OrderLineStatus =
  | 'in_attesa' // Riga in attesa di preparazione
  | 'in_preparazione' // Riga in preparazione
  | 'pronta' // Riga pronta
  | 'consegnata' // Riga consegnata
  | 'completata'; // Riga completata

export type UnitaMisura =
  | 'pezzo'
  | 'porzione'
  | 'kg'
  | 'litro'
  | 'bottiglia'
  | 'lattina';

// ============================================================================
// INTERFACCE UTENTI
// ============================================================================

export interface User {
  id: string; // ID documento (Firebase Auth UID)
  nome: string; // Nome completo utente
  email: string; // Email (unica)
  role: UserRole; // Ruolo nel sistema
  is_attivo: boolean; // Stato attivo/inattivo
  pin?: string; // PIN per accesso rapido (hashato)
  ultimo_accesso?: Date; // Timestamp ultimo accesso
  created_at: Date; // Data creazione account
  updated_at: Date; // Data ultimo aggiornamento
}

// ============================================================================
// INTERFACCE CATEGORIE
// ============================================================================

export interface Category {
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

// ============================================================================
// INTERFACCE COMPONENTI MENU
// ============================================================================

export interface MenuComponent {
  id: string; // ID documento
  nome: string; // Nome componente
  descrizione?: string; // Descrizione opzionale
  prezzo_base: number; // Prezzo base (in centesimi)
  unita_misura: UnitaMisura; // Unità di misura
  allergeni?: string[]; // Lista allergeni
  ingredienti?: string[]; // Lista ingredienti principali
  is_attivo: boolean; // Componente disponibile
  categoria_id: string; // Riferimento categoria
  giacenza: number; // Quantità disponibile in magazzino
  giacenza_minima: number; // Scorta minima per evitare sold-out
  is_disponibile: boolean; // Disponibilità basata su giacenza
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// INTERFACCE ELEMENTI MENU
// ============================================================================

export interface MenuItemComponent {
  component_id: string; // Riferimento MenuComponent
  quantita: number; // Quantità utilizzata
  prezzo_unitario: number; // Prezzo unitario al momento
  nome_snapshot: string; // Nome componente al momento
}

export interface MenuItem {
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

// ============================================================================
// INTERFACCE ORDINI
// ============================================================================

export interface OrderLine {
  id: string; // ID documento
  order_id: string; // Riferimento ordine
  menu_item_id: string; // Riferimento menu item
  menu_item_name: string; // Nome piatto al momento
  quantita: number; // Quantità ordinata
  prezzo_unitario: number; // Prezzo unitario al momento (in centesimi)
  prezzo_totale: number; // Prezzo totale riga (in centesimi)
  note?: string; // Note specifiche per questa riga
  stato: OrderLineStatus; // Stato singola riga
  is_staff: boolean; // Flag staff (ricavo=0)
  is_priority: boolean; // Flag priorità
  nome_snapshot: string; // Nome piatto al momento
  categoria_snapshot: string; // Nome categoria al momento
  allergeni_snapshot?: string[]; // Allergeni al momento
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string; // ID documento
  progressivo: number; // Numero progressivo giornaliero
  cliente: string; // Nome cliente
  note?: string; // Note speciali ordine
  totale: number; // Totale finale (in centesimi)
  stato: OrderStatus; // Stato ordine
  is_prioritario: boolean; // Flag priorità
  created_at: Date; // Data creazione ordine
  updated_at: Date; // Data ultimo aggiornamento
  created_by: string; // ID utente che ha creato l'ordine
  created_by_name: string; // Nome utente che ha creato l'ordine
}

// ============================================================================
// INTERFACCE STATISTICHE
// ============================================================================

export interface SystemStats {
  id: 'system'; // ID fisso per stats sistema
  ultimo_progressivo_creato: number; // Ultimo progressivo ordini
  ultimo_progressivo_pronto: number; // Ultimo progressivo pronti
  totale_ordini: number; // Totale ordini (tutti i tempi)
  totale_ordini_oggi: number; // Totale ordini oggi
  totale_ordini_completati_oggi: number; // Ordini completati oggi
  totale_ordini_cancellati_oggi: number; // Ordini cancellati oggi
  fatturato_oggi: number; // Fatturato oggi (in centesimi)
  ultimo_aggiornamento: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryStats {
  id: 'categories'; // ID fisso per stats categorie
  totale_categorie: number; // Totale categorie
  categorie_attive: number; // Categorie attive
  ultimo_aggiornamento: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// INTERFACCE SNAPSHOT
// ============================================================================

export interface PriceSnapshot {
  prezzo_unitario: number; // Prezzo unitario al momento
  prezzo_componenti: {
    component_id: string;
    prezzo_unitario: number;
    nome: string;
  }[];
  timestamp: Date;
}

export interface NameSnapshot {
  nome_piatto: string; // Nome piatto al momento
  nome_categoria: string; // ID categoria al momento
  descrizione?: string; // Descrizione al momento
  allergeni?: string[]; // Allergeni al momento
  timestamp: Date;
}

// ============================================================================
// INTERFACCE VALIDAZIONE
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface TestResult {
  test: string;
  passed: boolean;
  errors: string[];
}

export interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
}

// ============================================================================
// INTERFACCE DATI MOCK
// ============================================================================

export interface MockData {
  users: User[];
  categories: Category[];
  menu_components: MenuComponent[];
  menu_items: MenuItem[];
  orders: Order[];
}

// ============================================================================
// INTERFACCE UTILITY
// ============================================================================

export interface DatabaseReference {
  collection: string;
  id: string;
}

export interface QueryFilter {
  field: string;
  operator:
    | '=='
    | '!='
    | '<'
    | '<='
    | '>'
    | '>='
    | 'in'
    | 'not-in'
    | 'array-contains'
    | 'array-contains-any';
  value: any;
}

export interface QueryOrder {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orders?: QueryOrder[];
  limit?: number;
  startAfter?: any;
}

// ============================================================================
// TIPI UNIONE
// ============================================================================

export type AnyEntity =
  | User
  | Category
  | MenuComponent
  | MenuItem
  | Order
  | OrderLine
  | SystemStats
  | CategoryStats;

export type EntityCollection =
  | 'users'
  | 'categories'
  | 'menu_components'
  | 'menu_items'
  | 'orders'
  | 'order_lines'
  | 'stats';

// ============================================================================
// TIPI PER FIRESTORE
// ============================================================================

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

// ============================================================================
// TIPI PER CALCOLI
// ============================================================================

export interface PriceCalculation {
  subtotale: number;
  sconto: number;
  totale: number;
  iva?: number;
  iva_amount?: number;
}

export interface OrderSummary {
  orderId: string;
  progressivo: number;
  cliente: string;
  totale: number;
  stato: OrderStatus;
  is_prioritario: boolean;
  created_at: Date;
  items_count: number;
}
