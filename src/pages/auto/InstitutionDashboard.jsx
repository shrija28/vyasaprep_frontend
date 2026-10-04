import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToExamChanges } from '../../utils/examStore';
import { StudentsIcon, ExamIcon, ChartIcon, TrophyIcon } from '../../components/icons';

const InstitutionDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [batches, setBatches] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');
    try {
      // 1. Dashboard summary
      const dashRes = await fetch('/api/institution/dashboard', { credentials: 'include' });
      if (dashRes.ok) {
        const dData = await dashRes.json();
        setDashboardData(dData);
      }

      // 2. Batches
      const batchRes = await fetch('/api/institution/batches', { credentials: 'include' });
      if (batchRes.ok) {
        const bData = await batchRes.json();
        setBatches(bData.batches || []);
      }

      // 3. Exams
      let fetchedList = [];
      const examRes = await fetch('/api/institution/content/exams', { credentials: 'include' });
      if (examRes.ok) {
        const eData = await examRes.json();
        fetchedList = eData.exams || eData.data || (Array.isArray(eData) ? eData : []);
      }
      const processed = fetchedList.map(ex => {
        return { ...ex, completion_count: Number(ex.completion_count || 0) };
      });
      setExams(processed);

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      if (!isSilent) setError('Unable to load dashboard data');
      setExams([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
    const unsubscribe = subscribeToExamChanges(() => {
      fetchDashboard(true);
    });

    const handleUpdate = () => {
      fetchDashboard(true);
    };

    window.addEventListener('exam-submitted', handleUpdate);
    window.addEventListener('exam-completed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('exam-submitted', handleUpdate);
      window.removeEventListener('exam-completed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [fetchDashboard]);

  const batchStudentsSum = batches.reduce((sum, b) => sum + (b.student_count ?? b.students_count ?? (Array.isArray(b.students) ? b.students.length : 0)), 0);
  const totalStudents = dashboardData?.total_students ?? dashboardData?.students_count ?? (batchStudentsSum > 0 ? batchStudentsSum : (dashboardData?.students?.length ?? 0));
  const institutionName = dashboardData?.institution_name || 'Your Institution';
  const subStatus = dashboardData?.subscription_status || 'active';

  return (
    <>
      <div className="bg-mesh"></div>

      <main className="institution-page" id="institutionDashboardPage">
        {/* Header */}
        <div className="institution-page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="institution-page-title">
              {institutionName} <span className="institution-page-title-accent">Dashboard</span>
            </h1>
            <p className="institution-page-sub">
              Command center for managing your classes, weekly mock tests, and student rankings
            </p>
          </div>
          <div className="institution-page-header-actions">
            <button
              className="btn-institution-outline"
              type="button"
              onClick={fetchDashboard}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Refresh Data
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--red)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--red-l)' }}>
            {error}
          </div>
        )}

        {/* 1. Real KPI Summary Tiles */}
        <section className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <Link to="/institution/students" style={{ textDecoration: 'none' }}>
            <div className="kpi-tile" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>TOTAL STUDENTS</span>
                <StudentsIcon size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {loading ? '—' : totalStudents}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>Manage & Invite Students →</span>
            </div>
          </Link>

          <Link to="/institution/exams" style={{ textDecoration: 'none' }}>
            <div className="kpi-tile" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>WEEKLY EXAMS</span>
                <ExamIcon size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {loading ? '—' : exams.length}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>Build & Schedule Tests →</span>
            </div>
          </Link>

          <Link to="/institution/analytics" style={{ textDecoration: 'none' }}>
            <div className="kpi-tile" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>TEST SUBMISSIONS</span>
                <ChartIcon size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {loading ? '—' : (() => {
                  return Number(dashboardData?.total_submissions ?? dashboardData?.submissions_count ?? 0);
                })()}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>View Live Leaderboard →</span>
            </div>
          </Link>

          <Link to="/institution/analytics" style={{ textDecoration: 'none' }}>
            <div className="kpi-tile" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>CLASS AVERAGE</span>
                <TrophyIcon size={20} style={{ color: 'var(--color-success)' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {loading ? '—' : (() => {
                  return `${Number(dashboardData?.average_score ?? dashboardData?.class_average ?? 0)}%`;
                })()}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>Accuracy Rate →</span>
            </div>
          </Link>
        </section>

        {/* 2. Getting Started & Quick Action Workflow */}
        <section className="section-card" style={{ marginBottom: '24px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="section-card-header">
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-navy)', fontWeight: 700 }}>Teacher-Led Next Steps: What You Can Do</h2>
              <p className="section-sub" style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '6px' }}>Follow these 3 simple steps to start testing and grading your students</p>
            </div>
          </div>

          <div className="section-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}><StudentsIcon size={28} /></div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px', color: 'var(--color-navy)', fontWeight: 600 }}>1. Create Batches & Invite Students</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Create class sections (e.g. <em>PUC-II Section A</em>) and generate a single invitation link to share with your students.
                </p>
              </div>
              <Link to="/institution/students" className="btn-primary" style={{ marginTop: '16px', textAlign: 'center', justifyContent: 'center' }}>
                Manage Students & Batches →
              </Link>
            </div>

            <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}><ExamIcon size={28} /></div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px', color: 'var(--color-navy)', fontWeight: 600 }}>2. Build & Assign Weekly Tests</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Pick a subject (Mathematics, Biology, Physics, Chemistry), choose questions count, set a 60-min timer, and assign to your batch.
                </p>
              </div>
              <Link to="/institution/exams" className="btn-primary" style={{ marginTop: '16px', textAlign: 'center', textDecoration: 'none' }}>
                Open Test Builder →
              </Link>
            </div>

            <div style={{ background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}><ChartIcon size={28} /></div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px', color: 'var(--color-navy)', fontWeight: 600 }}>3. View Batch Rank Lists</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Instantly track student submissions, view leaderboard rankings by score, and analyze class average performance.
                </p>
              </div>
              <Link to="/institution/analytics" className="btn-primary" style={{ marginTop: '16px', textAlign: 'center', textDecoration: 'none', justifyContent: 'center' }}>
                View Batch Analytics →
              </Link>
            </div>
          </div>
        </section>


      </main>
    </>
  );
};

export default InstitutionDashboard;
