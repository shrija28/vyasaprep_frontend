import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Alert, Card } from '../../components';

const InvitationAccept = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('code') || searchParams.get('token') || '';
  
  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const verifyInvite = async () => {
      setLoading(true);
      setError('');
      if (!inviteCode) {
        setError('No invitation code provided in the link.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/institution/invitations/info?code=${encodeURIComponent(inviteCode)}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setInvitationData(data);
        } else {
          setInvitationData({
            institution_name: 'Partner Institution',
            invite_code: inviteCode
          });
        }
      } catch {
        setInvitationData({
          institution_name: 'Partner Institution',
          invite_code: inviteCode
        });
      } finally {
        setLoading(false);
      }
    };

    verifyInvite();
  }, [inviteCode]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/institution/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: inviteCode, invite_code: inviteCode })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/student/institution');
        }, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to accept invitation. You may need to sign in first.');
      }
    } catch {
      setError('Network error while processing invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <Card variant="elevated" style={styles.card}>
          <h1 style={styles.title}>Institution Invitation</h1>
          <p style={styles.subtitle}>
            Review the invitation details below and choose to accept or decline.
          </p>

          {error && <Alert variant="error" style={styles.alert}>{error}</Alert>}
          {success && (
            <Alert variant="success" style={styles.alert}>
              Invitation accepted successfully! Redirecting to institution portal…
            </Alert>
          )}

          {loading ? (
            <div style={styles.loading}>Loading invitation details…</div>
          ) : (
            <div style={styles.details}>
              <div style={styles.detailGroup}>
                <span style={styles.detailLabel}>Institution</span>
                <p style={styles.detailValue}>
                  {invitationData?.institution_name || 'VyasaPrep Institution'}
                </p>
              </div>

              {inviteCode && (
                <div style={styles.detailGroup}>
                  <span style={styles.detailLabel}>Invite Code</span>
                  <p style={styles.detailValue}>
                    {inviteCode}
                  </p>
                </div>
              )}

              <div style={styles.detailGroup}>
                <span style={styles.detailLabel}>What You'll Get</span>
                <ul style={styles.benefitsList}>
                  <li>Access to your institution's curated exams</li>
                  <li>Personalized analytics and batch rankings</li>
                  <li>Full access to your institution's prep portal</li>
                </ul>
              </div>

              <div style={styles.actions}>
                <Button
                  type="button"
                  variant="primary"
                  size="large"
                  onClick={handleAccept}
                  disabled={submitting || success}
                  style={styles.actionButton}
                >
                  {submitting ? 'Accepting…' : 'Accept Invitation'}
                </Button>
                <Button
                  as={Link}
                  to="/"
                  variant="outline"
                  size="large"
                  style={styles.actionButton}
                >
                  Decline
                </Button>
              </div>
            </div>
          )}
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
    maxWidth: '520px',
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
    marginBottom: 'var(--spacing-xl)',
  },
  loading: {
    textAlign: 'center',
    padding: 'var(--spacing-2xl) 0',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-body)',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xl)',
  },
  detailGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  detailLabel: {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 'var(--font-size-h4)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    margin: 0,
  },
  benefitsList: {
    margin: 0,
    paddingLeft: 'var(--spacing-xl)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-body)',
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: '140px',
  },
};

export default InvitationAccept;
