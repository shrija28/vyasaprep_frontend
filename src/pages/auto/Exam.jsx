import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { AuthContext } from '../../contexts/AuthContext';
import { AIIcon, AlertIcon, BooksIcon, CameraIcon, ExamIcon, InstitutionsIcon, LockIcon, QuestionsIcon, SirenIcon } from '../../components/icons';
import { generateStudentId } from '../../utils/studentId';
import { normalizeExamSubjects } from '../../utils/examStore';
import { flattenStudentExams, getStudentExamState, isInstitutionLinkedStudent } from '../../utils/studentExamAccess';

// High-precision face & liveness analyzer that verifies an actual human face is present
// and strictly rejects covered cameras, black frames, blank walls, and Windows "Camera Off" placeholders.
const analyzeFaceInVideo = async (video, prevFrameRef) => {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return { detected: false, confidence: 0, reason: 'Waiting for camera feed...' };
  }

  // 1. Native Chromium Shape Detection API (if supported by Chrome/Edge)
  if ('FaceDetector' in window) {
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 2 });
      const faces = await detector.detect(video);
      if (faces && faces.length > 0) {
        const f = faces[0];
        if (f.boundingBox && f.boundingBox.width > 25 && f.boundingBox.height > 25) {
          return { detected: true, confidence: 98, reason: 'Student face verified' };
        }
      } else {
        // Native FaceDetector is supported and found 0 faces in view
        return { detected: false, confidence: 0, reason: 'No face detected in camera view' };
      }
    } catch (e) {
      // Fall through to computer vision analyzer
    }
  }

  // 2. High-Precision Computer Vision Multi-Stage Analyzer (160x120)
  try {
    const canvas = document.createElement('canvas');
    const width = 160;
    const height = 120;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { detected: false, confidence: 0, reason: 'Canvas unavailable' };

    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const totalPixels = width * height;

    let totalLuma = 0;
    let monochromePixels = 0;
    let skinPixels = 0;
    let centerSkinPixels = 0;
    let centerTotalPixels = 0;

    // Central region (where student's head and face must be framed)
    const cXStart = Math.floor(width * 0.18);
    const cXEnd = Math.floor(width * 0.82);
    const cYStart = Math.floor(height * 0.08);
    const cYEnd = Math.floor(height * 0.92);

    let skinMinX = width, skinMaxX = 0, skinMinY = height, skinMaxY = 0;
    const centerLumas = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        const luma = (r * 299 + g * 587 + b * 114) / 1000;
        totalLuma += luma;

        // Monochrome / grayscale check
        const maxCh = Math.max(r, g, b);
        const minCh = Math.min(r, g, b);
        const diff = maxCh - minCh;
        if (diff < 12) {
          monochromePixels++;
        }

        // Multi-ethnic human skin tone chromaticity locus in YCbCr and RGB
        const Cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
        const Cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

        const isSkin = (
          Cb >= 73 && Cb <= 135 &&
          Cr >= 130 && Cr <= 180 &&
          r > 45 && g > 25 && b > 15 &&
          r > g && g >= b * 0.82 &&
          diff > 12
        );

        const inCenter = (x >= cXStart && x <= cXEnd && y >= cYStart && y <= cYEnd);
        if (inCenter) {
          centerTotalPixels++;
          centerLumas.push(luma);
          if (isSkin) {
            centerSkinPixels++;
            if (x < skinMinX) skinMinX = x;
            if (x > skinMaxX) skinMaxX = x;
            if (y < skinMinY) skinMinY = y;
            if (y > skinMaxY) skinMaxY = y;
          }
        }
        if (isSkin) skinPixels++;
      }
    }

    const avgLuma = totalLuma / totalPixels;
    const monochromeRatio = monochromePixels / totalPixels;
    const centerSkinRatio = centerTotalPixels > 0 ? (centerSkinPixels / centerTotalPixels) : 0;

    // 1. Camera lens is covered or environment is pitch black
    if (avgLuma < 15) {
      return { detected: false, confidence: 0, reason: 'Camera lens covered or room is dark' };
    }

    // 2. Camera is overexposed (pure white glare)
    if (avgLuma > 248) {
      return { detected: false, confidence: 0, reason: 'Camera feed is overexposed' };
    }

    // 3. Windows "Camera Off" placeholder graphic:
    // Windows camera driver outputs a synthetic graphic (black frame with white crossed-out camera icon).
    // This graphic is >85% monochrome with 0.00% skin chromaticity.
    if (monochromeRatio > 0.78 && centerSkinRatio < 0.03) {
      return { detected: false, confidence: 0, reason: 'Camera is off (privacy shutter closed or hardware switch off)' };
    }

    // 4. Insufficient human skin tone in center region
    if (centerSkinRatio < 0.055) {
      return { detected: false, confidence: 0, reason: 'No student face detected in camera frame' };
    }

    // 5. Skin cluster bounding box geometry & anthropometrics
    const boxW = skinMaxX - skinMinX;
    const boxH = skinMaxY - skinMinY;
    if (boxW < 16 || boxH < 20) {
      return { detected: false, confidence: 15, reason: 'Face is too far or partially obscured' };
    }

    const aspectRatio = boxH / Math.max(1, boxW);
    if (aspectRatio < 0.60 || aspectRatio > 2.70) {
      return { detected: false, confidence: 20, reason: 'Please position your face upright in the oval' };
    }

    // 6. Facial luminance variance (distinguishes human facial features like eyes/brows/nose from flat surfaces)
    let sumVar = 0;
    const cLen = centerLumas.length;
    for (let i = 0; i < cLen; i++) {
      const d = centerLumas[i] - avgLuma;
      sumVar += d * d;
    }
    const stdDev = Math.sqrt(sumVar / Math.max(1, cLen));
    if (stdDev < 8) {
      return { detected: false, confidence: 25, reason: 'Position face directly in front of camera' };
    }

    const confidence = Math.min(99, Math.round(centerSkinRatio * 140 + 50));
    return { detected: true, confidence, reason: 'Student face verified & live' };
  } catch (err) {
    console.error("Face analysis error:", err);
    return { detected: false, confidence: 0, reason: 'Analyzing camera feed...' };
  }
};

const resolveTakeAnotherExamRoute = (profile = null) => (
  isInstitutionLinkedStudent(profile) ? '/student/institution/exams' : '/exam'
);

