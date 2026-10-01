import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Input, Button, Alert, Card } from '../components';

const LoginPage = () => {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(() => {
    if (location.state?.subscriptionSuccess) {
      return `Subscription active for ${location.state.planName || 'Plan'}! Sign in to enter your dashboard.`;
    }
    if (location.state?.fromSubscription) {
      return 'Subscription complete! Sign in to enter your dashboard.';
    }
    if (location.state?.registered) {
      return 'Account created! Please sign in to continue.';
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      let endpoint = '/api/auth/login';
      if (role === 'admin') endpoint = '/api/auth/admin/login';
      else if (role === 'institution') endpoint = '/api/auth/institution/login';

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Fallback: if user attempted login on student tab with admin credentials
        if (role === 'student') {
          const adminRes = await fetch('/api/auth/admin/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            login(adminData);
            navigate(adminData.redirect || '/admin/dashboard');
            return;
          }
        }

        // Handle generic auth failure or lockout
        if (data.error === 'account_locked') {
          setError(data.message || 'Account temporarily locked. Try again later.');
        } else {
          setError('Invalid credentials. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Successful login
      login(data);
      
      // Redirect based on role or explicit redirect from backend
      if (data.redirect) navigate(data.redirect);
      else if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'institution') navigate('/institution/dashboard');
      else navigate('/dashboard');
      
    } catch (err) {
      setError('Network error. Ensure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <Card variant="elevated" style={styles.card}>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your account</p>

          {info && <Alert variant="info" style={styles.alert}>{info}</Alert>}
          {error && <Alert variant="error" style={styles.alert}>{error}</Alert>}

          {/* Role Tabs */}
          <div style={styles.roleTabs}>
            {[
              { value: 'student', label: 'Student' },
              { value: 'institution', label: 'Institution' },
              { value: 'admin', label: 'Platform Admin' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                style={{
                  ...styles.roleTab,
                  ...(role === r.value ? styles.roleTabActive : {}),
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <p style={styles.footer}>
            {role === 'institution' ? (
              <>
                Onboarding your school or college?{' '}
                <Link to="/institution/register" style={styles.link}>
                  Register Institution →
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <Link to="/register" style={styles.link}>
                  Register
                </Link>
              </>
            )}
          </p>
        </Card>
      </main>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    backgroundColor: 'var(--color-background)',
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 80px)',
    padding: 'clamp(1rem, 3vw, 2rem)',
  },
  card: {
    maxWidth: '420px',
    width: '100%',
    padding: 'clamp(1.5rem, 3vw, 2rem)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(230, 95, 0, 0.04)',
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontFamily: 'Fraunces, serif',
    fontWeight: '700',
    color: 'var(--color-navy)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    color: 'var(--color-text-secondary)',
    marginBottom: '1.5rem',
  },
  alert: {
    marginBottom: '1.5rem',
  },
  roleTabs: {
    display: 'flex',
    gap: '0',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '1.5rem',
    backgroundColor: '#FFFFFF',
  },
  roleTab: {
    flex: 1,
    padding: '0.75rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: '0.85rem',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderRight: '1px solid var(--color-border)',
  },
  roleTabActive: {
    backgroundColor: 'var(--color-soft-orange)',
    color: 'var(--color-primary)',
    borderRight: '1px solid var(--color-border)',
    fontWeight: '700',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  submitBtn: {
    width: '100%',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.9rem',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    color: 'var(--color-text-secondary)',
  },
  link: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default LoginPage;
