import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChartIcon, ExamIcon, StudentsIcon } from '../../components/icons';

const InstitutionAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async (batchId = 'all') => {
    setLoading(true);
    setError('');
    try {
      const url = batchId && batchId !== 'all'
        ? `/api/institution/content/analytics?batch_id=${batchId}`
        : `/api/institution/content/analytics`;

      let data = null;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        data = await res.json().catch(() => null);
      }

      // Group local submissions by student
      const studentMap = new Map();
      
      // Populate from backend first if available
      if (data && Array.isArray(data.students)) {
        data.students.forEach(s => {
          const sKey = String(s.student_id || s.email || s.display_name || '').toLowerCase().trim();
          if (sKey) {
            studentMap.set(sKey, {
              student_id: s.student_id || sKey,
              display_name: s.display_name || s.name || 'Student',
              email: s.email || '',
              batch_name: s.batch_name || 'General',
              total_attempts: Number(s.total_attempts || s.attempts || 0),
              scores: s.average_score !== undefined ? [Number(s.average_score)] : []
            });
          }
        });
      }

      const formattedStudents = Array.from(studentMap.values()).map(s => {
        const avg = s.scores.length > 0 ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length) : 0;
        return {
          ...s,
          average_score: avg
        };
      });

      // Sort by average score descending for leaderboard
      formattedStudents.sort((a, b) => b.average_score - a.average_score || b.total_attempts - a.total_attempts);

      const totalSubmissionsCount = Number(data?.total_submissions ?? data?.submissions_count ?? 0);
      const totalStudentsCount = Number(data?.total_students ?? data?.students_count ?? formattedStudents.length);
      
      const overallAvg = formattedStudents.length > 0
        ? Math.round(formattedStudents.reduce((a, s) => a + s.average_score, 0) / formattedStudents.length)
        : (data?.average_score || 0);

      const finalAnalyticsObj = {
        total_students: totalStudentsCount,
        total_submissions: totalSubmissionsCount,
        average_score: overallAvg,
        students: formattedStudents,
        batches: data?.batches || []
      };

      setAnalytics(finalAnalyticsObj);
      if (data?.batches && Array.isArray(data.batches) && data.batches.length > 0) {
        setBatches(data.batches);
      }
    } catch {
      setError('Network error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedBatch);

    const handleUpdate = () => {
      fetchAnalytics(selectedBatch);
    };

    window.addEventListener('exam-submitted', handleUpdate);
    window.addEventListener('exam-completed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('exam-submitted', handleUpdate);
      window.removeEventListener('exam-completed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [selectedBatch]);

  return (
    <>
      <div className="bg-mesh"></div>

      <div className="main-wrap">
        <header className="institution-page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="institution-page-title">
              Institution <span className="institution-page-title-accent">Analytics & Rankings</span>
            </h1>
            <p className="institution-page-sub">
              Track student test participation, score averages, and class rank leaderboards
            </p>
          </div>
          <div className="institution-page-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

            <select
              className="text-input"
              aria-label="Filter analytics by batch"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="all">All batches</option>
              {batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.name}</option>)}
            </select>

            <button
              type="button"
              className="btn-institution-outline"
              onClick={() => fetchAnalytics(selectedBatch)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--red)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--red-l)' }}>
            {error}
          </div>
        )}

        {/* 1. Summary KPI Tiles */}
        <section className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="kpi-tile" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Students in Cohort</span>
              <StudentsIcon size={22} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
              {analytics ? analytics.total_students : '—'}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {selectedBatch === 'all' ? 'Across all batches' : 'In this specific section'}
            </span>
          </div>

          <div className="kpi-tile" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Total Submissions</span>
              <ExamIcon size={22} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>
              {analytics ? analytics.total_submissions : '—'}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Completed weekly exam attempts
            </span>
          </div>

          <div className="kpi-tile" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Cohort Average</span>
              <ChartIcon size={22} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary, #E65F00)' }}>
              {analytics ? `${analytics.average_score}%` : '—'}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Overall accuracy in weekly mocks
            </span>
          </div>
        </section>

        {/* 2. Batch Student Leaderboard */}
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.2), rgba(5,150,105,0.2))' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <h2>Student Performance Leaderboard</h2>
                <p className="section-sub">
                  Rankings based on test attempts and average percentage
                </p>
              </div>
            </div>
          </div>

          <div className="section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                Calculating batch performance...
              </div>
            ) : !analytics || analytics.students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
                <h3>No Student Records in this Cohort</h3>
                <p style={{ marginTop: '6px' }}>
                  Students linked to this batch will automatically appear here once they complete their exams.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Rank</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Batch</th>
                      <th>Attempts</th>
                      <th style={{ textAlign: 'right' }}>Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.students.map((stu, index) => {
                      const rank = index + 1;
                      const isTop3 = rank <= 3;
                      const medalColor = rank === 1 ? '#eab308' : rank === 2 ? '#94a3b8' : '#b45309';

                      return (
                        <tr key={stu.student_id}>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              background: isTop3 ? `${medalColor}20` : 'rgba(255,255,255,0.05)',
                              color: isTop3 ? medalColor : 'var(--muted)',
                              border: isTop3 ? `1px solid ${medalColor}40` : 'none',
                            }}>
                              {rank}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {stu.display_name}
                            </div>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                            {stu.email}
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.78rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--color-soft-orange)',
                              color: 'var(--color-primary)',
                            }}>
                              {stu.batch_name || 'Unassigned'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.88rem' }}>
                            <strong style={{ color: 'var(--text)' }}>{stu.total_attempts}</strong> tests
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: stu.average_score >= 70 ? '#10b981' : stu.average_score >= 40 ? '#eab308' : 'var(--muted)',
                            }}>
                              {stu.average_score}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InstitutionAnalytics;
