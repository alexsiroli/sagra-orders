import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { User } from '../types/dataModel';

// ============================================================================
// INTERFACCE E TIPI
// ============================================================================

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// HOOK PERSONALIZZATO
// ============================================================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve essere usato all'interno di AuthProvider");
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FUNZIONI DI AUTENTICAZIONE
  // ============================================================================

  /**
   * Login con email e password
   */
  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Recupera i dati utente da Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        throw new Error('Utente non trovato nel database');
      }

      const userData = userDoc.data() as User;

      // Verifica che l'utente sia attivo
      if (!userData.is_attivo) {
        await signOut(auth);
        throw new Error('Account disattivato');
      }

      setUser(userData);
    } catch (err: any) {
      console.error('Errore durante il login:', err);

      let errorMessage = 'Errore durante il login';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Utente non trovato';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Password non corretta';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Email non valida';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Troppi tentativi. Riprova più tardi';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login con PIN (per accesso rapido)
   */
  const loginWithPin = async (pin: string) => {
    try {
      setError(null);
      setLoading(true);

      // Cerca utente con PIN corrispondente
      const usersQuery = query(
        collection(db, 'users'),
        where('pin', '==', pin),
        where('is_attivo', '==', true)
      );

      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        throw new Error('PIN non valido o utente non attivo');
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data() as User;

      // Per ora, simula il login (in un sistema reale dovresti verificare il PIN hash)
      setUser(userData);
    } catch (err: any) {
      console.error('Errore durante il login con PIN:', err);

      const errorMessage = err.message || 'PIN non valido';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Errore durante il logout:', err);
      setError('Errore durante il logout');
    }
  };

  // ============================================================================
  // EFFETTI
  // ============================================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            // Recupera i dati utente da Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

            if (userDoc.exists()) {
              const userData = userDoc.data() as User;

              // Verifica che l'utente sia attivo
              if (userData.is_attivo) {
                setUser(userData);
              } else {
                console.warn('Utente disattivato, effettua logout');
                await signOut(auth);
                setUser(null);
              }
            } else {
              console.warn('Utente non trovato nel database, effettua logout');
              await signOut(auth);
              setUser(null);
            }
          } catch (err) {
            console.error('Errore durante il recupero dati utente:', err);
            await signOut(auth);
            setUser(null);
          }
        } else {
          setUser(null);
        }

        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // ============================================================================
  // VALORI DEL CONTEXT
  // ============================================================================

  const value: AuthContextType = {
    user,
    loading,
    login,
    loginWithPin,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
