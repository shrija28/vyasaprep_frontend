export const isInstitutionLinkedStudent = (profile = null) => {
  if (!profile) return false;

  const accountTypes = [
    profile?.student_subtype,
    profile?.account_type,
    profile?.user_type,
    profile?.role,
    profile?.type,
  ].map((value) => String(value || '').toLowerCase());

  return accountTypes.some((type) => ['institutional', 'institution_student', 'institution', 'institution_linked'].includes(type)) || Boolean(
    profile?.institution_id ||
    profile?.institution?.id ||
    profile?.institution_name ||
    profile?.institution?.name ||
    profile?.student?.institution_id ||
    profile?.student?.institution_name ||
    profile?.join_code
  );
};

export const flattenStudentExams = (data) => {
  if (Array.isArray(data?.subjects)) {
    return data.subjects.flatMap((group) => (group.exams || []).map((exam) => ({
      ...exam,
      subject: exam.subject || group.subject,
    })));
  }
  if (Array.isArray(data?.exams)) return data.exams;
  if (Array.isArray(data?.data)) return data.data;
  return Array.isArray(data) ? data : [];
};

export const getStudentExamState = (exam, now = Date.now()) => {
  if (!exam) return 'unavailable';

  const attemptsUsed = Number(exam.attempts_used);
  const attempted = exam.attempted === true || attemptsUsed > 0 || Boolean(exam.submission_id);
  const canAttempt = exam.can_attempt === true;
  const startsAt = exam.scheduled_start ? Date.parse(exam.scheduled_start) : NaN;
  const endsAt = exam.scheduled_end ? Date.parse(exam.scheduled_end) : NaN;

  if (attempted && !canAttempt) return 'completed';
  if (Number.isFinite(startsAt) && startsAt > now) return 'upcoming';
  if (Number.isFinite(endsAt) && endsAt < now) return 'expired';
  if (attempted && canAttempt) return 'retake';
  if (!attempted && canAttempt) return 'available';
  return 'unavailable';
};

const hasActualResult = (record) => {
  const score = record?.score_pct ?? record?.percentage ?? record?.score_obtained ?? record?.score;
  if (score === null || score === undefined || score === '') return false;
  if (Number.isFinite(Number(score))) return true;
  return typeof score === 'string' && score.trim().endsWith('%') && Number.isFinite(Number.parseFloat(score));
};

export const findStudentExamResult = (exam, history = []) => {
  if (!exam || !Array.isArray(history)) return null;

  const assignedSetId = String(exam.assigned_set_id || '');
  const submissionId = String(exam.submission_id || '');
  if (!assignedSetId && !submissionId) return null;

  return history.find((record) => {
    if (!hasActualResult(record)) return false;
    const recordSetId = String(record.exam_set_id || '');
    const recordSubmissionId = String(record.submission_id || record.attempt_id || record.id || '');
    return (assignedSetId && recordSetId === assignedSetId) ||
      (submissionId && recordSubmissionId === submissionId);
  }) || null;
};