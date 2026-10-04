import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getStoredExams, saveStoredExams, addStoredExam, deleteStoredExam, subscribeToExamChanges } from '../../utils/examStore';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import { AnalyticsIcon, CrossIcon, EyeIcon, TrashIcon } from '../../components/icons';

const InstitutionExams = () => {
  const [exams, setExams] = useState(getStoredExams());
  const [batches, setBatches] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pendingDeleteExam, setPendingDeleteExam] = useState(null);
  const [deletingExam, setDeletingExam] = useState(false);

  // Form State
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [batchId, setBatchId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(60);
  const [questionCount, setQuestionCount] = useState(60);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Filter
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (feedback?.variant !== 'success') return undefined;

    const currentFeedback = feedback;
    const timeoutId = window.setTimeout(() => {
      setFeedback((activeFeedback) => activeFeedback === currentFeedback ? null : activeFeedback);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isMountedRef.current && !silent) {
      setLoading(true);
      setFeedback(null);
    }
    try {
      let profileData = instProfile;
      if (!profileData) {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          profileData = await meRes.json().catch(() => null);
          if (profileData && profileData.authenticated && isMountedRef.current) {
            setInstProfile(profileData);
          }
        }
      }

      const currentInstId = String(profileData?.institution_id || profileData?.join_code || profileData?.id || '').toLowerCase().trim();
      const currentInstName = String(profileData?.institution_name || profileData?.name || profileData?.username || '').toLowerCase().trim();

      // 1. Fetch Exams across institution endpoints
      let examRes = await fetch('/api/institution/content/exams', { credentials: 'include' });
      let data = null;

      if (examRes.ok) {
        data = await examRes.json().catch(() => null);
      }

      if (!data) {
        examRes = await fetch('/api/institution/exams', { credentials: 'include' });
        if (examRes.ok) {
          data = await examRes.json().catch(() => null);
        }
      }

      const fetchedList = data ? (data.exams || data.data || data.items || (Array.isArray(data) ? data : [])) : [];
      // The institution API is authoritative for reads. Do not broadcast a
      // local-storage update while fetching, or subscribers will refetch forever.
      const mergedList = fetchedList;

      // STRICT INSTITUTION ISOLATION:
      // Show ONLY exams created by this specific institution
      const instExamsOnly = mergedList.filter(ex => {
        if (!ex) return false;

        const exInstId = String(ex.institution_id || ex.created_by_institution_id || '').toLowerCase().trim();
        const exInstName = String(ex.institution_name || ex.created_by_institution_name || '').toLowerCase().trim();

        // System/admin seed exams MUST NOT appear on institution platform
        if (ex.created_by_type === 'system' || ex.created_by_type === 'admin' || exInstId === 'system' || exInstId === 'admin') {
          return false;
        }

        const matchId = currentInstId && exInstId && (currentInstId === exInstId || currentInstId.includes(exInstId) || exInstId.includes(currentInstId));
        const matchName = currentInstName && exInstName && (currentInstName === exInstName || currentInstName.includes(exInstName) || exInstName.includes(currentInstName));

        if (exInstId || exInstName) {
          return Boolean(matchId || matchName);
        }

        if (ex.created_by_type === 'institution' || ex.created_by_institution === true) {
          return Boolean(matchId || matchName || (!exInstId && !exInstName));
        }

        // The authenticated institution endpoint can omit redundant tenant
        // fields; only explicit mismatches are rejected above.
        return !exInstId && !exInstName;
      });

      if (isMountedRef.current) {
        setExams(instExamsOnly);
      }

      // 2. Fetch Batches
      try {
        const batchRes = await fetch('/api/institution/batches', { credentials: 'include' });
        if (batchRes.ok) {
          const bData = await batchRes.json().catch(() => null);
          if (bData && isMountedRef.current) {
            setBatches(bData.batches || []);
          }
        }
      } catch (bErr) {}

      // 3. Fetch Question Counts
      try {
        const qRes = await fetch('/api/institution/content/questions/counts', { credentials: 'include' });
        if (qRes.ok) {
          const qData = await qRes.json().catch(() => null);
          if (qData && isMountedRef.current) {
            setQuestionCounts(qData.counts || {});
          }
        }
      } catch (qErr) {}
    } catch (err) {
      if (isMountedRef.current && !silent) {
        setFeedback({ variant: 'error', message: 'Failed to load exams and batch data' });
      }
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current && !silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeToExamChanges(() => {
      fetchData(true);
    });

    const handleUpdate = () => {
      fetchData(true);
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
  }, []);

  // Questions Modal State
  const [viewingQuestionsExam, setViewingQuestionsExam] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  const fetchExamQuestions = async (examId) => {
    setLoadingQuestions(true);
    setFeedback(null);
    const targetExam = exams.find(e => e.exam_id === examId || e.id === examId || e.exam_name === examId) || { exam_id: examId, subject: 'Mathematics' };
    const examSubject = targetExam.subject || 'Mathematics';

    try {
      let data = null;
      let res = await fetch(`/api/institution/content/exams/${examId}/questions`, { credentials: 'include' });
      if (res.ok) {
        data = await res.json().catch(() => null);
      }
      if (!data || data.message || data.error) {
        res = await fetch(`/api/institution/exams/${examId}/questions`, { credentials: 'include' });
        if (res.ok) {
          data = await res.json().catch(() => null);
        }
      }
      if (data && (data.sets || data.questions) && !data.message && !data.error) {
        let rawSets = data.sets || [];
        if (rawSets.length === 0 && Array.isArray(data.questions)) {
          rawSets = [{ set_label: 'A', questions: data.questions }];
        }

        // Ensure 4 sets (A, B, C, D) exist, and each set has exactly 60 questions
        const setLabels = ['A', 'B', 'C', 'D'];
        const formattedSets = setLabels.map((lbl) => {
          const existingSet = rawSets.find(s => (s.set_label || s.label || '').toUpperCase() === lbl);
          let questions = (existingSet?.questions || []).map(q => ({
            id: q.id || q.question_id,
            question_text: q.question_text || q.question || q.text || '',
            options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []),
            correct_option: q.correct_option !== undefined ? String(q.correct_option) : '0',
            topic: q.topic || 'General',
            explanation: q.explanation || ''
          }));

          return {
            set_label: lbl,
            question_count: questions.length,
            questions: questions
          };
        });

        setViewingQuestionsExam({
          exam_name: data.exam_name || targetExam.exam_name || `${examSubject} Mock Exam`,
          subject: data.subject || examSubject,
          duration_minutes: data.duration_minutes || targetExam.duration_minutes || 60,
          total_marks: data.total_marks || targetExam.total_marks || 60,
          sets: formattedSets
        });
        setActiveSetIndex(0);
      } else {
        setFeedback({ variant: 'error', message: 'Question data is unavailable for this exam.' });
        setViewingQuestionsExam(null);
      }
    } catch {
      setFeedback({ variant: 'error', message: 'Unable to load questions for this exam.' });
      setViewingQuestionsExam(null);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const [instProfile, setInstProfile] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.authenticated) {
          setInstProfile(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateExam = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFeedback(null);
    if (!examName.trim()) {
      setFeedback({ variant: 'error', message: 'Please enter an exam title before creating an exam.' });
      return;
    }

    setCreating(true);

    const currentInstId = instProfile?.institution_id || instProfile?.join_code || instProfile?.id || 'INST-LOCAL';
    const currentInstName = instProfile?.institution_name || instProfile?.name || instProfile?.username || 'Institution';

    const examTimestamp = Date.now();
    const newExamId = `EXAM-${examTimestamp}`;

    const createdExamObj = {
      exam_id: newExamId,
      id: newExamId,
      exam_name: examName.trim(),
      name: examName.trim(),
      subject: subject,
      batch_id: batchId || null,
      duration_minutes: Number(durationMinutes) || 60,
      total_marks: Number(totalMarks) || 60,
      question_count: Number(questionCount) || 60,
      is_published: isPublished,
      created_by_type: 'institution',
      created_by_institution: true,
      institution_id: currentInstId,
      institution_name: currentInstName,
      sets: [],
      created_at: new Date().toISOString()
    };

    try {
      const payload = {
        exam_id: newExamId,
        exam_name: createdExamObj.exam_name,
        name: createdExamObj.exam_name,
        subject: createdExamObj.subject,
        batch_id: createdExamObj.batch_id,
        duration_minutes: createdExamObj.duration_minutes,
        total_marks: createdExamObj.total_marks,
        question_count: createdExamObj.question_count,
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
        is_published: isPublished,
        sets: []
      };

      const res = await fetch('/api/institution/content/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        addStoredExam({ ...createdExamObj, ...data, sets: data.sets || [] });
        await fetchData();
        setFilterSubject('all');
        setFilterBatch('all');
        setFeedback({ variant: 'success', message: `Exam "${createdExamObj.exam_name}" was created${isPublished ? ' and published' : ' as a draft'}.` });
        setExamName('');
        setScheduledStart('');
        setScheduledEnd('');
      } else {
        const data = await res.json().catch(() => ({}));
        const apiError = data.message || data.detail || data.error;
        setFeedback({
          variant: 'error',
          message: typeof apiError === 'string'
            ? apiError
            : apiError?.message || 'The exam could not be created.',
        });
      }
    } catch (err) {
      setFeedback({ variant: 'error', message: 'Network error creating the exam. No local exam was saved.' });
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (examId, currentStatus) => {
    setExams(prev => {
      const updated = prev.map(ex => (ex.exam_id === examId || ex.id === examId) ? { ...ex, is_published: !currentStatus } : ex);
      saveStoredExams(updated);
      return updated;
    });
    setFeedback({ variant: 'success', message: `Exam status updated to ${!currentStatus ? 'Published' : 'Draft'}` });
    try {
      await fetch(`/api/institution/content/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_published: !currentStatus }),
      });
    } catch {}
  };

  const handleDeleteExam = (exam) => {
    setFeedback(null);
    setPendingDeleteExam(exam);
  };

  const confirmDeleteExam = async () => {
    if (!pendingDeleteExam || deletingExam) return;

    const targetId = pendingDeleteExam.exam_id || pendingDeleteExam.id;
    if (!targetId) return;

    setDeletingExam(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/institution/content/exams/${targetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success !== true) {
        const apiError = data.message || data.detail || data.error;
        setPendingDeleteExam(null);
        setFeedback({
          variant: 'error',
          message: typeof apiError === 'string'
            ? apiError
            : apiError?.message || 'The exam could not be deleted.',
        });
        return;
      }

      deleteStoredExam(targetId);
      setExams((currentExams) => currentExams.filter((exam) => exam.exam_id !== targetId && exam.id !== targetId));
      setPendingDeleteExam(null);
      await fetchData(true);
      setFeedback({ variant: 'success', message: 'Exam deleted successfully.' });
    } catch {
      setPendingDeleteExam(null);
      setFeedback({ variant: 'error', message: 'Network error while deleting the exam. Refresh to check its status.' });
    } finally {
      setDeletingExam(false);
    }
  };

  const filteredExams = exams.filter(ex => {
    if (!ex) return false;
    const matchSubj = filterSubject === 'all' || !filterSubject || 
      (ex.subject && ex.subject.toLowerCase() === filterSubject.toLowerCase());
    const matchBatch = filterBatch === 'all' || !filterBatch || 
      String(ex.batch_id || '') === String(filterBatch);
    return matchSubj && matchBatch;
  });

  return (
    <>
      <div className="bg-mesh"></div>

      <div className="main-wrap institution-exams-page">
        <header className="institution-page-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="institution-page-title">
              Weekly Test <span className="institution-page-title-accent">Builder</span>
            </h1>
            <p className="institution-page-sub">
              Create custom weekly exams, schedule time windows, and assign them directly to batches
            </p>
          </div>
          <div className="institution-page-actions">
            <button
              type="button"
              className="btn-institution-outline"
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              Refresh
            </button>
          </div>
        </header>

        {feedback && (
          <Alert
            key={`${feedback.variant}:${feedback.message}`}
            className="institution-exam-feedback"
            variant={feedback.variant}
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        )}

        {/* 1. Test Builder Form */}
        <div className="section-card" style={{ marginBottom: '24px' }}>
          <div className="section-card-header">
            <div className="section-icon" style={{ background: 'linear-gradient(135deg, rgba(230, 95, 0, 0.2), rgba(37,99,235,0.2))' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            </div>
            <div>
              <h2>Create & Assign Weekly Test</h2>
              <p className="section-sub">Configure exam parameters and assign to a specific class cohort</p>
            </div>
          </div>

          <div className="section-body">
            <form onSubmit={handleCreateExam}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="input-label" htmlFor="examName">Exam Title *</label>
                  <input
                    type="text"
                    id="examName"
                    className="text-input"
                    placeholder="e.g. Weekly Mock #2 - Calculus"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="input-label" htmlFor="subject">Subject *</label>
                  <select
                    id="subject"
                    className="text-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>
                </div>

                <div>
                  <label className="input-label" htmlFor="duration">Duration (Minutes)</label>
                  <select
                    id="duration"
                    className="text-input"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="30">30 Minutes (Quick Quiz)</option>
                    <option value="60">60 Minutes (Standard KCET)</option>
                    <option value="80">80 Minutes (Full Length)</option>
                    <option value="120">120 Minutes (Extended Mock)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label className="input-label" htmlFor="startDate">Start Window (Optional)</label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    className="text-input"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="input-label" htmlFor="batch">Batch / Group</label>
                  <select
                    id="batch"
                    className="text-input"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">All institution students</option>
                    {batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="input-label" htmlFor="endDate">Due / End Window (Optional)</label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    className="text-input"
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  Publish immediately (Students can view & take exam)
                </label>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                  style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  {creating ? 'Generating 4 Sets...' : 'Create & Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 2. Scheduled Institution Exams Table */}
        <div className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="section-icon" style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.2), rgba(5,150,105,0.2))' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
              </div>
              <div>
                <h2>Scheduled Weekly Exams ({exams.length})</h2>
                <p className="section-sub">Active tests distributed across your institution</p>
              </div>
            </div>

          </div>

          <div className="section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading scheduled exams...</div>
            ) : filteredExams.length === 0 ? (
              <div className="institution-exams-empty">
                <h3>No Exams Scheduled Yet</h3>
                <p style={{ marginTop: '6px' }}>Use the Test Builder above to create your first weekly test.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="results-table institution-exams-table">
                  <thead>
                    <tr>
                      <th>Exam Name</th>
                      <th>Subject</th>
                      <th>Duration / Marks</th>
                      <th>Sets</th>
                      <th>Status</th>
                      <th>Submissions</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map((exam) => (
                      <tr key={exam.exam_id}>
                        <td>
                          <div className="institution-exams-name">
                            {exam.exam_name || 'Weekly Exam'}
                          </div>
                          <span className="institution-exams-created">
                            Created {exam.created_at ? new Date(exam.created_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td>
                          <span className="institution-exams-subject">
                            {exam.subject}
                          </span>
                        </td>
                        <td className="institution-exams-meta">
                          <strong>{exam.duration_minutes}m</strong> • {exam.total_marks} Marks
                        </td>
                        <td className="institution-exams-meta">
                          <span>4 Sets (A-D)</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(exam.exam_id, exam.is_published)}
                            className={`institution-exams-status ${exam.is_published ? 'is-published' : 'is-draft'}`}
                            title="Click to toggle status"
                          >
                            {exam.is_published ? '● Published' : '○ Draft'}
                          </button>
                        </td>
                        <td style={{ fontSize: '0.88rem' }}>
                          <strong style={{ color: 'var(--text)' }}>{exam.completion_count || 0}</strong> completed
                        </td>
                        <td className="institution-exams-actions-cell">
                          <div className="institution-exams-actions">
                            <button
                              type="button"
                              className="institution-exam-action institution-exam-action-view"
                              onClick={() => fetchExamQuestions(exam.exam_id)}
                              disabled={loadingQuestions}
                              title="View questions assigned to this test"
                            >
                              <EyeIcon size={14} />
                              View Questions
                            </button>
                            <Link
                              to={`/institution/analytics?exam_id=${exam.exam_id}`}
                              className="institution-exam-action institution-exam-action-results"
                            >
                              <AnalyticsIcon size={14} />
                              Results
                            </Link>
                            <button
                              type="button"
                              className="institution-exam-action institution-exam-action-delete"
                              onClick={() => handleDeleteExam(exam)}
                              title="Delete Exam"
                            >
                              <TrashIcon size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(pendingDeleteExam)}
        onClose={() => {
          if (!deletingExam) setPendingDeleteExam(null);
        }}
        title="Delete Exam?"
        size="sm"
        className="institution-exam-delete-modal"
        closeButton={false}
        footer={(
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPendingDeleteExam(null)}
              disabled={deletingExam}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={confirmDeleteExam}
              disabled={deletingExam}
            >
              <TrashIcon size={16} />
              {deletingExam ? 'Deleting...' : 'Delete Exam'}
            </button>
          </>
        )}
      >
        <div className="institution-delete-confirmation">
          <span className="institution-delete-confirmation-icon" aria-hidden="true">
            <TrashIcon size={20} />
          </span>
          <div>
            <p>
              Are you sure you want to delete{' '}
              <strong>{pendingDeleteExam?.exam_name || pendingDeleteExam?.name || 'this exam'}</strong>?
            </p>
            <p className="institution-delete-confirmation-note">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>

      {/* View Exam Questions Modal */}
      {viewingQuestionsExam && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setViewingQuestionsExam(null)}
        >
          <div
            className="section-card"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '0',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--s2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text)' }}>{viewingQuestionsExam.exam_name}</h2>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(230, 95, 0, 0.15)', color: 'var(--color-primary)', fontWeight: 600 }}>
                    {viewingQuestionsExam.subject}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {viewingQuestionsExam.duration_minutes} Minutes • {viewingQuestionsExam.total_marks} Marks • Only these questions are visible to students taking this test
                </p>
              </div>
              <button
                type="button"
                aria-label="Close exam questions"
                title="Close exam questions"
                onClick={() => setViewingQuestionsExam(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
              >
                <CrossIcon size={18} />
              </button>
            </div>

            {/* Set Selector Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--s1)', padding: '0 24px' }}>
              {(viewingQuestionsExam.sets || []).map((setObj, idx) => (
                <button
                  key={setObj.set_label || idx}
                  onClick={() => setActiveSetIndex(idx)}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeSetIndex === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                    color: activeSetIndex === idx ? 'var(--color-primary)' : 'var(--muted)',
                    fontWeight: activeSetIndex === idx ? 700 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Set {setObj.set_label} ({setObj.question_count} Qs)
                </button>
              ))}
            </div>

            {/* Questions Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {viewingQuestionsExam.sets && viewingQuestionsExam.sets[activeSetIndex] ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {viewingQuestionsExam.sets[activeSetIndex].questions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                          Question #{qIdx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'var(--s3)', padding: '2px 8px', borderRadius: '4px' }}>
                          {q.topic}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--text)', marginBottom: '12px', lineHeight: '1.5', fontWeight: 500 }}>
                        {q.question_text}
                      </p>

                      {/* Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                        {(q.options || []).map((opt, oIdx) => {
                          const corr = String(q.correct_option ?? '').trim();
                          const isCorrect = corr === String(oIdx) || (corr.toUpperCase() === String.fromCharCode(65 + oIdx));
                          return (
                            <div
                              key={oIdx}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isCorrect ? '1.5px solid var(--green-l)' : '1px solid var(--border)',
                                background: isCorrect ? 'rgba(5,150,105,0.08)' : 'var(--s1)',
                                fontSize: '0.85rem',
                                color: isCorrect ? 'var(--green-l)' : 'var(--text)',
                                fontWeight: isCorrect ? 600 : 400
                              }}
                            >
                              <strong style={{ marginRight: '6px' }}>{String.fromCharCode(65 + oIdx)}.</strong> {opt} {isCorrect && ' (Correct)'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No questions found for this set.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--s2)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setViewingQuestionsExam(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstitutionExams;
