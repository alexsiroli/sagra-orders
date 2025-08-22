import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/dataModel';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostra loading mentre verifica l'autenticazione
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Verifica accesso...</p>
      </div>
    );
  }

  // Se non c'è utente, redirect al login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Se sono specificati ruoli permessi, verifica che l'utente abbia uno di essi
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect alla cassa se l'utente non ha i permessi per la rotta richiesta
    return <Navigate to="/cassa" replace />;
  }

  // Se l'utente è attivo e ha i permessi, mostra il contenuto
  if (user.is_attivo) {
    return <>{children}</>;
  }

  // Se l'utente è disattivato, redirect al login
  return <Navigate to={redirectTo} state={{ from: location }} replace />;
};

export default ProtectedRoute;
