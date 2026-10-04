                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    import React, { useCallback, useState, useEffect } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

import { extractStudentName, generateStudentId } from '../../utils/studentId';
import {
  AIIcon,
  ChartIcon,
  CheckmarkIcon,
  DocumentIcon,
  ExamIcon,
  InstitutionsIcon,
  LightningIcon,
  QuestionsIcon,
  SirenIcon,
  TrophyIcon,
} from '../../components/icons';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatPercentage = (value) => {
  const number = toFiniteNumber(value);
  return number === null ? '—' : `${Number.isInteger(number) ? number : number.toFixed(1)}%`;
};

const ChartEmptyState = ({ title, description }) => (
  <div className="chart-empty-state" role="status">
    <span className="chart-empty-icon" aria-hidden="true"><ChartIcon size={18} /></span>
    <span className="chart-empty-copy">
      <strong>{title}</strong>
      <span>{description}</span>
    </span>
  </div>
);

const normalizeAttempt = (attempt, index) => {
  const score = toFiniteNumber(attempt.score ?? attempt.score_obtained);
  const total = toFiniteNumber(attempt.total_marks ?? attempt.max_score);
  const percentage = toFiniteNumber(attempt.score_pct ?? attempt.percentage) ?? (score !== null && total > 0 ? Math.round((score / total) * 100) : null);
  const submittedAt = attempt.submitted_at || attempt.completed_at || attempt.date || '';
  const submittedDate = submittedAt ? new Date(submittedAt) : null;
  const elapsedSeconds = toFiniteNumber(attempt.time_taken_sec ?? attempt.timeTakenSec);
  const rawStatus = String(attempt.status || '').trim();
  const normalizedStatus = rawStatus.toLowerCase();
  const attemptId = attempt.attempt_id || attempt.submission_id || attempt.id ||
    (attempt.exam_set_id && submittedAt ? `${attempt.exam_set_id}:${submittedAt}` : `${attempt.exam_name || 'exam'}:${submittedAt || index}`);

  return {
    ...attempt,
    attemptId: String(attemptId),
    subject: String(attempt.subject || attempt.subject_name || '—'),
    exam_name: String(attempt.exam_name || attempt.name || 'Exam'),
    percentage,
    scoreLabel: typeof attempt.score === 'string' && attempt.score.trim().endsWith('%')
      ? attempt.score
      : percentage !== null ? `${percentage}%` : score !== null && total !== null ? `${score}/${total}` : '—',
    timeSeconds: elapsedSeconds,
    timeLabel: typeof attempt.time === 'string' ? attempt.time : elapsedSeconds !== null
      ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`
      : '—',
    status: normalizedStatus === 'pass' ? 'Pass' : normalizedStatus === 'fail' ? 'Fail' : rawStatus || '—',
    dateLabel: submittedDate && !Number.isNaN(submittedDate.getTime())
      ? submittedDate.toLocaleDateString()
      : submittedAt || '—',
  };
};

const Dashboard = () => {
  const location = useLocation();
  const { studentProfile: currentStudent } = useOutletContext();
  const [data, setData] = useState(null);
  const [dataError, setDataError] = useState('');
  const [dashboardDataReady, setDashboardDataReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('—');
  const studentProfile = currentStudent ? {
    name: extractStudentName(currentStudent),
    id: generateStudentId(currentStudent),
    institutionName: currentStudent.institution_name || currentStudent.institution?.name || null,
  } : { name: 'Student', id: '—' };

  // Filters & Search
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // KCET College Predictor based on Rank
  const [predictorRank, setPredictorRank] = useState('');
  const [predictorCategory, setPredictorCategory] = useState('GM');
  const [predictorLocation, setPredictorLocation] = useState('all');
  const [predictorLoading, setPredictorLoading] = useState(false);
  const [predictionResults, setPredictionResults] = useState(null);
  const [predictorError, setPredictorError] = useState('');
  const [activePredictionTab, setActivePredictionTab] = useState('all');
  const [weakAreasExpanded, setWeakAreasExpanded] = useState(false);

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const statsResponse = await fetch('/api/student/dashboard-stats', { credentials: 'include' });
      if (!statsResponse.ok) throw new Error('Student performance data is temporarily unavailable.');
      const apiData = await statsResponse.json();
      const apiHistory = apiData?.examHistory ?? apiData?.exam_history;
      const examHistory = (Array.isArray(apiHistory) ? apiHistory : []).filter(Boolean).map(normalizeAttempt);
      const apiKpis = apiData?.kpis || {};
      const aiAnalysis = apiData?.aiAnalysis ?? apiData?.ai_analysis ?? apiData?.performanceAnalysis ?? apiData?.performance_analysis ?? null;
      setDataError('');
      setData({
        has_data: examHistory.length > 0,
        kpis: {
          examsTaken: toFiniteNumber(apiKpis.examsTaken ?? apiKpis.exams_taken),
          submissions: toFiniteNumber(apiKpis.submissions),
          avgScore: toFiniteNumber(apiKpis.avgScore ?? apiKpis.avg_score),
          passRate: toFiniteNumber(apiKpis.passRate ?? apiKpis.pass_rate),
          avgTime: toFiniteNumber(apiKpis.avgTime ?? apiKpis.avg_time ?? apiKpis.averageTime),
          rank: apiKpis.rank ?? apiData?.rank ?? '—',
          rankHint: apiKpis.rankHint ?? apiData?.rank_hint ?? '',
        },
        aiAnalysis,
        examHistory,
      });
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      setDataError(error.message || 'Student performance data is temporarily unavailable.');
      console.error('Failed to fetch real dashboard metrics.');
    } finally {
      setDashboardDataReady(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);

    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('exam-submitted', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('exam-submitted', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    if (location.hash === '#performance') {
      if (!dashboardDataReady) return;

      const frame = window.requestAnimationFrame(() => {
        document.getElementById('performance')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.hash, dashboardDataReady]);

  const handlePredictColleges = async (rankOverride = null) => {
    const targetRank = rankOverride !== null ? rankOverride : predictorRank;
    if (!targetRank || parseInt(targetRank, 10) <= 0) {
      setPredictorError('Please enter a valid KCET rank number greater than 0.');
      return;
    }
    setPredictorLoading(true);
    setPredictorError('');
    try {
      const res = await fetch(
        `/api/student/predict-colleges?rank=${encodeURIComponent(targetRank)}&category=${encodeURIComponent(predictorCategory)}&location=${encodeURIComponent(predictorLocation)}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const json = await res.json();
        setPredictionResults(json);
        if (json.matches?.safe?.length > 0) {
          setActivePredictionTab('safe');
        } else if (json.matches?.target?.length > 0) {
          setActivePredictionTab('target');
        } else {
          setActivePredictionTab('reach');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        setPredictorError(errJson.message || 'Unable to predict colleges for this rank.');
      }
    } catch {
      setPredictorError('Network error while predicting colleges.');
    } finally {
      setPredictorLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#475569' }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(26,54,93,0.1)' },
        ticks: { color: '#475569' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#475569' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#475569' }
      }
    },
    cutout: '70%'
  };

  // Apply the same filters to metrics, charts, and history.
  const filteredHistory = (data?.examHistory || []).filter(h => {
    if (selectedSubject !== 'all' && h.subject.toLowerCase() !== selectedSubject.toLowerCase()) return false;
    if (selectedStatus !== 'all' && h.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchSubj = h.subject.toLowerCase().includes(term);
      const matchName = (h.exam_name || '').toLowerCase().includes(term);
      if (!matchSubj && !matchName) return false;
    }
    return true;
  });

  const scoredAttempts = filteredHistory.filter((attempt) => attempt.percentage !== null);
  const statusAttempts = filteredHistory.filter((attempt) => ['Pass', 'Fail'].includes(attempt.status));
  const timedAttempts = filteredHistory.filter((attempt) => attempt.timeSeconds !== null);
  const passCount = statusAttempts.filter((attempt) => attempt.status === 'Pass').length;
  const hasActiveFilters = selectedSubject !== 'all' || selectedStatus !== 'all' || Boolean(searchTerm.trim());
  const filteredKpis = {
    examsTaken: filteredHistory.length,
    submissions: filteredHistory.length,
    avgScore: scoredAttempts.length
      ? Math.round(scoredAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / scoredAttempts.length)
      : null,
    passRate: statusAttempts.length ? Math.round((passCount / statusAttempts.length) * 100) : null,
    avgTime: timedAttempts.length
      ? Math.round(timedAttempts.reduce((sum, attempt) => sum + attempt.timeSeconds, 0) / timedAttempts.length / 60)
      : null,
    rank: data?.kpis?.rank ?? '—',
  };
  const visibleKpis = hasActiveFilters && data ? filteredKpis : {
    examsTaken: data?.kpis?.examsTaken,
    submissions: data?.kpis?.submissions,
    avgScore: data?.kpis?.avgScore,
    passRate: data?.kpis?.passRate,
    avgTime: data?.kpis?.avgTime,
    rank: data?.kpis?.rank ?? '—',
  };

  const subjectScores = new Map();
  scoredAttempts.forEach((attempt) => {
    if (attempt.subject === '—') return;
    const scores = subjectScores.get(attempt.subject) || [];
    scores.push(attempt.percentage);
    subjectScores.set(attempt.subject, scores);
  });
  const subjectAverages = Array.from(subjectScores, ([subject, scores]) => ({
    subject,
    score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
  }));
  const derivedAnalysis = {
    strong_areas: subjectAverages.filter(({ score }) => score >= 75).map(({ subject, score }) => `${subject} (${score}%)`),
    can_improve_areas: subjectAverages.filter(({ score }) => score >= 50 && score < 75).map(({ subject, score }) => `${subject} (${score}%)`),
    weak_areas: subjectAverages.filter(({ score }) => score < 50).map(({ subject, score }) => `${subject} (${score}%)`),
  };
  const hasApiAnalysis = ['strong_areas', 'can_improve_areas', 'weak_areas'].some((key) =>
    Array.isArray(data?.aiAnalysis?.[key]) && data.aiAnalysis[key].length > 0
  );
  const performanceAnalysis = !hasActiveFilters && scoredAttempts.length > 0 && hasApiAnalysis ? data.aiAnalysis : derivedAnalysis;
  const hasPerformanceAnalysis = filteredHistory.length > 0 && scoredAttempts.length > 0;
  const hasAnyHistory = (data?.examHistory || []).length > 0;
  const scoreEmptyDescription = filteredHistory.length > 0
    ? 'No valid score data was returned for these attempts.'
    : hasAnyHistory ? 'Try clearing or changing the current filters.' : '';
  const subjectEmptyState = {
    title: scoreEmptyDescription
      ? filteredHistory.length > 0 ? 'Score data unavailable' : 'No matching attempts'
      : 'Subject performance will appear here',
    description: scoreEmptyDescription || 'Complete a scored exam to start tracking your subject-wise performance.',
  };
  const progressionEmptyState = {
    title: scoreEmptyDescription
      ? filteredHistory.length > 0 ? 'Score data unavailable' : 'No matching attempts'
      : 'Score progression will appear here',
    description: scoreEmptyDescription || 'Complete a scored exam to start tracking your progress.',
  };
  const statusEmptyState = {
    title: filteredHistory.length > 0
      ? 'Pass/fail status unavailable'
      : hasAnyHistory ? 'No matching attempts' : 'Pass vs Fail will appear here',
    description: filteredHistory.length > 0
      ? 'These attempts do not include a recorded result.'
      : hasAnyHistory ? 'Try clearing or changing the current filters.' : 'Complete an exam with a recorded result to see this breakdown.',
  };
  const rankValue = String(visibleKpis.rank || '').trim();
  const rankLabel = rankValue && rankValue !== '—' ? (rankValue.startsWith('#') ? rankValue : `#${rankValue}`) : '—';
  const strongAreas = Array.isArray(performanceAnalysis?.strong_areas) ? performanceAnalysis.strong_areas : [];
  const improveAreas = Array.isArray(performanceAnalysis?.can_improve_areas) ? performanceAnalysis.can_improve_areas : [];
  const weakAreas = Array.isArray(performanceAnalysis?.weak_areas) ? performanceAnalysis.weak_areas : [];
  const visibleWeakAreas = weakAreasExpanded ? weakAreas : weakAreas.slice(0, 5);

  const subjectChartRows = subjectAverages;
  const topicChartData = subjectChartRows.length > 0 ? {
    labels: subjectChartRows.map(({ subject }) => subject),
    datasets: [{
      label: 'Average Score (%)',
      data: subjectChartRows.map(({ score }) => score),
      backgroundColor: 'rgba(230, 95, 0, 0.65)',
      borderColor: 'rgba(230, 95, 0, 1)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  } : null;
  const progressionAttempts = [...scoredAttempts].sort((first, second) => {
    const firstTime = Date.parse(first.submitted_at || first.completed_at || first.date || '');
    const secondTime = Date.parse(second.submitted_at || second.completed_at || second.date || '');
    if (!Number.isFinite(firstTime)) return Number.isFinite(secondTime) ? -1 : 0;
    if (!Number.isFinite(secondTime)) return 1;
    return firstTime - secondTime;
  }).slice(-7);
  const setChartData = progressionAttempts.length > 0 ? {
    labels: progressionAttempts.map((attempt) => attempt.exam_name),
    datasets: [{
      label: 'Score (%)',
      data: progressionAttempts.map((attempt) => attempt.percentage),
      borderColor: '#1A365D',
      backgroundColor: 'rgba(26, 54, 93, 0.12)',
      fill: true,
      tension: 0.25,
      pointRadius: 4,
      pointBackgroundColor: '#E65F00',
    }],
  } : null;
  const passFailChartData = statusAttempts.length > 0 ? {
    labels: ['Pass', 'Fail'],
    datasets: [{
      data: [passCount, statusAttempts.length - passCount],
      backgroundColor: ['#25855A', '#C64D43'],
      borderWidth: 0,
    }],
  } : null;

  const kpiCards = [
    { label: 'Exams Taken', value: visibleKpis.examsTaken ?? '—', Icon: ExamIcon, tone: 'orange' },
    { label: 'Submissions', value: visibleKpis.submissions ?? '—', Icon: DocumentIcon, tone: 'navy' },
    { label: 'Average Score', value: formatPercentage(visibleKpis.avgScore), Icon: ChartIcon, tone: 'yellow' },
    { label: 'Pass Rate', value: formatPercentage(visibleKpis.passRate), Icon: CheckmarkIcon, tone: 'green' },
    { label: 'Average Time', value: visibleKpis.avgTime == null ? '—' : `${visibleKpis.avgTime}m`, Icon: LightningIcon, tone: 'navy' },
    { label: 'Rank', value: rankLabel, Icon: TrophyIcon, tone: 'orange', detail: data?.kpis?.rankHint },
  ];

  return (
    <>
      <main className="dash-main direct-student-dashboard">
        {/* Hero Header */}
        <div className="dash-hero">
          <div>
            <h1 className="dash-title">My <span className="hero-gradient">Dashboard</span></h1>
            <p className="dash-sub" id="dashSubtitle">Your live performance analytics calculated from your actual exam attempts</p>
          </div>
          <div className="dash-hero-right">
            <div className="last-updated" id="lastUpdated">Last updated: {lastUpdated}</div>
            <button className="btn-outline" onClick={() => fetchDashboardData()} disabled={loading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {dataError && <p role="alert" style={{ color: '#991B1B', background: '#FEF2F2', padding: '12px 16px', borderRadius: '8px' }}>{dataError}</p>}

        {/* Student Profile Card */}
        <div className="section-card student-profile-summary" style={{ marginBottom: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Student Profile
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Name:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text)' }} id="studentName">
                    {studentProfile.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>KCET Student ID:</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-primary)' }} id="studentKcetId">
                    {studentProfile.id}
                  </div>
                </div>
                {studentProfile.institutionName && (
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Institution:</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-primary)' }} id="studentInstitution">
                      <InstitutionsIcon size={18} /> {studentProfile.institutionName}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {data && !data.has_data && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-soft-orange)', border: '1px solid var(--color-light-orange)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', color: 'var(--color-primary-hover)' }}>
                <AIIcon size={18} />
                <span>
                  Complete an exam to see your recorded scores and subject insights.{' '}
                  <Link to="/exam" style={{ color: 'inherit', fontWeight: 700 }}>Browse available exams</Link>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Dashboard Content */}
        <div id="dashContent">
          {/* Filter Bar */}
          <div className="dash-filters section-card student-dashboard-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label className="input-label" htmlFor="filterSubject">Subject</label>
                <select id="filterSubject" className="select-input" value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
                  <option value="all">All Subjects</option>
                  <option value="Biology">Biology</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="input-label" htmlFor="filterStatus">Status</label>
                <select id="filterStatus" className="select-input" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                  <option value="all">All</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attempt-derived KPIs */}
          <div className="kpi-row" id="kpiRow">
            {kpiCards.map(({ label, value, Icon, tone, detail }, index) => (
              <article className="kpi-tile" key={label}>
                <span className={`kpi-tile-icon ${tone}`} aria-hidden="true"><Icon size={19} /></span>
                <div className="kpi-tile-body">
                  <div className="kpi-tile-val" id={['kpiStudents', 'kpiSubmissions', 'kpiAvgScore', 'kpiPassRate', 'kpiAvgTime', 'kpiRankValue'][index]}>{value}</div>
                  <div className="kpi-tile-label">{label}</div>
                  {detail && <div className="kpi-tile-hint" id="kpiRankHint">{detail}</div>}
                </div>
              </article>
            ))}
          </div>

          {/* Charts from the same filtered attempts as the KPIs. */}
          <div className="student-chart-grid">
            <section className={`chart-card section-card student-chart-card ${topicChartData ? 'has-chart-data' : 'has-chart-empty'}`}>
              <div className="chart-card-header"><h3>Subject Performance</h3></div>
              <div className="chart-wrap">
                {topicChartData ? <Bar data={topicChartData} options={chartOptions} /> : <ChartEmptyState {...subjectEmptyState} />}
              </div>
            </section>
            <section className={`chart-card section-card student-chart-card ${setChartData ? 'has-chart-data' : 'has-chart-empty'}`}>
              <div className="chart-card-header"><h3>Score Progression</h3></div>
              <div className="chart-wrap">
                {setChartData ? <Line data={setChartData} options={chartOptions} /> : <ChartEmptyState {...progressionEmptyState} />}
              </div>
            </section>
            <section className={`chart-card section-card student-chart-card ${passFailChartData ? 'has-chart-data' : 'has-chart-empty'}`}>
              <div className="chart-card-header"><h3>Pass vs Fail</h3></div>
              <div className="chart-wrap">
                {passFailChartData ? <Doughnut data={passFailChartData} options={doughnutOptions} /> : <ChartEmptyState {...statusEmptyState} />}
              </div>
            </section>
          </div>

          {/* AI Performance Analysis Section */}
          <section className="ai-block section-card student-analysis-card" id="performance">
            <div className="ai-block-header">
              <div className="ai-block-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
                  <path d="M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07" />
                </svg>
              </div>
              <div>
                <h2>Performance Analysis</h2>
                <p className="section-sub" id="aiAnalysisFor">
                  {hasPerformanceAnalysis
                    ? `Analysis from ${filteredHistory.length} completed exam attempt${filteredHistory.length === 1 ? '' : 's'}`
                    : hasAnyHistory && filteredHistory.length === 0
                      ? 'No attempts match the current filters.'
                      : 'Complete more exams to generate your performance analysis.'}
                </p>
              </div>
            </div>

            <div className="ai-zones-grid">
              <div className="ai-zone strong">
                <div className="ai-zone-header">
                  <span className="zone-icon"><TrophyIcon size={18} /></span>
                  <span>Strong Areas (≥ 75%)</span>
                  <span className="zone-count" id="strongCount">
                    {strongAreas.length}
                  </span>
                </div>
                <ul className="zone-items" id="strongItems">
                  {strongAreas.length > 0 ? (
                    strongAreas.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))
                  ) : (
                    <li className="zone-empty-state">
                      {hasPerformanceAnalysis ? 'No subjects at or above 75%.' : 'No scored subject data yet.'}
                    </li>
                  )}
                </ul>
              </div>

              <div className="ai-zone improve">
                <div className="ai-zone-header">
                  <span className="zone-icon"><ChartIcon size={18} /></span>
                  <span>Can Improve (50–74%)</span>
                  <span className="zone-count" id="improveCount">
                    {improveAreas.length}
                  </span>
                </div>
                <ul className="zone-items" id="improveItems">
                  {improveAreas.length > 0 ? (
                    improveAreas.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))
                  ) : (
                    <li className="zone-empty-state">
                      {hasPerformanceAnalysis ? 'No subjects in the 50–74% range.' : 'No scored subject data yet.'}
                    </li>
                  )}
                </ul>
              </div>

              <div className="ai-zone weak">
                <div className="ai-zone-header">
                  <span className="zone-icon"><SirenIcon size={18} /></span>
                  <span>Weak Areas (&lt; 50%)</span>
                  <span className="zone-count" id="weakCount">
                    {weakAreas.length}
                  </span>
                </div>
                <ul className="zone-items" id="weakItems">
                  {weakAreas.length > 0 ? (
                    <>
                      {visibleWeakAreas.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                      {weakAreas.length > 5 && (
                        <li className="weak-area-disclosure">
                          <button
                            type="button"
                            className="weak-areas-toggle"
                            aria-expanded={weakAreasExpanded}
                            aria-controls="weakItems"
                            onClick={() => setWeakAreasExpanded((expanded) => !expanded)}
                          >
                            {weakAreasExpanded ? 'Show fewer weak areas' : `View all ${weakAreas.length} weak areas`}
                          </button>
                        </li>
                      )}
                    </>
                  ) : (
                    <li className="zone-empty-state">
                      {hasPerformanceAnalysis ? 'No subjects below 50%.' : 'No scored subject data yet.'}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* End AI Zones */}
          </section>

          {/* KCET College Prediction based on Rank Section */}
          <section className="section-card student-predictor-card" id="collegePredictorSection">
            <div className="ai-block-header">
              <div className="ai-block-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div>
                <h2>KCET College Predictor based on Rank</h2>
                <p className="section-sub">Enter your KCET rank to predict eligible engineering colleges & branches across Karnataka</p>
              </div>
            </div>

            {/* Controls Row */}
            <div className="student-predictor-fields">
              <div className="student-predictor-field">
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>KCET Rank</label>
                <input 
                  type="number" 
                  id="predictorRankInput" 
                  className="select-input" 
                  placeholder="Enter KCET Rank (e.g. 5000)"
                  value={predictorRank}
                  onChange={e => setPredictorRank(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handlePredictColleges(); }}
                  min="1"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="student-predictor-field">
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>Reservation Category</label>
                <select 
                  className="select-input"
                  value={predictorCategory}
                  onChange={e => setPredictorCategory(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="GM">General Merit (GM)</option>
                  <option value="2A">OBC Category 2A</option>
                  <option value="2B">OBC Category 2B</option>
                  <option value="3A">OBC Category 3A</option>
                  <option value="3B">OBC Category 3B</option>
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                  <option value="HK">Hyderabad-Karnataka (HK)</option>
                </select>
              </div>

              <div className="student-predictor-field">
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>Location / City</label>
                <select 
                  className="select-input"
                  value={predictorLocation}
                  onChange={e => setPredictorLocation(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="all">All Karnataka</option>
                  <option value="bangalore">Bangalore</option>
                  <option value="mysore">Mysore</option>
                </select>
              </div>

              <div className="student-predictor-action">
                <span aria-hidden="true" className="student-predictor-spacer" />
                <button 
                  className="btn-primary" 
                  id="predictCollegesBtn"
                  onClick={() => handlePredictColleges()}
                  disabled={predictorLoading || !predictorRank}
                  style={{
                    padding: '10px 22px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {!predictorLoading && <InstitutionsIcon size={18} />}
                  {predictorLoading ? 'Predicting...' : 'Predict Colleges'}
                </button>
              </div>
            </div>

            {/* Quick Rank Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>Quick Ranks:</span>
              {[
                { label: 'Rank #1,200', val: 1200 },
                { label: 'Rank #3,500', val: 3500 },
                { label: 'Rank #8,000', val: 8000 },
                { label: 'Rank #15,000', val: 15000 },
                { label: 'Rank #30,000', val: 30000 },
                { label: 'Rank #55,000', val: 55000 }
              ].map(chip => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => {
                    setPredictorRank(String(chip.val));
                    handlePredictColleges(chip.val);
                  }}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    color: 'var(--color-primary)',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {predictorError && (
              <div style={{ marginTop: '14px', color: 'var(--red-l)', fontSize: '0.86rem', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: '6px' }}>
                {predictorError}
              </div>
            )}

            {/* Prediction Results */}
            {predictionResults && (
              <div style={{ marginTop: '20px' }}>
                {/* Status / Metric Overview Banner */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                      Prediction for KCET Rank #{parseInt(predictionResults.rank).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '2px' }}>
                      Category: <strong>{predictionResults.category}</strong> • Region: <strong>{predictionResults.location === 'all' ? 'All Karnataka' : predictionResults.location}</strong> • Total Matches: <strong>{predictionResults.total_colleges}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16,185,129,0.18)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }}>
                      Safe: {predictionResults.counts?.safe || 0}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(234,179,8,0.18)', color: '#facc15', border: '1px solid rgba(234,179,8,0.4)' }}>
                      Target: {predictionResults.counts?.target || 0}
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
                      Reach: {predictionResults.counts?.reach || 0}
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActivePredictionTab('safe')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: activePredictionTab === 'safe' ? '1px solid #10b981' : '1px solid var(--border)',
                      background: activePredictionTab === 'safe' ? 'rgba(16,185,129,0.2)' : 'var(--s1)',
                      color: activePredictionTab === 'safe' ? '#34d399' : 'var(--muted)'
                    }}
                  >
                    Safe Colleges ({predictionResults.counts?.safe || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePredictionTab('target')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: activePredictionTab === 'target' ? '1px solid #eab308' : '1px solid var(--border)',
                      background: activePredictionTab === 'target' ? 'rgba(234,179,8,0.2)' : 'var(--s1)',
                      color: activePredictionTab === 'target' ? '#facc15' : 'var(--muted)'
                    }}
                  >
                    Target Matches ({predictionResults.counts?.target || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePredictionTab('reach')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: activePredictionTab === 'reach' ? '1px solid #ef4444' : '1px solid var(--border)',
                      background: activePredictionTab === 'reach' ? 'rgba(239,68,68,0.2)' : 'var(--s1)',
                      color: activePredictionTab === 'reach' ? '#f87171' : 'var(--muted)'
                    }}
                  >
                    Ambitious / Reach ({predictionResults.counts?.reach || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePredictionTab('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: activePredictionTab === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--border)',
                      background: activePredictionTab === 'all' ? 'var(--color-soft-orange)' : 'var(--s1)',
                      color: activePredictionTab === 'all' ? 'var(--color-primary)' : 'var(--muted)'
                    }}
                  >
                    All Colleges ({predictionResults.total_colleges})
                  </button>
                </div>

                {/* College Cards Grid */}
                {(() => {
                  let listToDisplay = [];
                  if (activePredictionTab === 'safe') listToDisplay = predictionResults.matches?.safe || [];
                  else if (activePredictionTab === 'target') listToDisplay = predictionResults.matches?.target || [];
                  else if (activePredictionTab === 'reach') listToDisplay = predictionResults.matches?.reach || [];
                  else {
                    listToDisplay = [
                      ...(predictionResults.matches?.safe || []),
                      ...(predictionResults.matches?.target || []),
                      ...(predictionResults.matches?.reach || [])
                    ];
                  }

                  if (listToDisplay.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', background: 'var(--s2)', borderRadius: '10px', fontSize: '0.9rem' }}>
                        No colleges found under this category filter. Try switching tabs or choosing 'All Karnataka'.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                      {listToDisplay.map((col, idx) => {
                        const isSafe = col.match_type === 'safe';
                        const isTarget = col.match_type === 'target';
                        const badgeColor = isSafe ? '#10b981' : isTarget ? '#eab308' : '#ef4444';
                        const badgeBg = isSafe ? 'rgba(16,185,129,0.15)' : isTarget ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)';

                        return (
                          <div 
                            key={idx}
                            style={{
                              background: 'var(--s2)',
                              border: `1px solid ${isSafe ? 'rgba(16,185,129,0.3)' : isTarget ? 'rgba(234,179,8,0.3)' : 'var(--border)'}`,
                              borderRadius: '10px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, color: 'var(--text)', lineHeight: '1.4' }}>
                                  {col.name}
                                </h3>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: col.tier === 1 ? 'var(--color-soft-orange)' : 'var(--s2)',
                                  color: col.tier === 1 ? 'var(--color-primary)' : 'var(--muted)',
                                  whiteSpace: 'nowrap',
                                  border: col.tier === 1 ? '1px solid var(--color-primary)' : '1px solid var(--border)'
                                }}>
                                  {col.tier_label}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  Location {col.location}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>•</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                                  Cutoff: #{col.cutoff_rank.toLocaleString()}
                                </span>
                              </div>

                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: badgeBg,
                                color: badgeColor,
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                marginBottom: '12px',
                                border: `1px solid ${badgeColor}40`
                              }}>
                                <span>{isSafe ? '' : isTarget ? 'Priority' : 'Target'}</span>
                                <span>{col.chance_label} ({col.chance_pct}%)</span>
                              </div>

                              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: '1.45', margin: '0 0 12px 0' }}>
                                {col.description}
                              </p>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Eligible Branches
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {col.branches && col.branches.map((b, bIdx) => (
                                  <span 
                                    key={bIdx}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid var(--border)',
                                      color: 'var(--text)'
                                    }}
                                  >
                                    {b}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </section>


          {/* Exam History Section */}
          <section className="section-card results-card student-history-card">
            <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3>My Exam History ({filteredHistory.length})</h3>
              <div className="results-search" style={{ maxWidth: '280px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input 
                  type="text" 
                  id="searchInput" 
                  className="search-input" 
                  placeholder="Search subject or exam..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="table-scroll">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Exam</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((h) => (
                      <tr key={h.attemptId}>
                        <td><strong>{h.subject}</strong></td>
                        <td>{h.exam_name}</td>
                        <td style={{ fontWeight: '600' }}>{h.scoreLabel}</td>
                        <td>{h.timeLabel}</td>
                        <td>
                          <span
                            className={`history-status-badge ${h.status === 'Pass' ? 'is-pass' : h.status === 'Fail' ? 'is-fail' : 'is-neutral'}`}
                            style={{
                            padding: '4px 10px', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem',
                            fontWeight: '600',
                          }}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td>{h.dateLabel}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                        {hasAnyHistory ? (
                          'No exam attempts match your current search and filters.'
                        ) : (
                          <div>
                            <div style={{ marginBottom: '8px', color: 'var(--color-primary)' }}><QuestionsIcon size={30} /></div>
                            <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                              No Exam Attempts Yet
                            </div>
                            <div>Choose an available practice exam to record your first score.</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default Dashboard;
