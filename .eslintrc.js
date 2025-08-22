export default {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true, // Permette process e altre variabili Node.js
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Regole specifiche per script Node.js
    'no-undef': 'off', // Disabilita per script che usano process
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'caughtErrorsIgnorePattern': '^_'
    }],
  },
  overrides: [
    {
      // Configurazione specifica per script nella cartella scripts
      files: ['src/scripts/**/*.js'],
      env: {
        node: true,
        es2020: true,
      },
      rules: {
        'no-undef': 'off',
        'no-unused-vars': ['error', { 
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }],
      },
    },
  ],
};
