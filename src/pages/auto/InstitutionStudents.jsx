import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CrossIcon } from '../../components/icons';
import { generateStudentId } from '../../utils/studentId';

const InstitutionStudents = () => {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteBatchId, setInviteBatchId] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Filter
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Batches
      const batchRes = await fetch('/api/institution/batches', { credentials: 'include' });
      if (batchRes.ok) {
        const bData = await batchRes.json();
        setBatches(bData.batches || []);
      }

      // 2. Fetch Students
      const stuRes = await fetch('/api/institution/students', { credentials: 'include' });
      if (stuRes.ok) {
        const sData = await stuRes.json();
        setStudents(sData.students || []);
      }

      // 3. Fetch Invitations
      const invRes = await fetch('/api/institution/invitations', { credentials: 'include' });
      if (invRes.ok) {
        const iData = await invRes.json();
        setInvitations(iData.invitations || []);
      }
    } catch (err) {
      setError('Unable to load institution data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    setCreatingBatch(true);
    setError('');
    try {
      const res = await fetch('/api/institution/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newBatchName.trim(), description: newBatchDesc.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Batch "${data.name}" created successfully!`);
        setShowBatchModal(false);
        setNewBatchName('');
        setNewBatchDesc('');
        fetchData();
      } else {
        setError(data.message || 'Failed to create batch');
      }
    } catch {
      setError('Network error creating batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId, batchName) => {
    if (!window.confirm(`Are you sure you want to delete "${batchName}"? Students in this batch will be unassigned.`)) return;
    try {
      const res = await fetch(`/api/institution/batches/${batchId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSuccessMsg(`Batch "${batchName}" deleted.`);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete batch');
      }
    } catch {
      setError('Network error deleting batch');
    }
  };

  const handleAssignBatch = async (studentId, batchId) => {
    try {
      const res = await fetch(`/api/institution/students/${studentId}/batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batch_id: batchId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Student batch updated to "${data.batch_name || 'Unassigned'}"`);
        setStudents((prev) =>
          prev.map((s) =>
            s.user_id === studentId ? { ...s, batch_id: data.batch_id, batch_name: data.batch_name } : s
          )
        );
      }
    } catch {
      setError('Failed to update student batch');
    }
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from your institution?`)) return;
    try {
      const res = await fetch(`/api/institution/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSuccessMsg(`Student removed from institution.`);
        fetchData();
      }
    } catch {
      setError('Failed to remove student');
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    setError('');
    try {
      const res = await fetch('/api/institution/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batch_id: inviteBatchId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedInvite(data);
        fetchData();
      } else {
        setError(data.message || 'Failed to generate invitation');
      }
    } catch {
      setError('Network error generating invitation');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const [selectedStudent, setSelectedStudent] = useState(null);
  const filteredStudents = selectedBatchFilter === 'all'
    ? students
    : students.filter((student) => String(student.batch_id || '') === String(selectedBatchFilter));

  return (
    <>
      <div className="bg-mesh"></div>

      <main className="institution-page" id="studentsPage">
        <header className="institution-page-header">
          <div>
            <h1 className="institution-page-title">
              Manage <span className="institution-page-title-accent">Students</span>
            </h1>
            <p className="institution-page-sub">
              Onboard, organize into batches, and view details for all institution students
            </p>
          </div>
          <div className="institution-page-actions" style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn-institution"
              onClick={() => {
                setGeneratedInvite(null);
                setShowInviteModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              Invite Student
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid var(--red)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--red-l)' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div role="status" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid var(--green)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: 'var(--green-l)' }}>
            {successMsg}
          </div>
        )}

        {/* 2. Linked Students Table */}
        <section className="section-card">
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="section-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div>
                <h2>Enrolled Students ({students.length})</h2>
                <p className="section-sub">View all registered institution students and their profile details</p>
              </div>
            </div>
            <select
              className="text-input"
              aria-label="Filter students by batch"
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '160px' }}
            >
              <option value="all">All batches</option>
              {batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.name}</option>)}
            </select>
          </div>

          <div className="section-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                No students found. Click "Invite Student" to add members.
              </div>
            ) : (
              <div className="responsive-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Batch / Group</th>
                      <th>Linked Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, index) => {
                      const studentIdDisplay = generateStudentId({ ...s, is_institutional: true }, index);
                      return (
                        <tr key={s.user_id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{s.display_name}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>ID: {studentIdDisplay}</span>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{s.email}</td>
                          <td>
                            <select
                              className="text-input"
                              value={s.batch_id || ''}
                              onChange={(e) => handleAssignBatch(s.user_id, e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
                            >
                              <option value="">Unassigned</option>
                              {batches.map((b) => (
                                <option key={b.batch_id} value={b.batch_id}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                            {s.linked_at ? new Date(s.linked_at).toLocaleDateString() : 'Today'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn-institution-outline"
                                onClick={() => setSelectedStudent(s)}
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              >
                                View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(s.user_id, s.display_name)}
                                style={{ background: 'none', border: 'none', color: 'var(--red-l)', cursor: 'pointer', fontSize: '0.82rem', padding: '4px 6px' }}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* 3. Pending Invitations Table */}
        <section className="section-card" style={{ marginTop: '24px' }}>
          <div className="section-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Pending Invitations ({invitations.filter(i => i.status === 'pending').length})</h2>
              <p className="section-sub">Unclaimed invitation codes waiting for students to register</p>
            </div>
          </div>
          <div className="section-body" style={{ padding: 0 }}>
            {invitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                No active invitations. Click "Invite Student" to generate a code or link.
              </div>
            ) : (
              <div className="responsive-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Invite Code</th>
                      <th>Status</th>
                      <th>Expires At</th>
                      <th style={{ textAlign: 'right' }}>Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.slice(0, 10).map((inv, idx) => {
                      return (
                        <tr key={idx}>
                          <td>
                            <span style={{ fontFamily: 'monospace', background: 'var(--color-soft-orange)', color: 'var(--color-primary)', padding: '3px 6px', borderRadius: '4px' }}>
                              {inv.code.slice(0, 16)}...
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.78rem',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: inv.status === 'pending' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: inv.status === 'pending' ? '#eab308' : '#10b981',
                            }}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                            {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '7 days'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-institution-outline"
                              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                              onClick={() => {
                                const url = `${window.location.origin}/invitation-accept?code=${encodeURIComponent(inv.code)}`;
                                copyToClipboard(url, 'link');
                              }}
                            >
                              Copy Link
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal: Invite Student */}
      {showInviteModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-dialog" style={{ width: '480px', maxWidth: '90vw', background: '#13141f', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text)' }}>Invite Student to Institution</h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {!generatedInvite ? (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '16px' }}>
                  Generate a single-use onboarding link for a student to join your institution.
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn-institution-outline"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-institution"
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite}
                  >
                    {generatingInvite ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--green)', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: 'var(--green-l)', fontSize: '0.85rem' }}>
                   Invitation created! Valid for 7 days.
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Direct Student Invitation Link:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="text-input"
                      readOnly
                      style={{ flex: 1, fontSize: '0.82rem' }}
                      value={`${window.location.origin}/invitation-accept?code=${encodeURIComponent(generatedInvite.code)}`}
                    />
                    <button
                      type="button"
                      className="btn-institution"
                      style={{ padding: '6px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                      onClick={() => copyToClipboard(`${window.location.origin}/invitation-accept?code=${encodeURIComponent(generatedInvite.code)}`, 'link')}
                    >
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Invitation Code:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="text-input"
                      readOnly
                      style={{ flex: 1, fontSize: '0.85rem', fontFamily: 'monospace' }}
                      value={generatedInvite.code}
                    />
                    <button
                      type="button"
                      className="btn-institution-outline"
                      style={{ padding: '6px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                      onClick={() => copyToClipboard(generatedInvite.code, 'code')}
                    >
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-institution"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Student Details Modal */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--card-bg, #0f172a)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#fff', fontWeight: 'bold' }}>
                  {(selectedStudent.display_name || 'S')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)' }}>{selectedStudent.display_name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    ID: {generateStudentId({ ...selectedStudent, is_institutional: true })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close student details"
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.4rem', cursor: 'pointer', padding: '0 4px' }}
              >
                <CrossIcon size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Email Address:</span>
                <strong style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{selectedStudent.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Membership Status:</span>
                <span className="badge badge-active" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>Active Member</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Account Subtype:</span>
                <strong style={{ color: 'var(--cyan-l)' }}>Institutional Student</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Assigned Batch:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{selectedStudent.batch_name || 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--muted)' }}>Joined Date:</span>
                <strong style={{ color: 'var(--text)' }}>
                  {selectedStudent.linked_at ? new Date(selectedStudent.linked_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Today'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  handleRemoveStudent(selectedStudent.user_id, selectedStudent.display_name);
                  setSelectedStudent(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--red-l)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Remove Student
              </button>
              <button
                type="button"
                className="btn-institution"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstitutionStudents;
