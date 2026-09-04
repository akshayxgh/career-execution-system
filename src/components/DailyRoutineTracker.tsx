import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import type { StudyLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  Database, BarChart3, Send, MessageSquare, CheckCircle2, 
  Clock, Play, Pause, RotateCcw, Sparkles, Check
} from 'lucide-react';
import { formatToISTDate } from '../utils/dateUtils';

interface RoutinePillar {
  id: 'sql' | 'pbi' | 'apps' | 'interview';
  title: string;
  subtitle: string;
  targetMinutes: number;
  color: string;
  accentColor: string;
  icon: React.ReactNode;
  subject: string;
  defaultTopic: string;
}

const PILLARS: RoutinePillar[] = [
  {
    id: 'sql',
    title: 'SQL Practice',
    subtitle: 'Queries, LeetCode, Window Fns',
    targetMinutes: 60, // Set to 60 min
    color: '#6366f1', // Indigo
    accentColor: 'rgba(99, 102, 241, 0.15)',
    icon: <Database size={20} />,
    subject: 'SQL Track',
    defaultTopic: 'Daily SQL Practice (60m Target)'
  },
  {
    id: 'pbi',
    title: 'Power BI & DAX',
    subtitle: 'CALCULATE, Modeling, Reports',
    targetMinutes: 90,
    color: '#059669', // Emerald
    accentColor: 'rgba(5, 150, 105, 0.15)',
    icon: <BarChart3 size={20} />,
    subject: 'Power BI Track',
    defaultTopic: 'Power BI & DAX Practice (90m Target)'
  },
  {
    id: 'apps',
    title: 'Job Applications',
    subtitle: 'Decision Engine, Naukri, LinkedIn',
    targetMinutes: 90,
    color: '#0284c7', // Sky
    accentColor: 'rgba(2, 132, 199, 0.15)',
    icon: <Send size={20} />,
    subject: 'Job Applications',
    defaultTopic: 'Targeted Job Applications (90m Target)'
  },
  {
    id: 'interview',
    title: 'Interview Prep',
    subtitle: 'Verbal Pitches, Scenarios, Mock',
    targetMinutes: 45,
    color: '#8b5cf6', // Violet
    accentColor: 'rgba(139, 92, 246, 0.15)',
    icon: <MessageSquare size={20} />,
    subject: 'Interview Practice',
    defaultTopic: 'Interview Question Prep (45m Target)'
  }
];

