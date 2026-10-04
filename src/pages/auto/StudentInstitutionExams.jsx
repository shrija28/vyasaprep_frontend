import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateStudentId } from '../../utils/studentId';
import { normalizeExamSubjects, subscribeToExamChanges } from '../../utils/examStore';
import { findStudentExamResult, flattenStudentExams, getStudentExamState } from '../../utils/studentExamAccess';

const StudentInstitutionExams = () => {
  const [subjects, setSubjects] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [studentName, setStudentName] = useState('Student');
  const [studentId, setStudentId] = useState('STD-001');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      // Fetch from backend-authorized student exams endpoint exclusively
      const res = await fetch('/api/student/exams', { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load exams permitted for this student.');
      const data = await res.json();
      const fetchedList = flattenStudentExams(data);

      const historyResponse = await fetch('/api/student/dashboard-stats', { credentials: 'include' });
      const historyData = historyResponse.ok ? await historyResponse.json().catch(() => ({})) : {};
      setExamHistory(Array.isArray(historyData.examHistory)
        ? historyData.examHistory
        : Array.isArray(historyData.exam_history) ? historyData.exam_history : []);

      const publishedList = fetchedList.filter(ex => ex && ex.is_published !== false);
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

  return (
    <>
      <div className="bg-mesh"></div>

      <main className="dash-main">
        <div className="dash-hero">
          <div>
            <h1 className="dash-title">
              Institution <span className="hero-gradient">Exams</span>
            </h1>
            <p className="dash-sub">
              Published exams for your institution — paper sets assigned to <strong>{studentName}</strong> (Student ID: <strong style={{ color: 'var(--purple-l)' }}>{studentId}</strong>)
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: '8px', color: 'var(--red)', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
            Loading available institution exams...
          </div>
        ) : (
          <div id="examsContainer">
            {subjects.length === 0 ? (
              <div className="section-card">
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📝</div>
                  <h3>No Published Exams Available Yet</h3>
                  <p style={{ marginTop: '6px' }}>Exams published by your institution will appear here automatically.</p>
                </div>
              </div>
            ) : (
              subjects.map((subjGroup) => (
                <div key={subjGroup.subject} className="section-card" style={{ marginBottom: '24px' }}>
                  <div className="section-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h2 style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
                      📚 {subjGroup.subject}
                    </h2>
                    <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {subjGroup.available_exams} {subjGroup.available_exams === 1 ? 'Exam' : 'Exams'} Available
                    </span>
                  </div>

                  <div className="section-body" style={{ padding: 0 }}>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {subjGroup.exams.map((exam) => {
                        const assignedSet = exam.sets?.find((set) => set.exam_set_id === exam.assigned_set_id);
                        const examState = getStudentExamState(exam);
                        const result = findStudentExamResult(exam, examHistory);
                        const stateLabels = {
                          completed: 'Completed',
                          retake: 'Completed',
                          expired: 'Expired',
                          upcoming: 'Not Started',
                          unavailable: 'Unavailable',
                        };
                        const stateColor = ['completed', 'retake'].includes(examState)
                          ? { background: 'rgba(16,185,129,0.13)', color: '#10b981' }
                          : examState === 'expired'
                            ? { background: 'rgba(148,163,184,0.12)', color: 'var(--muted)' }
                            : { background: 'rgba(234,179,8,0.12)', color: '#eab308' };

                        return (
                          <li
                            key={exam.exam_id || exam.id}
                            style={{
                              padding: '20px',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '16px',
                            }}
                          >
                            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px', minWidth: 0 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--blue)' }}>
                                  {exam.exam_name || `${subjGroup.subject} Examination`}
                                </div>
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(230, 95, 0, 0.15)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                  60 MCQs
                                </span>
                                {examState !== 'available' && (
                                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', ...stateColor, fontWeight: 700 }}>
                                    {['completed', 'retake'].includes(examState) ? '✓ ' : ''}{stateLabels[examState]}
                                  </span>
                                )}
                              </div>
                              {['completed', 'retake'].includes(examState) && (
                                <div style={{ fontSize: '0.82rem', color: 'var(--green-l)', marginTop: '5px' }}>
                                  {Number.isFinite(Number(exam.attempts_used)) && exam.attempts_used !== null
                                    ? `${exam.attempts_used} attempt${Number(exam.attempts_used) === 1 ? '' : 's'} used`
                                    : 'Attempt submitted.'}
                                </div>
                              )}
                              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
                                Subject: <strong style={{ color: 'var(--text)' }}>{subjGroup.subject}</strong> • ⏱ {exam.duration_minutes || 60} Mins • Target Max Marks: {exam.total_marks || 60}
                                {assignedSet && <span style={{ marginLeft: '10px' }}>Set {assignedSet.set_label}</span>}
                                {exam.scheduled_start && examState === 'upcoming' && (
                                  <span style={{ marginLeft: '10px', color: '#eab308' }}>
                                    Available {new Date(exam.scheduled_start).toLocaleString()}
                                  </span>
                                )}
                                {exam.scheduled_end && (
                                  <span style={{ marginLeft: '10px', color: examState === 'expired' ? 'var(--muted)' : '#eab308' }}>
                                    Due {new Date(exam.scheduled_end).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ flex: '0 1 auto', minWidth: '130px' }}>
                              {examState === 'available' && assignedSet && (
                                <Link
                                  to={`/exam?set=${encodeURIComponent(exam.assigned_set_id)}&subject=${encodeURIComponent(subjGroup.subject)}&name=${encodeURIComponent(exam.exam_name || subjGroup.subject)}&label=${encodeURIComponent(exam.assigned_set_label || assignedSet.set_label || 'A')}`}
                                  className="btn-primary"
                                  style={{ minWidth: '130px', textAlign: 'center', display: 'block' }}
                                >
                                  Take Set {exam.assigned_set_label || assignedSet.set_label} →
                                </Link>
                              )}
                              {examState === 'retake' && assignedSet && (
                                <Link
                                  to={`/exam?set=${encodeURIComponent(exam.assigned_set_id)}&subject=${encodeURIComponent(subjGroup.subject)}&name=${encodeURIComponent(exam.exam_name || subjGroup.subject)}&label=${encodeURIComponent(exam.assigned_set_label || assignedSet.set_label || 'A')}`}
                                  className="btn-primary"
                                  style={{ minWidth: '130px', textAlign: 'center', display: 'block' }}
                                >
                                  Retake Exam →
                                </Link>
                              )}
                              {['completed', 'retake'].includes(examState) && result && (
                                <Link to="/dashboard" className="btn-primary" style={{ minWidth: '130px', textAlign: 'center', display: 'block' }}>
                                  View Result →
                                </Link>
                              )}
                              {['completed', 'retake'].includes(examState) && !result && (
                                <span style={{ display: 'block', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', padding: '9px 12px' }}>
                                  Result Pending
                                </span>
                              )}
                              {examState === 'upcoming' && <span style={{ display: 'block', textAlign: 'center', color: '#eab308', fontSize: '0.85rem', padding: '9px 12px' }}>Not Started</span>}
                              {['expired', 'unavailable'].includes(examState) && <span style={{ display: 'block', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', padding: '9px 12px' }}>{stateLabels[examState]}</span>}
                              {examState === 'available' && !assignedSet && <span style={{ display: 'block', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', padding: '9px 12px' }}>Unavailable</span>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </>
  );
};

export default StudentInstitutionExams;
