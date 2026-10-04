import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Alert, Card } from '../components';
import { InstitutionsIcon, StudentsIcon } from '../components/icons';

const RegisterPage = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [joinType, setJoinType] = useState('independent');
  const [joinCode, setJoinCode] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    
    try {
      const payload = {
        display_name: displayName,
        email: email,
        password: password,
        role: "student",
        student_subtype: joinType === 'via_code' ? "institutional" : "independent",
        institution_id: joinType === 'via_code' ? joinCode : null
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field === "email") {
          setError('Email already exists. Please log in instead.');
        } else {
          setError(data.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      setSuccess('You have registered successfully. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { state: { registered: true, role: 'student' } });
      }, 1500);
    } catch {
      setError('Network error. Ensure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <Card variant="elevated" style={styles.card}>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Register for VyasaPrep</p>

          {error && <Alert variant="error" style={styles.alert}>{error}</Alert>}
          {success && <Alert variant="success" style={styles.alert}>{success}</Alert>}

          {!success && (
            <form onSubmit={handleRegister} style={styles.form}>
              <Input
                label="Display Name"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

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
                placeholder="Min 8 chars, at least 1 digit"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {/* Join Type Selector */}
              <div style={styles.joinTypeSection}>
                <label style={styles.joinTypeLabel}>How are you joining?</label>
                <div style={styles.joinTypeOptions}>
                  <label style={{
                    ...styles.joinTypeOption,
                    ...(joinType === 'independent' ? styles.joinTypeOptionActive : {}),
                  }}>
                    <input
                      type="radio"
                      name="joinType"
                      value="independent"
                      checked={joinType === 'independent'}
                      onChange={() => setJoinType('independent')}
                      style={styles.joinTypeRadio}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <StudentsIcon size={18} />
                      Personal Student
                    </span>
                  </label>
                  <label style={{
                    ...styles.joinTypeOption,
                    ...(joinType === 'via_code' ? styles.joinTypeOptionActive : {}),
                  }}>
                    <input
                      type="radio"
                      name="joinType"
                      value="via_code"
                      checked={joinType === 'via_code'}
                      onChange={() => setJoinType('via_code')}
                      style={styles.joinTypeRadio}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <InstitutionsIcon size={18} />
                      Through Institution
                    </span>
                  </label>
                </div>
              </div>

              {joinType === 'via_code' && (
                <Input
                  label="Institution Code"
                  type="text"
                  placeholder="Enter code (e.g., INST-1234)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required={joinType === 'via_code'}
                />
              )}

              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={loading || !!success}
                style={styles.submitBtn}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}

          <p style={styles.footer}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Log in
            </Link>
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
    padding: 0,
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  joinTypeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  joinTypeLabel: {
    fontSize: '0.85rem',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  joinTypeOptions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  joinTypeOption: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.85rem',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    backgroundColor: '#FFFFFF',
    minWidth: '0',
  },
  joinTypeOptionActive: {
    backgroundColor: 'var(--color-soft-orange)',
    borderColor: 'var(--color-primary)',
    color: 'var(--color-primary)',
    fontWeight: '600',
  },
  joinTypeRadio: {
    margin: 0,
    cursor: 'pointer',
    accentColor: 'var(--color-primary)',
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

export default RegisterPage;
