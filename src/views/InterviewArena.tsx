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
import './InterviewArena.css';

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
  const [showBlueprint, setShowBlueprint] = useState<boolean>(true);

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
      if (result.suggestedConfidence) {
        handleConfidenceUpdate(result.suggestedConfidence);
      }
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
    <div className="arena-container">
      {/* Header Banner */}
      <header className="arena-header">
        <div className="arena-header-left">
          <div className="arena-badge-group">
            <span className="arena-tag-badge">
              <Mic size={13} />
              VERBAL PITCH & SPEECH SIMULATOR
            </span>
            <span className="arena-tag-sub">• 45-Min Daily Speaking Workout</span>
          </div>
          <h1 className="arena-title">Interview Arena</h1>
          <p className="arena-subtitle">
            Master clear, structured articulation under pressure using the Senior Consultant 3-Part Formula
          </p>
        </div>

        {/* Total Session Clock & Daily Routine Sync */}
        <div className="arena-header-actions">
          <div className="arena-clock-box">
            <Clock size={16} color="var(--accent-primary)" />
            <div>
              <div className="arena-clock-label">SESSION CLOCK</div>
              <div className="arena-clock-value">
                {formatTime(totalSessionSeconds)}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary arena-log-btn"
            onClick={logSessionToDailyRoutine}
            disabled={loggedStudyHours}
          >
            <Save size={16} />
            <span>{loggedStudyHours ? 'Logged to Routine ✓' : 'Log 45m Session'}</span>
          </button>
        </div>
      </header>

      {/* Mode & Category Bar */}
      <div className="card arena-toolbar">
        {/* Modes */}
        <div className="arena-modes-wrapper">
          <span className="arena-modes-label">Workout Mode:</span>
          <div className="arena-modes-list">
            {[
              { id: '45m_workout', label: '🔥 45-Min Full Session' },
              { id: '15m_sprint', label: '⚡ 15-Min Rapid Sprint' },
              { id: 'company_drill', label: '🏢 Target Company Drill' },
              { id: 'freeform', label: '🎯 Free Practice' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`arena-mode-btn ${workoutMode === m.id ? 'active' : ''}`}
                onClick={() => setWorkoutMode(m.id as WorkoutMode)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="arena-filters">
          {/* Tool filter */}
          <select
            className="input arena-filter-select"
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
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
              className="input arena-filter-select"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
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
        <div className="card arena-empty-card">
          <HelpCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
          <h3>No Questions Found for this Selection</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Try selecting "All Tools" or populate more questions in your Question Bank.
          </p>
        </div>
      ) : sessionCompleted ? (
        /* Session Completed Trophy Card */
        <div className="card arena-trophy-card">
          <Award size={64} color="var(--accent-primary)" />
          <h2>Workout Completed! 🎉</h2>
          <p className="text-muted">
            Outstanding effort. You just practiced {sessionQuestions.length} real verbal interview pitches out loud.
          </p>

          <div className="arena-trophy-actions">
            {!loggedStudyHours && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={logSessionToDailyRoutine}
              >
                <Save size={18} />
                <span>Log 45 Minutes to Daily Routine Tracker</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => buildSessionQueue(workoutMode, selectedCompany, selectedTool)}
            >
              Start Another Workout Round
            </button>
          </div>
        </div>
      ) : (
        /* Main Dual Workspace */
        <div className="arena-grid">
          {/* LEFT COLUMN: Active Question, 3-Part Speech Blueprint, and Live Mic */}
          <div className="arena-left-col">
            {/* Question Card */}
            <div className="card arena-card">
              {/* Question Header */}
              <div className="arena-q-header">
                <div className="arena-q-tags">
                  <span className="arena-tag arena-tag-num">
                    QUESTION {currentIndex + 1} OF {sessionQuestions.length}
                  </span>
                  {currentQuestion?.tool && (
                    <span className="arena-tag arena-tag-tool">
                      {currentQuestion.tool}
                    </span>
                  )}
                  {currentQuestion?.company && (
                    <span className="arena-tag arena-tag-company">
                      {currentQuestion.company}
                    </span>
                  )}
                </div>

                <span
                  className={`arena-tag-diff ${
                    currentQuestion?.difficulty === 'Hard' ? 'hard' : 'medium'
                  }`}
                >
                  {currentQuestion?.difficulty || 'Medium'} ({initialTimerSeconds}s)
                </span>
              </div>

              {/* Question Prompt */}
              <h2 className="arena-q-prompt">
                {currentQuestion?.question}
              </h2>
            </div>

            {/* The Senior Consultant 3-Part Answer Blueprint */}
            <div className="card arena-blueprint-card arena-card">
              <div
                className="arena-blueprint-header"
                onClick={() => setShowBlueprint(!showBlueprint)}
                role="button"
                tabIndex={0}
              >
                <div className="arena-blueprint-title-wrap">
                  <Lightbulb size={18} color="var(--accent-primary)" />
                  <h3 className="arena-blueprint-title">
                    The Senior Consultant 3-Part Answer Blueprint
                  </h3>
                </div>
                <button
                  type="button"
                  className="arena-blueprint-toggle-btn"
                  aria-label={showBlueprint ? 'Collapse Blueprint' : 'Expand Blueprint'}
                >
                  {showBlueprint ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showBlueprint && (
                <>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                    Follow this structure out loud to give a razor-sharp, confident answer:
                  </p>

                  <div className="arena-blueprint-grid">
                    <div className="arena-blueprint-col">
                      <div
                        className="arena-blueprint-step-tag"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        1. THE HOOK (First 10s)
                      </div>
                      <div className="arena-blueprint-step-desc">
                        State the high-level executive definition directly. Avoid filler words.
                      </div>
                    </div>

                    <div className="arena-blueprint-col">
                      <div
                        className="arena-blueprint-step-tag"
                        style={{ color: '#6366f1' }}
                      >
                        2. THE RECIPE (Next 30s)
                      </div>
                      <div className="arena-blueprint-step-desc">
                        Walk through the practical, step-by-step implementation or DAX/SQL recipe.
                      </div>
                    </div>

                    <div className="arena-blueprint-col">
                      <div
                        className="arena-blueprint-step-tag"
                        style={{ color: 'var(--warning)' }}
                      >
                        3. THE GOTCHA (Last 15s)
                      </div>
                      <div className="arena-blueprint-step-desc">
                        Highlight an edge case, gotcha, or performance optimization (e.g. query folding).
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reveal Question Bank Ideal Answer (Reference Pitch) */}
            <div className="card arena-solution-card">
              <button
                type="button"
                className="arena-solution-accordion-btn"
                onClick={() => setShowIdealAnswer(!showIdealAnswer)}
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

            {/* Live Speech Recorder & Timer Box */}
            <div className="card arena-recorder-card arena-card">
              <div className="arena-recorder-top">
                <div className="arena-mic-status-wrap">
                  {/* Big Microphone Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`arena-mic-btn ${isListening ? 'listening' : ''}`}
                    title={isListening ? 'Stop Speaking' : 'Click to Speak'}
                  >
                    {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                  </button>

                  <div className="arena-mic-labels">
                    <div className="arena-mic-state">
                      {isListening ? (
                        <span style={{ color: 'var(--danger)' }}>🔴 Listening & Transcribing...</span>
                      ) : (
                        <span>Click mic to start speaking</span>
                      )}
                    </div>
                    <div className="arena-mic-stats">
                      {wordCount} words spoken • {wordsPerMinute} WPM cadence
                    </div>
                  </div>
                </div>

                {/* Stopwatch Ring Pill */}
                <div
                  className="arena-timer-pill"
                  style={{
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
                  }}
                >
                  <Clock size={16} />
                  <span>{formatTime(questionTimerSeconds)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="arena-progress-track">
                <div
                  className="arena-progress-bar"
                  style={{
                    width: `${(questionTimerSeconds / initialTimerSeconds) * 100}%`,
                    backgroundColor:
                      questionTimerSeconds <= 10
                        ? 'var(--danger)'
                        : questionTimerSeconds <= 25
                        ? 'var(--warning)'
                        : 'var(--accent-primary)',
                  }}
                />
              </div>

              {/* Live Transcribed Speech Textarea */}
              <textarea
                className="input arena-speech-textarea"
                rows={4}
                value={transcribedSpeech}
                onChange={(e) => setTranscribedSpeech(e.target.value)}
                placeholder="Speak out loud into your microphone (or type here). Your verbal explanation will transcribe live in real time..."
              />

              {/* Action Buttons under Speech Box */}
              <div className="arena-recorder-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setTranscribedSpeech('');
                    setCritiqueResult(null);
                    setQuestionTimerSeconds(initialTimerSeconds);
                    setIsTimerRunning(false);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset Question</span>
                </button>

                <div className="arena-recorder-actions-primary">
                  <button
                    type="button"
                    className="arena-ai-critique-btn"
                    onClick={runAiCritique}
                    disabled={isEvaluating || !transcribedSpeech.trim()}
                  >
                    <Sparkles size={16} />
                    <span>{isEvaluating ? 'Critiquing...' : 'AI Speech Critique'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary arena-next-btn"
                    onClick={handleNextQuestion}
                  >
                    <span>Next Question</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI Critique Scorecard & Question Bank Solution */}
          <div className="arena-right-col">
            {/* AI Critique Scorecard Card */}
            {critiqueResult && (
              <div className="card arena-critique-card">
                <div className="arena-critique-header">
                  <div className="arena-critique-title">
                    <Sparkles size={18} color="#6366f1" />
                    <h3>AI Speech Critique</h3>
                  </div>

                  {/* Clarity Score Pill */}
                  <span
                    className="arena-clarity-score"
                    style={{
                      background:
                        critiqueResult.clarityScore >= 8
                          ? 'var(--accent-primary)'
                          : critiqueResult.clarityScore >= 5
                          ? 'var(--warning)'
                          : 'var(--danger)',
                    }}
                  >
                    Clarity: {critiqueResult.clarityScore}/10
                  </span>
                </div>

                {/* Verdict */}
                <div className="arena-critique-verdict">
                  {critiqueResult.verdict}
                </div>

                {/* Missing Points */}
                {critiqueResult.missingPoints && critiqueResult.missingPoints.length > 0 && (
                  <div className="arena-critique-section" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                    <div className="arena-critique-section-title" style={{ color: 'var(--danger)' }}>
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
                  <div className="arena-critique-section" style={{ background: 'var(--bg-dark)' }}>
                    <div className="arena-critique-section-title" style={{ color: 'var(--text-muted)' }}>
                      RAMBLING REMOVER (YOUR CORE PUNCHLINE):
                    </div>
                    <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-main)' }}>
                      "{critiqueResult.condensedPitch}"
                    </div>
                  </div>
                )}

                {/* The Elevated Senior Pitch */}
                {critiqueResult.elevatedSeniorPitch && (
                  <div className="arena-critique-section" style={{ background: 'rgba(5, 150, 105, 0.08)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div className="arena-critique-section-title" style={{ color: 'var(--accent-primary)' }}>
                      THE ELEVATED SENIOR PITCH (HOW TO SAY IT):
                    </div>
                    <div className="arena-critique-section-body">
                      {critiqueResult.elevatedSeniorPitch}
                    </div>
                  </div>
                )}

                {/* Realistic Follow-up Question */}
                {critiqueResult.followUpQuestion && (
                  <div className="arena-critique-section" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                    <div className="arena-critique-section-title" style={{ color: '#6366f1' }}>
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
            <div className="card arena-confidence-card">
              <div className="arena-confidence-header">
                <span className="arena-confidence-title">How did that answer feel?</span>
                <span className="arena-confidence-sub">Updates Question Bank</span>
              </div>

              {critiqueResult?.suggestedConfidence && (
                <div className="arena-auto-rated-badge">
                  <Sparkles size={14} />
                  <span>
                    AI Auto-Rated: <strong style={{ textTransform: 'capitalize', color: 'var(--text-main)' }}>{critiqueResult.suggestedConfidence}</strong> (Saved)
                  </span>
                </div>
              )}

              <div className="arena-confidence-btn-group">
                <button
                  type="button"
                  onClick={() => handleConfidenceUpdate('struggled')}
                  className="arena-confidence-btn"
                  style={{
                    border: currentQuestion?.confidence === 'struggled' ? '2px solid var(--danger)' : '1px solid var(--border-color)',
                    background: currentQuestion?.confidence === 'struggled' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-dark)',
                    color: 'var(--danger)',
                  }}
                >
                  Struggled
                </button>

                <button
                  type="button"
                  onClick={() => handleConfidenceUpdate('hesitant')}
                  className="arena-confidence-btn"
                  style={{
                    border: currentQuestion?.confidence === 'hesitant' ? '2px solid var(--warning)' : '1px solid var(--border-color)',
                    background: currentQuestion?.confidence === 'hesitant' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-dark)',
                    color: 'var(--warning)',
                  }}
                >
                  Hesitant
                </button>

                <button
                  type="button"
                  onClick={() => handleConfidenceUpdate('mastered')}
                  className="arena-confidence-btn"
                  style={{
                    border: currentQuestion?.confidence === 'mastered' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: currentQuestion?.confidence === 'mastered' ? 'rgba(5, 150, 105, 0.15)' : 'var(--bg-dark)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  Mastered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
