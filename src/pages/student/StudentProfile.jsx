import React, { useContext } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { extractStudentName } from '../../utils/studentId';

const StudentProfile = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const { studentProfile: profile, profileLoading, profileError } = useOutletContext();

  const resolvedEmail = profile?.email || profile?.user?.email || profile?.user_email || profile?.student?.email || '';
  const resolvedStudentId = profile?.kcet_student_id || profile?.student_id || profile?.studentId ||
    (profile?.sub && !String(profile.sub).includes('@') ? profile.sub : '');
  const resolvedInstitution = profile?.institution_name || profile?.institution?.name || '';
  const accountType = [profile?.student_subtype, profile?.account_type, profile?.user_type]
    .some((value) => ['institutional', 'institution_student', 'institution'].includes(String(value || '').toLowerCase())) ||
    Boolean(resolvedInstitution || profile?.institution_id || profile?.institution?.id)
    ? 'Institution Student'
    : 'Direct Student';
  const dashboardPath = accountType === 'Institution Student' ? '/student/institution/dashboard' : '/dashboard';

  const profileFields = profile ? [
    ...(extractStudentName(profile) !== 'Student' ? [['Name', extractStudentName(profile)]] : []),
    ...(resolvedStudentId ? [[profile?.kcet_student_id ? 'KCET Student ID' : 'Student ID', resolvedStudentId]] : []),
    ...(resolvedEmail ? [['Email', resolvedEmail]] : []),
    ['Account Type', accountType],
    ...(resolvedInstitution ? [['Institution', resolvedInstitution]] : []),
  ] : [];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.warn('Logout failed on profile page:', error);
    }
    navigate('/login', { replace: true });
  };

  return (
    <section className="student-profile-page" style={styles.page}>
      <div style={styles.headingRow}>
        <div>
          <p style={styles.eyebrow}>STUDENT ACCOUNT</p>
          <h1 style={styles.title}>Profile</h1>
        </div>
        <div style={styles.actions}>
          <Link to={dashboardPath} style={styles.backLink}>Dashboard</Link>
          <button type="button" onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </div>

      {profileLoading ? (
        <p role="status" style={styles.message}>Loading profile...</p>
      ) : profileError && !profile ? (
        <p role="alert" style={styles.message}>{profileError}</p>
      ) : (
        <dl style={styles.details}>
          {profileFields.map(([label, value]) => (
            <div key={label} style={styles.detailRow}>
              <dt style={styles.label}>{label}</dt>
              <dd style={styles.value}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

const styles = {
  page: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '1.5rem 0',
    color: '#1E293B',
  },
  headingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  eyebrow: {
    margin: '0 0 0.35rem',
    color: '#B34A00',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  title: {
    margin: 0,
    color: '#1A365D',
    fontFamily: 'Fraunces, serif',
    fontSize: '2rem',
  },
  backLink: {
    color: '#B34A00',
    fontWeight: 700,
    textDecoration: 'none',
  },
  logoutButton: {
    border: '1px solid rgba(185, 28, 28, 0.2)',
    background: 'rgba(239, 68, 68, 0.05)',
    color: '#B91C1C',
    borderRadius: '999px',
    padding: '0.65rem 1.1rem',
    fontSize: '0.86rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  details: {
    margin: 0,
    borderTop: '1px solid rgba(26,54,93,0.14)',
  },
  detailRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(130px, 220px) minmax(0, 1fr)',
    gap: '1rem',
    padding: '1rem 0',
    borderBottom: '1px solid rgba(26,54,93,0.14)',
  },
  label: {
    color: '#475569',
    fontWeight: 600,
  },
  value: {
    margin: 0,
    color: '#1E293B',
    overflowWrap: 'anywhere',
  },
  message: {
    color: '#475569',
  },
};

export default StudentProfile;