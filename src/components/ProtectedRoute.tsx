import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type AuthState = 'checking' | 'authenticated' | 'anonymous';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const location = useLocation();

  useEffect(() => {
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
