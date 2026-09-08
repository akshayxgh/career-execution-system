import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type AuthState = 'checking' | 'authenticated' | 'anonymous';

// Automatically bypass authentication in local development mode.
// In production builds (e.g. Vercel deployment), authentication is strictly enforced.
// To test login locally, set VITE_DEV_AUTH_BYPASS=false in .env.local.
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(
    DEV_AUTH_BYPASS ? 'authenticated' : 'checking'
  );

  const location = useLocation();

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      return;
    }

    let cancelled = false;

    fetch('/api/session')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setAuthState(data.authenticated ? 'authenticated' : 'anonymous');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthState('anonymous');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === 'checking') {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <p className="text-muted">Checking session...</p>
        </div>
      </div>
    );
  }

  if (authState === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};