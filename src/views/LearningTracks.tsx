import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import type { TrackStatus, StudyLog, LearningTrack, TrackModule } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, BookOpen, Clock, ChevronDown, ChevronRight, 
  Flame, Award, TrendingUp, Search, 
  Pencil, Trash2, X, HelpCircle, ArrowRight,
  RefreshCw, FileText, Sparkles
} from 'lucide-react';
import { getStreak } from '../utils/scoreCalculator';
import { isSameWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { DailyRoutineTracker } from '../components/DailyRoutineTracker';

export const LearningTracks = () => {
  const { state, updateState, syncWithCloud, isSyncing, lastSyncedAt } = useStore();
  
  // UI States
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [addingModuleTrackId, setAddingModuleTrackId] = useState<string | null>(null);
  const [newModuleName, setNewModuleName] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [displayLimit, setDisplayLimit] = useState<number>(15);

  // New Track Modal State
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackModules, setNewTrackModules] = useState('');

  // Study Log Form State
  const defaultSubject = state.learningTracks[0]?.name || 'Power BI Track';
  const [logData, setLogData] = useState<Partial<StudyLog>>({
    date: new Date().toISOString().split('T')[0],
    subject: defaultSubject,
    topic: '',
    plannedHours: 1,
    actualHours: 1,
    confidenceScore: 7,
    notes: '',
    completed: true
  });

  // Summary Metrics
  const totalStudyHours = useMemo(() => {
    return state.studyLogs.reduce((sum, log) => sum + (Number(log.actualHours) || 0), 0);
  }, [state.studyLogs]);

  const streakDays = useMemo(() => getStreak(state), [state]);

  const hoursThisWeek = useMemo(() => {
    return state.studyLogs
      .filter(l => isSameWeek(new Date(l.date), new Date()))
      .reduce((sum, log) => sum + (Number(log.actualHours) || 0), 0);
  }, [state.studyLogs]);

  const moduleStats = useMemo(() => {
    const allModules = state.learningTracks.flatMap(t => t.modules);
    const total = allModules.length;
    const mastered = allModules.filter(m => m.status === 'Mastered').length;
    const ready = allModules.filter(m => m.status === 'Interview Ready').length;
    const inProgress = allModules.filter(m => m.status === 'Learning' || m.status === 'Practicing').length;
    const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const readinessPct = total > 0 ? Math.round(((mastered + ready) / total) * 100) : 0;
    return { total, mastered, ready, inProgress, masteryPct, readinessPct };
  }, [state.learningTracks]);

  // Question bank tool matcher
  const getQuestionCountForTrack = (trackName: string) => {
    const norm = trackName.toLowerCase();
    return state.questionBank.filter(q => {
      const tool = (q.tool || '').toLowerCase();
      const topic = (q.topic || '').toLowerCase();
      if (norm.includes('power bi') || norm.includes('pbi')) {
        return tool.includes('power bi') || topic.includes('power bi') || topic.includes('dax');
      }
      if (norm.includes('sql')) {
        return tool.includes('sql') || topic.includes('sql');
      }
      if (norm.includes('python')) {
        return tool.includes('python') || topic.includes('python') || topic.includes('pandas');
      }
      return tool.includes(norm) || topic.includes(norm);
    }).length;
  };

  // Module Status Update
  const handleUpdateStatus = (trackId: string, moduleId: string, newStatus: TrackStatus) => {
    const updatedTracks = state.learningTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          modules: t.modules.map(m => m.id === moduleId ? { ...m, status: newStatus } : m)
        };
      }
      return t;
    });
    updateState({ learningTracks: updatedTracks });
  };

  // Add Module to Track
  const handleAddModule = (trackId: string) => {
    if (!newModuleName.trim()) return;
    const updatedTracks = state.learningTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          modules: [
            ...t.modules,
            { id: uuidv4(), name: newModuleName.trim(), status: 'Not Started' as TrackStatus }
          ]
        };
      }
      return t;
    });
    updateState({ learningTracks: updatedTracks });
    setNewModuleName('');
    setAddingModuleTrackId(null);
  };

  // Delete Module from Track
  const handleDeleteModule = (trackId: string, moduleId: string, moduleName: string) => {
    if (!window.confirm(`Are you sure you want to remove the module "${moduleName}"?`)) return;
    const updatedTracks = state.learningTracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          modules: t.modules.filter(m => m.id !== moduleId)
        };
      }
      return t;
    });
    updateState({ learningTracks: updatedTracks });
  };

  // Add Custom Track
  const handleCreateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName.trim()) return;

    const modulesList: TrackModule[] = newTrackModules
      .split(/[\n,]+/)
      .map(m => m.trim())
      .filter(Boolean)
      .map(name => ({
        id: uuidv4(),
        name,
        status: 'Not Started' as TrackStatus
      }));

    const newTrack: LearningTrack = {
      id: uuidv4(),
      name: newTrackName.trim(),
      modules: modulesList.length > 0 ? modulesList : [
        { id: uuidv4(), name: 'Foundations & Core Setup', status: 'Not Started' }
      ]
    };

    updateState({ learningTracks: [...state.learningTracks, newTrack] });
    setNewTrackName('');
    setNewTrackModules('');
    setShowTrackModal(false);
  };

  // Delete Entire Track
  const handleDeleteTrack = (trackId: string, trackName: string) => {
    const isDefault = ['power-bi', 'sql', 'python'].includes(trackId);
    const msg = isDefault
      ? `"${trackName}" is a default curriculum track. Are you sure you want to remove it?`
      : `Are you sure you want to delete track "${trackName}" and all of its modules?`;
    if (!window.confirm(msg)) return;
    updateState({ learningTracks: state.learningTracks.filter(t => t.id !== trackId) });
  };

  // Manual cloud sync
  const handleManualSync = async () => {
    const ok = await syncWithCloud();
    setSyncFeedback(ok ? 'Synced with Supabase Cloud!' : 'Sync failed, check connection');
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  // Study Log Handlers
  const toggleLogExpansion = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const handleStartEditLog = (log: StudyLog, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingLogId(log.id);
    setLogData({
      date: log.date,
      subject: log.subject,
      topic: log.topic,
      plannedHours: log.plannedHours ?? log.actualHours,
      actualHours: log.actualHours,
      confidenceScore: log.confidenceScore,
      notes: log.notes || '',
      completed: log.completed ?? true
    });
    setShowLogModal(true);
  };

  const handleDeleteLog = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this study session log?')) return;
    updateState({ studyLogs: state.studyLogs.filter(l => l.id !== id) });
    if (editingLogId === id) {
      resetForm();
    }
  };

  const resetForm = () => {
    setShowLogModal(false);
    setEditingLogId(null);
    setLogData({
      date: new Date().toISOString().split('T')[0],
      subject: state.learningTracks[0]?.name || 'General Prep',
      topic: '',
      plannedHours: 1,
      actualHours: 1,
      confidenceScore: 7,
      notes: '',
      completed: true
    });
  };

  const appendNoteSnippet = (snippet: string) => {
    setLogData(prev => ({
      ...prev,
      notes: prev.notes ? `${prev.notes}\n${snippet}` : snippet
    }));
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLogId) {
      const updatedLogs = state.studyLogs.map(l => {
        if (l.id === editingLogId) {
          return {
            ...l,
            ...(logData as Omit<StudyLog, 'id'>)
          };
        }
        return l;
      });
      updateState({ studyLogs: updatedLogs });
    } else {
      const newLog: StudyLog = {
        id: uuidv4(),
        ...(logData as Omit<StudyLog, 'id'>)
      };
      updateState({ studyLogs: [newLog, ...state.studyLogs] });
    }
    resetForm();
  };

  // Filtered study logs
  const filteredLogs = useMemo(() => {
    return state.studyLogs.filter(log => {
      const matchesSubject = subjectFilter === 'ALL' || log.subject === subjectFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        (log.topic && log.topic.toLowerCase().includes(q)) || 
        (log.notes && log.notes.toLowerCase().includes(q)) ||
        (log.subject && log.subject.toLowerCase().includes(q));
      return matchesSubject && matchesQuery;
    });
  }, [state.studyLogs, subjectFilter, searchQuery]);

  const displayedLogs = useMemo(() => {
    if (displayLimit === 0) return filteredLogs;
    return filteredLogs.slice(0, displayLimit);
  }, [filteredLogs, displayLimit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Learning Tracks</h1>
          <p className="text-muted">Master key technical domains, track study hours, and monitor interview readiness.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Cloud Sync Status & Action */}
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Sync all learning tracks and study history with Supabase Cloud across browsers"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Syncing...' : syncFeedback || (lastSyncedAt ? 'Cloud Synced' : 'Sync Cloud')}
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => setShowTrackModal(true)}
            title="Add a custom curriculum track"
          >
            <Plus size={16} /> New Track
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingLogId(null);
              setShowLogModal(true);
            }}
          >
            <Plus size={16} /> Log Study Session
          </button>
        </div>
      </header>

      {/* Top KPI Metrics Banner */}
      <div className="grid grid-cols-4 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        
        {/* Total Hours */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(5, 150, 105, 0.12)', color: 'var(--accent-primary)' }}>
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Study Time</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{totalStudyHours.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>hrs</span></div>
            <span className="text-xs text-muted">{state.studyLogs.length} sessions logged</span>
          </div>
        </div>

        {/* Study Streak */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
            <Flame size={24} />
          </div>
          <div>
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Current Streak</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{streakDays} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>{streakDays === 1 ? 'day' : 'days'}</span></div>
            <span className="text-xs text-muted">{streakDays > 0 ? 'Consistency on track' : 'Log today to start streak'}</span>
          </div>
        </div>

        {/* Weekly Volume */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--info)' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(14, 165, 233, 0.12)', color: 'var(--info)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>This Week's Pace</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{hoursThisWeek.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 20h</span></div>
            <span className="text-xs text-muted">{Math.min(100, Math.round((hoursThisWeek / 20) * 100))}% of weekly target</span>
          </div>
        </div>

        {/* Overall Curriculum Mastery */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
            <Award size={24} />
          </div>
          <div>
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Curriculum Ready</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{moduleStats.readinessPct}%</div>
            <span className="text-xs text-muted">{moduleStats.mastered} Mastered • {moduleStats.ready} Ready</span>
          </div>
        </div>

      </div>

      {/* Daily 4-Pillar Focus Routine Tracker */}
      <DailyRoutineTracker />

      {/* Learning Track Cards Grid */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Technical Curriculum Tracks</h2>
            <p className="text-xs text-muted">Update module status as you progress from learning concepts to mastering interview questions.</p>
          </div>
          <span className="text-xs text-muted">{state.learningTracks.length} tracks active</span>
        </div>

        <div className="grid grid-cols-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {state.learningTracks.map(track => {
            const total = track.modules.length;
            const mastered = track.modules.filter(m => m.status === 'Mastered').length;
            const ready = track.modules.filter(m => m.status === 'Interview Ready').length;
            const inProgress = track.modules.filter(m => m.status === 'Learning' || m.status === 'Practicing').length;
            const masteredPct = total > 0 ? (mastered / total) * 100 : 0;
            const readyPct = total > 0 ? (ready / total) * 100 : 0;
            const inProgPct = total > 0 ? (inProgress / total) * 100 : 0;
            const questionCount = getQuestionCountForTrack(track.name);

            return (
              <div 
                key={track.id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.25rem', 
                  position: 'relative',
                  borderTop: '3px solid var(--accent-primary)' 
                }}
              >
                {/* Track Card Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', margin: 0 }}>
                      <BookOpen size={18} className="text-accent-primary" /> 
                      {track.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.4rem', border: 'none', background: 'transparent' }} 
                        onClick={() => handleDeleteTrack(track.id, track.name)}
                        title="Remove track"
                      >
                        <Trash2 size={14} className="text-muted" />
                      </button>
                    </div>
                  </div>

                  {/* Progress stats summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                    <span className="text-muted">
                      <strong>{mastered}</strong> / {total} Mastered {ready > 0 && `• ${ready} Ready`}
                    </span>
                    <span style={{ fontWeight: 600, color: masteredPct >= 80 ? 'var(--success)' : masteredPct >= 40 ? 'var(--info)' : 'var(--text-muted)' }}>
                      {Math.round(masteredPct)}%
                    </span>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginTop: '0.35rem' }}>
                    <div style={{ width: `${masteredPct}%`, backgroundColor: 'var(--success)', transition: 'width 0.3s ease' }} title={`Mastered: ${mastered}`} />
                    <div style={{ width: `${readyPct}%`, backgroundColor: 'var(--info)', transition: 'width 0.3s ease' }} title={`Interview Ready: ${ready}`} />
                    <div style={{ width: `${inProgPct}%`, backgroundColor: 'var(--warning)', transition: 'width 0.3s ease' }} title={`In Progress: ${inProgress}`} />
                  </div>

                  {/* Question Bank Link Shortcut if questions exist */}
                  {questionCount > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <Link 
                        to="/question-bank" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}
                      >
                        <HelpCircle size={12} /> {questionCount} questions in Question Bank <ArrowRight size={10} />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Modules List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {track.modules.length === 0 ? (
                    <p className="text-muted text-xs" style={{ textAlign: 'center', padding: '1rem 0' }}>No modules yet. Add the first module below.</p>
                  ) : (
                    track.modules.map(mod => (
                      <div 
                        key={mod.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '0.4rem 0.5rem', 
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-hover)',
                          border: '1px solid var(--border-color)',
                          gap: '0.5rem'
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mod.name}>
                          {mod.name}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <select 
                            className="select" 
                            style={{ 
                              width: '125px', 
                              padding: '0.2rem 0.4rem', 
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              backgroundColor: mod.status === 'Mastered' ? 'rgba(16, 185, 129, 0.15)' : 
                                               mod.status === 'Interview Ready' ? 'rgba(14, 165, 233, 0.15)' : 
                                               mod.status === 'Learning' || mod.status === 'Practicing' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-card)',
                              color: mod.status === 'Mastered' ? 'var(--success)' : 
                                     mod.status === 'Interview Ready' ? 'var(--info)' : 
                                     mod.status === 'Learning' || mod.status === 'Practicing' ? 'var(--warning)' : 'var(--text-main)',
                              fontWeight: mod.status === 'Not Started' ? 400 : 600
                            }} 
                            value={mod.status} 
                            onChange={e => handleUpdateStatus(track.id, mod.id, e.target.value as TrackStatus)}
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="Learning">Learning</option>
                            <option value="Practicing">Practicing</option>
                            <option value="Interview Ready">Interview Ready</option>
                            <option value="Mastered">Mastered</option>
                          </select>
                          
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem', border: 'none', background: 'transparent' }}
                            onClick={() => handleDeleteModule(track.id, mod.id, mod.name)}
                            title="Delete module"
                          >
                            <X size={13} className="text-muted" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Add Module Control */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  {addingModuleTrackId === track.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="e.g. Window Functions, Star Schema..." 
                        className="input" 
                        style={{ fontSize: '0.8125rem', padding: '0.35rem 0.6rem' }} 
                        value={newModuleName} 
                        onChange={e => setNewModuleName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddModule(track.id);
                          } else if (e.key === 'Escape') {
                            setAddingModuleTrackId(null);
                            setNewModuleName('');
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} 
                        onClick={() => handleAddModule(track.id)}
                      >
                        Add
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} 
                        onClick={() => {
                          setAddingModuleTrackId(null);
                          setNewModuleName('');
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.4rem' }} 
                      onClick={() => {
                        setAddingModuleTrackId(track.id);
                        setNewModuleName('');
                      }}
                    >
                      <Plus size={14} /> Add Module
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* Study Logs Section */}
      <div className="card">
        
        {/* Section Header & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} className="text-accent-primary" /> Study Session History
            </h3>
            <span className="text-xs text-muted">Showing {displayedLogs.length} of {filteredLogs.length} sessions</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search topic or notes..." 
                className="input" 
                style={{ paddingLeft: '2rem', fontSize: '0.8125rem', width: '200px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={12} className="text-muted" />
                </button>
              )}
            </div>

            {/* Subject Filter */}
            <select 
              className="select" 
              style={{ fontSize: '0.8125rem', width: '160px' }}
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
            >
              <option value="ALL">All Subjects</option>
              {state.learningTracks.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
              <option value="General Prep">General Prep</option>
              <option value="Interview Practice">Interview Practice</option>
              <option value="Portfolio Projects">Portfolio Projects</option>
            </select>

            {/* Display Limit */}
            <select 
              className="select" 
              style={{ fontSize: '0.8125rem', width: '100px' }}
              value={displayLimit}
              onChange={e => setDisplayLimit(Number(e.target.value))}
            >
              <option value={10}>10 items</option>
              <option value={15}>15 items</option>
              <option value={25}>25 items</option>
              <option value={50}>50 items</option>
              <option value={0}>Show all</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 500 }}>No study sessions found.</p>
            <p className="text-xs">
              {searchQuery || subjectFilter !== 'ALL' 
                ? 'Try resetting your search query or subject filters.' 
                : 'Click "Log Study Session" above to record your first study sprint.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '32px' }}></th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject / Track</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Topic Covered</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Time (Actual / Plan)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map(log => {
                  const isExpanded = expandedLogs.has(log.id);
                  const hasNotes = Boolean(log.notes && log.notes.trim());
                  const variance = (log.actualHours || 0) - (log.plannedHours ?? log.actualHours ?? 0);

                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        style={{ 
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                          cursor: hasNotes ? 'pointer' : 'default',
                          backgroundColor: isExpanded ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                          transition: 'background-color 0.15s ease'
                        }}
                        onClick={() => hasNotes && toggleLogExpansion(log.id)}
                      >
                        {/* Expand Icon */}
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {hasNotes && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {log.date}
                        </td>

                        {/* Subject */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                            {log.subject}
                          </span>
                        </td>

                        {/* Topic & Notes Indicator */}
                        <td style={{ padding: '0.75rem 1rem', maxWidth: '300px' }}>
                          <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.topic}>
                            {log.topic}
                          </div>
                          {hasNotes ? (
                            <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                              <FileText size={12} className="text-accent-primary" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                                {log.notes}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem', marginTop: '0.2rem', border: 'none', background: 'transparent', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={e => handleStartEditLog(log, e)}
                            >
                              <Plus size={11} /> Add Notes
                            </button>
                          )}
                        </td>

                        {/* Hours (Actual vs Plan) */}
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{log.actualHours} hrs</span>
                          {log.plannedHours !== undefined && log.plannedHours !== null && (
                            <span className="text-xs text-muted" style={{ marginLeft: '0.4rem' }}>
                              (plan {log.plannedHours}h)
                            </span>
                          )}
                        </td>

                        {/* Confidence Score */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${
                            log.confidenceScore >= 8 ? 'badge-success' : 
                            log.confidenceScore >= 5 ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {log.confidenceScore}/10
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.4rem' }} 
                              onClick={e => handleStartEditLog(log, e)}
                              title="Edit this study session"
                            >
                              <Pencil size={13} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.4rem' }} 
                              onClick={e => handleDeleteLog(log.id, e)}
                              title="Delete log"
                            >
                              <Trash2 size={13} className="text-muted" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Notes Row */}
                      {isExpanded && hasNotes && (
                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                          <td></td>
                          <td colSpan={6} style={{ padding: '0 1rem 1rem 1rem' }}>
                            <div style={{ 
                              backgroundColor: 'var(--bg-card)', 
                              border: '1px solid var(--border-color)', 
                              borderLeft: '3px solid var(--accent-primary)',
                              borderRadius: 'var(--radius-sm)', 
                              padding: '0.85rem 1rem',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <FileText size={13} className="text-accent-primary" /> Session Notes & Takeaways
                                </strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span className="text-xs text-muted">
                                    {variance > 0 ? `+${variance.toFixed(1)}h over planned` : variance < 0 ? `${variance.toFixed(1)}h under planned` : 'On plan'}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.725rem', padding: '0.15rem 0.45rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    onClick={e => handleStartEditLog(log, e)}
                                    title="Edit notes"
                                  >
                                    <Pencil size={11} /> Edit Notes
                                  </button>
                                </div>
                              </div>
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-main)', lineHeight: 1.6 }}>
                                {log.notes}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Study Session Modal (Create & Edit) */}
      {showLogModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderTop: '4px solid var(--accent-primary)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {editingLogId ? <Pencil size={20} className="text-accent-primary" /> : <Plus size={20} className="text-accent-primary" />}
                  {editingLogId ? 'Edit Study Session' : 'Log Study Session'}
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                  {editingLogId ? 'Update your recorded hours, topic, confidence, and notes.' : 'Record the time spent, topics covered, and self-assessed confidence.'}
                </p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.4rem' }} 
                onClick={resetForm}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="input" 
                    value={logData.date} 
                    onChange={e => setLogData({ ...logData, date: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Subject / Track</label>
                  <select 
                    className="select" 
                    value={logData.subject} 
                    onChange={e => setLogData({ ...logData, subject: e.target.value })}
                  >
                    {state.learningTracks.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                    <option value="General Prep">General Prep</option>
                    <option value="Interview Practice">Interview Practice</option>
                    <option value="Portfolio Projects">Portfolio Projects</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Topic Covered *</label>
                  <input 
                    required 
                    className="input" 
                    placeholder="e.g. CALCULATE & Filter Context" 
                    value={logData.topic} 
                    onChange={e => setLogData({ ...logData, topic: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Planned Hours</label>
                  <input 
                    type="number" 
                    step="0.25" 
                    min="0"
                    className="input" 
                    placeholder="1.0"
                    value={logData.plannedHours ?? 1} 
                    onChange={e => setLogData({ ...logData, plannedHours: Math.max(0, Number(e.target.value)) })} 
                  />
                </div>

                <div>
                  <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Actual Hours Spent *</label>
                  <input 
                    type="number" 
                    step="0.25" 
                    min="0.25" 
                    required 
                    className="input" 
                    placeholder="1.0"
                    value={logData.actualHours} 
                    onChange={e => setLogData({ ...logData, actualHours: Math.max(0.1, Number(e.target.value)) })} 
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="text-sm text-muted">Confidence Score</label>
                    <span className={`badge ${
                      (logData.confidenceScore || 5) >= 8 ? 'badge-success' : 
                      (logData.confidenceScore || 5) >= 5 ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {logData.confidenceScore}/10
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    className="input" 
                    style={{ padding: '0.25rem 0', cursor: 'pointer' }}
                    value={logData.confidenceScore || 5} 
                    onChange={e => setLogData({ ...logData, confidenceScore: Number(e.target.value) })} 
                  />
                </div>
              </div>

              {/* Prominent Notes Section with Formatting Helpers */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label className="text-sm text-muted" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileText size={16} className="text-accent-primary" /> Session Notes, Takeaways & Code Snippets
                  </label>
                  
                  {/* Quick Tag Insert Helpers */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Sparkles size={11} /> Quick Insert:
                    </span>
                    {[
                      { label: '+ Key Takeaway', snippet: '\n• Key Takeaway: ' },
                      { label: '+ Code Snippet', snippet: '\n```sql\n-- Code Snippet\n\n```\n' },
                      { label: '+ Problem Solved', snippet: '\n• Problem Solved: ' },
                      { label: '+ Interview Pitch', snippet: '\n• Interview Pitch: ' }
                    ].map(tag => (
                      <button
                        key={tag.label}
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.675rem', padding: '0.15rem 0.35rem' }}
                        onClick={() => appendNoteSnippet(tag.snippet)}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea 
                  className="textarea" 
                  rows={4} 
                  placeholder="Formulas practiced, DAX patterns, SQL optimization tricks, interview pitches, or key takeaways..." 
                  value={logData.notes} 
                  onChange={e => setLogData({ ...logData, notes: e.target.value })}
                  style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={logData.completed ?? true} 
                    onChange={e => setLogData({ ...logData, completed: e.target.checked })} 
                  />
                  Session goals achieved
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editingLogId ? 'Update Session' : 'Save Session'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Track Modal */}
      {showTrackModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', borderTop: '4px solid var(--accent-primary)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} className="text-accent-primary" /> Create New Learning Track
              </h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.25rem 0.4rem' }} 
                onClick={() => setShowTrackModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTrack} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Track Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Microsoft Fabric, Azure Data Factory, GenAI Engineering" 
                  className="input" 
                  value={newTrackName} 
                  onChange={e => setNewTrackName(e.target.value)} 
                />
              </div>

              <div>
                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Initial Modules / Topics (comma or line separated)
                </label>
                <textarea 
                  className="textarea" 
                  rows={4} 
                  placeholder="OneLake Architecture&#10;Dataflows Gen2&#10;Lakehouse vs Warehouse&#10;Fabric Deployment Pipelines"
                  value={newTrackModules} 
                  onChange={e => setNewTrackModules(e.target.value)} 
                />
                <span className="text-xs text-muted" style={{ marginTop: '0.25rem', display: 'block' }}>
                  You can also add or modify modules anytime after creating the track.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowTrackModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

