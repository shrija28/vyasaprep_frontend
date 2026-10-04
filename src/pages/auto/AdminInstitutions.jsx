import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminCache, setAdminCache, clearAdminCache } from '../../utils/adminCache';
import AdminPageHeader from '../../components/AdminPageHeader';

const AdminInstitutions = () => {
  const cachedInst = getAdminCache('admin_institutions_data');
  const [institutions, setInstitutions] = useState(() => cachedInst || []);
  const [loading, setLoading] = useState(() => !cachedInst);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchInstitutions = async () => {
    if (!getAdminCache('admin_institutions_data')) {
      setLoading(true);
    }
    setError('');
    try {
      const res = await fetch('/api/admin/institutions', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list = data.institutions || (Array.isArray(data) ? data : []);
        setInstitutions(list);
        setAdminCache('admin_institutions_data', list);
      } else {
        if (!getAdminCache('admin_institutions_data')) {
          setError('Failed to fetch institutions');
        }
      }
    } catch (err) {
      console.error('Error fetching institutions:', err);
      if (!getAdminCache('admin_institutions_data')) {
        setError('Network error loading institutions');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleToggleStatus = async (instId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/institutions/${instId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        clearAdminCache('admin_institutions_data');
        clearAdminCache('admin_dashboard_data');
        fetchInstitutions();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredList = institutions.filter(inst => {
    if (!filterStatus) return true;
    return (inst.status || 'active').toLowerCase() === filterStatus.toLowerCase();
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
    .admin-institutions-wrap { width:100%;max-width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
    .admin-institutions-wrap h1 { color:#0f172a !important; }
    .admin-institutions-wrap .section-card { min-width:0;overflow:hidden; }
    .admin-institutions-wrap .table-scroll { width:100%;max-width:100%;overflow-x:auto; }
    .inst-table td { white-space:normal;word-break:break-word;vertical-align:top; }
    .inst-table { table-layout:fixed;min-width:860px; }
    .inst-table col.col-name   { width:24%; }
    .inst-table col.col-status { width:11%; }
    .inst-table col.col-stud   { width:10%; }
    .inst-table col.col-quest  { width:10%; }
    .inst-table col.col-exams  { width:10%; }
    .inst-table col.col-renew  { width:15%; }
    .inst-table col.col-acts   { width:20%; }
    @media (max-width:900px) {
      .navbar { min-width:0;overflow:hidden;padding:0 12px;gap:8px; }
      .navbar .nav-brand { flex:0 0 auto; }
      .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none; }
      .navbar .nav-links::-webkit-scrollbar { display:none; }
      .navbar .nav-actions { flex:0 0 auto; }
      .navbar .nav-actions .btn { padding:6px 9px;font-size:0.75rem; }
      .admin-institutions-wrap { padding-left:16px !important;padding-right:16px !important; }
    }
    @media (max-width:560px) {
      .navbar .brand-name,.navbar .brand-ai { font-size:0.95rem; }
      .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; }
      .admin-institutions-wrap { padding-top:18px !important;padding-bottom:48px !important; }
      .admin-institutions-wrap > div:first-child { align-items:flex-start !important;gap:12px; }
      .admin-institutions-wrap > div:first-child h1 { font-size:1.35rem !important; }
      .admin-institutions-wrap > div:first-child button { flex-shrink:0; }
    }
  ` }} />
      
      <div className="bg-mesh"></div>

      <div className="main-wrap admin-institutions-wrap" style={{ maxWidth: '100%', padding: '24px 28px 80px' }}>
        <AdminPageHeader
          title="Institution Management"
          description="Activate, suspend, view details and monitor student counts across all institutions"
          actions={<button
            className="btn-outline" 
            id="refreshBtn" 
            onClick={fetchInstitutions}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? <span className="btn-spinner" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>}
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>}
        />

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--red)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: 'var(--red-l)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div className="section-card">
          <div className="section-body" style={{ paddingBottom: '0' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div className="input-group" style={{ margin: '0' }}>
                <label className="input-label" htmlFor="filterStatus">Status</label>
                <select 
                  id="filterStatus" 
                  className="text-input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="section-body" style={{ padding: '0' }}>
            <div className="table-scroll">
              <table className="results-table inst-table">
                <colgroup>
                  <col className="col-name"/>
                  <col className="col-status"/>
                  <col className="col-stud"/>
                  <col className="col-quest"/>
                  <col className="col-exams"/>
                  <col className="col-renew"/>
                  <col className="col-acts"/>
                </colgroup>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Status</th>
                    <th>Students</th>
                    <th>Questions</th>
                    <th>Exams</th>
                    <th>Renewal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="instTableBody">
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Loading institutions…</td></tr>
                  ) : filteredList.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>No institutions found.</td></tr>
                  ) : (
                    filteredList.map((inst) => {
                      const studentCount = inst.total_students ?? inst.students_count ?? inst.student_count ?? (Array.isArray(inst.students) ? inst.students.length : 0);
                      const questionCount = inst.total_questions ?? inst.questions_count ?? inst.question_count ?? 0;
                      const examCount = inst.total_exams ?? inst.exams_count ?? inst.exam_count ?? 0;
                      const status = (inst.status || inst.institution_status || 'active').toLowerCase();

                      return (
                        <tr key={inst.institution_id || inst.id || inst.code}>
                          <td>
                            <strong>{inst.institution_name || inst.name || 'Unnamed Institution'}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              Code: <code style={{ color: 'var(--color-primary)' }}>{inst.join_code || inst.code || inst.institution_code || inst.institution_id || 'N/A'}</code>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${status === 'active' ? 'badge-active' : 'badge-inactive'}`} style={{ textTransform: 'capitalize' }}>
                              {status}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text)' }}>
                            {studentCount}
                          </td>
                          <td>{questionCount}</td>
                          <td>{examCount}</td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                            {inst.renewal_date || inst.next_renewal_date || inst.registered_at || inst.created_at || '—'}
                          </td>
                          <td>
                            <button 
                              className="btn-outline small"
                              onClick={() => handleToggleStatus(inst.institution_id || inst.id, status)}
                              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                            >
                              {status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <span id="tableFooter" style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Showing {filteredList.length} institution{filteredList.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminInstitutions;
