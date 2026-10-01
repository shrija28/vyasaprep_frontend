import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Alert, Card } from '../../components';

const InstitutionRegister = () => {
  const [institutionName, setInstitutionName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (!/\d/.test(password)) {
      setError('Password must contain at least one number (0–9). For example: SMVITM@2026 or Password123');
      setLoading(false);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      setError('Contact phone must be between 10 and 15 digits.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: institutionName.trim(),
        admin_email: email.trim().toLowerCase(),
        contact_phone: cleanPhone,
        admin_password: password
      };

      const res = await fetch('/api/institution/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.error === 'duplicate_email') {
          setError('This institution email is already registered. Please sign in instead.');
        } else {
          setError(data.message || 'Registration failed. Please check your inputs.');
        }
        setLoading(false);
        return;
      }

      setSuccess(`Institution "${data.institution_name || institutionName}" registered successfully! Redirecting to login...`);
      setTimeout(() => {
        navigate('/login', { state: { registered: true, role: 'institution' } });
      }, 1500);
    } catch (err) {
      setError('Network error. Please make sure the server is reachable.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <Card variant="elevated" style={styles.card}>
          <h1 style={styles.title}>Register Your Institution</h1>
          <p style={styles.subtitle}>
            Create an admin account for your school, college, or coaching center
          </p>

          {error && <Alert variant="error" style={styles.alert}>{error}</Alert>}
          {success && <Alert variant="success" style={styles.alert}>{success}</Alert>}

          {!success && (
            <form onSubmit={handleSubmit} autoComplete="off" style={styles.form}>
              <Input
                label="Institution Name"
                type="text"
                placeholder="e.g., National Institute of Technology"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
              />

              <Input
                label="Institution Admin Email"
                type="email"
                placeholder="admin@institution.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Contact Phone"
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                helperText="10-15 digits"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters, at least 1 digit"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText="Must be at least 8 characters and include at least one number (0–9)"
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={loading}
                style={styles.submitBtn}
              >
                {loading ? 'Registering...' : 'Register Institution'}
              </Button>
            </form>
          )}

          <div style={styles.links}>
            <p style={styles.linkText}>
              Already registered?{' '}
              <Link to="/login" style={styles.link}>
                Sign in
              </Link>
            </p>
            <p style={styles.linkText}>
              Looking to register as a student?{' '}
              <Link to="/register" style={styles.link}>
                Register here
              </Link>
            </p>
          </div>
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
    padding: 'var(--spacing-xl)',
  },
  card: {
    maxWidth: '440px',
    width: '100%',
    padding: 'var(--spacing-2xl)',
  },
  title: {
    fontSize: 'var(--font-size-h2)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-sm)',
  },
  subtitle: {
    fontSize: 'var(--font-size-body)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--spacing-xl)',
  },
  alert: {
    marginBottom: 'var(--spacing-lg)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-xl)',
  },
  submitBtn: {
    width: '100%',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-text-secondary)',
    margin: 0,
  },
  link: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    fontWeight: 'var(--font-weight-semibold)',
    cursor: 'pointer',
  },
};

export default InstitutionRegister;
