import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { LockKeyhole, Eye, EyeOff } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { InteractiveBackground } from '../components/InteractiveBackground';
import './Login.css';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export const Login = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname || '/';

  // Interactive 3D Card Tilt responding to mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const xOffset = (e.clientX - innerWidth / 2) / (innerWidth / 2);
      const yOffset = (e.clientY - innerHeight / 2) / (innerHeight / 2);

      setTilt({
        rotateX: -yOffset * 6,
        rotateY: xOffset * 6,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
        setError(data?.message || 'Invalid password.');
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
      {/* Interactive mouse-tracking constellation background */}
      <InteractiveBackground />

      <section
        className="auth-panel"
        aria-label="Login"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
        }}
      >
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-input-wrap">
            <LockKeyhole size={18} className="auth-icon-left" />
            <input
              id="password"
              className="input auth-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              autoFocus
            />
            <button
              type="button"
              className="auth-toggle-visibility"
              onClick={() => setShowPassword((prev) => !prev)}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
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
