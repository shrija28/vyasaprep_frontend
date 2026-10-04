import React, { useContext, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../contexts/AuthContext';
import { extractStudentName } from '../utils/studentId';
import {
  DashboardIcon,
  ExamIcon,
  ChartIcon,
  SyllabusIcon,
  LockIcon,
  StudentsIcon,
} from '../components/icons';

const institutionStudentLinks = [
  { to: '/student/institution/dashboard', label: 'Dashboard', icon: <DashboardIcon size={18} />, end: true },
  { to: '/student/institution/exams', label: 'My Exams', icon: <ExamIcon size={18} />, end: true },
  { to: '/dashboard#performance', label: 'Performance', icon: <ChartIcon size={18} />, end: true },
  { to: '/syllabus', label: 'Syllabus', icon: <SyllabusIcon size={18} />, end: true },
  { to: '/profile', label: 'Profile', icon: <StudentsIcon size={18} />, end: true },
];

const directStudentLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon size={18} />, end: true },
  { to: '/exam', label: 'My Exams', icon: <ExamIcon size={18} />, end: true },
  { to: '/syllabus', label: 'Syllabus', icon: <SyllabusIcon size={18} />, end: true },
  { to: '/profile', label: 'Profile', icon: <StudentsIcon size={18} />, end: true },
];

const hasInstitutionLink = (profile) => {
  const accountTypes = [profile?.student_subtype, profile?.account_type, profile?.user_type]
    .map((value) => String(value || '').toLowerCase());
  return accountTypes.some((type) => ['institutional', 'institution_student', 'institution', 'institution_linked'].includes(type)) ||
    Boolean(
      profile?.institution_id ||
      profile?.institution?.id ||
      profile?.institution_name ||
      profile?.institution?.name ||
      profile?.student?.institution_id ||
      profile?.student?.institution_name
    );
};

const StudentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const isInstitutionStudentRoute = location.pathname.startsWith('/student-institution-') || location.pathname.startsWith('/student/institution');
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (response) => {
        const profile = await response.json().catch(() => ({}));
        if (!response.ok || !profile.authenticated) {
          throw new Error(profile.message || 'Sign in to view your student profile.');
        }

        try {
          const dashboardResponse = await fetch('/api/student/dashboard-stats', { credentials: 'include' });
          if (!dashboardResponse.ok) return profile;

          const dashboardData = await dashboardResponse.json().catch(() => ({}));
          const studentDetails = dashboardData.student;
          if (!studentDetails || typeof studentDetails !== 'object') return profile;

          const authStudentId = String(profile.kcet_student_id || profile.student_id || profile.sub || '').trim().toLowerCase();
          const detailsStudentId = String(studentDetails.kcet_student_id || studentDetails.student_id || '').trim().toLowerCase();
          if (authStudentId && detailsStudentId && authStudentId !== detailsStudentId) return profile;

          return {
            ...studentDetails,
            ...profile,
            email: profile.email || profile.user_email || profile.user?.email || profile.student?.email || studentDetails.email || '',
            institution_name: profile.institution_name || studentDetails.institution_name || '',
          };
        } catch {
          return profile;
        }
      })
      .then((profile) => {
        if (active) setStudentProfile(profile);
      })
      .catch((error) => {
        if (active) setProfileError(error.message || 'Unable to load your profile right now.');
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isInstitutionStudentRoute]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isExamShellRoute = location.pathname === '/exam' && Boolean(new URLSearchParams(location.search).get('set'));
  const currentStudent = studentProfile || user || null;
  const isInstitutionStudent = isInstitutionStudentRoute || hasInstitutionLink(currentStudent);
  const studentName = extractStudentName(currentStudent);
  const studentEmail = currentStudent?.email || currentStudent?.user?.email || currentStudent?.user_email || currentStudent?.student?.email || 'Email not available';
  const studentInitials = studentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ST';
  const studentLinks = isInstitutionStudent ? institutionStudentLinks : directStudentLinks;
  const profileMenu = (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="student-user-badge"
        style={styles.profileButton}
        aria-label={`Open profile menu for ${studentName}`}
        onClick={() => setProfileMenuOpen((value) => !value)}
      >
        <span style={styles.avatar}>{studentInitials}</span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
          <span className="student-user-meta" style={styles.userMeta}>{studentName}</span>
          <span className="student-user-role" style={styles.userRole}>{studentEmail === 'Email not available' ? 'Student' : studentEmail}</span>
        </span>
      </button>

      {profileMenuOpen && (
        <div style={styles.profileMenu} role="menu" aria-label="Student profile menu">
          <div style={styles.profileMenuHeader}>
            <div style={styles.avatarLarge}>{studentInitials}</div>
            <div>
              <div style={styles.profileMenuName}>{studentName}</div>
              {studentEmail !== 'Email not available' && (
                <div style={styles.profileMenuEmail}>{studentEmail}</div>
              )}
            </div>
          </div>
          <button type="button" style={styles.menuItem} onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}>
            <StudentsIcon size={16} />
            <span>Profile</span>
          </button>
          <button type="button" style={styles.menuItemDanger} onClick={handleLogout}>
            <LockIcon size={16} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );

  async function handleLogout() {
    setProfileMenuOpen(false);
    try {
      await logout();
    } catch (error) {
      console.warn('Logout failed in student layout:', error);
    }
    navigate('/login', { replace: true });
  }

  if (isExamShellRoute) {
    return (
      <div className="student-layout exam-shell-layout" style={styles.examShellPage}>
        <Outlet context={{
          studentProfile: currentStudent,
          profileAuthenticated: Boolean(studentProfile?.authenticated || user),
          profileLoading,
          profileError,
        }} />
      </div>
    );
  }

  return (
    <div className="student-layout" style={styles.pageShell}>
      <div className="bg-mesh"></div>
      <Sidebar
        title=""
        logo={<BrandLogo size="sm" />}
        items={studentLinks}
      />
      <div className="student-main-area" style={styles.mainArea}>
        <header className="student-topbar" style={{ ...styles.topbar, justifyContent: 'flex-end' }}>
          {profileMenu}
        </header>

        <main style={styles.contentArea}>
          <Outlet context={{
            studentProfile: currentStudent,
            profileAuthenticated: Boolean(studentProfile?.authenticated || user),
            profileLoading,
            profileError,
          }} />
        </main>
      </div>
    </div>
  );
};

const styles = {
  pageShell: {
    position: 'relative',
    minHeight: '100vh',
    background: '#F7F5F1',
    display: 'flex',
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    minHeight: '100vh',
    padding: '1.25rem 2rem 2rem',
    boxSizing: 'border-box',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.5rem 0 1.5rem',
  },
  searchBox: {
    background: '#F9F7F3',
    border: '1px solid rgba(26,54,93,0.12)',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.9rem 1.2rem',
    flex: 1,
    maxWidth: '760px',
    color: '#475569',
    fontSize: '0.96rem',
  },
  searchShortcut: {
    marginLeft: 'auto',
    border: '1px solid rgba(26,54,93,0.12)',
    borderRadius: '0.4rem',
    padding: '0.2rem 0.4rem',
    color: '#475569',
    fontSize: '0.72rem',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconButton: {
    border: '1px solid rgba(26,54,93,0.12)',
    background: '#F9F7F3',
    borderRadius: '0.8rem',
    width: '2.5rem',
    height: '2.5rem',
    cursor: 'pointer',
    fontSize: '1.15rem',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    background: '#F9F7F3',
    border: '1px solid rgba(26,54,93,0.12)',
    borderRadius: '999px',
    padding: '0.4rem 0.8rem 0.4rem 0.45rem',
  },
  profileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    background: '#F9F7F3',
    border: '1px solid rgba(26,54,93,0.12)',
    borderRadius: '999px',
    padding: '0.45rem 0.9rem 0.45rem 0.45rem',
    color: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  profileMenu: {
    position: 'absolute',
    top: 'calc(100% + 0.75rem)',
    right: 0,
    minWidth: '220px',
    background: '#FFFFFF',
    border: '1px solid rgba(26,54,93,0.12)',
    borderRadius: '14px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.15)',
    padding: '0.75rem',
    zIndex: 20,
  },
  profileMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.35rem 0.25rem 0.75rem',
    borderBottom: '1px solid rgba(26,54,93,0.10)',
    marginBottom: '0.35rem',
  },
  avatarLarge: {
    width: '2.4rem',
    height: '2.4rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#F7E7CF',
    color: '#1A365D',
    fontWeight: 800,
    fontSize: '0.76rem',
  },
  profileMenuName: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#1A365D',
    lineHeight: 1.2,
  },
  profileMenuEmail: {
    fontSize: '0.72rem',
    color: '#475569',
    lineHeight: 1.3,
    wordBreak: 'break-word',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    border: 'none',
    background: 'transparent',
    color: '#1E293B',
    padding: '0.7rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  },
  menuItemDanger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    border: 'none',
    background: 'rgba(239,68,68,0.05)',
    color: '#B91C1C',
    padding: '0.7rem 0.5rem',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  avatar: {
    width: '2.1rem',
    height: '2.1rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#F7E7CF',
    color: '#1A365D',
    fontWeight: 700,
    fontSize: '0.72rem',
  },
  userMeta: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#1A365D',
  },
  userRole: {
    color: '#475569',
    fontSize: '0.7rem',
  },
  contentArea: {
    borderRadius: '1.6rem',
    background: 'transparent',
    minHeight: 'calc(100vh - 100px)',
  },
  examShellPage: {
    minHeight: '100vh',
    background: '#F7F5F1',
  },
};

export default StudentLayout;
