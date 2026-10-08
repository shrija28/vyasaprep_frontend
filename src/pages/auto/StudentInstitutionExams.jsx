import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertIcon, ExamIcon } from '../../components/icons';
import { generateStudentId } from '../../utils/studentId';
import { normalizeExamSubjects, subscribeToExamChanges } from '../../utils/examStore';
import { findStudentExamResult, flattenStudentExams, getStudentExamState } from '../../utils/studentExamAccess';

const getResultValue = (record, keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const StudentInstitutionExams = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [studentName, setStudentName] = useState('Student');
  const [studentId, setStudentId] = useState('STD-001');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProfileAndExams = async () => {
    setLoading(true);
    setError('');
    try {
      let profile = null;
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (meRes.ok) {
        profile = await meRes.json();
        if (profile.authenticated) {
          const name = profile.name || profile.full_name || profile.username || (profile.email ? profile.email.split('@')[0] : '');
          if (name) setStudentName(name);

          const stdId = profile.kcet_student_id || generateStudentId(profile);
          setStudentId(stdId);
          localStorage.setItem('vyasaprep_active_student_id', stdId);
        }
      }

      const res = await fetch('/api/student/exams', { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load exams permitted for this student.');
      const data = await res.json();
      const fetchedList = flattenStudentExams(data);

      const historyResponse = await fetch('/api/student/dashboard-stats', { credentials: 'include' });
      const historyData = historyResponse.ok ? await historyResponse.json().catch(() => ({})) : {};
      const parsedHistory = Array.isArray(historyData.examHistory)
        ? historyData.examHistory
        : Array.isArray(historyData.exam_history) ? historyData.exam_history : [];
      setExamHistory(parsedHistory);

      const publishedList = fetchedList.filter((ex) => ex && ex.is_published !== false);
      const parsedSubjects = normalizeExamSubjects(publishedList);
      setSubjects(parsedSubjects);
    } catch (err) {
      console.error('Error fetching institution exams:', err);
      setSubjects([]);
      setError(err.message || 'Unable to load institution exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndExams();

    const unsubscribe = subscribeToExamChanges(() => {
      fetchProfileAndExams();
    });

    const handleUpdate = () => {
      fetchProfileAndExams();
    };

    window.addEventListener('exam-submitted', handleUpdate);
    window.addEventListener('exam-completed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('exam-submitted', handleUpdate);
      window.removeEventListener('exam-completed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const subjectButtons = useMemo(() => {
    const base = ['ALL', 'Biology', 'Physics', 'Chemistry', 'Mathematics'];
    return base.map((subject) => {
      const count = subject === 'ALL'
        ? subjects.reduce((sum, group) => sum + (group.exams?.length || 0), 0)
        : (subjects.find((group) => group.subject.toLowerCase() === subject.toLowerCase())?.exams?.length || 0);
      return { subject, count };
    });
  }, [subjects]);

  const filteredExamsList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return subjects
      .map((group) => ({
        ...group,
        exams: (group.exams || []).filter((exam) => {
          const matchesSubject = selectedSubjectFilter === 'ALL' || group.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
          const textMatch = !query || [
            exam.exam_name,
            group.subject,
            exam.assigned_set_label,
            exam.assigned_set_id,
          ].some((value) => String(value || '').toLowerCase().includes(query));
          return matchesSubject && textMatch;
        }),
      }))
      .filter((group) => group.exams.length > 0);
  }, [subjects, selectedSubjectFilter, searchQuery]);

  return (
    <>
      <div className="bg-mesh"></div>

      <div style={{ maxWidth: '1440px', width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '30px 20px 80px', minHeight: '80vh' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'var(--color-soft-orange)', color: 'var(--color-primary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>
              <ExamIcon size={16} /> Select Examination
            </div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
              Available <span style={{ color: 'var(--color-primary)' }}>Institution Exams</span>
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--muted)', margin: 0 }}>
              Published exams for your institution — paper sets assigned to <strong>{studentName}</strong> (Student ID: <strong style={{ color: 'var(--purple-l)' }}>{studentId}</strong>)
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--s1)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {subjectButtons.map(({ subject, count }) => {
              const isActive = selectedSubjectFilter === subject;

              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(subject)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '20px',
                    border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border)',
                    background: isActive ? 'var(--color-soft-orange)' : 'var(--s2)',
                    color: isActive ? 'var(--color-primary)' : 'var(--muted)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{subject === 'ALL' ? 'All Subjects' : subject}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(230,95,0,0.15)' : 'rgba(0,0,0,0.04)',
                    color: isActive ? '#fff' : 'var(--muted)',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ minWidth: '240px', flex: '1 1 240px', maxWidth: '340px' }}>
            <input
              type="text"
              aria-label="Search exams by name"
              placeholder="Search test by name..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="text-input"
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                background: 'var(--s2)',
                border: '1px solid var(--border)',
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: '12px', color: 'var(--red)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <AlertIcon size={18} style={{ color: 'var(--color-error)' }} />
              {error}
            </span>
            <button type="button" className="btn-outline small" onClick={fetchProfileAndExams}>Retry</button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            <p style={{ fontWeight: 600 }}>Loading available institution exams...</p>
          </div>
        )}

        {!loading && !error && filteredExamsList.length === 0 && (
          <div style={{
            background: 'var(--s1)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            color: 'var(--muted)',
          }}>
            <div style={{ marginBottom: '14px', color: 'var(--color-primary)' }}><ExamIcon size={40} /></div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '8px', fontWeight: 700 }}>
              {searchQuery || selectedSubjectFilter !== 'ALL' ? 'No Matching Exams Found' : 'No Published Exams Available'}
            </h3>
            <p style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {searchQuery || selectedSubjectFilter !== 'ALL'
                ? 'Try changing your subject filter or search keyword to find available institution exams.'
                : 'New institution exams will appear here as soon as they are assigned and published.'}
            </p>
            {(searchQuery || selectedSubjectFilter !== 'ALL') && (
              <button
                type="button"
                className="btn-outline small"
                style={{ marginTop: '16px' }}
                onClick={() => { setSelectedSubjectFilter('ALL'); setSearchQuery(''); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {!loading && filteredExamsList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredExamsList.flatMap(({ subject, exams }) =>
              exams.map((exam) => {
                const assignedSet = exam.sets?.find((set) => set.exam_set_id === exam.assigned_set_id);
                const examState = getStudentExamState(exam);
                const result = findStudentExamResult(exam, examHistory);
                const isCompleted = ['completed', 'retake'].includes(examState);

                const badgeColor = subject === 'Biology'
                  ? { bg: 'rgba(5,150,105,0.12)', text: '#059669', border: 'rgba(5,150,105,0.3)' }
                  : subject === 'Physics'
                    ? { bg: 'rgba(37,99,235,0.12)', text: '#2563eb', border: 'rgba(37,99,235,0.3)' }
                    : subject === 'Chemistry'
                      ? { bg: 'rgba(230,95,0,0.12)', text: '#E65F00', border: 'rgba(230,95,0,0.3)' }
                      : { bg: 'rgba(217,119,6,0.12)', text: '#d97706', border: 'rgba(217,119,6,0.3)' };

                return (
                  <div
                    key={exam.exam_id || exam.id || `${subject}-${exam.exam_name}-${exam.assigned_set_id || 'set'}`}
                    style={{
                      background: 'var(--s1)',
                      border: isCompleted ? '1px solid rgba(16,185,129,0.35)' : '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                      transition: 'all 0.25s ease',
                      boxShadow: 'var(--shadow)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: badgeColor.bg,
                            color: badgeColor.text,
                            border: `1px solid ${badgeColor.border}`,
                          }}>
                            {subject}
                          </span>
                          {isCompleted && (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}>
                              Completed
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {exam.duration_minutes || 60} Mins
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        {exam.exam_name || `${subject} Mock Exam`}
                      </h3>

                      <div style={{
                        background: 'var(--s2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '0.82rem',
                        color: 'var(--muted)',
                        marginBottom: '8px',
                      }}>
                        <div>
                          <span>Questions:</span>{' '}
                          <strong style={{ color: 'var(--text)' }}>{exam.question_count || 60} MCQs</strong>
                        </div>
                        <div>
                          <span>Max Marks:</span>{' '}
                          <strong style={{ color: 'var(--text)' }}>{exam.total_marks || 60} Marks</strong>
                        </div>
                        <div>
                          <span>Duration:</span>{' '}
                          <strong style={{ color: 'var(--color-primary)' }}>{exam.duration_minutes || 60} Mins</strong>
                        </div>
                        <div>
                          <span>Set:</span>{' '}
                          <strong style={{ color: 'var(--text)' }}>{assignedSet?.set_label || exam.assigned_set_label || 'A'}</strong>
                        </div>
                      </div>

                      {exam.scheduled_end && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>
                          Due {new Date(exam.scheduled_end).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div>
                      {examState === 'available' && assignedSet ? (
                        <Link
                          to={`/exam?set=${encodeURIComponent(exam.assigned_set_id)}&subject=${encodeURIComponent(subject)}&name=${encodeURIComponent(exam.exam_name || subject)}&label=${encodeURIComponent(exam.assigned_set_label || assignedSet.set_label || 'A')}`}
                          className="btn-primary"
                          style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          Start Exam →
                        </Link>
                      ) : examState === 'retake' && assignedSet ? (
                        <Link
                          to={`/exam?set=${encodeURIComponent(exam.assigned_set_id)}&subject=${encodeURIComponent(subject)}&name=${encodeURIComponent(exam.exam_name || subject)}&label=${encodeURIComponent(exam.assigned_set_label || assignedSet.set_label || 'A')}`}
                          className="btn-primary"
                          style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          Retake Exam →
                        </Link>
                      ) : isCompleted && result ? (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => setSelectedResult(result)}
                          style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          View Result →
                        </button>
                      ) : isCompleted ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled
                          style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '0.92rem', fontWeight: 700, cursor: 'not-allowed', opacity: 0.8, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                        >
                          Attempted
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled
                          style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}
                        >
                          {examState === 'upcoming' ? 'Not Started' : examState === 'expired' ? 'Expired' : 'Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        )}
      </div>

      {selectedResult && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10, 14, 24, 0.74)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 2000 }}>
          <div style={{ width: 'min(980px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '18px', boxShadow: '0 28px 64px rgba(15, 23, 42, 0.35)', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '20px 24px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#E65F00' }}>Exam Result</div>
                <h2 style={{ margin: '6px 0 0', fontSize: '1.6rem', color: '#1A365D' }}>{selectedResult.exam_name || selectedResult.name || 'Exam Result'}</h2>
              </div>
              <button type="button" onClick={() => setSelectedResult(null)} style={{ border: '1px solid rgba(26,54,93,0.2)', background: '#fff', color: '#1A365D', borderRadius: '10px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '22px' }}>
                <div style={{ background: '#FFF7F0', borderRadius: '12px', padding: '16px', border: '1px solid rgba(230,95,0,0.14)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Subject</div>
                  <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 800, color: '#1A365D' }}>{selectedResult.subject || selectedResult.subject_name || '—'}</div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid rgba(148,163,184,0.18)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Score</div>
                  <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 800, color: '#1A365D' }}>
                    {(selectedResult.score_obtained ?? selectedResult.score ?? selectedResult.correct_count ?? '—')} / {(selectedResult.total_marks ?? selectedResult.max_score ?? '—')}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid rgba(148,163,184,0.18)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Percentage</div>
                  <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 800, color: '#E65F00' }}>
                    {selectedResult.score_pct ?? selectedResult.percentage ?? '—'}
                  </div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid rgba(148,163,184,0.18)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Time Taken</div>
                  <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 800, color: '#1A365D' }}>
                    {selectedResult.time_taken ?? selectedResult.time_taken_sec ?? '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: '#EFFDF5', borderRadius: '12px', padding: '14px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ color: '#10B981', fontWeight: 700 }}>Correct</div>
                  <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 800 }}>{selectedResult.correct_count ?? selectedResult.correct_answers ?? '—'}</div>
                </div>
                <div style={{ background: '#FEF2F2', borderRadius: '12px', padding: '14px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ color: '#EF4444', fontWeight: 700 }}>Wrong</div>
                  <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 800 }}>{selectedResult.incorrect_count ?? selectedResult.wrong_answers ?? '—'}</div>
                </div>
                <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '14px', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <div style={{ color: '#D97706', fontWeight: 700 }}>Unanswered</div>
                  <div style={{ marginTop: '4px', fontSize: '1.1rem', fontWeight: 800 }}>{selectedResult.unanswered_count ?? selectedResult.skipped_count ?? '—'}</div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid rgba(148,163,184,0.2)' }}>
                  <div style={{ color: '#475569', fontWeight: 700 }}>Submitted</div>
                  <div style={{ marginTop: '4px', fontSize: '1rem', fontWeight: 700 }}>{selectedResult.submitted_at ?? selectedResult.completed_at ?? selectedResult.timestamp ?? selectedResult.date ?? '—'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(15, 23, 42, 0.08)', paddingTop: '18px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', color: '#1A365D' }}>Question Review</h3>
                {Array.isArray(selectedResult.question_review) && selectedResult.question_review.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {selectedResult.question_review.map((item, index) => {
                      const questionText = item.question_text || item.question || item.text || `Question ${index + 1}`;
                      const studentAnswer = item.selected_answer ?? item.student_answer ?? item.user_answer ?? item.selected_option ?? item.answer;
                      const correctAnswer = item.correct_answer ?? item.correct_option ?? item.answer_key ?? item.correct_option_label;
                      const explanation = item.explanation ?? item.solution ?? item.rationale ?? item.reason;
                      const status = item.is_correct === true ? '✓ Correct' : item.is_correct === false ? '✗ Wrong' : '— Unanswered';

                      return (
                        <div key={index} style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.2)' }}>
                          <div style={{ fontWeight: 800, color: '#1A365D', marginBottom: '8px' }}>Question {index + 1}</div>
                          <div style={{ marginBottom: '10px', color: '#0F172A', lineHeight: 1.6 }}>{questionText}</div>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            <div><strong>Your Answer:</strong> {studentAnswer ?? 'Not provided by backend'}</div>
                            <div><strong>Correct Answer:</strong> {correctAnswer ?? 'Not provided by backend'}</div>
                            <div><strong>Status:</strong> {status}</div>
                            {explanation ? <div><strong>Explanation:</strong> {explanation}</div> : <div><strong>Explanation:</strong> Not provided by backend</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ background: '#FFF7F0', borderRadius: '12px', border: '1px solid rgba(230,95,0,0.15)', padding: '18px', color: '#1A365D' }}>
                    <strong>Question-level result review is unavailable from the backend for this attempt.</strong>
                    <div style={{ marginTop: '8px', color: '#475569' }}>Only the real summary data is available, so the frontend is showing the score breakdown without fabricated answer-level details.</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '0 24px 24px' }}>
              <button type="button" className="btn-outline" onClick={() => setSelectedResult(null)} style={{ padding: '10px 18px' }}>Back to Exams</button>
              <button type="button" className="btn-primary" onClick={() => { setSelectedResult(null); navigate('/student/institution/exams'); }} style={{ padding: '10px 18px' }}>Take Another Exam</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentInstitutionExams;
