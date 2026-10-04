import React, { useState, useEffect } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/students', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list = data.students || data.data || (Array.isArray(data) ? data : []);
        setStudents(list);
      } else {
        setStudents([]);
        setError(`Unable to load students (HTTP ${res.status}).`);
      }
    } catch (err) {
      setStudents([]);
      setError('Unable to load students. Check the /api/admin/students endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const isInstitutionLinked = (student) => {
    const subtype = String(student.student_subtype || student.subtype || student.type || '').toLowerCase();
    if (subtype) return subtype.includes('institution');
    return Boolean(student.institution_id || (student.institution_name && student.institution_name !== '—') || (student.institution && student.institution !== '—'));
  };
  const getInstitutionName = (student) => [student.institution_name, student.institution].find(value => value && value !== '—') || '';
  const filteredStudents = students.filter(s => {
    if (filterType === 'institution') return isInstitutionLinked(s);
    if (filterType === 'direct') return !isInstitutionLinked(s);
    return true;
  });

  const totalCount = students.length;
  const instCount = students.filter(isInstitutionLinked).length;
  const directCount = totalCount - instCount;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .main-wrap { max-width: 100%; }
        .admin-students-wrap { width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
        .admin-students-wrap h1,.admin-students-wrap h2 { color:#0f172a !important; }
        .admin-students-wrap .section-sub,.admin-students-wrap > div:first-child p { color:#475569 !important; }
        .tab-group { display: flex; gap: 0; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
        .tab-group { overflow-x:auto; overflow-y:hidden; scrollbar-width:none; }
        .tab-group::-webkit-scrollbar { display:none; }
        .tab-btn { padding: 12px 16px; background: transparent; border: none; color: var(--muted); cursor: pointer; font-size: 0.88rem; font-weight: 600; transition: all 0.2s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
        .student-table { table-layout: fixed; width: 100%; border-collapse: collapse; }
        .student-table-wrap { width:100%;overflow-x:auto;overflow-y:hidden; }
        .student-mobile-list { display:none; }
        .student-mobile-card { padding:14px 16px;border-bottom:1px solid var(--border); }
        .student-mobile-card:last-child { border-bottom:none; }
        .student-mobile-row { display:flex;justify-content:space-between;gap:12px;line-height:1.4; }
        .student-mobile-label { color:#64748b;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.04em; }
        .student-mobile-value { color:#0f172a;text-align:right;overflow-wrap:anywhere;word-break:break-word; }
        .sub-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
        .sub-badge.active { background: rgba(5, 150, 105, 0.15); color: var(--green-l); }
        .sub-badge.no_subscription { background: rgba(107, 114, 128, 0.1); color: var(--muted2); }
        @media (max-width:900px) {
          .navbar { min-width:0;overflow:hidden;padding:0 12px;gap:8px; }
          .navbar .nav-brand { flex:0 0 auto; }
          .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none; }
          .navbar .nav-links::-webkit-scrollbar { display:none; }
          .navbar .nav-actions { flex:0 0 auto; }
          .navbar .nav-actions .btn { padding:6px 9px;font-size:0.75rem; }
          .admin-students-wrap { padding-left:16px !important;padding-right:16px !important; }
        }
        @media (max-width:560px) {
          .navbar .brand-name,.navbar .brand-ai { font-size:0.95rem; }
          .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; }
          .admin-students-wrap { padding-top:18px !important;padding-bottom:48px !important; }
          .admin-students-wrap > div:first-child { align-items:flex-start !important;gap:12px; }
          .admin-students-wrap > div:first-child h1 { font-size:1.35rem !important; }
          .student-table-wrap { display:none; }
          .student-mobile-list { display:block; }
        }
      ` }} />

      <div className="bg-mesh"></div>

      <div className="main-wrap admin-students-wrap" style={{ maxWidth: '100%', padding: '24px 28px 80px' }}>
        <AdminPageHeader
          title="Students Management"
          description="View and manage all students. Subscription/payment features are currently inactive / future feature."
          actions={<button className="btn-outline" onClick={fetchStudents} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {loading ? <span className="btn-spinner" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>}
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>}
        />

        {error && <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#991b1b', fontSize: '0.85rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-primary)' }}>{totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Total Students</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--blue-l,#60a5fa)' }}>{instCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Institution-linked</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-primary)' }}>{directCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Direct Students</div>
          </div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--green-l)' }}>{totalCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Free access</div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', marginBottom: '16px' }}>
              <div className="section-icon" style={{ background: 'linear-gradient(135deg,rgba(230,95,0,0.12),rgba(255,240,227,0.8))' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ flex: '1' }}>
                <h2 style={{ margin: '0', fontSize: '1.1rem' }}>All Students</h2>
                <p className="section-sub" style={{ margin: '2px 0 0' }}>Enrolled students across institutions and direct access</p>
              </div>
            </div>

            <div className="tab-group" style={{ width: '100%' }}>
              <button className={`tab-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All Students ({totalCount})</button>
              <button className={`tab-btn ${filterType === 'institution' ? 'active' : ''}`} onClick={() => setFilterType('institution')}>Institution-linked ({instCount})</button>
              <button className={`tab-btn ${filterType === 'direct' ? 'active' : ''}`} onClick={() => setFilterType('direct')}>Direct Students ({directCount})</button>
            </div>
          </div>

          <div className="section-body" style={{ padding: '0' }}>
            <div className="table-scroll student-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="results-table student-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>Name</th>
                    <th style={{ padding: '12px 16px' }}>Student ID</th>
                    <th style={{ padding: '12px 16px' }}>Email</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Institution</th>
                    <th style={{ padding: '12px 16px' }}>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Loading students...</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>No students recorded yet.</td></tr>
                  ) : (
                    filteredStudents.map((stu, i) => (
                      <tr key={stu.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{stu.display_name || stu.name || 'Student'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>{stu.kcet_student_id || stu.student_id || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{stu.email || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{isInstitutionLinked(stu) ? 'Institution-linked' : 'Direct'}</td>
                        <td style={{ padding: '12px 16px' }}>{getInstitutionName(stu) || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="sub-badge active">Free access</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="student-mobile-list">
              {loading ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 16px' }}>Loading students...</div> : filteredStudents.length === 0 ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 16px' }}>No students recorded yet.</div> : filteredStudents.map((stu, i) => (
                <div className="student-mobile-card" key={stu.id || `mobile-${i}`}>
                  <div className="student-mobile-row"><strong className="student-mobile-value">{stu.display_name || stu.name || 'Student'}</strong><span className="sub-badge active">Free access</span></div>
                  <div className="student-mobile-row"><span className="student-mobile-label">Student ID</span><span className="student-mobile-value">{stu.kcet_student_id || stu.student_id || '—'}</span></div>
                  <div className="student-mobile-row"><span className="student-mobile-label">Email</span><span className="student-mobile-value">{stu.email || '—'}</span></div>
                  <div className="student-mobile-row"><span className="student-mobile-label">Type</span><span className="student-mobile-value">{isInstitutionLinked(stu) ? 'Institution-linked' : 'Direct'}</span></div>
                  <div className="student-mobile-row"><span className="student-mobile-label">Institution</span><span className="student-mobile-value">{getInstitutionName(stu) || '—'}</span></div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Showing {filteredStudents.length} of {totalCount} students</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminStudents;
