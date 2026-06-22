import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { TrackStatus, StudyLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, BookOpen, Clock, ChevronDown, ChevronRight } from 'lucide-react';

export const LearningTracks = () => {
  const { state, updateState } = useStore();
  const [showLogForm, setShowLogForm] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const [logData, setLogData] = useState<Partial<StudyLog>>({
    date: new Date().toISOString().split('T')[0],
    subject: 'Power BI Track',
    topic: '',
    plannedHours: 1,
    actualHours: 1,
    confidenceScore: 5,
    notes: '',
    completed: true
  });

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

  const toggleLogExpansion = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: StudyLog = {
      id: uuidv4(),
      ...(logData as Omit<StudyLog, 'id'>)
    };
    updateState({ studyLogs: [newLog, ...state.studyLogs] });
    setShowLogForm(false);
    setLogData({
      date: new Date().toISOString().split('T')[0],
      subject: 'Power BI Track',
      topic: '',
      plannedHours: 1,
      actualHours: 1,
      confidenceScore: 5,
      notes: '',
      completed: true
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Learning Tracks</h1>
          <p className="text-muted">Master the skills required to get hired.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLogForm(!showLogForm)}>
          <Plus size={18} /> {showLogForm ? 'Cancel' : 'Log Study Session'}
        </button>
      </header>

      {showLogForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--info)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Log Study Session</h3>
          <form onSubmit={handleLogSubmit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted">Date</label>
              <input type="date" required className="input" value={logData.date} onChange={e => setLogData({...logData, date: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Subject / Track</label>
              <select className="select" value={logData.subject} onChange={e => setLogData({...logData, subject: e.target.value})}>
                {state.learningTracks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                <option value="General Prep">General Prep</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Topic</label>
              <input required className="input" placeholder="e.g. Advanced DAX" value={logData.topic} onChange={e => setLogData({...logData, topic: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Planned Hours</label>
              <input type="number" step="0.5" className="input" value={logData.plannedHours} onChange={e => setLogData({...logData, plannedHours: Number(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm text-muted">Actual Hours</label>
              <input type="number" step="0.5" required className="input" value={logData.actualHours} onChange={e => setLogData({...logData, actualHours: Number(e.target.value)})} />
            </div>
            <div>
              <label className="text-sm text-muted">Confidence Score (1-10)</label>
              <input type="number" min="1" max="10" className="input" value={logData.confidenceScore} onChange={e => setLogData({...logData, confidenceScore: Number(e.target.value)})} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label className="text-sm text-muted">Notes</label>
              <textarea className="textarea" rows={2} value={logData.notes} onChange={e => setLogData({...logData, notes: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Log</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {state.learningTracks.map(track => (
          <div key={track.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} className="text-accent-primary" /> {track.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {track.modules.map(mod => (
                <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{mod.name}</span>
                  <select 
                    className="select" 
                    style={{ width: '130px', padding: '0.25rem', fontSize: '0.75rem', 
                      backgroundColor: mod.status === 'Mastered' ? 'rgba(16, 185, 129, 0.2)' : 
                                       mod.status === 'Interview Ready' ? 'rgba(59, 130, 246, 0.2)' : 
                                       mod.status === 'Learning' || mod.status === 'Practicing' ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-dark)',
                      color: mod.status === 'Mastered' ? 'var(--success)' : 
                             mod.status === 'Interview Ready' ? 'var(--accent-primary)' : 
                             mod.status === 'Learning' || mod.status === 'Practicing' ? 'var(--warning)' : 'var(--text-main)'
                    }} 
                    value={mod.status} 
                    onChange={e => handleUpdateStatus(track.id, mod.id, e.target.value as TrackStatus)}
                  >
                    {['Not Started', 'Learning', 'Practicing', 'Interview Ready', 'Mastered'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20} /> Recent Study Logs</h3>
        {state.studyLogs.length === 0 ? (
          <p className="text-muted">No study logs yet. Get to work.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', width: '40px' }}></th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                <th style={{ padding: '0.75rem 1rem' }}>Topic</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actual Hours</th>
                <th style={{ padding: '0.75rem 1rem' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {state.studyLogs.slice(0, 10).map(log => (
                <React.Fragment key={log.id}>
                  <tr style={{ borderBottom: expandedLogs.has(log.id) ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', cursor: log.notes ? 'pointer' : 'default' }} onClick={() => log.notes && toggleLogExpansion(log.id)}>
                      {log.notes ? (expandedLogs.has(log.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />) : null}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{log.date}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{log.subject}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{log.topic}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{log.actualHours}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${log.confidenceScore >= 8 ? 'badge-success' : log.confidenceScore >= 5 ? 'badge-warning' : 'badge-danger'}`}>
                        {log.confidenceScore}/10
                      </span>
                    </td>
                  </tr>
                  {expandedLogs.has(log.id) && log.notes && (
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                      <td></td>
                      <td colSpan={5} style={{ padding: '0.75rem 1rem', paddingTop: '0', color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                        <div style={{ marginTop: '0.5rem', borderLeft: '2px solid var(--accent-primary)', paddingLeft: '1rem' }}>
                          <strong>Notes:</strong><br />
                          {log.notes}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