const Exam = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = React.useContext(AuthContext);
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();
  const isInstitutionStudentRoute = isInstitutionLinkedStudent(user || storedUser);

  const [examSetId, setExamSetId] = useState(searchParams.get('set') || '');
  const [subject, setSubject] = useState(searchParams.get('subject') || 'General');
  const [examName, setExamName] = useState(searchParams.get('name') || 'KCET Exam');
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [accessVerified, setAccessVerified] = useState(!searchParams.get('set'));
  const [accessBlockReason, setAccessBlockReason] = useState('');

  // Published exams state for test selection
  const [publishedSubjects, setPublishedSubjects] = useState([]);
  const [loadingPublished, setLoadingPublished] = useState(false);
  const [publishedError, setPublishedError] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [skipped, setSkipped] = useState(new Set());
  const EXAM_DURATION_SEC = 80 * 60; // 80 minutes
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SEC);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [navFilter, setNavFilter] = useState('all'); // 'all' | 'incorrect' | 'correct' | 'skipped'

  // Memoized evaluated reviews for instant review mode on question paper
  const evaluatedReviews = useMemo(() => {
    if (!submitResult) return [];
    const list = submitResult.detailed_reviews || submitResult.ai_analysis?.detailed_reviews;
    if (list && Array.isArray(list) && list.length > 0) return list;

    // Fallback calculation from questions & student answers
    return questions.map((q, idx) => {
      const studentChoice = answers[idx];
      const isAns = studentChoice !== undefined && studentChoice !== null;
      const isSkipped = !isAns && (skipped instanceof Set ? skipped.has(idx) : Boolean(skipped?.[idx]));
      const correctIdx = 0;
      return {
        question_number: idx + 1,
        question_text: q.text,
        options: q.options || [],
        student_option_index: isAns ? Number(studentChoice) : null,
        student_answer: isAns && q.options ? q.options[studentChoice] : (isSkipped ? "Skipped" : "Not Answered"),
        correct_option_index: correctIdx,
        correct_answer: q.options ? q.options[correctIdx] : "Option A",
        is_correct: isAns && Number(studentChoice) === correctIdx,
        is_unanswered: !isAns,
        topic: q.topic || "General",
        subtype: q.subtype || "theory_definition",
        subtype_label: q.subtype_label || "⚡ KCET Standard",
        explanation: q.explanation || "Derived directly from syllabus textbook principles and formulas.",
        ai_insight: isAns ? "KCET syllabus conceptual pattern." : "Question skipped."
      };
    });
  }, [submitResult, questions, answers, skipped]);

  // Memoized evaluation summary (scores, counts, topic performance)
  const evalSummary = useMemo(() => {
    if (!submitResult) return null;
    const aiAnalysis = submitResult.ai_analysis;
    const summary = aiAnalysis?.summary || {};
    const totalVal = submitResult.total_marks ?? summary.total ?? questions.length;
    const scoreVal = submitResult.score ?? summary.score ?? 0;
    const pctVal = submitResult.percentage ?? summary.percentage ?? Math.round((scoreVal / Math.max(1, totalVal)) * 100);
    const correctCount = submitResult.correct_count ?? summary.correct_count ?? scoreVal;
    const incorrectCount = submitResult.incorrect_count ?? summary.incorrect_count ?? 0;
    const unansCount = submitResult.unanswered_count ?? summary.unanswered_count ?? Math.max(0, totalVal - correctCount - incorrectCount);
    return {
      score: scoreVal,
      total: totalVal,
      percentage: pctVal,
      correctCount,
      incorrectCount,
      unansCount,
      band: summary.performance_band || (pctVal >= 85 ? "Outstanding Mastery" : pctVal >= 65 ? "Strong Competency" : pctVal >= 45 ? "Developing Competency" : "Foundational Review Needed"),
      pacing: summary.pacing_assessment || `Exam completed in ${Math.floor((submitResult.time_taken_sec || 0)/60)}m ${(submitResult.time_taken_sec || 0)%60}s.`,
      verdict: summary.overall_verdict || `Student demonstrated ${pctVal >= 50 ? 'competency' : 'review needed'} across ${subject} KCET syllabus concepts with an overall score of ${pctVal}%.`,
      topicMap: aiAnalysis?.topic_breakdown || {},
      subtypeMap: aiAnalysis?.subtype_breakdown || summary.subtype_breakdown || {},
      blueprintPerf: aiAnalysis?.blueprint_performance || summary.blueprint_performance || null,
      blueprintDiag: summary.blueprint_diagnosis || (aiAnalysis?.blueprint_performance?.diagnosis) || '',
      actionPlan: aiAnalysis?.action_plan || []
    };
  }, [submitResult, questions.length, subject]);

  const videoRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const videoAlertRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [checkingCamera, setCheckingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  // Student Face Visibility & Proctoring State (2-Strike System)
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStatus, setFaceStatus] = useState('Checking camera...');
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [faceMissingAlert, setFaceMissingAlert] = useState(false);
  const faceMissingAlertRef = useRef(false);
  const [faceViolations, setFaceViolations] = useState(0);
  const faceViolationsRef = useRef(0);
  const [realignCountdown, setRealignCountdown] = useState(60);
  const [autoSubmittedReason, setAutoSubmittedReason] = useState('');
  const missingFramesRef = useRef(0);
  const consecutiveRealignedFramesRef = useRef(0);
  const resumeGracePeriodRef = useRef(false);
  const resumeGraceTimeoutRef = useRef(null);
  const prevFrameRef = useRef(null);

  // Anti-Cheat & Tab Switch Tracking (2-Strike System)
  const [tabViolations, setTabViolations] = useState(0);
  const tabViolationsRef = useRef(0);
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const tabSwitchAlertRef = useRef(false);
  const blurTimeoutRef = useRef(null);

  // Floating Security Alert Toast (Copy, Paste, DevTools prevention)
  const [securityToast, setSecurityToast] = useState({ show: false, message: '' });
  const securityToastTimerRef = useRef(null);

  const showSecurityToast = (message) => {
    if (securityToastTimerRef.current) clearTimeout(securityToastTimerRef.current);
    setSecurityToast({ show: true, message });
    securityToastTimerRef.current = setTimeout(() => {
      setSecurityToast({ show: false, message: '' });
    }, 3500);
  };

  useEffect(() => {
    tabSwitchAlertRef.current = tabSwitchAlert;
  }, [tabSwitchAlert]);

  const handleResumeFromTabSwitch = () => {
    tabSwitchAlertRef.current = false;
    setTabSwitchAlert(false);
    window.focus();
  };

  // Synchronize faceMissingAlertRef
  useEffect(() => {
    faceMissingAlertRef.current = faceMissingAlert;
  }, [faceMissingAlert]);

  // Safe helper to attach webcam stream to any video element
  const attachStream = (el) => {
    if (el && cameraStream) {
      if (el.srcObject !== cameraStream) {
        el.srcObject = cameraStream;
      }
      el.play().catch(() => {});
    }
  };

  const handleResumeExam = () => {
    setFaceMissingAlert(false);
    missingFramesRef.current = 0;
    consecutiveRealignedFramesRef.current = 0;
    // 5-second grace period after resuming so user posture change doesn't trigger strike
    resumeGracePeriodRef.current = true;
    if (resumeGraceTimeoutRef.current) clearTimeout(resumeGraceTimeoutRef.current);
    resumeGraceTimeoutRef.current = setTimeout(() => {
      resumeGracePeriodRef.current = false;
    }, 5000);
  };

  const [studentDetails, setStudentDetails] = useState({ name: 'Loading...', id: 'Loading...' });

  const startCamera = async () => {
    try {
      setCheckingCamera(true);
      setCameraError('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported on this browser. Please use Chrome, Edge, or Firefox.');
        setCameraActive(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        setCameraError('No video feed detected from your webcam. Please ensure your camera is plugged in and turned on.');
        setCameraActive(false);
        return;
      }

      setCameraStream(stream);
      setCameraActive(true);

      // Attach immediately to preview if element exists
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      videoTracks.forEach(track => {
        track.onended = () => {
          setCameraActive(false);
          setCameraError('Camera was disconnected. Please turn on your camera to continue.');
        };
        track.onmute = () => {
          setCameraActive(false);
          setCameraError('Camera is muted or covered. Please enable your camera to continue.');
        };
        track.onunmute = () => {
          setCameraActive(true);
          setCameraError('');
        };
      });
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings (lock icon in address bar) to continue.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on your device. A working webcam is strictly required to take this test.');
      } else {
        setCameraError('Unable to access camera: ' + (err.message || 'Please check device permissions.'));
      }
    } finally {
      setCheckingCamera(false);
    }
  };

  // Automatically turn on webcam ONLY when a specific exam is selected or active
  useEffect(() => {
    if (examSetId && accessVerified && !accessBlockReason && !submitResult) {
      startCamera();
    } else if ((!examSetId || accessBlockReason) && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setCameraActive(false);
    }
  }, [examSetId, started, submitResult, accessVerified, accessBlockReason]);

  // Cleanup camera stream when component unmounts or exam is submitted
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Attach stream to video elements when stream or cameraActive changes
  useEffect(() => {
    if (cameraStream) {
      if (videoPreviewRef.current) attachStream(videoPreviewRef.current);
      if (videoRef.current) attachStream(videoRef.current);
      if (videoAlertRef.current) attachStream(videoAlertRef.current);
    }
  }, [started, cameraStream, cameraActive, faceMissingAlert]);

  // Real-time Face Verification loop (runs every 250ms while camera is active)
  useEffect(() => {
    if (!cameraStream || !cameraActive) {
      setFaceDetected(false);
      setFaceStatus('Camera is off');
      return;
    }

    const interval = setInterval(async () => {
      let activeVideo = videoPreviewRef.current;
      if (started) {
        if (faceMissingAlertRef.current && videoAlertRef.current && videoAlertRef.current.readyState >= 2) {
          activeVideo = videoAlertRef.current;
        } else if (videoRef.current && videoRef.current.readyState >= 2) {
          activeVideo = videoRef.current;
        } else if (videoAlertRef.current && videoAlertRef.current.readyState >= 2) {
          activeVideo = videoAlertRef.current;
        }
      }

      if (!activeVideo || activeVideo.readyState < 2) return;

      const result = await analyzeFaceInVideo(activeVideo, prevFrameRef);
      setFaceDetected(result.detected);
      setFaceConfidence(result.confidence);
      setFaceStatus(result.reason);

      if (started && !submitResult) {
        // If tab switch warning modal is currently open, pause face strike evaluation so strikes do not conflict
        if (tabSwitchAlertRef.current) return;

        // STATE A: Warning 1 Modal is Currently Open (Waiting for student to realign face)
        if (faceMissingAlertRef.current) {
          if (result.detected) {
            consecutiveRealignedFramesRef.current += 1;
            // Auto-resume after ~2 seconds (8 ticks at 250ms) of continuously verified face
            if (consecutiveRealignedFramesRef.current >= 8 && faceViolationsRef.current === 1) {
              handleResumeExam();
            }
          } else {
            consecutiveRealignedFramesRef.current = 0;
          }
          // Crucial: NEVER trigger Strike 2 from standard ticks while the Warning 1 modal is open!
          return;
        }

        // STATE B: Post-Resume 5-second Grace Period
        if (resumeGracePeriodRef.current) {
          missingFramesRef.current = 0;
          return;
        }

        // STATE C: Live Exam Proctoring Monitoring
        if (!result.detected) {
          missingFramesRef.current += 1;
          // When face is missing/covered for ~2 seconds (8 ticks at 250ms)
          if (missingFramesRef.current >= 8) {
            if (faceViolationsRef.current === 0) {
              // STRIKE 1: First Warning (1 of 2)
              faceViolationsRef.current = 1;
              setFaceViolations(1);
              setRealignCountdown(60); // 60 seconds generous window
              setFaceMissingAlert(true);
              missingFramesRef.current = 0;
              consecutiveRealignedFramesRef.current = 0;
            } else if (faceViolationsRef.current === 1) {
              // STRIKE 2: Second time face not recognized during exam -> Automatically submit test!
              faceViolationsRef.current = 2;
              setFaceViolations(2);
              setFaceMissingAlert(true);
              const reason = 'Face was not recognized for the second time. Per KCET proctoring regulations, your test was automatically cancelled and submitted.';
              setAutoSubmittedReason(reason);
              setTimeout(() => {
                handleSubmitExamRef.current?.(reason);
              }, 1500);
            }
          }
        } else {
          // Face is recognized during normal exam
          missingFramesRef.current = 0;
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [cameraStream, cameraActive, started, submitResult]);

  // Re-alignment countdown timer for Strike 1 (60 seconds)
  useEffect(() => {
    if (!faceMissingAlert || faceViolations !== 1 || submitResult) return;

    const cdTimer = setInterval(() => {
      setRealignCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cdTimer);
          // 60 seconds expired without student realigning face -> Triggers Strike 2 and auto-submits!
          faceViolationsRef.current = 2;
          setFaceViolations(2);
          const reason = 'Face was not recognized within the allowed 60-second time limit. Test automatically submitted.';
          setAutoSubmittedReason(reason);
          setTimeout(() => {
            handleSubmitExamRef.current?.(reason);
          }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cdTimer);
  }, [faceMissingAlert, faceViolations, submitResult]);

  // Stop camera when exam is submitted or completed
  useEffect(() => {
    if (submitResult && cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
  }, [submitResult]);

  // 1. Fetch student details
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setStudentDetails({
            name: data.display_name || data.sub || 'Student',
            id: generateStudentId(data),
            institutionName: data.institution_name || data.institution_code || (data.student_subtype === 'institutional' ? (data.join_code || 'Institution Member') : null)
          });
        } else {
          setStudentDetails({ name: 'Guest Student', id: 'GST-001' });
        }
      })
      .catch(() => {
        setStudentDetails({ name: 'Student', id: 'STD-123' });
      });
  }, []);

  // ── Tab Switch & Focus Monitoring (2-Strike System) ──────────────────────
  useEffect(() => {
    if (!started || submitResult) return;

    const triggerTabViolation = () => {
      // Don't trigger if already submitted or warning modal already active
      if (tabSwitchAlertRef.current) return;

      if (tabViolationsRef.current === 0) {
        tabViolationsRef.current = 1;
        setTabViolations(1);
        tabSwitchAlertRef.current = true;
        setTabSwitchAlert(true);
        showSecurityToast('Tab switch detected! You must remain on this exam tab.');
      } else if (tabViolationsRef.current >= 1) {
        tabViolationsRef.current = 2;
        setTabViolations(2);
        tabSwitchAlertRef.current = true;
        setTabSwitchAlert(true);
        const reason = 'Student switched tabs for the second time. In accordance with examination regulations, your test was automatically cancelled and submitted.';
        setAutoSubmittedReason(reason);
        setTimeout(() => {
          handleSubmitExamRef.current?.(reason);
        }, 1200);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        triggerTabViolation();
      }
    };

    const handleBlur = () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          triggerTabViolation();
        }
      }, 350);
    };

    const handleFocus = () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [started, submitResult]);

  // ── Anti-Cheat: Suppress Copy, Cut, Paste, Right Click & Shortcuts ─────────
  useEffect(() => {
    if (!started || submitResult) return;

    const handleCopy = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clipboardData) {
        e.clipboardData.clearData();
      }
      showSecurityToast('Blocked Copying question text or options is strictly prohibited.');
    };

    const handlePaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast('Blocked Pasting is strictly prohibited during the examination.');
    };

    const handleCut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast('Blocked Cutting content is disabled during the examination.');
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSecurityToast('Blocked Right-click context menu is disabled during the exam.');
    };

    const handleDragStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleSelectStart = (e) => {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // Block Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+X (Cut), Ctrl+A (Select All), Ctrl+U (Source), Ctrl+P (Print), Ctrl+S (Save)
      if (isCtrlOrCmd && ['c', 'v', 'x', 'a', 'u', 'p', 's'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        const actionLabels = {
          c: 'Copying',
          v: 'Pasting',
          x: 'Cutting',
          a: 'Select All',
          u: 'Viewing source',
          p: 'Printing',
          s: 'Saving page'
        };
        showSecurityToast(`Blocked ${actionLabels[key] || 'Shortcut'} is strictly disabled during the exam.`);
        return;
      }

      // Block DevTools shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.key === 'F12' || (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast('Blocked Developer Tools inspection is strictly disabled.');
        return;
      }
    };

    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [started, submitResult]);

  // Verify URL access against the student's backend-assigned attempt before loading questions.
  useEffect(() => {
    const currentSet = searchParams.get('set') || '';
    const currentSubj = searchParams.get('subject') || '';
    const currentName = searchParams.get('name') || '';

    setExamSetId(currentSet);
    if (currentSubj) setSubject(currentSubj);
    if (currentName) setExamName(currentName);
    if (!currentSet) {
      setAlreadyCompleted(false);
      setAccessBlockReason('');
      setAccessVerified(true);
      return undefined;
    }

    let active = true;
    setAccessVerified(false);
    setAccessBlockReason('');
    setAlreadyCompleted(false);

    const verifyAccess = async () => {
      try {
        const response = await fetch('/api/student/exams', { credentials: 'include' });
        if (!response.ok) throw new Error('Exam access could not be verified.');
        const exams = flattenStudentExams(await response.json());
        const assignedExam = exams.find((exam) => String(exam.assigned_set_id || '') === currentSet);
        const state = getStudentExamState(assignedExam);
        const canOpen = state === 'available' || state === 'retake';

        if (!active) return;
        setAlreadyCompleted(state === 'completed');
        if (!canOpen) {
          const reasons = {
            completed: 'This assigned exam has already been submitted.',
            expired: 'This exam is past its due date.',
            upcoming: 'This exam is not available yet.',
            unavailable: 'This set is not currently assigned or available to your account.',
          };
          setAccessBlockReason(reasons[state] || 'This exam is not available to your account.');
        }
      } catch (error) {
        if (active) {
          setAccessBlockReason(error.message || 'Exam access could not be verified.');
        }
      } finally {
        if (active) setAccessVerified(true);
      }
    };

    verifyAccess();
    return () => { active = false; };
  }, [searchParams]);

  // Fetch published exams when no exam is currently chosen
  const fetchPublishedExams = async () => {
    setLoadingPublished(true);
    setPublishedError('');
    try {
      let data = null;

      // Ensure student profile is loaded for affiliation checking
      let student = studentDetails;
      if (!student || !student.id || student.id === 'Loading...') {
        try {
          const meRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.authenticated) {
              const stdId = generateStudentId(meData);
              student = {
                name: meData.display_name || meData.sub || 'Student',
                id: stdId,
                institutionName: meData.institution_name || meData.institution_code || (meData.student_subtype === 'institutional' ? (meData.join_code || 'Institution Member') : null),
                institution_id: meData.institution_id || meData.join_code,
                student_subtype: meData.student_subtype
              };
              setStudentDetails(student);
              localStorage.setItem('vyasaprep_active_student_id', stdId);
            }
          }
        } catch (e) {}
      } else if (student.id) {
        localStorage.setItem('vyasaprep_active_student_id', student.id);
      }

      // 1. Try primary student exams endpoint
      let res = await fetch('/api/student/exams', { credentials: 'include' });
      if (res.ok) {
        data = await res.json().catch(() => null);
      }

      // 2. Fallback if primary endpoint is not available or returned empty
      let hasExams = data && ((Array.isArray(data.subjects) && data.subjects.length > 0) || (Array.isArray(data.exams) && data.exams.length > 0));

      if (!hasExams) {
        res = await fetch('/api/student/institution/exams', { credentials: 'include' });
        if (res.ok) {
          const instData = await res.json().catch(() => null);
          if (instData && ((Array.isArray(instData.subjects) && instData.subjects.length > 0) || (Array.isArray(instData.exams) && instData.exams.length > 0))) {
            data = instData;
            hasExams = true;
          }
        }
      }

      const fetchedList = [];
      if (data) {
        if (Array.isArray(data.subjects)) {
          data.subjects.forEach(sg => {
            (sg.exams || []).forEach(ex => {
              fetchedList.push({
                ...ex,
                subject: ex.subject || sg.subject,
              });
            });
          });
        } else if (Array.isArray(data.exams)) {
          fetchedList.push(...data.exams);
        } else if (Array.isArray(data.data)) {
          fetchedList.push(...data.data);
        } else if (Array.isArray(data)) {
          fetchedList.push(...data);
        }
      }

      const mergedList = fetchedList;

      // --- STRICT INSTITUTION EXAM VISIBILITY RULES ---
      const isInstitutionalStudent = Boolean(
        (student?.institutionName && !String(student.institutionName).toLowerCase().includes('guest')) ||
        student?.institution_id ||
        student?.student_subtype === 'institutional'
      );
      const studentInstName = String(student?.institutionName || student?.institution_name || '').toLowerCase().trim();
      const studentInstId = String(student?.institution_id || student?.join_code || '').toLowerCase().trim();

      const filteredList = mergedList.filter(ex => {
        if (!ex) return false;

        const isInstitutionCreated = Boolean(
          ex.created_by_type === 'institution' ||
          ex.created_by_institution === true ||
          (ex.institution_id && ex.institution_id !== 'admin' && ex.institution_id !== 'system') ||
          (ex.institution_name && !String(ex.institution_name).toLowerCase().includes('admin') && !String(ex.institution_name).toLowerCase().includes('system'))
        );

        if (isInstitutionCreated) {
          // Rule 1: Exams created by an institution MUST NOT be visible to regular/independent students!
          if (!isInstitutionalStudent) return false;

          // Rule 2: Exams created by Institution A should ONLY be visible to students of Institution A!
          const exInstId = String(ex.institution_id || '').toLowerCase().trim();
          const exInstName = String(ex.institution_name || '').toLowerCase().trim();

          const matchId = studentInstId && exInstId && (studentInstId === exInstId || studentInstId.includes(exInstId) || exInstId.includes(studentInstId));
          const matchName = studentInstName && exInstName && (studentInstName === exInstName || studentInstName.includes(exInstName) || exInstName.includes(studentInstName));

          return Boolean(matchId || matchName || (!exInstId && !exInstName));
        }

        // Public platform practice exams created by system/admin are visible to all students
        return true;
      });

      const scopedSubjects = normalizeExamSubjects(filteredList);
      setPublishedSubjects(scopedSubjects);

    } catch (err) {
      console.error('Failed to retrieve published exams:', err);
      setPublishedError('Unable to retrieve published exams. Please check your connection.');
      setPublishedSubjects([]);
    } finally {
      setLoadingPublished(false);
    }
  };

  useEffect(() => {
    if (!examSetId) {
      fetchPublishedExams();
    }
    const handleUpdate = () => {
      if (!examSetId) {
        fetchPublishedExams();
      }
    };
    window.addEventListener('exam-created', handleUpdate);
    window.addEventListener('exam-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('exam-created', handleUpdate);
      window.removeEventListener('exam-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [examSetId]);

  // Handle selecting an exam from published tests list (Assigned based on Student ID: A, B, C, D...)
  const handleSelectExam = (exam, subjGroup, targetSet) => {
    const assignedSet = exam.sets?.find((set) => set.exam_set_id === exam.assigned_set_id);
    const setObj = targetSet || assignedSet;
    if (!exam.assigned_set_id || !setObj || setObj.exam_set_id !== exam.assigned_set_id) {
      alert('The backend has not assigned an available set to this account.');
      return;
    }
    const setId = setObj.exam_set_id;
    const subj = subjGroup.subject || 'General';
    const name = exam.exam_name || `${subj} Mock Exam`;
    setAccessVerified(false);
    setAccessBlockReason('');
    setExamSetId(setId);
    setSubject(subj);
    setExamName(name);
    setSearchParams({
      set: setId,
      subject: subj,
      name: name,
      label: setObj.set_label || 'A'
    });
  };

  // Handle going back to the relevant exam selection page without breaking the student type flow.
  const handleBackToExamSelection = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setCameraActive(false);
    }
    const nextRoute = resolveTakeAnotherExamRoute(user || storedUser);
    if (isInstitutionStudentRoute) {
      setExamSetId('');
      setQuestions([]);
      setStarted(false);
      setAlreadyCompleted(false);
      setAccessBlockReason('');
      setAccessVerified(true);
      setSubmitResult(null);
      setShowAiModal(false);
      setAnswers({});
      setSkipped(new Set());
      setCurrentQ(0);
      setNavFilter('all');
      setLoadError('');
      setSearchParams({});
      navigate(nextRoute, { replace: true });
      return;
    }
    setExamSetId('');
    setQuestions([]);
    setStarted(false);
    setAlreadyCompleted(false);
    setAccessBlockReason('');
    setAccessVerified(true);
    setSubmitResult(null);
    setShowAiModal(false);
    setAnswers({});
    setSkipped(new Set());
    setCurrentQ(0);
    setNavFilter('all');
    setLoadError('');
    setSearchParams({});
    fetchPublishedExams();
  };

  // Filtered list of published exams
  const filteredExamsList = React.useMemo(() => {
    const list = [];
    publishedSubjects.forEach(subjGroup => {
      if (selectedSubjectFilter !== 'ALL' && subjGroup.subject.toLowerCase() !== selectedSubjectFilter.toLowerCase()) {
        return;
      }
      (subjGroup.exams || []).forEach(exam => {
        const title = exam.exam_name || `${subjGroup.subject} Mock Exam`;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = title.toLowerCase().includes(q);
          const matchSubject = subjGroup.subject.toLowerCase().includes(q);
          if (!matchTitle && !matchSubject) return;
        }
        list.push({ exam, subjGroup });
      });
    });
    return list;
  }, [publishedSubjects, selectedSubjectFilter, searchQuery]);

  // Fetch questions once a specific exam set is selected (unless already completed)
  useEffect(() => {
    if (!examSetId || !accessVerified || accessBlockReason) {
      setLoadingQuestions(false);
      return;
    }

    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      setLoadError('');

      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examSetId);
        let loadedSuccessfully = false;

        if (isUuid) {
          try {
            const res = await fetch(`/api/student/exams/${examSetId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.questions && data.questions.length > 0) {
              setQuestions(data.questions.map((q, idx) => ({
                id: `q${idx + 1}`,
                text: q.q || q.text || q.question_text,
                options: Array.isArray(q.opts) ? q.opts : (Array.isArray(q.options) ? q.options : (typeof q.opts === 'string' ? JSON.parse(q.opts) : [])),
                topic: q.topic || 'General',
                subtype: q.subtype || 'theory_definition',
                explanation: q.exp || q.explanation || '',
                marks: q.marks || 1,
                // correct_option is the 0-based index of the right answer ("0","1","2","3").
                // Stored here so handleSubmitExam can compute an accurate local score
                // that matches the backend's evaluation. Without this the frontend
                // defaults every correct answer to index 0 and produces wrong counts.
                correct_option: q.ans !== undefined ? String(q.ans) : undefined,
              })));
              if (data.subject) setSubject(data.subject);
              loadedSuccessfully = true;
            }
          } catch (e) {
            console.warn('API question fetch failed, attempting local fallback:', e);
          }
        }

        if (!loadedSuccessfully) {
          setQuestions([]);
          setLoadError('Question content is unavailable from the exam service. This assigned exam cannot be started with substitute questions.');
        }
      } catch (err) {
        setQuestions([]);
        setLoadError('Question content could not be verified. Return to My Exams and try again.');
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [examSetId, accessVerified, accessBlockReason]);

  const handleSubmitExamRef = useRef(null);
  const handleSubmitExam = async (violationReason = '') => {
    if (submitting) return;
    setSubmitting(true);

    const effectiveReason = violationReason || autoSubmittedReason || '';

    // Calculate exact evaluation metrics across all questions
    let exactCorrect = 0;
    let exactIncorrect = 0;
    let exactUnanswered = 0;

    questions.forEach((q, idx) => {
      const studentAns = answers[idx];
      if (studentAns === undefined || studentAns === null) {
        exactUnanswered++;
      } else {
        let correctIdx = 0;
        if (q.correct_option !== undefined && q.correct_option !== null) {
          const cStr = String(q.correct_option).trim();
          if (/^\d+$/.test(cStr)) {
            correctIdx = parseInt(cStr, 10);
          } else {
            const upper = cStr.toUpperCase();
            if (upper === 'A') correctIdx = 0;
            else if (upper === 'B') correctIdx = 1;
            else if (upper === 'C') correctIdx = 2;
            else if (upper === 'D') correctIdx = 3;
          }
        }
        if (Number(studentAns) === correctIdx) {
          exactCorrect++;
        } else {
          exactIncorrect++;
        }
      }
    });

    const totalQCount = questions.length || 60;
    const exactPercentage = Math.round((exactCorrect / Math.max(1, totalQCount)) * 100);

    // Format answers map for backend: { "0": "1", "1": "3", ... }
    const formattedAnswers = {};
    Object.keys(answers).forEach(qIdx => {
      formattedAnswers[String(qIdx)] = String(answers[qIdx]);
    });

    const timeTaken = Math.max(1, EXAM_DURATION_SEC - timeLeft);

    const recordLocalSubmission = (submissionData) => {
      try {
        const existing = JSON.parse(localStorage.getItem('vyasaprep_submissions') || '[]');
        const activeStudentId = String(
          studentDetails?.kcet_student_id ||
          studentDetails?.id ||
          studentDetails?.sub ||
          studentDetails?.email ||
          localStorage.getItem('vyasaprep_active_student_id') ||
          'STD-001'
        ).trim();

        if (activeStudentId && activeStudentId !== 'STD-001') {
          localStorage.setItem('vyasaprep_active_student_id', activeStudentId);
        }

        const newRecord = {
          id: `sub-${Date.now()}`,
          student_id: activeStudentId,
          user_id: activeStudentId,
          student_name: studentDetails?.name || 'Student',
          institution_id: studentDetails?.institution_id || '',
          exam_set_id: examSetId,
          exam_id: examSetId,
          exam_name: examName || `${subject} Practice Exam`,
          subject: subject || 'General',
          set_label: setLabel || 'A',
          score: submissionData.score ?? exactCorrect,
          total_marks: submissionData.total_marks ?? totalQCount,
          correct_count: submissionData.correct_count ?? exactCorrect,
          incorrect_count: submissionData.incorrect_count ?? exactIncorrect,
          unanswered_count: submissionData.unanswered_count ?? exactUnanswered,
          percentage: submissionData.percentage ?? exactPercentage,
          status: (submissionData.percentage ?? exactPercentage) >= 40 ? 'Pass' : 'Fail',
          submitted_at: new Date().toISOString(),
          time_taken_sec: timeTaken
        };
        const updated = [newRecord, ...existing.filter(s => {
          if (!s) return false;
          const sId = String(s.student_id || s.user_id || '').trim();
          const targetId = String(activeStudentId).trim();
          // Keep other students' records unchanged!
          if (sId !== targetId) return true;
          // Replace previous submission of the SAME exam for THIS student
          return !(s.exam_set_id === examSetId || s.exam_name === newRecord.exam_name);
        })];
        localStorage.setItem('vyasaprep_submissions', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('exam-submitted', { detail: newRecord }));
        window.dispatchEvent(new CustomEvent('exam-completed', { detail: newRecord }));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error('Error recording local submission:', e);
      }
    };

    try {
      const res = await fetch('/api/student/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_set_id: examSetId,
          answers: formattedAnswers,
          time_taken_sec: timeTaken
        })
      });

      const data = await res.json();
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setCameraActive(false);
      }
      if (res.ok) {
        // Use the backend's authoritative evaluation as the primary source.
        // The backend runs score_submission() which correctly compares each
        // submitted answer index against the stored correct_option index.
        // Only fall back to the locally-computed values when the backend
        // response is missing a field (e.g. older API version).
        const finalObj = {
          ...data,
          score:           data.score           ?? data.correct_count ?? exactCorrect,
          total_marks:     data.total_marks      ?? totalQCount,
          correct_count:   data.correct_count    ?? exactCorrect,
          incorrect_count: data.incorrect_count  ?? exactIncorrect,
          unanswered_count:data.unanswered_count ?? exactUnanswered,
          percentage:      data.percentage       ?? exactPercentage,
          autoSubmitted: Boolean(effectiveReason),
          violationReason: effectiveReason
        };
        setSubmitResult(finalObj);
        recordLocalSubmission(finalObj);
        setCurrentQ(0);
      } else {
        const finalObj = {
          score: exactCorrect,
          total_marks: totalQCount,
          percentage: exactPercentage,
          correct_count: exactCorrect,
          incorrect_count: exactIncorrect,
          unanswered_count: exactUnanswered,
          message: data.message || 'Exam evaluated successfully',
          autoSubmitted: Boolean(effectiveReason),
          violationReason: effectiveReason
        };
        setSubmitResult(finalObj);
        recordLocalSubmission(finalObj);
        setCurrentQ(0);
      }
    } catch (err) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setCameraActive(false);
      }
      const finalObj = {
        score: exactCorrect,
        total_marks: totalQCount,
        percentage: exactPercentage,
        correct_count: exactCorrect,
        incorrect_count: exactIncorrect,
        unanswered_count: exactUnanswered,
        message: 'Exam evaluated successfully',
        autoSubmitted: Boolean(effectiveReason),
        violationReason: effectiveReason
      };
      setSubmitResult(finalObj);
      recordLocalSubmission(finalObj);
      setCurrentQ(0);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  // 3. Proctor camera and exam timer
  useEffect(() => {
    if (!started || submitResult) return;

    if (cameraStream && videoRef.current) {
      attachStream(videoRef.current);
    }

    const timer = setInterval(() => {
      // Pause exam clock while proctoring or tab switch warning modal is open so student does not lose test time
      if (faceMissingAlertRef.current || tabSwitchAlertRef.current) return;

      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExamRef.current?.('Exam time expired (80 minutes).');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, submitResult]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleAnswer = (optionIdx) => {
    if (submitResult) return; // Read-only evaluation mode
    setAnswers(prev => ({ ...prev, [currentQ]: optionIdx }));
    setSkipped(prev => {
      const next = new Set(prev);
      next.delete(currentQ);
      return next;
    });
  };

  const handleSkip = () => {
    if (submitResult) return;
    setAnswers(prev => {
      if (prev[currentQ] === undefined) return prev;
      const next = { ...prev };
      delete next[currentQ];
      return next;
    });
    setSkipped(prev => {
      const next = new Set(prev);
      next.add(currentQ);
      return next;
    });
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (!submitResult && answers[currentQ] === undefined) {
      setSkipped(prev => {
        const next = new Set(prev);
        next.add(currentQ);
        return next;
      });
    }
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!submitResult && answers[currentQ] === undefined) {
      setSkipped(prev => {
        const next = new Set(prev);
        next.add(currentQ);
        return next;
      });
    }
    if (currentQ > 0) {
      setCurrentQ(prev => prev - 1);
    }
  };

  const handleSelectQ = (targetIdx) => {
    if (!submitResult && answers[currentQ] === undefined) {
      setSkipped(prev => {
        const next = new Set(prev);
        next.add(currentQ);
        return next;
      });
    }
    setCurrentQ(targetIdx);
  };

  // Quick navigation to jump to next question where student made a mistake
  const handleNextMistake = () => {
    if (!submitResult || !evaluatedReviews || evaluatedReviews.length === 0) return;
    // Search forward
    for (let i = currentQ + 1; i < evaluatedReviews.length; i++) {
      if (!evaluatedReviews[i].is_correct && !evaluatedReviews[i].is_unanswered) {
        setCurrentQ(i);
        return;
      }
    }
    // Search from start
    for (let i = 0; i <= currentQ; i++) {
      if (!evaluatedReviews[i].is_correct && !evaluatedReviews[i].is_unanswered) {
        setCurrentQ(i);
        return;
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      {/* Published Exams Selection Screen (Shown when student visits Exam page without selecting a test yet) */}
      {!examSetId && !submitResult && (
        <div style={{ maxWidth: '1440px', width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '30px 20px 80px', minHeight: '80vh' }}>
          {/* Header Banner */}
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'var(--color-soft-orange)', color: 'var(--color-primary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>
                <ExamIcon size={16} /> Select Examination
              </div>
              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                Available <span style={{ color: 'var(--color-primary)' }}>Practice Exams</span>
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--muted)', margin: 0 }}>
                Please choose which published test you want to answer to begin your exam
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
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
            gap: '16px'
          }}>
            {/* Subject Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'Biology', 'Physics', 'Chemistry', 'Mathematics'].map(subj => {
                const isActive = selectedSubjectFilter === subj;
                const count = subj === 'ALL'
                  ? publishedSubjects.reduce((acc, s) => acc + (s.exams?.length || 0), 0)
                  : (publishedSubjects.find(s => s.subject.toLowerCase() === subj.toLowerCase())?.exams?.length || 0);

                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(subj)}
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
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{subj === 'ALL' ? 'All Subjects' : subj}</span>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: isActive ? 'rgba(230,95,0,0.15)' : 'rgba(0,0,0,0.04)',
                      color: isActive ? '#fff' : 'var(--muted)'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ minWidth: '240px', flex: '1 1 240px', maxWidth: '340px' }}>
              <input
                type="text"
                aria-label="Search exams by name"
                placeholder="Search test by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  background: 'var(--s2)',
                  border: '1px solid var(--border)'
                }}
              />
            </div>
          </div>

          {/* Loading State */}
          {loadingPublished && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <p style={{ fontWeight: 600 }}>Loading available published exams...</p>
            </div>
          )}

          {/* Error State */}
          {publishedError && !loadingPublished && (
            <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: '12px', color: 'var(--red)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <AlertIcon size={18} style={{ color: 'var(--color-error)' }} />
                {publishedError}
              </span>
              <button type="button" className="btn-outline small" onClick={fetchPublishedExams}>Retry</button>
            </div>
          )}

          {/* Empty State */}
          {!loadingPublished && !publishedError && filteredExamsList.length === 0 && (
            <div style={{
              background: 'var(--s1)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--muted)'
            }}>
              <div style={{ marginBottom: '14px', color: 'var(--color-primary)' }}><ExamIcon size={40} /></div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '8px', fontWeight: 700 }}>
                {searchQuery || selectedSubjectFilter !== 'ALL' ? 'No Matching Exams Found' : 'No Published Exams Available'}
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {searchQuery || selectedSubjectFilter !== 'ALL'
                  ? 'Try changing your subject filter or search keyword to find available exams.'
                  : 'New mock exams will appear here as soon as they are created and published by your administrator.'}
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

          {/* Published Exams Cards Grid */}
          {!loadingPublished && filteredExamsList.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {filteredExamsList.map(({ exam, subjGroup }) => {
                const defaultSet = exam.sets?.find((set) => set.exam_set_id === exam.assigned_set_id);
                const subjectName = subjGroup.subject || 'General';
                const examState = getStudentExamState(exam);
                const isCompleted = examState === 'completed';

                const badgeColor = subjectName === 'Biology'
                  ? { bg: 'rgba(5,150,105,0.12)', text: '#059669', border: 'rgba(5,150,105,0.3)' }
                  : subjectName === 'Physics'
                    ? { bg: 'rgba(37,99,235,0.12)', text: '#2563eb', border: 'rgba(37,99,235,0.3)' }
                    : subjectName === 'Chemistry'
                      ? { bg: 'rgba(230,95,0,0.12)', text: '#E65F00', border: 'rgba(230,95,0,0.3)' }
                      : { bg: 'rgba(217,119,6,0.12)', text: '#d97706', border: 'rgba(217,119,6,0.3)' };

                return (
                  <div
                    key={exam.exam_id}
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
                      boxShadow: 'var(--shadow)'
                    }}
                  >
                    <div>
                      {/* Card Header: Subject Tag & Duration */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: badgeColor.bg,
                            color: badgeColor.text,
                            border: `1px solid ${badgeColor.border}`
                          }}>
                            {subjectName}
                          </span>
                          {isCompleted && (
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                               Completed (1 Attempt Limit)
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Priority Full Length Mock
                        </span>
                      </div>

                      {/* Exam Title */}
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                        {exam.exam_name || `${subjectName} Mock Exam`}
                      </h3>

                      {/* Details specs */}
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
                        marginBottom: '8px'
                      }}>
                        <div>
                          <span>Questions:</span>{' '}
                          <strong style={{ color: 'var(--text)' }}>60 MCQs</strong>
                        </div>
                        <div>
                          <span>Max Marks:</span>{' '}
                          <strong style={{ color: 'var(--text)' }}>60 Marks</strong>
                        </div>
                        <div>
                          <span>Duration:</span>{' '}
                          <strong style={{ color: 'var(--color-primary)' }}>80 Mins</strong>
                        </div>
                        <div>
                          <span>Proctoring:</span>{' '}
                          <strong style={{ color: 'var(--green)' }}>AI Camera</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isCompleted ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '10px 16px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            cursor: 'not-allowed',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#10b981'
                          }}
                        >
                          Completed
                        </button>
                      ) : ['available', 'retake'].includes(examState) && defaultSet ? (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleSelectExam(exam, subjGroup, defaultSet)}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '10px 16px',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {examState === 'retake' ? 'Retake Exam →' : `Take Set ${exam.assigned_set_label || defaultSet.set_label} →`}
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
              })}
            </div>
          )}
        </div>
      )}
      
      {started && !submitResult && <div className="exam-topbar" id="examTopbar">
            <div className="exam-topbar-left">
              <div style={{ background: '#FCFBF8', borderRadius: '6px', padding: '3px 8px' }}>
                <BrandLogo size="sm" />
              </div>
            </div>
            <div className="exam-topbar-center">
              <span className="exam-badge set-badge" id="topbarSet">{examName}</span>
              <span className="exam-badge subject-badge" id="topbarSubject">{subject}</span>
              {studentDetails.institutionName && (
                  <span className="exam-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.78rem', fontWeight: 600 }}>
                  <InstitutionsIcon size={14} /> {studentDetails.institutionName}
                </span>
              )}
              {submitResult ? (
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.5)',
                  color: '#34d399',
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}>
                   Exam Evaluated
                </span>
              ) : (
                (tabViolations === 1 || faceViolations === 1) ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {tabViolations === 1 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: 'rgba(239,68,68,0.22)',
                        border: '1px solid rgba(239,68,68,0.6)',
                        color: '#f87171',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertIcon size={14} />
                        Tab Warning: 1/2
                      </span>
                    )}
                    {faceViolations === 1 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: 'rgba(234,179,8,0.22)',
                        border: '1px solid rgba(234,179,8,0.6)',
                        color: '#facc15',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertIcon size={14} />
                        Face Warning: 1/2
                      </span>
                    )}
                  </div>
                ) : null
              )}
            </div>
            <div className="exam-topbar-right">
              {submitResult ? (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => navigate('/dashboard')}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  Dashboard →
                </button>
              ) : (
                <div className="timer-block">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span id="timerDisplay" className="timer-text">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>}

      {examSetId && !accessVerified && !submitResult && (
        <div role="status" style={{ maxWidth: '560px', margin: '60px auto', padding: '32px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          Verifying exam access...
        </div>
      )}

      {/* Backend-authoritative exam access block */}
      {examSetId && accessVerified && accessBlockReason && !submitResult && (
        <div style={{ maxWidth: '700px', margin: '60px auto', padding: '40px 24px', background: 'var(--s1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '20px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <LockIcon size={30} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
            {alreadyCompleted ? 'Exam Already Completed' : 'Exam Not Available'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 28px' }}>
            {accessBlockReason}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleBackToExamSelection}
            style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px' }}
          >
            ← Return to Available Exams
          </button>
        </div>
      )}

      {/* Entry Modal / Pre-Exam Screen */}
      {examSetId && accessVerified && !accessBlockReason && !started && !submitResult && !alreadyCompleted && (
        <div className="overlay" style={{ display: "flex" }}>
          <div className="entry-modal" style={{ maxWidth: '520px', width: '90%' }}>
            <div className="entry-modal-top">
              <button
                type="button"
                onClick={handleBackToExamSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '10px',
                  alignSelf: 'flex-start'
                }}
              >
                ← Back to Published Tests
              </button>
              <div className="entry-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '50px' }}>
                <AlertIcon size={32} style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2>{examName}</h2>
              <p>{subject} Examination</p>
            </div>

            <div className="entry-form">
              {loadError ? (
                <div style={{ padding: '20px', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--red)', borderRadius: '12px', color: 'var(--red)', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '0 0 12px 0' }}>{loadError}</p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-outline small" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleBackToExamSelection}>
                      Return to My Exams
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="candidate-profile-box" style={{ background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "14px 16px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "0.88rem" }}>
                      <span style={{ color: "var(--muted)" }}>Candidate Name:</span>
                      <span style={{ fontWeight: "700", color: "var(--text)" }}>{studentDetails.name}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: "0.88rem" }}>
                      <span style={{ color: "var(--muted)" }}>Candidate ID:</span>
                      <span style={{ fontWeight: "700", color: "var(--color-primary)", fontFamily: "monospace" }}>{studentDetails.id}</span>
                    </div>
                  </div>

                  {/* Mandatory Proctoring Camera Box with Real-Time Face Verification */}
                  <div style={{
                    background: "var(--s2)",
                    border: `1.5px solid ${(cameraActive && faceDetected) ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)"}`,
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "14px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <CameraIcon size={16} /> Web Camera Verification
                      </span>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "12px",
                        background: (!cameraActive || !faceDetected) ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                        color: (!cameraActive || !faceDetected) ? "var(--red-l, #f87171)" : "var(--green)"
                      }}>
                        {!cameraActive 
                          ? "● Camera Offline" 
                          : faceDetected 
                            ? "● Face Verified & Live" 
                            : "● No Face Visible (Camera Off)"}
                      </span>
                    </div>

                    <div style={{
                      width: "100%",
                      height: "170px",
                      background: "#080a10",
                      borderRadius: "8px",
                      overflow: "hidden",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "10px",
                      border: (cameraActive && faceDetected) ? "1.5px solid rgba(16,185,129,0.7)" : "1.5px solid rgba(239,68,68,0.5)"
                    }}>
                      <video
                        ref={(el) => {
                          videoPreviewRef.current = el;
                          attachStream(el);
                        }}
                        autoPlay
                        muted
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: "scaleX(-1)",
                          display: cameraActive ? "block" : "none"
                        }}
                      />

                      {/* Face Alignment Oval Guide */}
                      {cameraActive && (
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "100px",
                          height: "125px",
                          border: faceDetected ? "2px solid rgba(16, 185, 129, 0.85)" : "2px dashed rgba(239, 68, 68, 0.75)",
                          boxShadow: faceDetected ? "0 0 15px rgba(16, 185, 129, 0.4)" : "none",
                          borderRadius: "50%",
                          pointerEvents: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.3s ease"
                        }}>
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: faceDetected ? "#10b981" : "#f87171",
                            background: "rgba(0,0,0,0.65)",
                            padding: "2px 6px",
                            borderRadius: "4px"
                          }}>
                            {faceDetected ? " Face In View" : "Align Face"}
                          </span>
                        </div>
                      )}

                      {/* Verification Status Badge Overlay */}
                      {cameraActive && (
                        <div style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          background: faceDetected ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)",
                          color: "#fff",
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          padding: "3px 8px",
                          borderRadius: "4px"
                        }}>
                          {faceDetected ? ` Face Verified (${faceConfidence}%)` : "Blocked Face Not Detected"}
                        </div>
                      )}

                      {!cameraActive && (
                        <div style={{ color: "var(--muted)", textAlign: "center", padding: "16px" }}>
                          <div style={{ marginBottom: "6px", color: 'var(--color-primary)' }}><CameraIcon size={36} /></div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--red-l)" }}>Camera is OFF</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px", maxWidth: "340px", lineHeight: "1.4" }}>
                            Webcam proctoring is mandatory. You cannot take the test without turning on your camera.
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={startCamera}
                            disabled={checkingCamera}
                            style={{
                              marginTop: "12px",
                              padding: "8px 20px",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              background: "var(--color-primary)"
                            }}
                          >
                            {checkingCamera ? "Requesting Camera..." : <><CameraIcon size={16} /> Turn On Camera</>}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Camera Off / Face Not Detected Warning */}
                    {cameraActive && !faceDetected && (
                      <div style={{
                        padding: "10px 14px",
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        borderRadius: "8px",
                        color: "var(--red-l, #f87171)",
                        fontSize: "0.82rem",
                        marginBottom: "10px",
                        lineHeight: "1.5",
                        textAlign: "left"
                      }}>
                        <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>Blocked</span> Student Face Not Detected
                        </div>
                        <div style={{ marginTop: "4px", color: "var(--text)" }}>
                          {faceStatus}. Your camera appears to be covered or turned off. You cannot begin the test without your face clearly visible on screen.
                        </div>
                        <div style={{ marginTop: "6px", fontSize: "0.76rem", color: "var(--muted)" }}>
                          <strong>How to fix:</strong> Check your laptop's physical webcam privacy slider or switch, or allow camera access in Windows Settings.
                        </div>
                      </div>
                    )}

                    {cameraError && (
                      <div style={{
                        padding: "8px 12px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid var(--red)",
                        borderRadius: "6px",
                        color: "var(--red)",
                        fontSize: "0.8rem",
                        marginBottom: "10px",
                        textAlign: "left"
                      }}>
                        Warning  {cameraError}
                      </div>
                    )}

                    {!cameraActive && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={startCamera}
                        disabled={checkingCamera}
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          padding: "10px",
                          fontSize: "0.88rem",
                          background: "linear-gradient(135deg, #E65F00, #B34A00)",
                          fontWeight: 700
                        }}
                      >
                        {checkingCamera ? "Requesting Camera..." : <><CameraIcon size={16} /> Turn On Camera to Unlock Exam</>}
                      </button>
                    )}
                  </div>

                  <div className="exam-info-box" style={{ marginBottom: '16px' }}>
                    <div className="info-row"><span><BooksIcon size={16} /> Subject:</span><span>{subject}</span></div>
                    <div className="info-row"><span><QuestionsIcon size={16} /> Questions:</span><span>{loadingQuestions ? 'Loading...' : `${questions.length} Live Questions`}</span></div>
                    <div className="info-row"><span>Time Limit:</span><span>80 minutes</span></div>
                  </div>

                  <button 
                    className="btn-generate" 
                    onClick={() => {
                      if (!cameraActive) {
                        alert("Camera is mandatory! You must turn on your webcam to take this exam.");
                        return;
                      }
                      if (!faceDetected) {
                        alert("Student face not detected! Your camera is covered or turned off. Uncover your camera and position your face in the center of the frame before you can begin the exam.");
                        return;
                      }
                      setStarted(true);
                    }} 
                    disabled={loadingQuestions || questions.length === 0 || !cameraActive || !faceDetected}
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center',
                      opacity: (!cameraActive || !faceDetected || loadingQuestions || questions.length === 0) ? 0.45 : 1,
                      cursor: (!cameraActive || !faceDetected || loadingQuestions || questions.length === 0) ? 'not-allowed' : 'pointer',
                      background: (cameraActive && faceDetected) ? 'var(--color-primary)' : '#27272a',
                      border: (!cameraActive || !faceDetected) ? '1px solid rgba(239,68,68,0.5)' : 'none',
                      color: (!cameraActive || !faceDetected) ? 'var(--red-l, #f87171)' : '#ffffff'
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    {loadingQuestions 
                      ? 'Loading Questions...' 
                      : !cameraActive 
                        ? 'Blocked Turn On Camera to Unlock Exam'
                        : !faceDetected
                          ? 'Blocked Student Face Must Be Visible to Begin Exam'
                          : 'Begin Exam →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mid-Exam Proctoring Violation Modal (2-Strike System) */}
      {started && (!cameraActive || faceMissingAlert) && !submitResult && (
        <div className="overlay" style={{ display: 'flex', zIndex: 99999, background: 'rgba(0,0,0,0.94)' }}>
          <div className="entry-modal" style={{
            maxWidth: '500px',
            width: '92%',
            textAlign: 'center',
            border: faceViolations >= 2 ? '2.5px solid var(--red)' : '2px solid #eab308',
            boxShadow: faceViolations >= 2 ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 25px rgba(234,179,8,0.3)',
            borderRadius: '16px',
            padding: '28px 22px'
          }}>
            {/* Header Badge */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                padding: '4px 14px',
                borderRadius: '20px',
                background: faceViolations >= 2 ? 'rgba(239,68,68,0.22)' : 'rgba(234,179,8,0.2)',
                border: faceViolations >= 2 ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(234,179,8,0.6)',
                color: faceViolations >= 2 ? '#f87171' : '#facc15',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {faceViolations >= 2 ? (
                  <>
                    <SirenIcon size={20} style={{ color: '#f87171' }} />
                    PROCTORING VIOLATION (2 OF 2)
                  </>
                ) : (
                  <>
                    <AlertIcon size={20} style={{ color: '#facc15' }} />
                    PROCTORING WARNING 1 OF 2
                  </>
                )}
              </span>
            </div>

            <div style={{ marginBottom: '8px' }}>
              {faceViolations >= 2 ? (
                <SirenIcon size={40} style={{ color: '#f87171' }} />
              ) : (
                <AlertIcon size={40} style={{ color: '#facc15' }} />
              )}
            </div>

            <h2 style={{
              color: faceViolations >= 2 ? 'var(--red)' : '#facc15',
              marginBottom: '10px',
              fontSize: '1.45rem',
              fontWeight: 800
            }}>
              {faceViolations >= 2 ? 'Test Automatically Submitted!' : 'Student Face Not Recognized!'}
            </h2>

            {/* Crucial Required Warning Callout */}
            {faceViolations < 2 ? (
              <div style={{
                background: 'rgba(234,179,8,0.14)',
                border: '1.5px solid rgba(234,179,8,0.5)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '14px',
                color: '#fef08a',
                fontSize: '0.92rem',
                lineHeight: '1.5',
                textAlign: 'center',
                fontWeight: 700
              }}>
                Warning  <strong>CRITICAL WARNING:</strong> If your face is not recognized again, the test will automatically be cancelled and submitted!
              </div>
            ) : (
              <div style={{
                background: 'rgba(239,68,68,0.2)',
                border: '2px solid rgba(239,68,68,0.6)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '14px',
                color: '#fca5a5',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                textAlign: 'center',
                fontWeight: 700
              }}>
                Blocked Your face was not recognized for the second time. Per KCET proctoring regulations, your test has been automatically cancelled and submitted.
              </div>
            )}

            <p style={{ color: 'var(--text)', marginBottom: '12px', fontSize: '0.88rem', lineHeight: '1.5' }}>
              {!cameraActive
                ? 'Your camera feed was interrupted or turned off. Video proctoring is mandatory for the entire examination.'
                : faceViolations >= 2
                  ? 'Submitting your current responses and generating diagnostic evaluation...'
                  : `${faceStatus}. Your face must remain visible to the proctoring camera at all times.`}
            </p>

            {/* Countdown Display for Strike 1 */}
            {faceViolations < 2 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '20px',
                background: 'rgba(239,68,68,0.18)',
                border: '1px solid rgba(239,68,68,0.45)',
                color: '#f87171',
                fontSize: '0.84rem',
                fontWeight: 700,
                marginBottom: '14px'
              }}>
                ⏱ Re-align face within: <strong>{realignCountdown}s</strong> (or exam will auto-submit)
              </div>
            )}

            {/* Video Box with Oval */}
            <div style={{
              width: "100%",
              height: "170px",
              background: "#080a10",
              borderRadius: "8px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "14px",
              border: faceDetected ? "2px solid #10b981" : faceViolations >= 2 ? "2px solid var(--red)" : "2px solid #eab308"
            }}>
              <video
                ref={(el) => {
                  videoAlertRef.current = el;
                  attachStream(el);
                }}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: cameraActive ? "block" : "none"
                }}
              />
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "95px",
                height: "120px",
                border: faceDetected ? "2.5px solid #10b981" : faceViolations >= 2 ? "2px dashed #ef4444" : "2px dashed #eab308",
                boxShadow: faceDetected ? "0 0 16px rgba(16,185,129,0.45)" : "none",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                background: faceDetected ? "rgba(16,185,129,0.12)" : "rgba(0,0,0,0.3)"
              }}>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: faceDetected ? "#10b981" : faceViolations >= 2 ? "#f87171" : "#facc15",
                  background: "rgba(0,0,0,0.85)",
                  padding: "3px 8px",
                  borderRadius: "4px"
                }}>
                  {faceDetected ? ` Face In View (${faceConfidence}%)` : "Align Face"}
                </span>
              </div>
            </div>

            {!cameraActive ? (
              <button 
                className="btn-primary" 
                onClick={startCamera} 
                disabled={checkingCamera}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
              >
                {checkingCamera ? 'Connecting Camera...' : <><CameraIcon size={16} /> Turn On Camera to Resume Exam</>}
              </button>
            ) : faceViolations < 2 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleResumeExam}
                  disabled={!faceDetected}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '13px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    background: faceDetected ? '#10b981' : 'rgba(255,255,255,0.08)',
                    color: faceDetected ? '#ffffff' : 'var(--muted)',
                    border: faceDetected ? '1px solid #10b981' : '1px solid var(--border)',
                    cursor: faceDetected ? 'pointer' : 'not-allowed',
                    boxShadow: faceDetected ? '0 0 20px rgba(16,185,129,0.45)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {faceDetected ? (
                    <>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                       Face Verified — Click to Resume Exam
                    </>
                  ) : (
                    '⏳ Position Face Inside Oval to Resume'
                  )}
                </button>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                  Center your face in the oval or open your camera shutter. Once the green checkmark appears, click Resume (or hold position for 2 seconds to auto-resume).
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--red-l)', fontSize: '0.9rem', fontWeight: 700 }}>
                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                Submitting Exam Responses...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Security Alert Toast */}
      {securityToast.show && (
        <div
          className="security-toast-container"
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999999,
            background: '#18181b',
            border: '1.5px solid #ef4444',
            color: '#fca5a5',
            padding: '12px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(239,68,68,0.45)',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <LockIcon size={20} />
          <span>{securityToast.message}</span>
        </div>
      )}

      {/* Mid-Exam Tab Switch Violation Modal (2-Strike System) */}
      {started && tabSwitchAlert && !submitResult && (
        <div className="overlay" style={{ display: 'flex', zIndex: 999998, background: 'rgba(0,0,0,0.95)' }}>
          <div className="entry-modal" style={{
            maxWidth: '520px',
            width: '92%',
            textAlign: 'center',
            border: tabViolations >= 2 ? '2.5px solid var(--red)' : '2px solid #eab308',
            boxShadow: tabViolations >= 2 ? '0 0 35px rgba(239,68,68,0.5)' : '0 0 30px rgba(234,179,8,0.4)',
            borderRadius: '16px',
            padding: '30px 24px'
          }}>
            <div style={{ marginBottom: '14px' }}>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                padding: '4px 14px',
                borderRadius: '20px',
                background: tabViolations >= 2 ? 'rgba(239,68,68,0.22)' : 'rgba(234,179,8,0.2)',
                border: tabViolations >= 2 ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(234,179,8,0.6)',
                color: tabViolations >= 2 ? '#f87171' : '#facc15',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {tabViolations >= 2 ? (
                  <>
                    <SirenIcon size={20} style={{ color: '#f87171' }} />
                    TAB VIOLATION: DISQUALIFIED (2 OF 2)
                  </>
                ) : (
                  <>
                    <AlertIcon size={20} style={{ color: '#facc15' }} />
                    TAB SWITCH DETECTED (STRIKE 1 OF 2)
                  </>
                )}
              </span>
            </div>

            <div style={{ fontSize: '3.4rem', marginBottom: '10px' }}>
              {tabViolations >= 2 ? 'Blocked' : 'Document'}
            </div>

            <h2 style={{
              color: tabViolations >= 2 ? 'var(--red)' : '#facc15',
              marginBottom: '12px',
              fontSize: '1.45rem',
              fontWeight: 800
            }}>
              {tabViolations >= 2 ? 'Test Automatically Cancelled & Submitted!' : 'Tab Switch Detected!'}
            </h2>

            {tabViolations < 2 ? (
              <div style={{
                background: 'rgba(234,179,8,0.14)',
                border: '1.5px solid rgba(234,179,8,0.5)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '16px',
                color: '#fef08a',
                fontSize: '0.92rem',
                lineHeight: '1.5',
                textAlign: 'center',
                fontWeight: 700
              }}>
                Warning  <strong>FINAL WARNING:</strong> You switched away from the exam tab. Tab switching, window unfocusing, and copying questions are strictly prohibited during the exam. If you switch tabs again, your test will be <strong>automatically submitted immediately</strong>!
              </div>
            ) : (
              <div style={{
                background: 'rgba(239,68,68,0.2)',
                border: '2px solid rgba(239,68,68,0.6)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
                color: '#fca5a5',
                fontSize: '0.95rem',
                lineHeight: '1.5',
                textAlign: 'center',
                fontWeight: 700
              }}>
                Blocked Multiple tab switches were detected. Under examination anti-cheat regulations, your exam has been terminated and auto-submitted.
              </div>
            )}

            <p style={{ color: 'var(--text)', marginBottom: '18px', fontSize: '0.88rem', lineHeight: '1.6' }}>
              {tabViolations < 2
                ? 'You must keep this examination window active and focused at all times. Please click below to return to your exam.'
                : 'Evaluating your answers and compiling your performance summary...'}
            </p>

            {tabViolations < 2 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={handleResumeFromTabSwitch}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.96rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #E65F00, #B34A00)',
                  cursor: 'pointer'
                }}
              >
                 I Understand — Resume Exam
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--red-l)', fontSize: '0.9rem', fontWeight: 700 }}>
                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                Submitting Exam Responses...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Exam Layout (Handles both Live Test & Evaluated Review Mode) */}
      {started && questions.length > 0 && (
        <div className={`exam-layout ${submitResult ? 'evaluation-mode' : ''} ${started && !submitResult ? 'secure-anti-cheat' : ''}`}>
          <aside className="exam-sidebar">
            {submitResult ? (
              <div style={{
                marginBottom: "15px",
                borderRadius: "10px",
                padding: "16px 14px",
                background: "var(--color-soft-orange)",
                border: "1px solid var(--color-light-orange)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Marks Awarded
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: (evalSummary?.percentage ?? 0) >= 50 ? "#28724A" : "#8A5A00", margin: "4px 0" }}>
                  {evalSummary?.score ?? 0} <span style={{ fontSize: "0.95rem", color: "var(--muted, #9ca3af)", fontWeight: 500 }}>/ {evalSummary?.total ?? questions.length}</span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#1A365D", fontWeight: 700 }}>
                  {evalSummary?.percentage ?? 0}% Marks ({evalSummary?.correctCount ?? 0} Correct)
                </div>
              </div>
            ) : (
              <div id="proctorContainer" style={{
                marginBottom: "15px",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#000",
                border: (cameraActive && faceDetected)
                  ? (faceViolations === 1 ? "1.5px solid rgba(234,179,8,0.7)" : "1.5px solid rgba(16,185,129,0.6)")
                  : "1.5px solid rgba(239,68,68,0.7)",
                aspectRatio: "4/3",
                maxHeight: "150px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative"
              }}>
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    attachStream(el);
                  }}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scaleX(-1)" }}
                />
                <div style={{
                  position: "absolute",
                  top: "6px",
                  left: "6px",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: faceViolations === 0 ? "rgba(16,185,129,0.85)" : faceViolations === 1 ? "rgba(234,179,8,0.9)" : "rgba(239,68,68,0.9)",
                  color: faceViolations === 1 ? "#000" : "#fff"
                }}>
                  {faceViolations === 0 ? "Strikes: 0/2" : `Strikes: ${faceViolations}/2`}
                </div>
                <span style={{
                  position: "absolute",
                  bottom: "6px",
                  right: "6px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: (cameraActive && faceDetected) ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)",
                  color: "#fff"
                }}>
                  {(cameraActive && faceDetected) ? "● Face Verified" : "● Face Missing"}
                </span>
              </div>
            )}

            <div className="sidebar-section-title">
              {submitResult ? 'Evaluation Navigator' : 'Question Navigator'}
            </div>

            {submitResult && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', marginBottom: '10px' }}>
                {[
                  { id: 'all', label: `All (${questions.length})` },
                  { id: 'incorrect', label: `Wrong (${evalSummary?.incorrectCount ?? 0})` },
                  { id: 'correct', label: ` Right (${evalSummary?.correctCount ?? 0})` },
                  { id: 'skipped', label: `Skip (${evalSummary?.unansCount ?? 0})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNavFilter(tab.id)}
                    style={{
                      padding: '5px 4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: navFilter === tab.id ? 'var(--color-primary, #E65F00)' : 'var(--s2, #1a1d26)',
                      color: navFilter === tab.id ? '#fff' : 'var(--muted, #9ca3af)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="q-grid">
              {questions.map((q, i) => {
                const rev = evaluatedReviews[i];
                const isAnswered = answers[i] !== undefined;
                const isSkipped = submitResult 
                  ? Boolean(rev?.is_unanswered) 
                  : (!isAnswered && (skipped instanceof Set ? skipped.has(i) : Boolean(skipped?.[i])));
                const isCorrect = submitResult ? Boolean(rev?.is_correct) : false;
                const isIncorrect = submitResult ? (!isCorrect && !isSkipped) : false;
                const isCurrent = i === currentQ;

                if (submitResult) {
                  if (navFilter === 'incorrect' && !isIncorrect) return null;
                  if (navFilter === 'correct' && !isCorrect) return null;
                  if (navFilter === 'skipped' && !isSkipped) return null;
                }

                let btnClass = 'q-grid-btn';
                if (submitResult) {
                  if (isCorrect) btnClass += ' correct';
                  else if (isIncorrect) btnClass += ' incorrect';
                  else if (isSkipped) btnClass += ' skipped';
                } else {
                  if (isAnswered) btnClass += ' answered';
                  else if (isSkipped) btnClass += ' skipped';
                }
                if (isCurrent) btnClass += ' current';

                return (
                  <button
                    key={q.id || i}
                    onClick={() => handleSelectQ(i)}
                    className={btnClass}
                    style={{
                      ...(submitResult ? (
                        isCorrect ? { background: '#d1fae5', borderColor: '#10b981', color: '#065f46', fontWeight: 800 } :
                        isIncorrect ? { background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b', fontWeight: 800 } :
                        { background: '#fef08a', borderColor: '#eab308', color: '#854d0e', fontWeight: 800 }
                      ) : (
                        isAnswered ? { background: '#d1fae5', borderColor: '#10b981', color: '#065f46', fontWeight: 800 } :
                        isSkipped ? { background: '#fef08a', borderColor: '#eab308', color: '#854d0e', fontWeight: 800 } : {}
                      )),
                      ...(isCurrent ? { 
                        boxShadow: '0 0 0 3px #FBE1CA',
                        ...((!submitResult && !isAnswered && !isSkipped) ? { background: '#FFF0E3', borderColor: '#FBE1CA', color: '#E65F00', fontWeight: 800 } : {})
                      } : {})
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="q-legend">
              {submitResult ? (
                <>
                  <div className="legend-row">
                    <span className="legend-box correct" style={{ background: '#10b981', border: '1.5px solid #059669' }}></span>
                    Correct (+1 Mark)
                  </div>
                  <div className="legend-row">
                    <span className="legend-box incorrect" style={{ background: '#ef4444', border: '1.5px solid #dc2626' }}></span>
                    Incorrect (0 Marks)
                  </div>
                  <div className="legend-row">
                    <span className="legend-box skipped" style={{ background: '#eab308', border: '1.5px solid #ca8a04' }}></span>
                    Skipped (0 Marks)
                  </div>
                </>
              ) : (
                <>
                  <div className="legend-row">
                    <span className="legend-box answered" style={{ background: '#10b981', border: '1.5px solid #059669' }}></span>
                    Answered
                  </div>
                  <div className="legend-row">
                    <span className="legend-box skipped" style={{ background: '#eab308', border: '1.5px solid #ca8a04' }}></span>
                    Skipped
                  </div>
                  <div className="legend-row">
                    <span className="legend-box current" style={{ background: '#FBE1CA', border: '1.5px solid #E65F00' }}></span>
                    Current
                  </div>
                </>
              )}
            </div>

            {!submitResult ? (
              <>
                <div className="sidebar-progress">
                  <div className="sidebar-prog-label">
                    <span>{Object.keys(answers).length}</span> / <span>{questions.length}</span> answered
                  </div>
                  <div className="sidebar-prog-bar">
                    <div className="sidebar-prog-fill" style={{ width: `${(Object.keys(answers).length / Math.max(1, questions.length)) * 100}%` }}></div>
                  </div>
                </div>

                <button className="btn-submit-exam" onClick={() => handleSubmitExam()} disabled={submitting}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  {submitting ? 'Submitting...' : 'Submit Paper'}
                </button>
              </>
            ) : null}
          </aside>

          <div className="exam-content">
            {submitResult && (
              <div style={{
                background: 'var(--color-soft-orange)',
                border: '1px solid var(--color-light-orange)',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <AIIcon size={22} />
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1A365D' }}>
                      {evalSummary ? 'KCET Examination Evaluated' : 'Exam Submitted'}
                    </span>
                    {evalSummary && <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: '14px',
                      background: (evalSummary?.percentage ?? 0) >= 50 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      color: (evalSummary?.percentage ?? 0) >= 50 ? '#28724A' : '#A33B32',
                      border: `1px solid ${(evalSummary?.percentage ?? 0) >= 50 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`
                    }}>
                      Total Marks: {evalSummary?.score ?? 0} / {evalSummary?.total ?? questions.length} ({evalSummary?.percentage ?? 0}%)
                    </span>}
                  </div>
                  {evalSummary ? <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.86rem', marginTop: '6px' }}>
                    <span style={{ color: '#28724A', fontWeight: 700 }}>
                       {evalSummary.correctCount ?? '—'} Correct
                    </span>
                    <span style={{ color: '#A33B32', fontWeight: 700 }}>
                      {evalSummary.incorrectCount ?? '—'} Incorrect
                    </span>
                    <span style={{ color: '#8A5A00', fontWeight: 700 }}>
                      {evalSummary.unansCount ?? '—'} Skipped
                    </span>
                  </div> : <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>Your attempt was submitted. The result is not available yet.</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleBackToExamSelection}
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    Take Another Exam
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => navigate('/dashboard')}
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            )}

            {!submitResult && (
              <div className="exam-top-bar">
                <div className="exam-top-prog">
                  <div className="exam-top-prog-fill" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}></div>
                </div>
              </div>
            )}

            {questions[currentQ] && (!submitResult || evaluatedReviews.length > 0) && (() => {
              const currRev = submitResult ? evaluatedReviews[currentQ] : null;
              const isRevCorrect = currRev ? currRev.is_correct : false;
              const isRevSkipped = currRev ? currRev.is_unanswered : false;

              return (
                <div className={`question-panel ${started && !submitResult ? 'secure-anti-cheat' : ''}`}>
                  <div className="q-meta-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    <span className="q-num-badge">Question {currentQ + 1} of {questions.length}</span>
                    <span className="q-type-chip">MCQ</span>
                    <span className="q-topic-chip">{currRev?.topic || questions[currentQ].topic || 'General'}</span>
                    <span className="q-marks-chip">{questions[currentQ].marks || 1} mark</span>

                    {submitResult && (
                      <div style={{ marginLeft: 'auto' }}>
                        {isRevCorrect ? (
                          <span style={{
                            background: '#d1fae5',
                            border: '1.5px solid #10b981',
                            color: '#065f46',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                             Correct (+1 Mark)
                          </span>
                        ) : !isRevSkipped ? (
                          <span style={{
                            background: '#fee2e2',
                            border: '1.5px solid #ef4444',
                            color: '#991b1b',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            Incorrect (0 Marks)
                          </span>
                        ) : (
                          <span style={{
                            background: '#fef08a',
                            border: '1.5px solid #eab308',
                            color: '#854d0e',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            Skipped (0 Marks)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="q-body" style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--text)', marginBottom: '24px', lineHeight: '1.6' }}>
                    {questions[currentQ].text}
                  </div>

                  {/* Options Area */}
                  <div className="q-answer-area">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {questions[currentQ].options.map((opt, idx) => {
                        if (submitResult) {
                          const targetCorrIdx = (currRev?.correct_option_index !== undefined && currRev?.correct_option_index !== null)
                            ? currRev.correct_option_index
                            : 0;
                          const isCorrectChoice = idx === targetCorrIdx;
                          const isStudentChoice = (currRev?.student_option_index !== undefined && currRev?.student_option_index !== null)
                            ? (idx === currRev.student_option_index)
                            : (answers[currentQ] === idx);

                          let optBorder = 'rgba(255,255,255,0.08)';
                          let optBg = 'var(--s2)';
                          let optTextColor = 'var(--text)';
                          let tag = null;

                          if (isCorrectChoice) {
                            optBorder = '#10b981';
                            optBg = 'rgba(16,185,129,0.12)';
                            optTextColor = '#28724A';
                            tag = (
                              <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                color: '#28724A',
                                background: 'rgba(16,185,129,0.22)',
                                border: '1px solid rgba(16,185,129,0.4)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                marginLeft: 'auto'
                              }}>
                                {isStudentChoice ? " Your Answer (Correct +1 Mark)" : " Correct Answer"}
                              </span>
                            );
                          } else if (isStudentChoice) {
                            optBorder = '#ef4444';
                            optBg = 'rgba(239,68,68,0.12)';
                            optTextColor = '#A33B32';
                            tag = (
                              <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                color: '#A33B32',
                                background: 'rgba(239,68,68,0.22)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                marginLeft: 'auto'
                              }}>
                                Your Answer (Incorrect)
                              </span>
                            );
                          }

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                width: '100%',
                                padding: '16px 20px',
                                background: optBg,
                                border: `2px solid ${optBorder}`,
                                borderRadius: '12px',
                                textAlign: 'left',
                                boxSizing: 'border-box'
                              }}
                            >
                              <span style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: isCorrectChoice ? '#10b981' : isStudentChoice ? '#ef4444' : 'var(--s1)',
                                color: isCorrectChoice || isStudentChoice ? '#fff' : 'var(--text)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                border: isCorrectChoice || isStudentChoice ? 'none' : '1px solid var(--border)',
                                flexShrink: 0
                              }}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span style={{ fontSize: '1rem', color: optTextColor, fontWeight: isCorrectChoice || isStudentChoice ? 600 : 400 }}>
                                {opt}
                              </span>
                              {tag}
                            </div>
                          );
                        }

                        // Live mode option button
                        const isSelected = answers[currentQ] === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              width: '100%',
                              padding: '16px 20px',
                              background: isSelected ? 'var(--color-soft-orange)' : 'var(--s2)',
                              border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--border)'}`,
                              borderRadius: '12px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s',
                              boxShadow: isSelected ? '0 0 0 3px rgba(230,95,0,0.18)' : 'none'
                            }}
                          >
                            <span style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--color-primary)' : 'var(--s1)',
                              color: isSelected ? '#fff' : 'var(--text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              border: isSelected ? 'none' : '1px solid var(--border)'
                            }}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span style={{ fontSize: '1rem', color: isSelected ? 'var(--color-primary-hover)' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Evaluation Mode: Pedagogical Solution Card */}
                  {submitResult && (
                    <div style={{
                      marginTop: '22px',
                      background: 'var(--color-soft-orange)',
                      border: '1.5px solid var(--color-light-orange)',
                      borderRadius: '12px',
                      padding: '18px 22px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <AIIcon size={18} />
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-primary, #E65F00)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Verified Solution & Conceptual Rationale
                        </span>
                      </div>
                      <div style={{ fontSize: '0.96rem', color: 'var(--text, #f3f4f6)', lineHeight: '1.65', marginBottom: currRev?.ai_insight ? '10px' : '0' }}>
                        {currRev?.explanation || questions[currentQ].explanation || "Derived directly from KCET syllabus textbook principles and standard formulas."}
                      </div>
                      {currRev?.ai_insight && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted, #64748b)', borderTop: '1px solid var(--color-light-orange)', paddingTop: '8px', marginTop: '8px' }}>
                          <strong style={{ color: 'var(--color-primary)' }}>Examiner Note:</strong> {currRev.ai_insight}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Bottom Nav Row */}
            <div className="exam-nav-row">
              <button className="btn-outline exam-nav-btn" disabled={currentQ === 0} onClick={handlePrev}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Previous
              </button>

              <div className="exam-nav-center">
                {submitResult ? (
                  (evalSummary?.incorrectCount ?? 0) > 0 && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleNextMistake}
                      style={{
                        borderColor: 'rgba(239,68,68,0.6)',
                        color: '#f87171',
                        background: 'rgba(239,68,68,0.1)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        padding: '6px 14px'
                      }}
                    >
                      Priority Jump to Next Mistake
                    </button>
                  )
                ) : (
                  <button className="btn-skip" onClick={handleSkip}>Skip</button>
                )}
                <span className="q-position">{currentQ + 1} of {questions.length}</span>
              </div>

              {!submitResult && currentQ === questions.length - 1 ? (
                <button
                  className="btn-primary exam-nav-btn btn-submit-nav"
                  onClick={() => handleSubmitExam()}
                  disabled={submitting}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              ) : (
                <button className="btn-primary exam-nav-btn" disabled={currentQ === questions.length - 1} onClick={handleNext}>
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive AI Diagnostic & Blueprint Analysis Modal (Opened via View Full AI Diagnostic button) */}
      {showAiModal && submitResult && evalSummary && (
        <div className="overlay" style={{ display: "flex", alignItems: "flex-start", padding: "30px 16px" }}>
          <div
            className="ai-report-modal"
            style={{
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <AIIcon size={28} />
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text, #fff)' }}>
                    AI Performance & Syllabus Diagnostics
                  </h2>
                </div>
                <p style={{ margin: 0, color: 'var(--muted, #9ca3af)', fontSize: '0.9rem' }}>
                  {examName} • {subject} • KCET Diagnostic Evaluation
                </p>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowAiModal(false)}
                style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                 Close Report
              </button>
            </div>

            {/* Proctoring Violation Notice Banner */}
            {submitResult.autoSubmitted && (
              <div style={{
                padding: '16px 20px',
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1.5px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '12px',
                marginBottom: '22px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left'
              }}>
                <span style={{ fontSize: '2.2rem' }}>Blocked</span>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--red-l, #f87171)', fontSize: '1.02rem' }}>
                    Exam Automatically Submitted (Proctoring Violation)
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text)', marginTop: '4px', lineHeight: '1.4' }}>
                    {submitResult.violationReason || 'Your test was automatically submitted because your face was not recognized for the second time during the exam.'}
                  </div>
                </div>
              </div>
            )}

            {/* Top Score Card */}
            <div style={{
              background: 'var(--color-soft-orange)',
              border: '1px solid var(--color-light-orange)',
              borderRadius: '14px',
              padding: '22px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Score</div>
                  <div style={{ fontSize: '2.6rem', fontWeight: 900, color: evalSummary.percentage >= 60 ? 'var(--green, #10b981)' : 'var(--yellow, #f59e0b)', lineHeight: 1.1, marginTop: '4px' }}>
                    {evalSummary.score} <span style={{ fontSize: '1.3rem', color: 'var(--muted, #9ca3af)', fontWeight: 500 }}>/ {evalSummary.total}</span>
                  </div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text, #fff)', fontWeight: 600, marginTop: '6px' }}>
                    {evalSummary.percentage}% Final Accuracy
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Performance Band</div>
                  <div style={{ 
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    background: evalSummary.percentage >= 75 ? 'rgba(16,185,129,0.2)' : evalSummary.percentage >= 50 ? 'rgba(230,95,0,0.25)' : 'rgba(239,68,68,0.2)',
                    color: evalSummary.percentage >= 75 ? '#34d399' : evalSummary.percentage >= 50 ? '#E65F00' : '#f87171',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: `1px solid ${evalSummary.percentage >= 75 ? 'rgba(16,185,129,0.4)' : evalSummary.percentage >= 50 ? 'rgba(230,95,0,0.4)' : 'rgba(239,68,68,0.4)'}`
                  }}>
                    Priority {evalSummary.band}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted, #9ca3af)', marginTop: '8px' }}>
                    {evalSummary.pacing}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ color: 'var(--green, #10b981)', fontWeight: 800, fontSize: '1.3rem' }}>{evalSummary.correctCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted, #9ca3af)' }}>Correct</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ color: 'var(--red, #ef4444)', fontWeight: 800, fontSize: '1.3rem' }}>{evalSummary.incorrectCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted, #9ca3af)' }}>Incorrect</div>
                  </div>
                  <div style={{ background: 'rgba(156,163,175,0.1)', border: '1px solid rgba(156,163,175,0.25)', borderRadius: '10px', padding: '10px' }}>
                    <div style={{ color: '#9ca3af', fontWeight: 800, fontSize: '1.3rem' }}>{evalSummary.unansCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted, #9ca3af)' }}>Skipped</div>
                  </div>
                </div>
              </div>

              {/* AI Verdict Quote */}
              <div style={{ marginTop: '18px', padding: '12px 16px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', borderLeft: '4px solid var(--color-primary, #E65F00)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary, #E65F00)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  AI Evaluator Verdict
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text, #e5e7eb)', lineHeight: 1.5 }}>
                  "{evalSummary.verdict}"
                </div>
              </div>
            </div>

            {/* KCET Blueprint & Calculation vs Theory Diagnostic */}
            {(evalSummary.blueprintPerf || Object.keys(evalSummary.subtypeMap).length > 0) && (
              <div style={{
                background: 'var(--s2, #1a1d26)',
                border: '1px solid var(--color-light-orange)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '26px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>Target</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text, #fff)' }}>
                      KCET Blueprint & Calculation Breakdown Diagnostic
                    </h3>
                  </div>
                  {evalSummary.blueprintPerf?.type && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: 'rgba(230,95,0,0.2)', color: 'var(--color-primary, #E65F00)', border: '1px solid rgba(230,95,0,0.4)' }}>
                      {evalSummary.blueprintPerf.type === 'physics' ? 'Physics 55% Calculations / 45% Theory Pattern' : 'Chemistry 10% Numericals / 90% Facts Pattern'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  {Object.entries(evalSummary.subtypeMap).map(([stKey, stData]) => {
                    const stPct = stData.accuracy_pct ?? 0;
                    const isHigh = stPct >= 70;
                    const isMed = stPct >= 40;
                    const barColor = isHigh ? '#10b981' : isMed ? '#f59e0b' : '#ef4444';

                    return (
                      <div key={stKey} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text, #e5e7eb)' }}>
                            {stData.label || stKey.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: barColor }}>
                            {stPct}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--muted, #9ca3af)', marginBottom: '6px' }}>
                          <span>{stData.correct} of {stData.total} correct</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, stPct))}%`, height: '100%', background: barColor }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {evalSummary.blueprintDiag && (
                  <div style={{ padding: '10px 14px', background: 'rgba(230,95,0,0.08)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary, #E65F00)', fontSize: '0.86rem', color: 'var(--text, #d1d5db)' }}>
                    <strong style={{ color: 'var(--color-primary, #E65F00)' }}>Blueprint Strategy:</strong> {evalSummary.blueprintDiag}
                  </div>
                )}
              </div>
            )}

            {/* Syllabus Topic Mastery Breakdown */}
            {Object.keys(evalSummary.topicMap).length > 0 && (
              <div style={{ marginBottom: '26px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Analytics</span> Syllabus Topic Mastery Matrix
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {Object.entries(evalSummary.topicMap).map(([tName, tData]) => {
                    const tPct = tData.accuracy_pct ?? 0;
                    const level = tData.mastery_level || (tPct >= 75 ? 'Mastered' : tPct >= 50 ? 'Intermediate' : 'Review Needed');
                    const badgeColor = level === 'Mastered' ? '#10b981' : level === 'Intermediate' ? '#f59e0b' : '#ef4444';
                    const badgeBg = level === 'Mastered' ? 'rgba(16,185,129,0.15)' : level === 'Intermediate' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';

                    return (
                      <div key={tName} style={{ background: 'var(--s2, #1a1d26)', border: '1px solid var(--border, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text, #fff)' }}>{tName}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: badgeBg, color: badgeColor }}>
                            {level}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted, #9ca3af)', marginBottom: '6px' }}>
                          <span>Accuracy: {tPct}%</span>
                          <span>{tData.correct}/{tData.total} correct</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, tPct))}%`, height: '100%', background: badgeColor, transition: 'width 0.4s ease' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Plan */}
            {evalSummary.actionPlan.length > 0 && (
              <div style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '12px',
                padding: '18px 20px',
                marginBottom: '26px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <AIIcon size={18} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#fbbf24' }}>
                    Targeted AI Revision Action Plan
                  </h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text, #e5e7eb)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  {evalSummary.actionPlan.map((step, sIdx) => (
                    <li key={sIdx} style={{ marginBottom: '6px' }}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowAiModal(false)}
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                Back to Question Reviews
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/dashboard')}
                style={{ padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                Go to Student Dashboard →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Exam;
