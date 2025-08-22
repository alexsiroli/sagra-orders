import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.tsx';
import Layout from './components/Layout';
import Login from './components/Login';
import Cassa from './pages/Cassa';
import Cucina from './pages/Cucina';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Rotte pubbliche */}
            <Route path="/login" element={<Login />} />

            {/* Rotte protette con layout */}
            <Route path="/" element={<Layout />}>
              {/* Redirect root alla cassa */}
              <Route index element={<Navigate to="/cassa" replace />} />

              {/* Vista Cassa - accessibile a cassa e admin */}
              <Route
                path="cassa"
                element={
                  <ProtectedRoute allowedRoles={['cassa', 'admin']}>
                    <Cassa />
                  </ProtectedRoute>
                }
              />

              {/* Vista Cucina - accessibile a cucina e admin */}
              <Route
                path="cucina"
                element={
                  <ProtectedRoute allowedRoles={['cucina', 'admin']}>
                    <Cucina />
                  </ProtectedRoute>
                }
              />

              {/* Vista Admin - accessibile solo ad admin */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              {/* Gestione 404 - redirect alla cassa */}
              <Route path="*" element={<Navigate to="/cassa" replace />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
