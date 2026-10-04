import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import { TrashIcon } from '../../components/icons';
import { clearAdminCache } from '../../utils/adminCache';

const AdminUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, done
  const [uploadMessage, setUploadMessage] = useState('');
  const [generateStatus, setGenerateStatus] = useState('idle'); // idle, generating, done
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [generatedSets, setGeneratedSets] = useState([]);
  const [storedCount, setStoredCount] = useState(0);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [saveStatus, setSaveStatus] = useState('idle');
  const fileInputRef = useRef(null);

  const [subject, setSubject] = useState("");
  const [docType, setDocType] = useState("question_paper");
  const [browseError, setBrowseError] = useState("");
  
  const handleDropZoneClick = (e) => {
    if (e.target.closest('#adminBrowseBtn') || e.target.closest('label') || e.target.tagName === 'INPUT') {
      return;
    }
    setBrowseError("");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (saveMode = false) => {
    if (!files.length) return;
    if (!subject) {
      setErrorMessage('Please select a subject first.');
      return;
    }

    setUploadStatus('uploading');
    setSaveStatus('idle');
    setErrorMessage('');
    setUploadMessage(saveMode ? 'Saving validated extracted questions into the platform bank...' : 'Uploading and extracting content for preview...');

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('file_type', docType);
      formData.append('preview_only', String(!saveMode));
      files.forEach((f) => {
        formData.append('files', f);
      });

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || data.error || 'Failed to upload files');
        setUploadStatus('idle');
        return;
      }

      const extracted = Array.isArray(data.preview_questions) ? data.preview_questions : [];
      if (saveMode) {
        const savedCount = Number(data.questions_extracted || extracted.length || 0);
        clearAdminCache();
        setUploadStatus('done');
        setSaveStatus('done');
        setStoredCount(savedCount);
        setUploadMessage(`Saved ${savedCount} validated questions to the platform question bank for ${subject}.`);
        setPreviewQuestions([]);
        return;
      }

      setPreviewQuestions(extracted);
      setUploadStatus('done');
      setUploadMessage(`Extracted ${data.questions_extracted || extracted.length || 0} validated question(s) for ${subject}. Review and save to the platform bank.`);
      if (!extracted.length) {
        setErrorMessage('No valid MCQs were extracted from the uploaded file(s). Please check the file content and try again.');
      }
    } catch (err) {
      console.error(err);
      setUploadStatus('idle');
      setErrorMessage('Network error occurred while uploading. Please verify the /api/admin/upload endpoint and try again.');
    }
  };

  const handleSavePreview = async () => {
    if (!previewQuestions.length) {
      setErrorMessage('There are no extracted questions to save yet.');
      return;
    }
    await handleUpload(true);
  };

  const handleGenerate = async () => {
    if (!subject) {
      setErrorMessage("Please select a subject first.");
      return;
    }

    setGenerateStatus('generating');
    setErrorMessage('');

    try {
      const payload = { subject };
      if (files && files.length > 0) {
        payload.filenames = files.map((f) => f.name);
      }
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.message || data.error || 'Failed to generate question sets');
        setGenerateStatus('idle');
        return;
      }

      if (data.sets && data.sets.length > 0) {
        setGeneratedSets(data.sets);
        setStoredCount(data.added ?? data.sets[0]?.length ?? 60);
      }
      setGenerateStatus('done');
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error occurred while generating sets. Please verify backend is running.');
      setGenerateStatus('idle');
    }
  };

  const activeQuestions = generatedSets.length > activeTab ? generatedSets[activeTab] : [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-upload-wrap { width:100%;max-width:100%;box-sizing:border-box;min-width:0;overflow:hidden; }
        .admin-upload-wrap h2,.admin-upload-wrap h3 { color:#0f172a !important; }
        .admin-upload-wrap .section-sub { color:#475569 !important; }
        .admin-upload-wrap .section-card { min-width:0; }
        .admin-upload-wrap .file-grid span { min-width:0;overflow-wrap:anywhere;word-break:break-word; }
        @media (max-width:900px) {
          .navbar { min-width:0;overflow:hidden;padding:0 12px;gap:8px; }
          .navbar .nav-brand { flex:0 0 auto; }
          .navbar .nav-links { flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none; }
          .navbar .nav-links::-webkit-scrollbar { display:none; }
          .navbar .nav-actions { flex:0 0 auto; }
          .navbar .nav-actions .btn { padding:6px 9px;font-size:0.75rem; }
          .admin-upload-wrap { padding-left:16px !important;padding-right:16px !important; }
        }
        @media (max-width:560px) {
          .navbar .brand-name,.navbar .brand-ai { font-size:0.95rem; }
          .navbar .nav-pill { padding:6px 9px;font-size:0.76rem; }
          .admin-upload-wrap { padding-top:18px !important;padding-bottom:48px !important; }
          .admin-upload-wrap .upload-footer { align-items:stretch; }
          .admin-upload-wrap .upload-footer > * { width:100%; }
          .admin-upload-wrap .upload-footer .btn-primary { justify-content:center; }
          .admin-upload-wrap .generate-info-row { display:grid;grid-template-columns:1fr 1fr; }
          .admin-upload-wrap .generate-info-row .gen-info-chip { text-align:center; }
          .admin-upload-wrap .paper-preview-card { padding:14px !important; }
          .admin-upload-wrap .paper-preview-card > div:first-child { align-items:flex-start !important;flex-wrap:wrap;gap:10px; }
          .admin-upload-wrap .paper-preview-card > div:first-child > div { width:100%; }
        }
      ` }} />
      <div className="bg-mesh"></div>
      <main className="main-wrap admin-upload-wrap">
        <AdminPageHeader
          title="Content Upload"
          description="Upload learning materials and question papers for the platform question bank."
        />
        
        <div className="section-card" id="uploadCard">
          <div className="section-card-header">
            <div className="section-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div>
              <h2><span className="step-num">01</span> Upload Materials &amp; Question Papers</h2>
              <p className="section-sub">Upload NCERT textbooks or previous year papers — RAG will extract and index question patterns</p>
            </div>
          </div>
          <div className="section-body">
            
            <div style={{"marginBottom":"16px"}}>
              <label htmlFor="subjectSelect" style={{"display":"block","marginBottom":"6px","fontSize":"0.85rem","color":"var(--muted2)"}}>Subject <span style={{"color":"var(--red)"}}>*</span></label>
              <select id="subjectSelect" className="text-input" required value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="" disabled>Select a subject…</option>
                <option value="Biology">Biology</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
              </select>
            </div>

            <div style={{"marginBottom":"16px"}}>
              <label htmlFor="fileTypeSelect" style={{"display":"block","marginBottom":"6px","fontSize":"0.85rem","color":"var(--muted2)"}}>Document Type <span style={{"color":"var(--red)"}}>*</span></label>
              <select id="fileTypeSelect" className="text-input" required value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="question_paper">Question Paper (PYQ)</option>
                <option value="textbook">Textbook (NCERT / State Board)</option>
              </select>
            </div>

            <div className="drop-zone" id="dropZone" onClick={handleDropZoneClick} style={{ cursor: 'pointer' }}>
              <div className="drop-zone-content">
                <div className="drop-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                </div>
                <p className="drop-title">Drop your {docType === 'textbook' ? 'textbooks' : 'papers'} here</p>
                <p className="drop-sub">PDF, DOC, DOCX, TXT format supported</p>
                <label
                  htmlFor="adminFileInput"
                  id="adminBrowseBtn"
                  className="btn-primary"
                  style={{
                    backgroundColor: 'var(--blue)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    userSelect: 'none'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Browse Files
                </label>
                <input
                  type="file"
                  id="adminFileInput"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.target.value = null;
                  }}
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '1px',
                    height: '1px',
                    pointerEvents: 'none',
                    overflow: 'hidden'
                  }}
                />
              </div>
            </div>
            
            {browseError && (
              <p style={{ color: 'var(--red)', marginTop: '8px', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>
                {browseError}
              </p>
            )}

            {errorMessage && (
              <p style={{ color: 'var(--red)', marginTop: '12px', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px' }}>
                {errorMessage}
              </p>
            )}

            {files.length > 0 && (
              <div className="file-grid" style={{ marginTop: '16px' }}>
                {files.map((file, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '8px', background: 'var(--card-bg)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      aria-label={`Remove ${file.name}`}
                      title={`Remove ${file.name}`}
                      style={{ color: 'var(--red)', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="upload-footer" style={{ marginTop: '20px' }}>
              <div className="upload-progress-wrap">
                <div className="upload-count"><span>{files.length}</span> file{files.length === 1 ? '' : 's'} selected</div>
                <div className="upload-bar"><div className="upload-bar-fill" style={{ width: `${Math.min(files.length * 20, 100)}%` }}></div></div>
              </div>
              {files.length >= 1 && uploadStatus === 'idle' && (
                <button className="btn-primary" onClick={() => handleUpload(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload &amp; Extract
                </button>
              )}
              {uploadStatus === 'uploading' && <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{uploadMessage}</span>}
              {uploadStatus === 'done' && <span style={{ color: 'var(--green)', fontWeight: 600 }}>{uploadMessage}</span>}
            </div>
          </div>
        </div>

        {uploadStatus === 'done' && previewQuestions.length > 0 && (
          <div className="section-card" id="extractPreviewCard">
            <div className="section-card-header">
              <div className="section-icon purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 1"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              </div>
              <div>
                <h2><span className="step-num">02</span> Extracted Question Preview</h2>
                <p className="section-sub">Review the validated questions before saving them to the platform bank. Only valid MCQs with institution_id = NULL are kept.</p>
              </div>
            </div>
            <div className="section-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{previewQuestions.length} questions ready to save</span>
                <button className="btn-primary" onClick={handleSavePreview}>
                  Save to Platform Bank
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {previewQuestions.map((item, index) => (
                  <div key={`${item.q}-${index}`} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                      <strong style={{ color: 'var(--text)' }}>Q{index + 1}. {item.q}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.topic || subject}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      {Array.isArray(item.opts) && item.opts.map((opt, optIndex) => (
                        <div key={`${item.q}-${optIndex}`} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: optIndex === Number(item.ans) ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.02)' }}>
                          <strong style={{ marginRight: '6px' }}>{String.fromCharCode(65 + optIndex)}.</strong>{opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(uploadStatus === 'done' || subject) && (
          <div className="section-card generate-card" id="generateCard">
            <div className="section-card-header">
              <div className="section-icon green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <h2><span className="step-num">02</span> Generate 4 Paper Sets for {subject}</h2>
                <p className="section-sub">Generate Sets A, B, C, and D with 60 unique questions each (240 total unique questions, 0 repeats)</p>
              </div>
            </div>
            <div className="section-body">
              <div className="generate-info-row">
                <div className="gen-info-chip">Set A (60 Qs)</div>
                <div className="gen-info-chip">Set B (60 Qs)</div>
                <div className="gen-info-chip">Set C (60 Qs)</div>
                <div className="gen-info-chip">Set D (60 Qs)</div>
              </div>
              {generateStatus === 'idle' && (
                <button className="btn-generate" onClick={handleGenerate} style={{ display: 'block', margin: '20px auto' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Generate 4 Sets for {subject}
                </button>
              )}
              {generateStatus === 'generating' && (
                <div className="gen-progress" style={{ display: 'block', padding: '16px' }}>
                  <p className="gen-bar-label" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--blue)' }}>
                    Querying the question bank and partitioning 240 unique {subject} questions across Sets A, B, C, and D...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {generateStatus === 'done' && generatedSets.length > 0 && (
          <div id="setsOutput">
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div>
                <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.98rem' }}>
                   {storedCount || generatedSets[0]?.length || 60} fresh {subject} questions stored in Question Bank!
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                  The questions are now saved in your Question Bank. 4 paper sets ({generatedSets[0]?.length || 60} Qs each) are generated below. To create an exam using these questions, go to the <strong>Exams</strong> tab.
                </p>
              </div>
              <Link to="/admin/exams" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 18px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                Go to Exams
              </Link>
            </div>

            <div className="output-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 className="output-title">4 Generated {subject} Paper Sets ({generatedSets[0]?.length || 60} Qs per Set)</h2>
              </div>
              <div className="output-header-actions">
                <span style={{ fontSize: '0.88rem', color: 'var(--muted)', background: 'var(--card-bg)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  4 Sets · {generatedSets[0]?.length || 60} Questions per Set
                </span>
              </div>
            </div>

            <div className="sets-tab-bar">
              {['Set A', 'Set B', 'Set C', 'Set D'].map((set, idx) => (
                <button key={idx} className={`set-tab ${activeTab === idx ? 'active' : ''}`} onClick={() => setActiveTab(idx)}>
                  <span className="tab-label">{set}</span>
                  <span className="tab-count">{generatedSets[idx]?.length ?? 0} Qs</span>
                </button>
              ))}
            </div>

            <div className="paper-preview-card section-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--blue)' }}>Karnataka CET {subject} — Set {String.fromCharCode(65 + activeTab)}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{activeQuestions.length} distinct questions exclusively for Set {String.fromCharCode(65 + activeTab)}</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#666', background: 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '4px', fontWeight: 500 }}>
                  Time: 80 Mins | Max Marks: {activeQuestions.length || 60}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeQuestions.length === 0 && (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                    No questions generated for Set {String.fromCharCode(65 + activeTab)}.
                  </div>
                )}
                {activeQuestions.map((item, i) => {
                  const opts = Array.isArray(item.opts) ? item.opts : [];
                  const optLabels = ['A', 'B', 'C', 'D'];
                  return (
                    <div key={i} style={{ padding: '16px 20px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text)', fontWeight: 600, lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--blue)', marginRight: '8px' }}>Q{i + 1}.</span> 
                          {item.q}
                        </p>
                        {item.topic && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue)', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                            {item.topic}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                        {opts.map((opt, optIdx) => (
                          <div key={optIdx} style={{ 
                            padding: '10px 14px', 
                            background: optIdx === item.ans ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.02)', 
                            border: optIdx === item.ans ? '1px solid #10b981' : '1px solid var(--border)', 
                            borderRadius: '6px', 
                            fontSize: '0.88rem', 
                            color: 'var(--text)' 
                          }}>
                            <strong style={{ color: optIdx === item.ans ? '#10b981' : 'var(--muted)', marginRight: '6px' }}>
                              ({optLabels[optIdx]})
                            </strong>
                            {opt}
                          </div>
                        ))}
                      </div>

                      {item.exp && (
                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                          <strong>Explanation:</strong> {item.exp}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default AdminUpload;
