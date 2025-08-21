# Sagra Orders

Sistema di gestione ordini per sagra.

## Descrizione

Questo progetto gestisce gli ordini per eventi di sagra, fornendo un'interfaccia per la gestione di menu, ordini e clienti.

## Funzionalità

- Gestione menu
- Gestione ordini
- Gestione clienti
- Dashboard amministrativa

## Prerequisiti

- Node.js 20.18.0+ (specificato in `.nvmrc`)
- npm o yarn

## Installazione

```bash
# Clona la repository
git clone https://github.com/alexsiroli/sagra-orders.git

# Entra nella directory
cd sagra-orders

# Installa le dipendenze
npm install

# Copia il file delle variabili d'ambiente
cp env.example .env.local

# Configura le variabili Firebase nel file .env.local
```

## Utilizzo

```bash
# Avvia l'applicazione in modalità sviluppo
npm run dev

# Build per la produzione
npm run build

# Anteprima della build
npm run preview

# Linting del codice
npm run lint

# Formattazione del codice
npm run format

# Verifica formattazione
npm run format:check
```

## Struttura del Progetto

```
sagra-orders/
├── .github/workflows/    # GitHub Actions CI/CD
├── public/               # File statici
├── src/                  # Codice sorgente
├── .eslintrc.cjs        # Configurazione ESLint
├── .prettierrc          # Configurazione Prettier
├── .editorconfig        # Configurazione editor
├── .nvmrc               # Versione Node.js
├── env.example          # Esempio variabili d'ambiente
└── package.json         # Dipendenze e script
```

## Dipendenze Principali

- **React 19** - Framework UI
- **Vite** - Build tool e dev server
- **React Router DOM** - Routing
- **UUID** - Generazione ID univoci
- **IDB** - IndexedDB wrapper
- **Zod** - Validazione schemi

## CI/CD

Il progetto include GitHub Actions che eseguono automaticamente:

- Linting del codice
- Verifica formattazione
- Build del progetto
- Test della build

## Contribuire

1. Fai un fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committa le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pusha al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## Branches

- `main` - Branch principale per le release
- `dev` - Branch di sviluppo

## Licenza

Questo progetto è sotto licenza MIT.
