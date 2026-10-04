import React, { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';

const AdminAnalytics = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState('all');
  const [subject, setSubject] = useState('all');
  const [paperSet, setPaperSet] = useState('all');
  const [status, setStatus] = useState('all');
  const [updatedAt, setUpdatedAt] = useState('');
  const [exportMessage, setExportMessage] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('/api/admin/analytics', { credentials: 'include', signal: controller.signal });
      if (!res.ok) throw new Error(`Unable to load analytics (HTTP ${res.status}) from /api/admin/analytics.`);
      const data = await res.json();
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      setUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
      setError('Unable to load analytics data. Please try again.');
      setSubmissions([]);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const filteredSubmissions = useMemo(() => submissions.filter(item => {
    const matchesStudent = student === 'all' || (item.kcet_student_id || item.student_name) === student;
    const matchesSubject = subject === 'all' || item.subject === subject;
    const matchesSet = paperSet === 'all' || item.set_label === paperSet;
    const matchesStatus = status === 'all' || item.status === status;
    return matchesStudent && matchesSubject && matchesSet && matchesStatus;
  }), [submissions, student, subject, paperSet, status]);
  const metrics = useMemo(() => {
    const scores = filteredSubmissions.map(item => Number(item.score_pct || 0));
    const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    const passed = filteredSubmissions.filter(item => item.pass_flag === true || Number(item.score_pct || 0) >= 35).length;
    const avgTime = filteredSubmissions.length ? filteredSubmissions.reduce((sum, item) => sum + Number(item.time_taken_sec || 0), 0) / filteredSubmissions.length : 0;
    return { students: new Set(filteredSubmissions.map(item => item.kcet_student_id || item.student_name)).size, count: filteredSubmissions.length, avgScore, passRate: filteredSubmissions.length ? (passed / filteredSubmissions.length) * 100 : 0, avgTime };
  }, [filteredSubmissions]);
  const leaderboard = useMemo(() => Object.values(filteredSubmissions.reduce((result, item) => { const key = item.kcet_student_id || item.student_name; const current = result[key] || { name: item.student_name || 'Student', id: item.kcet_student_id || '—', scores: [], attempts: 0 }; current.scores.push(Number(item.score_pct || 0)); current.attempts += 1; result[key] = current; return result; }, {})).map(item => ({ ...item, average: item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length })).sort((a, b) => b.average - a.average));
  const chartData = useMemo(() => {
    const scoreBuckets = [
      { label: '0-19%', min: 0, max: 19 },
      { label: '20-39%', min: 20, max: 39 },
      { label: '40-59%', min: 40, max: 59 },
      { label: '60-79%', min: 60, max: 79 },
      { label: '80-100%', min: 80, max: 100 }
    ].map(bucket => ({ ...bucket, value: filteredSubmissions.filter(item => { const score = Number(item.score_pct || 0); return score >= bucket.min && score <= bucket.max; }).length }));
    const subjectScores = filteredSubmissions.reduce((result, item) => { const key = item.subject || 'Unknown'; const score = Number(item.score_pct || 0); result[key] = result[key] || []; result[key].push(score); return result; }, {});
    const subjectAverages = Object.entries(subjectScores).map(([label, scores]) => ({ label, value: scores.reduce((sum, score) => sum + score, 0) / scores.length }));
    const passed = filteredSubmissions.filter(item => item.pass_flag === true || Number(item.score_pct || 0) >= 35).length;
    return { scoreBuckets, subjectAverages, passFail: [{ label: 'Pass', value: passed }, { label: 'Fail', value: filteredSubmissions.length - passed }] };
  }, [filteredSubmissions]);
  const studentOptions = [...new Map(submissions.map(item => [item.kcet_student_id || item.student_name, item.student_name || item.kcet_student_id])).entries()];
  const setOptions = [...new Set(submissions.map(item => item.set_label).filter(Boolean))];
  const escapeCsvValue = (value) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const exportCsv = () => {
    if (!filteredSubmissions.length) {
      setExportMessage('No results available to export.');
      return;
    }

    const headers = ['Student', 'KCET ID', 'Subject', 'Paper Set', 'Score', 'Time', 'Status'];
    const rows = filteredSubmissions.map(item => [
      item.student_name || 'Student',
      item.kcet_student_id || '—',
      item.subject || '—',
      item.set_label || '—',
      `${Number(item.score_pct || 0).toFixed(1)}%`,
      `${Math.round(Number(item.time_taken_sec || 0) / 60)}m`,
      item.status || '—'
    ]);
    const csv = [headers, ...rows].map(row => row.map(escapeCsvValue).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vyasaprep-analytics-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage(`Exported ${rows.length} result${rows.length === 1 ? '' : 's'}.`);
  };
  const ChartBars = ({ items, formatValue = value => value, color = '#2563eb' }) => (
    loading ? <div className="analytics-chart-empty">Loading analytics...</div> : error ? <div className="analytics-chart-empty">Unable to load analytics data. Please try again.</div> : items.length ? <div className="analytics-bars">{items.map(item => <div className="analytics-bar-row" key={item.label}><span className="analytics-bar-label">{item.label}</span><div className="analytics-bar-track"><span className="analytics-bar-fill" style={{ width: `${items.some(entry => entry.value > 0) ? Math.max((item.value / Math.max(...items.map(entry => entry.value), 1)) * 100, item.value ? 4 : 0) : 0}%`, background: color }} /></div><strong className="analytics-bar-value">{formatValue(item.value)}</strong></div>)}</div> : <div className="analytics-chart-empty">No data available for this chart.</div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-analytics-wrap { width:100%;max-width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
        .admin-analytics-wrap .dash-title { color:#0f172a !important; }
        .admin-analytics-wrap .dash-sub,.admin-analytics-wrap .last-updated { color:#475569 !important; }
        .admin-analytics-wrap .table-scroll { max-width:100%;overflow-x:auto; }
        .admin-analytics-wrap .results-table { min-width:820px; }
        .analytics-bars { display:flex;flex-direction:column;gap:14px;padding:8px 0; }
        .analytics-bar-row { display:grid;grid-template-columns:minmax(76px,110px) minmax(0,1fr) 48px;align-items:center;gap:10px;min-width:0; }
        .analytics-bar-label,.analytics-bar-value { color:#334155;font-size:0.78rem; }
        .analytics-bar-value { text-align:right; }
        .analytics-bar-track { height:14px;background:#e2e8f0;border-radius:999px;overflow:hidden;min-width:0; }
        .analytics-bar-fill { display:block;height:100%;border-radius:inherit;min-width:0;transition:width 0.25s ease; }
        .analytics-chart-empty { display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;color:#64748b;font-size:0.88rem; }
        .admin-analytics-wrap .chart-wrap { min-height:190px;overflow:hidden; }
        @media (max-width:900px) { .navbar { min-width:0;overflow:hidden;padding:0 12px;gap:8px; } .navbar .nav-brand { flex:0 0 auto; } .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;scrollbar-width:none; } .navbar .nav-links::-webkit-scrollbar { display:none; } .navbar .nav-actions { flex:0 0 auto; } .admin-analytics-wrap { padding-left:16px !important;padding-right:16px !important; } }
        @media (max-width:560px) { .navbar .brand-name,.navbar .brand-ai { font-size:0.95rem; } .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; } .admin-analytics-wrap .dash-hero { align-items:flex-start;flex-wrap:wrap; } .admin-analytics-wrap .dash-hero-right { width:100%;justify-content:flex-start;flex-wrap:wrap; } .admin-analytics-wrap .filter-row { display:grid;grid-template-columns:1fr 1fr; } .admin-analytics-wrap .filter-group { min-width:0; } .admin-analytics-wrap select { min-width:0;width:100%; } }
      ` }} />
      
  <div className="bg-mesh"></div>

  
  

  <main className="dash-main admin-analytics-wrap">
    
    <AdminPageHeader
      title="Admin Analytics"
      description="Aggregate performance analytics across all students and subjects"
      actions={<>
        <div className="last-updated" id="lastUpdated">{error || (loading ? 'Loading analytics…' : `Last updated: ${updatedAt}`)}</div>
        <button className="btn-outline" onClick={fetchAnalytics} disabled={loading}>
          {loading ? <span className="btn-spinner" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>}
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <button className="btn-primary small" id="exportBtn" onClick={exportCsv}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
        {exportMessage && <div role="status" aria-live="polite" style={{ width: '100%', color: '#475569', fontSize: '0.8rem' }}>{exportMessage}</div>}
      </>}
    />

    
    {error && <div className="empty-state" style={{ display: 'block', color: '#991b1b' }}><h3>Analytics unavailable</h3><p>Unable to load analytics data. Please try again.</p></div>}
    {!loading && !error && filteredSubmissions.length === 0 && <div className="empty-state" style={{ display: 'block' }}><h3>No submissions found</h3><p>No submissions match the current filter criteria.</p></div>}
    <div className="empty-state" id="emptyState" style={{"display":"none"}}>
      <div className="empty-icon">Analytics</div>
      <h3>No Submissions Found</h3>
      <p>No submissions match the current filter criteria. Try adjusting the filters above.</p>
    </div>

    <div id="dashContent">
      
      <div className="dash-filters section-card">
        <div className="filter-row">
          <div className="filter-group">
            <label className="input-label">Student</label>
            <select id="filterStudent" className="select-input" value={student} onChange={(e) => setStudent(e.target.value)}>
              <option value="all">All Students</option>
              {studentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="input-label">Subject</label>
            <select id="filterSubject" className="select-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="all">All Subjects</option>
              <option value="Biology">Biology</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="input-label">Paper Set</label>
            <select id="filterSet" className="select-input" value={paperSet} onChange={(e) => setPaperSet(e.target.value)}>
              <option value="all">All Sets</option>
              {setOptions.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="input-label">Status</label>
            <select id="filterStatus" className="select-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>
        </div>
      </div>

      
      <div className="kpi-row" id="kpiRow">
        <div className="kpi-tile">
          <div className="kpi-tile-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
          <div className="kpi-tile-body">
            <div className="kpi-tile-val" id="kpiStudents">{loading ? '—' : metrics.students}</div>
            <div className="kpi-tile-label">Total Students</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div className="kpi-tile-body">
            <div className="kpi-tile-val" id="kpiSubmissions">{loading ? '—' : metrics.count}</div>
            <div className="kpi-tile-label">Submissions</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></div>
          <div className="kpi-tile-body">
            <div className="kpi-tile-val" id="kpiAvgScore">{loading ? '—' : `${metrics.avgScore.toFixed(1)}%`}</div>
            <div className="kpi-tile-label">Avg Score</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
          <div className="kpi-tile-body">
            <div className="kpi-tile-val" id="kpiPassRate">{loading ? '—' : `${metrics.passRate.toFixed(1)}%`}</div>
            <div className="kpi-tile-label">Pass Rate</div>
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-tile-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div className="kpi-tile-body">
            <div className="kpi-tile-val" id="kpiAvgTime">{loading ? '—' : `${Math.round(metrics.avgTime / 60)}m`}</div>
            <div className="kpi-tile-label">Avg Time</div>
          </div>
        </div>
      </div>

      
      <div className="charts-row">
        <div className="chart-card section-card wide">
          <div className="chart-card-header">
            <h3>Score Distribution</h3>
          </div>
          <div className="chart-wrap"><ChartBars items={chartData.scoreBuckets} formatValue={value => `${value}`} color="#2563eb" /></div>
        </div>
      </div>

      
      <div className="charts-row" style={{"marginTop":"20px"}}>
        <div className="chart-card section-card">
          <div className="chart-card-header"><h3>Subject-wise Avg Score</h3></div>
          <div className="chart-wrap"><ChartBars items={chartData.subjectAverages} formatValue={value => `${value.toFixed(1)}%`} color="#0891b2" /></div>
        </div>
        <div className="chart-card section-card">
          <div className="chart-card-header"><h3>Pass vs Fail</h3></div>
          <div className="chart-wrap"><ChartBars items={chartData.passFail} formatValue={value => `${value}`} color="#059669" /></div>
        </div>
      </div>

      
      <div className="section-card results-card" style={{"marginTop":"20px"}}>
        <div className="results-header">
          <h3>Student Leaderboard</h3>
        </div>
        
        <div className="table-scroll">
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>KCET ID</th>
                <th>Composite Score</th>
                <th>Avg Score</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody id="leaderboardBody">
              {loading ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b' }}>Loading analytics...</td></tr> : error ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '28px 16px', color: '#991b1b' }}>Unable to load analytics data. Please try again.</td></tr> : leaderboard.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b' }}>No leaderboard data available.</td></tr> : leaderboard.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{item.name}</td><td>{item.id}</td><td>{item.average.toFixed(1)}%</td><td>{item.average.toFixed(1)}%</td><td>{item.attempts}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      
      <div className="section-card results-card" style={{"marginTop":"20px"}}>
        <div className="results-header">
          <h3>Student Results</h3>
          <div className="results-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="searchInput" className="search-input" placeholder="Search student..." />
          </div>
        </div>
        <div className="table-scroll">
          <table className="results-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>KCET ID</th>
                <th>Subject</th>
                <th>Set</th>
                <th>Score</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="resultsBody">{filteredSubmissions.map(item => <tr key={item.id}><td>{item.student_name || 'Student'}</td><td>{item.kcet_student_id || '—'}</td><td>{item.subject || '—'}</td><td>{item.set_label || '—'}</td><td>{Number(item.score_pct || 0).toFixed(1)}%</td><td>{Math.round(Number(item.time_taken_sec || 0) / 60)}m</td><td>{item.status || '—'}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="table-footer" id="tableFooter"></div>
      </div>
    </div>
  </main>

  
  <div className="drawer-overlay" id="drawerOverlay"  style={{"display":"none"}}></div>
  <div className="detail-drawer" id="detailDrawer">
    <div className="drawer-header">
      <div>
        <h3 id="drawerName">Student Name</h3>
        <p className="drawer-meta" id="drawerMeta"></p>
      </div>
      <button className="drawer-close" >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div className="drawer-body" id="drawerBody"></div>
  </div>

  
  
  

    </>
  );
};

export default AdminAnalytics;
