import React, { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';

const AdminSyllabus = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterPuc, setFilterPuc] = useState('');

  const fetchSyllabus = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('/api/admin/syllabus', { credentials: 'include', signal: controller.signal });
      if (!res.ok) throw new Error(`Unable to load syllabus (HTTP ${res.status}) from /api/admin/syllabus.`);
      const data = await res.json();
      if (!Array.isArray(data.subjects)) throw new Error('Unable to parse syllabus data from /api/admin/syllabus.');
      setSubjects(data.subjects);
    } catch (err) {
      console.error('Failed to load admin syllabus:', err);
      setError(err.name === 'AbortError' ? 'Unable to load syllabus chapters. Please try again.' : 'Unable to load syllabus chapters. Please try again.');
      setSubjects([]);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => { fetchSyllabus(); }, []);

  const chapters = useMemo(() => subjects.flatMap(subject => (subject.puc_years || []).flatMap(puc => (puc.chapters || []).map(chapter => ({ ...chapter, subject: subject.subject, puc_year: puc.puc_year })))), [subjects]);
  const filteredChapters = chapters.filter(chapter => {
    if (filterSubject && chapter.subject !== filterSubject) return false;
    if (filterPuc && chapter.puc_year !== filterPuc) return false;
    return true;
  });
  const subjectCounts = subjects.reduce((result, subject) => {
    result[subject.subject] = (subject.puc_years || []).reduce((total, puc) => total + (puc.chapters || []).length, 0);
    return result;
  }, {});
  return (
    <>
      {/* Auto-injected styles from HTML head */}
      <style dangerouslySetInnerHTML={{ __html: `
    .admin-syllabus-wrap { width:100%;max-width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
    .admin-syllabus-wrap h2,.admin-syllabus-wrap h3 { color:#0f172a !important; }
    .admin-syllabus-wrap .section-sub { color:#475569 !important; }
    .admin-syllabus-wrap .table-scroll { width:100%;max-width:100%;overflow-x:auto; }
    .badge-1puc { background:rgba(37,99,235,0.15);color:#60a5fa; }
    .badge-2puc { background:rgba(230,95,0,0.12);color:var(--color-primary); }
    .badge-inactive { background:rgba(107,114,128,0.15);color:var(--muted); }
    .syllabus-table td { white-space:normal;word-break:break-word;overflow-wrap:anywhere;vertical-align:top; }
    .syllabus-table th { white-space:nowrap; }
    .syllabus-table { table-layout:fixed; }
    .syllabus-table col.col-no    { width:5%; }
    .syllabus-table col.col-subj  { width:10%; }
    .syllabus-table col.col-puc   { width:9%; }
    .syllabus-table col.col-ch    { width:6%; }
    .syllabus-table col.col-name  { width:32%; }
    .syllabus-table col.col-desc  { width:28%; }
    .syllabus-table col.col-act   { width:10%; }
    .syllabus-table { min-width:900px; }
    @media (max-width:900px) {
      .navbar { min-width:0;overflow:hidden;padding:0 12px;gap:8px; }
      .navbar .nav-brand { flex:0 0 auto; }
      .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none; }
      .navbar .nav-links::-webkit-scrollbar { display:none; }
      .navbar .nav-actions { flex:0 0 auto; }
      .navbar .nav-actions .btn { padding:6px 9px;font-size:0.75rem; }
      .admin-syllabus-wrap { padding-left:16px !important;padding-right:16px !important; }
    }
    @media (max-width:560px) {
      .navbar .brand-name,.navbar .brand-ai { font-size:0.95rem; }
      .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; }
      .admin-syllabus-wrap { padding-top:18px !important;padding-bottom:48px !important; }
      .admin-syllabus-wrap .section-card-header { align-items:flex-start !important;flex-wrap:wrap; }
      .admin-syllabus-wrap .section-card-header > div:last-child { margin-left:0 !important;width:100%;display:flex;gap:8px; }
      .admin-syllabus-wrap .section-card-header > div:last-child button { flex:1;min-width:0; }
      .admin-syllabus-wrap .filter-row { display:grid !important;grid-template-columns:1fr 1fr;gap:10px !important; }
      .admin-syllabus-wrap .filter-row > div { min-width:0; }
      .admin-syllabus-wrap .filter-row select { width:100%;min-width:0; }
    }
  
` }} />
      
  <div className="bg-mesh"></div>

  
  

  <div className="main-wrap admin-syllabus-wrap">
    <AdminPageHeader
      title="Syllabus Management"
      description="Manage the official Karnataka PUC syllabus for all four subjects."
      actions={<button className="btn-outline" id="refreshBtn" onClick={fetchSyllabus} disabled={loading}>
        {loading ? <span className="btn-spinner" aria-hidden="true" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>}
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>}
    />

    
    <div className="section-card">
      <div className="section-card-header">
        <div className="section-icon" style={{"background":"linear-gradient(135deg,rgba(230,95,0,0.12),rgba(255,240,227,0.8))"}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        </div>
        <div>
          <h2>KCET Syllabus Management</h2>
          <p className="section-sub">Official Karnataka PUC syllabus — 1st &amp; 2nd PUC chapters for all 4 subjects · Source: KEA / DPUE Karnataka</p>
        </div>
          <div style={{"marginLeft":"auto"}}>
          <button className="btn-outline small" id="bulkTextbookBtn"  style={{"marginRight":"8px"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{"width":"14px","height":"14px"}}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Textbooks
          </button>
          <button className="btn-primary" id="addTopicBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{"width":"14px","height":"14px"}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Chapter
          </button>
        </div>
      </div>
      <div className="section-body" style={{"paddingBottom":"0"}}>
        
        {error && <div role="alert" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', color: '#991b1b', fontSize: '0.85rem' }}>{error}</div>}
        <div id="countTiles" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit,minmax(140px,1fr))","gap":"10px","marginBottom":"16px"}}>
          {loading ? <div style={{"textAlign":"center","color":"var(--muted)","padding":"16px"}}>Loading syllabus chapters...</div> : error ? null : <>
            <div style={{ textAlign: 'center', padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }}><strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{chapters.length}</strong><div style={{ color: '#475569', fontSize: '0.75rem' }}>Total Chapters</div></div>
            {Object.entries(subjectCounts).map(([name, count]) => <div key={name} style={{ textAlign: 'center', padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }}><strong style={{ fontSize: '1.5rem', color: '#0f172a' }}>{count}</strong><div style={{ color: '#475569', fontSize: '0.75rem' }}>{name}</div></div>)}
          </>}
        </div>
        
        <div className="filter-row" style={{"display":"flex","gap":"12px","flexWrap":"wrap","marginBottom":"16px"}}>
          <div className="input-group" style={{"margin":"0"}}>
            <label className="input-label" htmlFor="filterSubject">Subject</label>
            <select id="filterSubject" className="text-input" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} disabled={loading}>
              <option value="">All Subjects</option>
              <option>Biology</option><option>Chemistry</option>
              <option>Mathematics</option><option>Physics</option>
            </select>
          </div>
          <div className="input-group" style={{"margin":"0"}}>
            <label className="input-label" htmlFor="filterPUC">PUC Year</label>
            <select id="filterPUC" className="text-input" value={filterPuc} onChange={(e) => setFilterPuc(e.target.value)} disabled={loading}>
              <option value="">Both PUC</option>
              <option>1st PUC</option><option>2nd PUC</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section-body" style={{"padding":"0"}}>
        <div className="table-scroll">
          <table className="results-table syllabus-table">
            <colgroup>
              <col className="col-no"/><col className="col-subj"/><col className="col-puc"/>
              <col className="col-ch"/><col className="col-name"/><col className="col-desc"/>
              <col className="col-act"/>
            </colgroup>
            <thead>
              <tr>
                <th>#</th><th>Subject</th><th>PUC Year</th>
                <th>Ch.</th><th>Chapter Name</th><th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="topicTableBody">
              {loading ? <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Loading syllabus chapters...</td></tr> : error ? <tr><td colSpan="7" style={{ textAlign: 'center', color: '#991b1b', padding: '40px' }}>Unable to load syllabus chapters. Please try again.</td></tr> : filteredChapters.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>No syllabus chapters found.</td></tr> : filteredChapters.map((chapter, index) => <tr key={chapter.id || `${chapter.subject}-${chapter.puc_year}-${chapter.chapter_number}-${index}`}><td>{index + 1}</td><td>{chapter.subject}</td><td>{chapter.puc_year}</td><td>{chapter.chapter_number || '—'}</td><td>{chapter.chapter_name || '—'}</td><td>{chapter.description || '—'}</td><td><span className={`topic-badge ${chapter.is_active === false ? 'badge-inactive' : 'badge-1puc'}`}>{chapter.is_active === false ? 'Inactive' : 'Active'}</span></td></tr>)}
            </tbody>
          </table>
        </div>
        <div style={{"padding":"12px 20px","borderTop":"1px solid var(--border)"}}>
          <span id="tableFooter" style={{"fontSize":"0.82rem","color":"var(--muted)"}}>{loading ? 'Loading syllabus chapters...' : error ? 'Syllabus data unavailable.' : `Showing ${filteredChapters.length} of ${chapters.length} chapters`}</span>
        </div>
      </div>
    </div>
  </div>

  
  <div id="topicModal" style={{"display":"none","position":"fixed","inset":"0","background":"rgba(0,0,0,0.7)","zIndex":"1000","alignItems":"center","justifyContent":"center"}}>
    <div style={{"background":"var(--card-bg)","border":"1px solid var(--border)","borderRadius":"var(--r)","padding":"28px","maxWidth":"520px","width":"90%","maxHeight":"90vh","overflowY":"auto"}}>
      <h3 id="modalTitle" style={{"margin":"0 0 20px","fontSize":"1.1rem"}}>Add Chapter</h3>
      <div style={{"display":"flex","flexDirection":"column","gap":"14px"}}>
        <div className="input-group" style={{"margin":"0"}}>
          <label className="input-label" htmlFor="mSubject">Subject *</label>
          <select id="mSubject" className="text-input">
            <option value="">Select…</option>
            <option>Biology</option><option>Chemistry</option>
            <option>Mathematics</option><option>Physics</option>
          </select>
        </div>
        <div className="input-group" style={{"margin":"0"}}>
          <label className="input-label" htmlFor="mPUC">PUC Year *</label>
          <select id="mPUC" className="text-input">
            <option value="">Select…</option>
            <option>1st PUC</option><option>2nd PUC</option>
          </select>
        </div>
        <div style={{"display":"flex","gap":"12px"}}>
          <div className="input-group" style={{"margin":"0","flex":"1"}}>
            <label className="input-label" htmlFor="mChNum">Chapter Number *</label>
            <input type="number" id="mChNum" className="text-input" min="1" placeholder="1"/>
          </div>
          <div className="input-group" style={{"margin":"0","flex":"1"}}>
            <label className="input-label" htmlFor="mOrder">Display Order</label>
            <input type="number" id="mOrder" className="text-input" min="0" placeholder="0"/>
          </div>
        </div>
        <div className="input-group" style={{"margin":"0"}}>
          <label className="input-label" htmlFor="mName">Chapter Name *</label>
          <input type="text" id="mName" className="text-input" placeholder="e.g. Laws of Motion"/>
        </div>
        <div className="input-group" style={{"margin":"0"}}>
          <label className="input-label" htmlFor="mDesc">Description (optional)</label>
          <textarea id="mDesc" className="text-input" rows="3" placeholder="Brief description of topics covered…" style={{"resize":"vertical"}}></textarea>
        </div>
        <div className="input-group" style={{"margin":"0"}}>
          <label className="input-label" htmlFor="mTextbook">Associated Textbook (PDF, DOCX, TXT)</label>
          <input type="file" id="mTextbook" className="text-input" accept=".pdf,.docx,.doc,.txt"/>
          <div id="mCurrentTextbookContainer" style={{"display":"none","marginTop":"6px","fontSize":"0.82rem","alignItems":"center","gap":"8px","color":"var(--muted)"}}>
            <span>Current: <a id="mCurrentTextbookLink" href="#" target="_blank" style={{"color":"var(--color-primary)","textDecoration":"underline"}}></a></span>
            <button type="button" className="btn-outline small" id="mClearTextbookBtn" style={{"padding":"2px 6px","fontSize":"0.75rem","color":"var(--red-l)","borderColor":"var(--red-l)"}}>Clear</button>
          </div>
        </div>
        <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
          <input type="checkbox" id="mActive" defaultChecked style={{"width":"16px","height":"16px","cursor":"pointer"}}/>
          <label htmlFor="mActive" style={{"fontSize":"0.85rem","cursor":"pointer"}}>Active (visible to students and institutions)</label>
        </div>
      </div>
      <div id="modalError" style={{"display":"none","marginTop":"12px","padding":"10px 14px","background":"rgba(220,38,38,0.12)","color":"var(--red-l)","border":"1px solid rgba(220,38,38,0.3)","borderRadius":"var(--rs)","fontSize":"0.85rem"}}></div>
      <div style={{"display":"flex","gap":"10px","justifyContent":"flex-end","marginTop":"20px"}}>
        <button className="btn-outline small" id="modalCancelBtn">Cancel</button>
        <button className="btn-primary small" id="modalSaveBtn">Save</button>
      </div>
    </div>
  </div>

  
  <div id="deleteModal" style={{"display":"none","position":"fixed","inset":"0","background":"rgba(0,0,0,0.6)","zIndex":"1001","alignItems":"center","justifyContent":"center"}}>
    <div style={{"background":"var(--card-bg)","border":"1px solid var(--border)","borderRadius":"var(--r)","padding":"28px","maxWidth":"400px","width":"90%"}}>
      <h3 style={{"margin":"0 0 10px","fontSize":"1.05rem"}}>Delete Chapter?</h3>
      <p id="deleteModalMsg" style={{"color":"var(--muted)","fontSize":"0.88rem","margin":"0 0 20px"}}></p>
      <div style={{"display":"flex","gap":"10px","justifyContent":"flex-end"}}>
        <button className="btn-outline small" id="deleteCancelBtn">Cancel</button>
        <button className="btn-primary small" id="deleteConfirmBtn" style={{"background":"var(--red)","borderColor":"var(--red)"}}>Delete</button>
      </div>
    </div>
  </div>

  
  

    </>
  );
};

export default AdminSyllabus;