export const DailyRoutineTracker: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { state, updateState } = useStore();
  const todayStr = formatToISTDate(new Date().toISOString());

  // Focus Timer state
  const [activeTimerPillar, setActiveTimerPillar] = useState<'sql' | 'pbi' | 'apps' | 'interview' | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [quickPillarAdd, setQuickPillarAdd] = useState<'sql' | 'pbi' | 'apps' | 'interview' | null>(null);
  const [customMinutesInput, setCustomMinutesInput] = useState<number>(30);

  // Live timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && activeTimerPillar) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, activeTimerPillar]);

  // Aggregate today's minutes for each pillar from state.studyLogs
  const loggedMinutesMap = useMemo(() => {
    const map: Record<'sql' | 'pbi' | 'apps' | 'interview', number> = {
      sql: 0,
      pbi: 0,
      apps: 0,
      interview: 0
    };

    state.studyLogs.forEach(log => {
      // Check if log is from today (support both ISO date prefix and local formatted date)
      if (log.date === todayStr || log.date === new Date().toISOString().split('T')[0]) {
        const minutes = Math.round((log.actualHours || 0) * 60);
        const subj = (log.subject || '').toLowerCase();
        const top = (log.topic || '').toLowerCase();
        const notes = (log.notes || '').toLowerCase();

        if (subj.includes('sql') || top.includes('sql')) {
          map.sql += minutes;
        } else if (subj.includes('power bi') || subj.includes('dax') || top.includes('power bi') || top.includes('dax')) {
          map.pbi += minutes;
        } else if (subj.includes('application') || subj.includes('job') || top.includes('application') || top.includes('applied') || notes.includes('application')) {
          map.apps += minutes;
        } else if (subj.includes('interview') || top.includes('interview') || top.includes('pitch') || top.includes('prep') || notes.includes('interview')) {
          map.interview += minutes;
        }
      }
    });

    return map;
  }, [state.studyLogs, todayStr]);

  // Compute overall completion stats (60 + 90 + 90 + 45 = 285m)
  const totalTargetMinutes = 285;
  const totalLoggedMinutes = loggedMinutesMap.sql + loggedMinutesMap.pbi + loggedMinutesMap.apps + loggedMinutesMap.interview;
  const overallPercentage = Math.min(100, Math.round((totalLoggedMinutes / totalTargetMinutes) * 100));
  const allCompleted = PILLARS.every(p => loggedMinutesMap[p.id] >= p.targetMinutes);

  // Quick log handler with notes support
  const handleAddMinutes = (
    pillarId: 'sql' | 'pbi' | 'apps' | 'interview', 
    minutes: number, 
    topicNote?: string,
    notesContent?: string
  ) => {
    if (minutes <= 0) return;
    const pillar = PILLARS.find(p => p.id === pillarId)!;
    const hours = Number((minutes / 60).toFixed(2));

    const newLog: StudyLog = {
      id: uuidv4(),
      date: todayStr,
      subject: pillar.subject,
      topic: topicNote?.trim() || pillar.defaultTopic,
      plannedHours: hours,
      actualHours: hours,
      confidenceScore: 8,
      notes: notesContent?.trim() || `Logged via Daily 4-Pillar Focus Protocol (+${minutes} min)`,
      completed: true
    };

    updateState({ studyLogs: [newLog, ...state.studyLogs] });
    setQuickPillarAdd(null);
    setCustomTopic('');
    setSessionNotes('');
  };

  // Timer complete & save handler with notes support
  const handleFinishTimer = () => {
    if (!activeTimerPillar) return;
    const elapsedMinutes = Math.max(1, Math.round(timerSeconds / 60));
    handleAddMinutes(activeTimerPillar, elapsedMinutes, customTopic, sessionNotes);
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setActiveTimerPillar(null);
    setCustomTopic('');
    setSessionNotes('');
  };

  const formatTimerDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="card" style={{ borderTop: '4px solid var(--accent-primary)', position: 'relative' }}>
      
      {/* Tracker Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
              <Sparkles size={20} className="text-accent-primary" /> Daily Focus Protocol
            </h3>
            {allCompleted && (
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={12} /> All Targets Met Today!
              </span>
            )}
          </div>
          <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
            Daily commitment: <strong>SQL (60m)</strong> • <strong>Power BI/DAX (90m)</strong> • <strong>Applications (90m)</strong> • <strong>Interview Prep (45m)</strong> — <em>285 min total</em>
          </p>
        </div>

        {/* Header Right: Day Progress Gauge */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: overallPercentage >= 100 ? 'var(--success)' : 'var(--text-main)' }}>
            {totalLoggedMinutes} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {totalTargetMinutes} min</span>
            <span style={{ marginLeft: '0.5rem', fontSize: '1rem', color: overallPercentage >= 100 ? 'var(--success)' : 'var(--accent-primary)' }}>
              ({overallPercentage}%)
            </span>
          </div>
          <span className="text-xs text-muted">
            {totalTargetMinutes - totalLoggedMinutes > 0 
              ? `${totalTargetMinutes - totalLoggedMinutes} min remaining today` 
              : 'Daily goal exceeded!'}
          </span>
        </div>
      </div>

      {/* Global Day Progress Bar */}
      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${overallPercentage}%`, 
            backgroundColor: overallPercentage >= 100 ? 'var(--success)' : 'var(--accent-primary)',
            transition: 'width 0.4s ease'
          }} 
        />
      </div>

      {/* Active Focus Timer Banner with Notes Section */}
      {activeTimerPillar && (
        <div style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          borderRadius: 'var(--radius-md)', 
          backgroundColor: 'var(--bg-hover)', 
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: isTimerRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: isTimerRunning ? 'var(--success)' : 'var(--warning)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Clock size={20} />
              </div>
              <div>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Live Focus Sprint
                </span>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {PILLARS.find(p => p.id === activeTimerPillar)?.title}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '1.75rem', fontFamily: 'monospace', fontWeight: 800 }}>
                {formatTimerDisplay(timerSeconds)}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.75rem' }}
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                  {isTimerRunning ? 'Pause' : 'Resume'}
                </button>

                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ padding: '0.4rem 0.75rem' }}
                  onClick={handleFinishTimer}
                >
                  <Check size={16} /> Finish & Log
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem' }}
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                    setActiveTimerPillar(null);
                    setSessionNotes('');
                    setCustomTopic('');
                  }}
                  title="Discard timer"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Session Notes for Timer */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <input 
              type="text" 
              placeholder="Topic covered (e.g. Window Functions, LeetCode 178)..." 
              className="input" 
              style={{ flex: 1, minWidth: '220px', fontSize: '0.8rem' }}
              value={customTopic}
              onChange={e => setCustomTopic(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Session notes / key takeaways / formulas practiced..." 
              className="input" 
              style={{ flex: 1.5, minWidth: '280px', fontSize: '0.8rem' }}
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* 4 Pillar Cards Grid */}
      <div 
        className="grid gap-4" 
        style={{ 
          gridTemplateColumns: compact 
            ? 'repeat(auto-fit, minmax(200px, 1fr))' 
            : 'repeat(auto-fit, minmax(240px, 1fr))' 
        }}
      >
        {PILLARS.map(pillar => {
          const loggedMins = loggedMinutesMap[pillar.id];
          const pct = Math.min(100, Math.round((loggedMins / pillar.targetMinutes) * 100));
          const isDone = loggedMins >= pillar.targetMinutes;
          const remainingMins = Math.max(0, pillar.targetMinutes - loggedMins);
          const isAdding = quickPillarAdd === pillar.id;

          return (
            <div 
              key={pillar.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `1px solid ${isDone ? 'var(--success)' : 'var(--border-color)'}`,
                borderLeft: `4px solid ${pillar.color}`,
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: isDone ? '0 2px 10px rgba(16, 185, 129, 0.1)' : 'var(--shadow-sm)'
              }}
            >
              {/* Pillar Title & Status */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: pillar.color }}>
                      {pillar.icon}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{pillar.title}</span>
                  </div>
                  {isDone ? (
                    <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                      <CheckCircle2 size={12} /> Done
                    </span>
                  ) : (
                    <span className="badge" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', backgroundColor: 'var(--bg-hover)' }}>
                      {remainingMins}m left
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                  {pillar.subtitle}
                </div>
              </div>

              {/* Progress Numbers & Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isDone ? 'var(--success)' : 'var(--text-main)' }}>
                    {loggedMins} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {pillar.targetMinutes}m</span>
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isDone ? 'var(--success)' : pillar.color }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${pct}%`, 
                      backgroundColor: isDone ? 'var(--success)' : pillar.color,
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Quick Log & Timer Controls */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                {isAdding ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <input 
                        type="number" 
                        min="5"
                        step="5"
                        className="input" 
                        style={{ width: '70px', fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                        value={customMinutesInput}
                        onChange={e => setCustomMinutesInput(Math.max(1, Number(e.target.value)))}
                      />
                      <span className="text-xs text-muted">min</span>
                      <input 
                        type="text" 
                        placeholder="Topic (e.g. Window Fns)..." 
                        className="input" 
                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        value={customTopic}
                        onChange={e => setCustomTopic(e.target.value)}
                      />
                    </div>
                    <div>
                      <textarea
                        rows={2}
                        placeholder="Session notes, takeaways, questions..."
                        className="textarea"
                        style={{ width: '100%', fontSize: '0.75rem', padding: '0.3rem 0.5rem', resize: 'vertical' }}
                        value={sessionNotes}
                        onChange={e => setSessionNotes(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                        onClick={() => handleAddMinutes(pillar.id, customMinutesInput, customTopic, sessionNotes)}
                      >
                        + Add {customMinutesInput}m
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                        onClick={() => {
                          setQuickPillarAdd(null);
                          setSessionNotes('');
                          setCustomTopic('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem' }} 
                        onClick={() => handleAddMinutes(pillar.id, 15)}
                        title="Quick add 15 minutes"
                      >
                        +15m
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem' }} 
                        onClick={() => handleAddMinutes(pillar.id, 30)}
                        title="Quick add 30 minutes"
                      >
                        +30m
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem' }} 
                        onClick={() => handleAddMinutes(pillar.id, 45)}
                        title="Quick add 45 minutes"
                      >
                        +45m
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.2rem 0.35rem', fontSize: '0.7rem' }} 
                        onClick={() => setQuickPillarAdd(pillar.id)}
                        title="Custom minutes and topic"
                      >
                        +Custom
                      </button>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.725rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      onClick={() => {
                        setActiveTimerPillar(pillar.id);
                        setIsTimerRunning(true);
                      }}
                      title="Start live focus timer"
                    >
                      <Play size={11} /> Sprint
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
