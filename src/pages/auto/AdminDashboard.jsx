import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components';
import AdminPageHeader from '../../components/AdminPageHeader';
import { getAdminCache, setAdminCache } from '../../utils/adminCache';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const AdminDashboard = () => {
  const [data, setData] = useState(() => getAdminCache('admin_dashboard_data'));
  const [loading, setLoading] = useState(!getAdminCache('admin_dashboard_data'));
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => getAdminCache('admin_dashboard_data') ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');

  const fetchAdminDashboardData = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);
    try {
      const dashRes = await fetch('/api/admin/dashboard', { credentials: 'include', signal: controller.signal });
      if (!dashRes.ok) {
        throw new Error(`Dashboard request failed (${dashRes.status})`);
      }
      const dashData = await dashRes.json();
      if (dashData.overview) {
        const overview = dashData.overview;
        const formattedData = {
          ...dashData,
          kpis: {
            institutions: overview.total_institutions ?? 0,
            institutionsSub: `${overview.active_institutions ?? 0} active`,
            students: overview.total_students ?? 0,
            studentsSub: `${overview.direct_students ?? 0} direct · ${overview.institution_linked_students ?? 0} institution-linked`,
            questions: overview.total_questions ?? 0,
            questionsSub: `${overview.admin_questions ?? 0} admin · ${overview.institution_questions ?? 0} institution`,
            exams: overview.total_exams ?? 0,
            examsSub: `${overview.published_exams ?? 0} published`,
            attempts: overview.total_exam_attempts ?? 0,
            attemptsSub: `${overview.avg_score ?? 0}% average score`
          }
        };
        setData(formattedData);
        setAdminCache('admin_dashboard_data', formattedData);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        return;
      }

      let totalInst = dashData.total_institutions ?? dashData.institutions_count ?? 0;
      let totalStudents = dashData.total_students ?? dashData.students_count ?? 0;
      let totalQuestions = dashData.total_questions ?? dashData.questions_count ?? 0;
      let totalExams = dashData.total_exams ?? dashData.exams_count ?? 0;

        // Only fetch fallbacks if required counts are missing from dashboard response
        const needsInst = totalInst === 0;
        const needsStudents = totalStudents === 0;
        const needsCounts = totalQuestions === 0;

        if (needsInst || needsStudents || needsCounts) {
          const fallbackRequests = [];
          if (needsCounts) fallbackRequests.push(fetch('/api/admin/questions/counts', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null));
          else fallbackRequests.push(Promise.resolve(null));

          if (needsInst) fallbackRequests.push(fetch('/api/admin/institutions', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null));
          else fallbackRequests.push(Promise.resolve(null));

          if (needsStudents) fallbackRequests.push(fetch('/api/admin/students', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null));
          else fallbackRequests.push(Promise.resolve(null));

          const [countsData, instData, stuData] = await Promise.all(fallbackRequests);

          if (instData) {
            const instList = instData.institutions || (Array.isArray(instData) ? instData : []);
            if (instList.length > 0) totalInst = instList.length;
          }
          if (stuData) {
            const stuList = stuData.students || (Array.isArray(stuData) ? stuData : []);
            if (stuList.length > 0) totalStudents = stuList.length;
          }
          if (countsData && countsData.counts) {
            totalQuestions = Object.values(countsData.counts).reduce((a, b) => a + Number(b || 0), 0);
          }
        }

        const formattedData = {
          kpis: {
            institutions: totalInst || 0,
            institutionsSub: 'Registered institutions',
            students: totalStudents || 0,
            studentsSub: 'Enrolled students',
            questions: totalQuestions || 0,
            questionsSub: 'Question bank total',
            exams: totalExams || 0,
            examsSub: 'Published exams'
          }
        };

      setData(formattedData);
      setAdminCache('admin_dashboard_data', formattedData);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
      setError(err.name === 'AbortError' ? 'Dashboard request timed out. Check /api/admin/dashboard.' : (err.message || 'Unable to load the admin dashboard.'));
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDashboardData();
  }, []);

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
    }
  };

  const qChartSubjects = data?.question_bank?.admin_by_subject || {};
  const qChartData = {
    labels: Object.keys(qChartSubjects),
    datasets: [{
      label: 'Questions Uploaded',
      data: Object.values(qChartSubjects),
      borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.1)',
      fill: true, tension: 0.4
    }]
  };

  const examsBySubject = data?.exams?.by_subject || {};
  const examsChartData = {
    labels: Object.keys(examsBySubject),
    datasets: [{
      label: 'Exams Taken',
      data: Object.values(examsBySubject),
      backgroundColor: 'rgba(230, 95, 0, 0.8)',
      borderRadius: 4
    }]
  };

  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';
  const sectionMessage = (items, emptyMessage) => {
    if (loading && !data) {
      return <LoadingState message="Loading dashboard data..." size="sm" />;
    }
    if (error && !data) {
      return (
        <ErrorState
          title="Dashboard data unavailable"
          message={error}
          action={
            <button className="btn-primary small" onClick={fetchAdminDashboardData} type="button">
              Retry
            </button>
          }
        />
      );
    }
    if (!items?.length) return <div className="dashboard-state">{emptyMessage}</div>;
    return null;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
    .admin-dashboard-wrap { width:100%;max-width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
    .admin-dashboard-wrap > * { min-width:0; }
    .admin-dashboard-wrap h1 { color:#0f172a !important; }
    .admin-dashboard-wrap h3 { color:#0f172a !important; }
    .admin-dashboard-wrap .section-sub { color:#475569 !important; }
    .admin-dashboard-wrap > div:first-of-type > div > p { color:#475569 !important; }
    .admin-dashboard-wrap .section-card { min-width:0;overflow:hidden; }
    .admin-dashboard-wrap .results-table { min-width:560px; }
    .admin-dashboard-wrap .section-body:has(.results-table) { overflow-x:auto; }
    .admin-dashboard-wrap .chart-body { height:220px;min-height:220px;position:relative; }
    .admin-dashboard-wrap .chart-body > canvas { max-width:100%; }
    .dashboard-state { color:var(--muted);text-align:center;padding:24px 16px; }
    .dashboard-email { max-width:260px;overflow-wrap:anywhere;word-break:break-word; }
    @media (max-width:900px) {
      .navbar { min-width:0;overflow:hidden;padding:0 clamp(16px, 2vw, 32px);gap:8px; }
      .navbar .nav-brand { flex:0 0 auto; }
      .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none; }
      .navbar .nav-links::-webkit-scrollbar { display:none; }
      .navbar .nav-actions { flex:0 0 auto; }
      .navbar .nav-actions .btn { padding:6px 9px;font-size:0.75rem; }
      .admin-dashboard-wrap { padding-left:16px !important;padding-right:16px !important; }
      .quick-actions { align-items:stretch;padding:14px; }
      .quick-actions-label { width:100%;margin-bottom:2px; }
      .qa-btn { flex:1 1 calc(50% - 10px);justify-content:center;min-width:0;text-align:center; }
      .charts-2col { gap:14px; }
    }
    @media (max-width:560px) {
      .navbar .brand-name { font-size:0.95rem; }
      .navbar .brand-ai { font-size:0.95rem; }
      .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; }
      .admin-dashboard-wrap { padding-top:18px !important;padding-bottom:48px !important; }
      .admin-dashboard-wrap > div:first-of-type { align-items:flex-start !important;gap:12px; }
      .admin-dashboard-wrap > div:first-of-type h1 { font-size:1.35rem !important; }
      .admin-dashboard-wrap > div:first-of-type p { line-height:1.4; }
      .admin-dashboard-wrap > div:first-of-type button { flex-shrink:0; }
      .kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
      .kpi-card { padding:14px; }
      .kpi-card .kpi-val { font-size:1.65rem; }
      .kpi-card .kpi-sub { overflow-wrap:anywhere; }
      .quick-actions { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
      .quick-actions-label { grid-column:1 / -1; }
      .qa-btn { min-height:40px;padding:8px 6px;font-size:0.74rem; }
      .section-nav { align-items:flex-start;gap:10px; }
      .section-nav h3 { line-height:1.3; }
      .chart-body { height:190px !important;min-height:190px !important; }
    }
    /* ── Clickable KPI cards ── */
    .kpi-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin-bottom:24px; }

    .kpi-card {
      background:var(--card-bg);
      border:1px solid var(--border);
      border-radius:var(--r);
      padding:18px 20px;
      position:relative;
      overflow:hidden;
      cursor:pointer;
      text-decoration:none;
      display:block;
      transition:border-color 0.18s, transform 0.15s, box-shadow 0.18s;
    }
    .kpi-card:hover {
      border-color:rgba(255,255,255,0.18);
      transform:translateY(-2px);
      box-shadow:0 8px 24px rgba(0,0,0,0.25);
    }
    .kpi-card:hover .kpi-arrow { opacity:1; transform:translateX(0); }
    .kpi-card .kpi-val { font-size:2rem;font-weight:800;line-height:1;margin-bottom:4px;color:var(--text); }
    .kpi-card .kpi-lbl { font-size:0.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px; }
    .kpi-card .kpi-sub { font-size:0.72rem;color:var(--muted2);margin-top:4px; }
    .kpi-card .kpi-accent { position:absolute;bottom:0;left:0;height:3px;width:100%;opacity:0.6; }
    .kpi-arrow {
      position:absolute;right:14px;bottom:14px;
      font-size:0.75rem;color:var(--muted);
      opacity:0;transform:translateX(-4px);
      transition:opacity 0.15s, transform 0.15s;
    }

    /* ── Quick actions ── */
    .quick-actions {
      display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;
      padding:16px 20px;
      background:var(--card-bg);
      border:1px solid var(--border);
      border-radius:var(--r);
      align-items:center;
    }
    .quick-actions-label {
      font-size:0.72rem;text-transform:uppercase;letter-spacing:0.5px;
      color:var(--muted);font-weight:700;margin-right:4px;white-space:nowrap;
    }
    .qa-btn {
      display:inline-flex;align-items:center;gap:6px;
      padding:7px 14px;border-radius:var(--rs);
      font-size:0.82rem;font-weight:600;
      border:1px solid var(--border);
      color:var(--muted2);background:var(--s2);
      text-decoration:none;cursor:pointer;
      transition:border-color 0.15s, color 0.15s, background 0.15s, transform 0.12s;
    }
    .qa-btn:hover { border-color:rgba(255,255,255,0.2);color:var(--text);background:var(--s3);transform:translateY(-1px); }
    .qa-btn svg { width:13px;height:13px;flex-shrink:0; }

    /* ── Section headers with "View All" ── */
    .section-nav { display:flex;align-items:center;justify-content:space-between;width:100%; }
    .view-all-link {
      font-size:0.78rem;font-weight:600;color:var(--color-primary);
      text-decoration:none;display:flex;align-items:center;gap:4px;
      transition:opacity 0.15s;white-space:nowrap;
    }
    .view-all-link:hover { opacity:0.75; }

    /* ── Alert items with resolve link ── */
    .alert-item {
      display:flex;align-items:center;gap:10px;
      padding:10px 14px;border-radius:var(--rs);margin-bottom:6px;font-size:0.85rem;
      cursor:pointer;transition:opacity 0.15s;
    }
    .alert-item:hover { opacity:0.85; }
    .alert-warn  { background:rgba(217,119,6,0.12);border:1px solid rgba(217,119,6,0.3);color:var(--yellow-l); }
    .alert-error { background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);color:var(--red-l); }
    .alert-info  { background:rgba(37,99,235,0.1);border:1px solid rgba(37,99,235,0.25);color:#60a5fa; }
    .alert-resolve { margin-left:auto;font-size:0.72rem;font-weight:700;white-space:nowrap; }

    /* ── Clickable institution rows ── */
    .inst-row { cursor:pointer;transition:background 0.12s; }
    .inst-row:hover td { background:rgba(255,255,255,0.03); }

    /* ── Clickable institution question bars ── */
    .inst-q-row {
      display:flex;align-items:center;gap:10px;
      padding:6px 0;cursor:pointer;border-radius:var(--rs);
      transition:background 0.12s;
    }
    .inst-q-row:hover { background:rgba(255,255,255,0.03); }

    /* ── Activity panel ── */
    .activity-item {
      display:flex;align-items:flex-start;gap:12px;
      padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);
      cursor:pointer;transition:opacity 0.15s;text-decoration:none;
    }
    .activity-item:hover { opacity:0.75; }
    .activity-item:last-child { border-bottom:none; }
    .activity-dot {
      width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;
    }
    .activity-text { font-size:0.85rem;color:var(--text);line-height:1.4; }
    .activity-time { font-size:0.72rem;color:var(--muted);margin-top:2px; }

    /* ── Charts container ── */
    .charts-2col { display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px; }
    @media(max-width:900px) { .charts-2col { grid-template-columns:1fr; } }

    /* ── Sub-summary tiles ── */
    .sub-tile {
      border-radius:var(--rs);padding:14px;text-align:center;
      cursor:pointer;transition:transform 0.15s,opacity 0.15s;
      text-decoration:none;display:block;
    }
    .sub-tile:hover { transform:translateY(-2px);opacity:0.85; }
  ` }} />
      <div className="bg-mesh"></div>
      
      <div className="main-wrap admin-dashboard-wrap">

    
    <AdminPageHeader
      title="Platform Dashboard"
      description={error && !data ? 'Dashboard unavailable' : lastUpdated ? `Updated ${lastUpdated}` : loading ? 'Loading dashboard data…' : 'No dashboard data available'}
      actions={<button className="btn-outline" id="refreshBtn" onClick={fetchAdminDashboardData} disabled={loading} style={{"display":"flex","alignItems":"center","gap":"6px","minHeight":"38px","padding":"8px 18px","borderRadius":"10px"}}>
        {loading ? (
          <span className="btn-spinner" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{"width":"14px","height":"14px"}}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        )}
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>}
    />

    
    <div className="quick-actions">
      <span className="quick-actions-label">Priority Quick Actions</span>
      <Link to="/admin/student-manage?action=create" className="qa-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Add Student
      </Link>
      <Link to="/admin/institutions" className="qa-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Add Institution
      </Link>
      <Link to="/admin/upload" className="qa-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Upload Question Paper
      </Link>
      <Link to="/admin/exams" className="qa-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Create Exam
      </Link>
      <Link to="/admin/syllabus" className="qa-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        Add KCET Topic
      </Link>
      <Link to="/admin/analytics" className="qa-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        View Analytics
      </Link>
    </div>

    
    {error && !data ? (
      <div style={{ marginBottom: '20px' }}>
        <ErrorState
          title="Dashboard unavailable"
          message={error}
          action={
            <button className="btn-primary small" onClick={fetchAdminDashboardData} type="button">
              Retry
            </button>
          }
        />
      </div>
    ) : null}

    <div id="alertsSection" style={{"marginBottom":"20px","display":"none"}}>
      <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"8px"}}>
        <span style={{"fontSize":"0.72rem","textTransform":"uppercase","letterSpacing":"0.5px","color":"var(--muted)","fontWeight":"700"}}>Warning  Alerts</span>
      </div>
      <div id="alertsList"></div>
    </div>

    
    <div style={{"fontSize":"0.72rem","textTransform":"uppercase","letterSpacing":"0.5px","color":"var(--muted)","marginBottom":"10px","fontWeight":"700"}}>Platform Overview</div>
    <div className="kpi-grid">
      <Link to="/admin/institutions" className="kpi-card">
        <div className="kpi-accent" style={{"background":"linear-gradient(90deg,#2563eb,#0891b2)"}}></div>
        <div className="kpi-val" id="kpiInstitutions">{data ? data.kpis.institutions : "—"}</div>
        <div className="kpi-lbl">Institutions</div>
        <div className="kpi-sub" id="kpiInstitutionsSub">{data ? data.kpis.institutionsSub : "—"}</div>
      </Link>
      <Link to="/admin/students" className="kpi-card">
        <div className="kpi-accent" style={{"background":"linear-gradient(90deg,#E65F00,#B34A00)"}}></div>
        <div className="kpi-val" id="kpiStudents">{data ? data.kpis.students : "—"}</div>
        <div className="kpi-lbl">Total Students</div>
        <div className="kpi-sub" id="kpiStudentsSub">{data ? data.kpis.studentsSub : "—"}</div>
      </Link>
      <Link to="/admin/questions" className="kpi-card">
        <div className="kpi-accent" style={{"background":"linear-gradient(90deg,#059669,#0d9488)"}}></div>
        <div className="kpi-val" id="kpiQuestions">{data ? data.kpis.questions : "—"}</div>
        <div className="kpi-lbl">Total Questions</div>
        <div className="kpi-sub" id="kpiQuestionsSub">{data ? data.kpis.questionsSub : "—"}</div>
      </Link>
      <Link to="/admin/exams" className="kpi-card">
        <div className="kpi-accent" style={{"background":"linear-gradient(90deg,#d97706,#b45309)"}}></div>
        <div className="kpi-val" id="kpiExams">{data ? data.kpis.exams : "—"}</div>
        <div className="kpi-lbl">Exams Created</div>
        <div className="kpi-sub" id="kpiExamsSub">{data ? data.kpis.examsSub : "—"}</div>
      </Link>
      <Link to="/admin/analytics" className="kpi-card">
        <div className="kpi-accent" style={{"background":"linear-gradient(90deg,#0891b2,#0d9488)"}}></div>
        <div className="kpi-val" id="kpiAttempts">{data ? data.kpis.attempts ?? 0 : '—'}</div>
        <div className="kpi-lbl">Exam Attempts</div>
        <div className="kpi-sub" id="kpiAttemptsSub">{data ? data.kpis.attemptsSub ?? 'Recorded attempts' : '—'}</div>
      </Link>
    </div>

    
    <div className="charts-2col">
      
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-nav">
            <div>
              <h3 style={{"margin":"0","fontSize":"1rem"}}>Admin Question Bank</h3>
              <p className="section-sub" style={{"margin":"0"}}>Click a subject bar to filter questions</p>
            </div>
            <Link to="/admin/questions" className="view-all-link">Manage</Link>
          </div>
        </div>
        <div className="section-body chart-body">{data && qChartData.labels.length ? <Line data={qChartData} options={chartOptions} /> : <div className="dashboard-state">{sectionMessage([], 'No admin question-bank data')}</div>}</div>
      </div>

      
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-nav">
            <div>
              <h3 style={{"margin":"0","fontSize":"1rem"}}>Exams by Subject</h3>
              <p className="section-sub" style={{"margin":"0"}}>Click a segment to filter exams</p>
            </div>
            <Link to="/admin/exams" className="view-all-link">View All</Link>
          </div>
        </div>
        <div className="section-body chart-body">{data && examsChartData.labels.length ? <Bar data={examsChartData} options={chartOptions} /> : <div className="dashboard-state">{sectionMessage([], 'No exam subject data')}</div>}</div>
      </div>
    </div>

    
    <div className="charts-2col">

      
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-nav">
            <div>
              <h3 style={{"margin":"0","fontSize":"1rem"}}>Institution Question Banks</h3>
              <p className="section-sub" style={{"margin":"0"}}>Click institution to manage</p>
            </div>
            <Link to="/admin/institutions" className="view-all-link">Manage</Link>
          </div>
        </div>
        <div className="section-body">
          <div id="instQList" style={{"display":"flex","flexDirection":"column"}}>
            {(() => {
              const items = data?.question_bank?.institution_by_institution || [];
              const message = sectionMessage(items, 'No institution question banks');
              return message ? <div className="dashboard-state">{message}</div> : items.map((item) => <Link key={item.name} to="/admin/institutions" className="inst-q-row"><span style={{ flex: 1, color: 'var(--text)' }}>{item.name}</span><strong style={{ color: 'var(--text)' }}>{item.count}</strong></Link>);
            })()}
          </div>
        </div>
      </div>

      
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-nav">
            <div>
              <h3 style={{"margin":"0","fontSize":"1rem"}}>Recent Activity</h3>
              <p className="section-sub" style={{"margin":"0"}}>Latest platform events</p>
            </div>
            <Link to="/admin/analytics" className="view-all-link">Full Log</Link>
          </div>
        </div>
        <div className="section-body" style={{"paddingTop":"4px"}}>
          <div id="activityList">
            {(() => {
              const items = data?.recent_activity || [];
              const message = sectionMessage(items, 'No recent activity');
              return message ? <div className="dashboard-state">{message}</div> : items.map((item) => <div key={item.id} className="activity-item"><span className="activity-dot" style={{ background: 'var(--color-primary)' }} /><div><div className="activity-text">{item.title}</div><div className="activity-time">{item.subtitle} · {formatDate(item.timestamp)}</div></div></div>);
            })()}
          </div>
        </div>
      </div>

    </div>

    
    <div className="charts-2col" style={{"marginTop":"0"}}>

      <div className="section-card">
        <div className="section-card-header">
          <div className="section-nav">
            <div><h3 style={{"margin":"0","fontSize":"1rem"}}>Recent Institutions</h3></div>
            <Link to="/admin/institutions" className="view-all-link">View All</Link>
          </div>
        </div>
        <div className="section-body" style={{"padding":"0"}}>
          <table className="results-table" id="recentInstTable">
            <thead><tr><th>Institution</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody id="recentInstBody">
              {(() => {
                const items = data?.recent_institutions || [];
                const message = sectionMessage(items, 'No recent institutions');
                return message ? <tr><td colSpan="3" className="dashboard-state">{message}</td></tr> : items.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.status || '—'}</td><td>{formatDate(item.registered_at)}</td></tr>);
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    
    <div className="section-card" style={{"marginTop":"20px"}}>
      <div className="section-card-header">
        <div className="section-nav">
          <div>
            <h3 style={{"margin":"0","fontSize":"1rem"}}>Direct Students</h3>
            <p className="section-sub" style={{"margin":"0"}}>Personal/independent students · subscription/payment features currently inactive / future feature</p>
          </div>
        </div>
      </div>
      <div className="section-body" style={{"padding":"0"}}>
        <table className="results-table" id="directSubTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>KCET ID</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody id="directSubBody">
            {(() => {
              const items = data?.direct_students || [];
              const message = sectionMessage(items, 'No direct students');
              return message ? <tr><td colSpan="5" className="dashboard-state">{message}</td></tr> : items.map((item) => <tr key={item.id}><td>{item.name || '—'}</td><td>{item.kcet_student_id || '—'}</td><td className="dashboard-email">{item.email || '—'}</td><td>Free access</td><td>{formatDate(item.created_at)}</td></tr>);
            })()}
          </tbody>
        </table>
        <div className="table-footer" id="directSubFooter" style={{"textAlign":"center","padding":"8px","fontSize":"0.8rem","color":"var(--muted)"}}>{data?.direct_students?.length ? `${data.direct_students.length} direct students` : '—'}</div>
      </div>
    </div>

  </div>
    </>
  );
};

export default AdminDashboard;
