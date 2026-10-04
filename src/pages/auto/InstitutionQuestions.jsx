import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QuestionsIcon } from '../../components/icons';

const InstitutionQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [counts, setCounts] = useState({ Biology: 0, Physics: 0, Chemistry: 0, Mathematics: 0 });
  const [filterSubject, setFilterSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [instProfile, setInstProfile] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const p = await res.json();
        if (p && p.authenticated) setInstProfile(p);
      }
    } catch (e) {
      console.warn('Could not fetch auth profile:', e);
    }
  }, []);

  const filterForInstitution = useCallback((fetchedList, profile) => {
    if (!Array.isArray(fetchedList)) return [];
    if (!profile) return [];

    const currentInstId = String(profile?.institution_id || profile?.join_code || profile?.id || '').toLowerCase().trim();
    const currentInstName = String(profile?.institution_name || profile?.name || profile?.username || '').toLowerCase().trim();

    return fetchedList.filter(q => {
      if (!q) return false;
      const qInstId = String(q.institution_id || q.created_by_institution_id || q.inst_id || '').toLowerCase().trim();
      const qInstName = String(q.institution_name || q.created_by_institution_name || q.inst_name || '').toLowerCase().trim();

      // If question object explicitly contains an institution reference, check for match
      if (qInstId || qInstName) {
        const matchId = currentInstId && qInstId && (currentInstId === qInstId || currentInstId.includes(qInstId) || qInstId.includes(currentInstId));
        const matchName = currentInstName && qInstName && (currentInstName === qInstName || currentInstName.includes(qInstName) || qInstName.includes(currentInstName));
        return Boolean(matchId || matchName);
      }

      // The authenticated institution endpoint is already tenant-scoped; many
      // valid question records omit redundant institution fields.
      return true;
    });
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      // First try counts endpoint
      const countRes = await fetch('/api/institution/content/questions/counts', { credentials: 'include' });
      if (countRes.ok) {
        const countData = await countRes.json();
        if (countData && (countData.counts || countData.counts_by_subject)) {
          const rawCounts = countData.counts || countData.counts_by_subject || {};
          const subjectCounts = { Biology: 0, Physics: 0, Chemistry: 0, Mathematics: 0 };
          Object.entries(rawCounts).forEach(([k, v]) => {
            const foundKey = Object.keys(subjectCounts).find(sk => sk.toLowerCase() === k.toLowerCase());
            if (foundKey) subjectCounts[foundKey] = Number(v) || 0;
          });
          setCounts(subjectCounts);
          return;
        }
      }

      // Fallback: aggregate from questions list
      let res = await fetch('/api/institution/content/questions?page_size=1000', { credentials: 'include' });
      if (!res.ok) {
        res = await fetch('/api/institution/questions?page_size=1000', { credentials: 'include' });
      }

      if (res.ok) {
        const data = await res.json();
        let fetchedList = [];
        if (Array.isArray(data)) {
          fetchedList = data;
        } else if (data && typeof data === 'object') {
          fetchedList = data.questions || data.items || data.mcqs || data.results || data.data || [];
        }

        const instQuestions = filterForInstitution(fetchedList, instProfile);

        const subjectCounts = { Biology: 0, Physics: 0, Chemistry: 0, Mathematics: 0 };
        instQuestions.forEach(q => {
          const s = String(q.subject || q.subject_name || q.category || '').trim();
          const foundKey = Object.keys(subjectCounts).find(k => k.toLowerCase() === s.toLowerCase());
          if (foundKey) {
            subjectCounts[foundKey]++;
          }
        });

        setCounts(subjectCounts);
      }
    } catch (err) {
      console.error('Failed to fetch institution question counts:', err);
    }
  }, [instProfile, filterForInstitution]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const backendPageSize = 50;
      const requestedOffset = (currentPage - 1) * pageSize;
      const backendPage = Math.floor(requestedOffset / backendPageSize) + 1;
      const backendOffset = requestedOffset % backendPageSize;
      const params = new URLSearchParams({
        page: String(backendPage),
        page_size: String(backendPageSize),
      });
      if (filterSubject) params.append('subject', filterSubject);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      let res = await fetch(`/api/institution/content/questions?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        res = await fetch(`/api/institution/questions?${params.toString()}`, { credentials: 'include' });
      }
      
      if (res.ok) {
        const data = await res.json();
        let fetchedList = [];
        let totalCountFromBackend = 0;
        
        if (Array.isArray(data)) {
          fetchedList = data;
          totalCountFromBackend = data.length;
        } else if (data && typeof data === 'object') {
          fetchedList = data.questions || data.items || data.mcqs || data.results || data.data || [];
          totalCountFromBackend = data.total || data.count || fetchedList.length;
        }

        let filteredList = filterForInstitution(fetchedList, instProfile);

        // Apply client-side subject and search filtering if needed
        if (filterSubject) {
          filteredList = filteredList.filter(q => {
            const s = String(q.subject || q.subject_name || q.category || '').toLowerCase();
            return s === filterSubject.toLowerCase();
          });
        }

        if (searchQuery.trim()) {
          const qText = searchQuery.toLowerCase();
          filteredList = filteredList.filter(q => {
            const txt = String(q.question || q.question_text || q.stem || q.text || '').toLowerCase();
            const topic = String(q.topic || q.chapter || q.subtopic || '').toLowerCase();
            return txt.includes(qText) || topic.includes(qText);
          });
        }

        setQuestions(filteredList.slice(backendOffset, backendOffset + pageSize));

        const totalInstCount = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);
        setTotalQuestions(
          searchQuery.trim()
            ? filteredList.length
            : filterSubject
            ? (counts[filterSubject] !== undefined ? counts[filterSubject] : filteredList.length)
            : (totalCountFromBackend || totalInstCount || filteredList.length)
        );
      } else {
        setQuestions([]);
        setTotalQuestions(0);
      }
    } catch (err) {
      console.error('Failed to fetch institution question bank:', err);
      setError('Unable to load questions from database. Please check connection to backend server.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filterSubject, searchQuery, instProfile, counts, filterForInstitution]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      let res = await fetch(`/api/institution/content/questions/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        res = await fetch(`/api/institution/questions/${deleteId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      }

      if (res.ok) {
        setDeleteId(null);
        fetchQuestions();
        fetchCounts();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete question.');
      }
    } catch (err) {
      alert('Error deleting question.');
    } finally {
      setDeleting(false);
    }
  };

  const parseQuestionDetails = (q) => {
    const questionText = q.question || q.question_text || q.stem || q.text || q.title || 'Question text unavailable';
    const subjectName = q.subject || q.subject_name || q.category || 'General';
    const topicName = q.topic || q.chapter || q.subtopic || '';
    const sourceType = q.source_type || q.source || (q.created_by_type === 'institution' ? 'Institution Upload' : 'Extracted MCQ');

    const rawOpts = q.options || q.choices || q.answers || [];
    let optionsList = [];
    if (Array.isArray(rawOpts)) {
      optionsList = rawOpts.map((opt, i) => {
        if (typeof opt === 'object' && opt !== null) {
          return { label: String.fromCharCode(65 + i), text: opt.text || opt.option || opt.choice || JSON.stringify(opt) };
        }
        return { label: String.fromCharCode(65 + i), text: String(opt) };
      });
    } else if (typeof rawOpts === 'string') {
      try {
        const parsed = JSON.parse(rawOpts);
        if (Array.isArray(parsed)) {
          optionsList = parsed.map((opt, i) => ({ label: String.fromCharCode(65 + i), text: String(opt) }));
        }
      } catch (e) {}
    } else if (rawOpts && typeof rawOpts === 'object') {
      optionsList = Object.entries(rawOpts).map(([k, v]) => ({
        label: k.toUpperCase(),
        text: String(v),
      }));
    }

    if (optionsList.length === 0) {
      const keys = ['option_a', 'option_b', 'option_c', 'option_d'];
      const altKeys = ['option1', 'option2', 'option3', 'option4'];
      keys.forEach((k, idx) => {
        const val = q[k] || q[altKeys[idx]];
        if (val) {
          optionsList.push({ label: String.fromCharCode(65 + idx), text: String(val) });
        }
      });
    }

    const correctStr = String(q.correct_option ?? q.answer ?? q.correct_answer ?? q.correct ?? '').trim();
    let correctIdx = -1;
    if (/^[0-3]$/.test(correctStr)) {
      correctIdx = parseInt(correctStr, 10);
    } else if (/^[a-dA-D]$/.test(correctStr)) {
      correctIdx = correctStr.toUpperCase().charCodeAt(0) - 65;
    } else if (correctStr) {
      const found = optionsList.findIndex(o => o.text.toLowerCase() === correctStr.toLowerCase() || o.label.toLowerCase() === correctStr.toLowerCase());
      if (found !== -1) correctIdx = found;
    }

    const explanation = q.explanation || q.rationale || q.solution || '';

    return { questionText, subjectName, topicName, sourceType, optionsList, correctIdx, explanation };
  };

  const totalPages = Math.ceil(totalQuestions / pageSize) || 1;
  const subjects = ['Biology', 'Physics', 'Chemistry', 'Mathematics'];
  const totalStored = Object.values(counts).reduce((a, b) => a + Number(b || 0), 0);

  return (
    <>
      <div className="bg-mesh"></div>

      <main className="main-wrap" style={{ padding: '24px' }}>
        {/* Header section card */}
        <div className="section-card" style={{ marginBottom: '20px' }}>
          <div className="section-card-header" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="section-icon" style={{ background: 'var(--color-soft-orange)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px' }}>
              <QuestionsIcon size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Institution Question Bank</h2>
              <p className="section-sub" style={{ margin: '4px 0 0', color: '#64748B' }}>
                View, filter, and manage all extracted MCQs stored in your institution's private question bank
              </p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Link to="/institution/upload" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '15px', height: '15px' }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload &amp; Extract MCQs
              </Link>
            </div>
          </div>

          {/* Counts overview tiles */}
          <div className="section-body" style={{ marginTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <div
                onClick={() => {
                  setFilterSubject('');
                  setCurrentPage(1);
                }}
                style={{
                  background: filterSubject === '' ? 'var(--color-soft-orange)' : 'var(--color-surface-secondary)',
                  border: filterSubject === '' ? '1px solid var(--color-light-orange)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--rs)',
                  padding: '14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: filterSubject === '' ? 'var(--color-primary)' : 'var(--color-navy)' }}>{totalStored || totalQuestions}</div>
                <div style={{ fontSize: '0.78rem', color: filterSubject === '' ? 'var(--color-primary)' : '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                  All Subjects
                </div>
              </div>
              {subjects.map((subj) => (
                <div
                  key={subj}
                  onClick={() => {
                    setFilterSubject(filterSubject === subj ? '' : subj);
                    setCurrentPage(1);
                  }}
                  style={{
                    background: filterSubject === subj ? 'var(--color-soft-orange)' : 'var(--color-surface-secondary)',
                    border: filterSubject === subj ? '1px solid var(--color-light-orange)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--rs)',
                    padding: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-navy)' }}>{counts[subj] || 0}</div>
                  <div style={{ fontSize: '0.78rem', color: filterSubject === subj ? 'var(--color-primary)' : '#64748B', fontWeight: 600, marginTop: '2px' }}>
                    {subj}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Questions list table card */}
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {filterSubject ? `${filterSubject} Questions` : 'Fetched Question Bank'} ({totalQuestions})
              </h3>
              <p className="section-sub" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>
                Page {currentPage} of {totalPages}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Search questions or topics..."
                  className="text-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', padding: '6px 12px 6px 32px', fontSize: '0.85rem' }}
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--muted)' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              {/* Subject Select */}
              <select
                className="text-input"
                value={filterSubject}
                onChange={(e) => {
                  setFilterSubject(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ minWidth: '150px', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                <option value="">All Subjects</option>
                <option value="Biology">Biology</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
              </select>

              {/* Page Size Select */}
              <select
                className="text-input"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ minWidth: '90px', padding: '6px 10px', fontSize: '0.85rem' }}
              >
                <option value={10}>10 / pg</option>
                <option value={15}>15 / pg</option>
                <option value={25}>25 / pg</option>
                <option value={50}>50 / pg</option>
              </select>

              <button
                type="button"
                className="btn-outline small"
                onClick={() => {
                  fetchQuestions();
                  fetchCounts();
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '13px', height: '13px' }}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>⏳ Loading fetched questions...</div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--red-l)' }}>{error}</div>
            ) : questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                <div style={{ marginBottom: '16px' }}><QuestionsIcon size={48} style={{ color: 'var(--color-primary)' }} /></div>
                <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-navy)', fontWeight: 700 }}>
                  {filterSubject ? `No ${filterSubject} Questions Found` : searchQuery ? 'No Matching Questions Found' : 'No Questions in Institution Bank'}
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#64748B', maxWidth: '480px', marginInline: 'auto' }}>
                  Upload question papers or textbooks in the Upload section to automatically extract and populate MCQs in your institution question bank.
                </p>
                <Link to="/institution/upload" className="btn-primary" style={{ textDecoration: 'none' }}>
                  Upload &amp; Extract MCQs →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {questions.map((q, idx) => {
                  const qIndex = (currentPage - 1) * pageSize + idx + 1;
                  const qId = q.id || q.question_id || q._id || idx;
                  const isExpanded = expandedId === qId;
                  const { questionText, subjectName, topicName, sourceType, optionsList, correctIdx, explanation } = parseQuestionDetails(q);

                  return (
                    <div
                      key={qId}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--color-border)',
                        background: isExpanded ? 'var(--color-soft-orange)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '0.9rem' }}>#{qIndex}</span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background:
                                  subjectName === 'Biology'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : subjectName === 'Physics'
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : subjectName === 'Chemistry'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(230, 95, 0, 0.15)',
                                color:
                                  subjectName === 'Biology'
                                    ? '#10b981'
                                    : subjectName === 'Physics'
                                    ? '#3b82f6'
                                    : subjectName === 'Chemistry'
                                    ? '#f59e0b'
                                    : '#E65F00',
                                fontWeight: 600,
                              }}
                            >
                              {subjectName}
                            </span>
                            {topicName && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'var(--s2)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '10px' }}>
                                {topicName}
                              </span>
                            )}
                            {sourceType && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                                {sourceType}
                              </span>
                            )}
                          </div>

                          <p style={{ margin: 0, fontSize: '0.96rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>
                            {questionText}
                          </p>

                          {/* Options display toggle */}
                          {optionsList.length > 0 && isExpanded && (
                            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                                {optionsList.map((opt, oIdx) => {
                                  const isCorrect = oIdx === correctIdx;
                                  return (
                                    <div
                                      key={oIdx}
                                      style={{
                                        padding: '8px 12px',
                                        borderRadius: 'var(--rs)',
                                        border: isCorrect ? '1px solid #10b981' : '1px solid var(--border)',
                                        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'var(--s2)',
                                        fontSize: '0.85rem',
                                        color: isCorrect ? '#10b981' : 'var(--text)',
                                        fontWeight: isCorrect ? 600 : 400,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, color: isCorrect ? '#10b981' : 'var(--color-primary)' }}>({opt.label})</span>
                                      <span>{opt.text}</span>
                                      {isCorrect && <span style={{ marginLeft: 'auto', fontWeight: 'bold', fontSize: '0.78rem' }}> Correct</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              {explanation && (
                                <div style={{ fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic', background: 'var(--color-soft-orange)', padding: '8px 12px', borderRadius: '6px', marginTop: '8px' }}>
                                  <strong>Explanation:</strong> {explanation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-outline small"
                            onClick={() => setExpandedId(isExpanded ? null : qId)}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {isExpanded ? 'Hide Options' : 'View Options'}
                          </button>
                          <button
                            type="button"
                            className="btn-outline small"
                            onClick={() => setDeleteId(qId)}
                            style={{ fontSize: '0.78rem', color: 'var(--red-l)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination footer */}
            {totalQuestions > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalQuestions)}–{Math.min(currentPage * pageSize, totalQuestions)} of {totalQuestions} questions
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-outline small"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    className="btn-outline small"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '28px', maxWidth: '420px', width: '90%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Delete Question?</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0 0 20px' }}>
              This will permanently remove the question from your question bank. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline small" onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="btn-primary small" onClick={handleDelete} disabled={deleting} style={{ background: 'var(--red)', borderColor: 'var(--red)' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstitutionQuestions;
