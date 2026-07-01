import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookOpen, LockKeyhole } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import './Login.css';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export const Login = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname || '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || 'Login failed.');
        return;
      }

      setIsAuthenticated(true);
      navigate(destination, { replace: true });
    } catch {
      setError('Login service unavailable.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Login">
        <div className="auth-mark">
          <BookOpen size={28} />
        </div>
        <div>
          <h1>MyCES</h1>
          <p className="text-muted">Private access for Akshay</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} />
            <input
              id="password"
              className="input auth-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </section>
    </main>
  );
};
