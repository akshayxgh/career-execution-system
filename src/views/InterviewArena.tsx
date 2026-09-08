import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import type { QuestionBankItem, QuestionConfidence, StudyLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Award,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Save,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  copilotService,
  type SpeechCritiqueResult,
  getQuestionTools,
  getQuestionCompanies,
} from '../services/copilotService';
import { formatToISTDate } from '../utils/dateUtils';

// Web Speech API interface declarations for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

type WorkoutMode = '45m_workout' | '15m_sprint' | 'company_drill' | 'freeform';

export const InterviewArena: React.FC = () => {
  const { state, updateState } = useStore();

  // Mode & Selection
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('45m_workout');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedTool, setSelectedTool] = useState<string>('ALL');

  // Question Queue
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionQuestions, setSessionQuestions] = useState<QuestionBankItem[]>([]);
  const [showIdealAnswer, setShowIdealAnswer] = useState<boolean>(false);

  // Timer States
  const [questionTimerSeconds, setQuestionTimerSeconds] = useState<number>(60);
  const [initialTimerSeconds, setInitialTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [totalSessionSeconds, setTotalSessionSeconds] = useState<number>(45 * 60);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Speech Recognition States
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcribedSpeech, setTranscribedSpeech] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  // AI Evaluation State
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [critiqueResult, setCritiqueResult] = useState<SpeechCritiqueResult | null>(null);

  // Session Logging State
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [loggedStudyHours, setLoggedStudyHours] = useState<boolean>(false);

  // Unique list of companies and tools from Question Bank
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    state.questionBank.forEach((q) => {
      getQuestionCompanies(q).forEach((c) => {
        if (c && c.toLowerCase() !== 'general') set.add(c);
      });
    });
    return Array.from(set).sort();
  }, [state.questionBank]);

  const availableTools = useMemo(() => {
    const set = new Set<string>();
    state.questionBank.forEach((q) => {
      getQuestionTools(q).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [state.questionBank]);

  // Filter and build queue of questions for the workout
  const buildSessionQueue = (mode: WorkoutMode, comp: string, tool: string) => {
    let pool = [...state.questionBank];

    // Filter by tool if specified
    if (tool !== 'ALL') {
      pool = pool.filter((q) => getQuestionTools(q).includes(tool));
    }

    // Filter by company if specified
    if (comp !== 'ALL') {
      pool = pool.filter((q) => getQuestionCompanies(q).includes(comp));
    }

    // Prioritize struggling & hesitant questions, then unseen, then mastered
    pool.sort((a, b) => {
      const order: Record<QuestionConfidence, number> = {
        struggled: 1,
        hesitant: 2,
        unseen: 3,
        mastered: 4,
      };
      return (order[a.confidence] || 3) - (order[b.confidence] || 3);
    });

    let targetCount = 10;
    if (mode === '15m_sprint') targetCount = 4;
    else if (mode === '45m_workout') targetCount = 9;
    else if (mode === 'company_drill') targetCount = 6;
    else targetCount = Math.min(pool.length, 15);

    const selected = pool.slice(0, targetCount);
    setSessionQuestions(selected);
    setCurrentIndex(0);
    setTranscribedSpeech('');
    setCritiqueResult(null);
    setShowIdealAnswer(false);
    setSessionCompleted(false);
    setLoggedStudyHours(false);

    const timeLimit = selected[0]?.difficulty === 'Hard' ? 90 : 60;
    setQuestionTimerSeconds(timeLimit);
    setInitialTimerSeconds(timeLimit);
    setIsTimerRunning(false);
  };

  useEffect(() => {
    buildSessionQueue(workoutMode, selectedCompany, selectedTool);
  }, [workoutMode, selectedCompany, selectedTool, state.questionBank.length]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }
      setTranscribedSpeech(fullTranscript.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  // Question countdown interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && questionTimerSeconds > 0) {
      interval = setInterval(() => {
        setQuestionTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch {
                // Ignore
              }
              setIsListening(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, questionTimerSeconds, isListening]);

  // Overall session countdown timer (for 45m workout)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSessionActive && totalSessionSeconds > 0) {
      interval = setInterval(() => {
        setTotalSessionSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, totalSessionSeconds]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your answer manually.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (!isTimerRunning && questionTimerSeconds > 0) {
          setIsTimerRunning(true);
        }
        if (!isSessionActive) {
          setIsSessionActive(true);
        }
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  const currentQuestion: QuestionBankItem | undefined = sessionQuestions[currentIndex];

  const handleNextQuestion = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListening(false);
    }

    if (currentIndex + 1 < sessionQuestions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setTranscribedSpeech('');
      setCritiqueResult(null);
      setShowIdealAnswer(false);
      const nextQ = sessionQuestions[nextIdx];
      const timeLimit = nextQ?.difficulty === 'Hard' ? 90 : 60;
      setQuestionTimerSeconds(timeLimit);
      setInitialTimerSeconds(timeLimit);
      setIsTimerRunning(false);
    } else {
      setSessionCompleted(true);
      setIsTimerRunning(false);
      setIsSessionActive(false);
    }
  };

  const handleConfidenceUpdate = (newConfidence: QuestionConfidence) => {
    if (!currentQuestion) return;
    const updatedBank = state.questionBank.map((q) =>
      q.id === currentQuestion.id ? { ...q, confidence: newConfidence, updatedAt: new Date().toISOString() } : q
    );
    updateState({ questionBank: updatedBank });
  };

  // Run AI Speech Critique
  const runAiCritique = async () => {
    if (!currentQuestion || !transcribedSpeech.trim()) {
      alert('Please speak or type your answer before requesting an AI critique.');
      return;
    }

    setIsEvaluating(true);
    try {
      const result = await copilotService.critiqueSpokenAnswer({
        question: currentQuestion.question,
        tool: currentQuestion.tool,
        topic: currentQuestion.topic,
        targetCompany: currentQuestion.company,
        transcribedSpeech: transcribedSpeech.trim(),
      });
      setCritiqueResult(result);
    } catch (err) {
      console.error('Failed to critique answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 1-Click Log Session to Daily Routine Tracker (studyLogs)
  const logSessionToDailyRoutine = () => {
    const elapsedMinutes = Math.max(15, Math.round((45 * 60 - totalSessionSeconds) / 60) || 45);
    const todayStr = formatToISTDate(new Date().toISOString());

    const newLog: StudyLog = {
      id: uuidv4(),
      date: todayStr,
      subject: 'Interview Practice',
      topic: `45-Min Verbal Interview Arena (${sessionQuestions.length} Questions Practiced)`,
      plannedHours: 0.75,
      actualHours: Math.round((elapsedMinutes / 60) * 10) / 10,
      confidenceScore: 8,
      notes: `Verbal drill session: Practiced rapid-fire pitches, senior gotchas, and AI evaluations on ${selectedTool !== 'ALL' ? selectedTool : 'Power BI & SQL'}.`,
      completed: true,
    };

    updateState({ studyLogs: [newLog, ...state.studyLogs] });
    setLoggedStudyHours(true);
  };

  // Word count and pacing helper
  const wordCount = useMemo(() => {
    return transcribedSpeech.trim() ? transcribedSpeech.trim().split(/\s+/).length : 0;
  }, [transcribedSpeech]);

  // Estimated Words Per Minute based on elapsed timer
  const wordsPerMinute = useMemo(() => {
    const elapsedSeconds = initialTimerSeconds - questionTimerSeconds;
    if (elapsedSeconds < 5 || wordCount === 0) return 0;
    return Math.round((wordCount / elapsedSeconds) * 60);
  }, [wordCount, initialTimerSeconds, questionTimerSeconds]);

  // Format MM:SS helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--danger)',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              <Mic size={13} />
              VERBAL PITCH & SPEECH SIMULATOR
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              • 45-Min Daily Speaking Workout
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Interview Arena</h1>
          <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            Master clear, structured articulation under pressure using the Senior Consultant 3-Part Formula
          </p>
        </div>

        {/* Total Session Clock & Daily Routine Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Clock size={16} color="var(--accent-primary)" />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>SESSION CLOCK</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1 }}>
                {formatTime(totalSessionSeconds)}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={logSessionToDailyRoutine}
            disabled={loggedStudyHours}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Save size={16} />
            <span>{loggedStudyHours ? 'Logged to Routine ✓' : 'Log 45m Session'}</span>
          </button>
        </div>
      </header>

      {/* Mode & Category Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
        }}
      >
        {/* Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Workout Mode:</span>
          {[
            { id: '45m_workout', label: '🔥 45-Min Full Session' },
            { id: '15m_sprint', label: '⚡ 15-Min Rapid Sprint' },
            { id: 'company_drill', label: '🏢 Target Company Drill' },
            { id: 'freeform', label: '🎯 Free Practice' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setWorkoutMode(m.id as WorkoutMode)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: workoutMode === m.id ? 'var(--accent-primary)' : 'var(--bg-dark)',
                color: workoutMode === m.id ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Tool filter */}
          <select
            className="input"
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, width: 'auto' }}
          >
            <option value="ALL">All Tools (Power BI / SQL)</option>
            {availableTools.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Company filter */}
          {workoutMode === 'company_drill' && (
            <select
              className="input"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, width: 'auto' }}
            >
              <option value="ALL">Select Company</option>
              {availableCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {sessionQuestions.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <HelpCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3>No Questions Found for this Selection</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Try selecting "All Tools" or populate more questions in your Question Bank.
          </p>
        </div>
      ) : sessionCompleted ? (
        /* Session Completed Trophy Card */
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            borderRadius: '16px',
            border: '2px solid var(--accent-primary)',
          }}
        >
          <Award size={64} color="var(--accent-primary)" />
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Workout Completed! 🎉</h2>
          <p className="text-muted" style={{ maxWidth: '500px', fontSize: '0.95rem' }}>
            Outstanding effort. You just practiced {sessionQuestions.length} real verbal interview pitches out loud.
          </p>

          {!loggedStudyHours && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={logSessionToDailyRoutine}
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 800 }}
            >
              <Save size={18} />
              Log 45 Minutes to Daily Routine Tracker
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => buildSessionQueue(workoutMode, selectedCompany, selectedTool)}
            style={{ marginTop: '0.5rem' }}
          >
            Start Another Workout Round
          </button>
        </div>
      ) : (
        /* Main Dual Workspace */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem' }}>
          {/* LEFT COLUMN: Active Question, 3-Part Speech Blueprint, and Live Mic */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Question Card */}
            <div
              className="card"
              style={{
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '8px',
                      background: 'var(--bg-dark)',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    QUESTION {currentIndex + 1} OF {sessionQuestions.length}
                  </span>
                  {currentQuestion?.tool && (
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {currentQuestion.tool}
                    </span>
                  )}
                  {currentQuestion?.company && (
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '8px',
                        background: 'rgba(5, 150, 105, 0.15)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {currentQuestion.company}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '8px',
                    background:
                      currentQuestion?.difficulty === 'Hard'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color: currentQuestion?.difficulty === 'Hard' ? 'var(--danger)' : 'var(--warning)',
                  }}
                >
                  {currentQuestion?.difficulty || 'Medium'} ({initialTimerSeconds}s)
                </span>
              </div>

              {/* Question Prompt */}
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.4 }}>
                {currentQuestion?.question}
              </h2>
            </div>

            {/* The Senior Consultant 3-Part Answer Blueprint */}
            <div
              className="card"
              style={{
                borderRadius: '16px',
                borderLeft: '4px solid var(--accent-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                backgroundColor: 'rgba(5, 150, 105, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lightbulb size={18} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                  The Senior Consultant 3-Part Answer Blueprint
                </h3>
              </div>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                Follow this structure out loud to give a razor-sharp, confident answer:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-dark)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                    1. THE HOOK (First 10s)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                    State the high-level executive definition directly. Avoid filler words.
                  </div>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-dark)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', marginBottom: '0.25rem' }}>
                    2. THE RECIPE (Next 30s)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                    Walk through the practical, step-by-step implementation or DAX/SQL recipe.
                  </div>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-dark)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '0.25rem' }}>
                    3. THE GOTCHA (Last 15s)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                    Highlight an edge case, gotcha, or performance optimization (e.g. query folding).
                  </div>
                </div>
              </div>
            </div>

            {/* Live Speech Recorder & Timer Box */}
            <div
              className="card"
              style={{
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Big Microphone Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isListening ? 'var(--danger)' : 'var(--accent-primary)',
                      color: '#ffffff',
                      boxShadow: isListening ? '0 0 0 4px rgba(239, 68, 68, 0.3)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title={isListening ? 'Stop Speaking' : 'Click to Speak'}
                  >
                    {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>

                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      {isListening ? (
                        <span style={{ color: 'var(--danger)' }}>🔴 Listening & Transcribing...</span>
                      ) : (
                        <span>Click mic to start speaking</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {wordCount} words spoken • {wordsPerMinute} WPM cadence
                    </div>
                  </div>
                </div>

                {/* Stopwatch Ring Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '20px',
                    background:
                      questionTimerSeconds <= 10
                        ? 'rgba(239, 68, 68, 0.15)'
                        : questionTimerSeconds <= 25
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(5, 150, 105, 0.15)',
                    color:
                      questionTimerSeconds <= 10
                        ? 'var(--danger)'
                        : questionTimerSeconds <= 25
                        ? 'var(--warning)'
                        : 'var(--accent-primary)',
                    fontWeight: 900,
                    fontSize: '1rem',
                  }}
                >
                  <Clock size={16} />
                  <span>{formatTime(questionTimerSeconds)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: 'var(--bg-dark)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(questionTimerSeconds / initialTimerSeconds) * 100}%`,
                    height: '100%',
                    backgroundColor:
                      questionTimerSeconds <= 10
                        ? 'var(--danger)'
                        : questionTimerSeconds <= 25
                        ? 'var(--warning)'
                        : 'var(--accent-primary)',
                    transition: 'width 1s linear',
                  }}
                />
              </div>

              {/* Live Transcribed Speech Textarea */}
              <textarea
                className="input"
                rows={4}
                value={transcribedSpeech}
                onChange={(e) => setTranscribedSpeech(e.target.value)}
                placeholder="Speak out loud into your microphone (or type here). Your verbal explanation will transcribe live in real time..."
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  borderRadius: '10px',
                  resize: 'vertical',
                }}
              />

              {/* Action Buttons under Speech Box */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setTranscribedSpeech('');
                    setCritiqueResult(null);
                    setQuestionTimerSeconds(initialTimerSeconds);
                    setIsTimerRunning(false);
                  }}
                  style={{ fontSize: '0.75rem' }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Question</span>
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={runAiCritique}
                    disabled={isEvaluating || !transcribedSpeech.trim()}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: 'none',
                    }}
                  >
                    <Sparkles size={16} />
                    <span>{isEvaluating ? 'Critiquing...' : 'AI Speech Critique'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNextQuestion}
                    style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <span>Next Question</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI Critique Scorecard & Question Bank Solution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* AI Critique Scorecard Card */}
            {critiqueResult && (
              <div
                className="card"
                style={{
                  borderRadius: '16px',
                  border: '1px solid #6366f1',
                  background: 'rgba(99, 102, 241, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={18} color="#6366f1" />
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#6366f1' }}>
                      AI Speech Critique
                    </h3>
                  </div>

                  {/* Clarity Score Pill */}
                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '20px',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      background:
                        critiqueResult.clarityScore >= 8
                          ? 'var(--accent-primary)'
                          : critiqueResult.clarityScore >= 5
                          ? 'var(--warning)'
                          : 'var(--danger)',
                      color: '#ffffff',
                    }}
                  >
                    Clarity: {critiqueResult.clarityScore}/10
                  </span>
                </div>

                {/* Verdict */}
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                  {critiqueResult.verdict}
                </div>

                {/* Missing Points */}
                {critiqueResult.missingPoints && critiqueResult.missingPoints.length > 0 && (
                  <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.25rem' }}>
                      KEY CONCEPTS YOU MISSED:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      {critiqueResult.missingPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rambling Remover: Condensed Pitch */}
                {critiqueResult.condensedPitch && (
                  <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-dark)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      RAMBLING REMOVER (YOUR CORE PUNCHLINE):
                    </div>
                    <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-main)' }}>
                      "{critiqueResult.condensedPitch}"
                    </div>
                  </div>
                )}

                {/* The Elevated Senior Pitch */}
                {critiqueResult.elevatedSeniorPitch && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.08)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                      THE ELEVATED SENIOR PITCH (HOW TO SAY IT):
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                      {critiqueResult.elevatedSeniorPitch}
                    </div>
                  </div>
                )}

                {/* Realistic Follow-up Question */}
                {critiqueResult.followUpQuestion && (
                  <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6366f1', marginBottom: '0.2rem' }}>
                      ⚡ INTERVIEWER PROBE / FOLLOW-UP:
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      "{critiqueResult.followUpQuestion}"
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confidence & Question Bank Sync Card */}
            <div
              className="card"
              style={{
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>How did that answer feel?</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Updates Question Bank</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleConfidenceUpdate('struggled')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: currentQuestion?.confidence === 'struggled' ? '2px solid var(--danger)' : '1px solid var(--border-color)',
                    background: currentQuestion?.confidence === 'struggled' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-dark)',
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Struggled
                </button>

                <button
                  type="button"
                  onClick={() => handleConfidenceUpdate('hesitant')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: currentQuestion?.confidence === 'hesitant' ? '2px solid var(--warning)' : '1px solid var(--border-color)',
                    background: currentQuestion?.confidence === 'hesitant' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-dark)',
                    color: 'var(--warning)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Hesitant
                </button>

                <button
                  type="button"
                  onClick={() => handleConfidenceUpdate('mastered')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: currentQuestion?.confidence === 'mastered' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: currentQuestion?.confidence === 'mastered' ? 'rgba(5, 150, 105, 0.15)' : 'var(--bg-dark)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Mastered
                </button>
              </div>
            </div>

            {/* Reveal Question Bank Ideal Answer */}
            <div
              className="card"
              style={{
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowIdealAnswer(!showIdealAnswer)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--text-main)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                <span>Question Bank Reference Pitch</span>
                {showIdealAnswer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showIdealAnswer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {currentQuestion?.humanAnswer?.pitch ? (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>
                        30-SECOND VERBAL PITCH:
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                        {currentQuestion.humanAnswer.pitch}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No pre-saved verbal pitch found in Question Bank.
                    </div>
                  )}

                  {currentQuestion?.humanAnswer?.proTip && (
                    <div style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.1)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '0.2rem' }}>
                        SENIOR GOTCHA:
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
                        {currentQuestion.humanAnswer.proTip}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
