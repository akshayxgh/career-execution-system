
import { useStore } from '../store/StoreContext';
import { calculateExecutionScore, getStreak } from '../utils/scoreCalculator';
import { Target, Flame, Briefcase, Clock, CheckCircle, Activity } from 'lucide-react';
import { isSameWeek } from 'date-fns';

export const Dashboard = () => {
  const { state } = useStore();

  const score = calculateExecutionScore(state);
  const streak = getStreak(state);

  const activeApps = state.applications.filter(a => !['Rejected', 'Joined', 'Saved'].includes(a.status)).length;
  
  const hoursThisWeek = state.studyLogs
    .filter(l => isSameWeek(new Date(l.date), new Date()))
    .reduce((sum, log) => sum + log.actualHours, 0);

  const openWeaknesses = state.weaknesses.filter(w => w.status === 'Open' || w.status === 'Learning').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>Mission Control</h1>
        <p className="text-muted">Welcome back. Keep executing.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Execution Score</span>
            <Activity size={20} color="var(--accent-primary)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{score}</span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Current Streak</span>
            <Flame size={20} color="var(--warning)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{streak} <span className="text-sm text-muted font-normal">days</span></span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Active Applications</span>
            <Briefcase size={20} color="var(--success)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{activeApps}</span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--info)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Study Hours (Week)</span>
            <Clock size={20} color="var(--info)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{hoursThisWeek} <span className="text-sm text-muted font-normal">hrs</span></span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Motivation Panel */}
        <div className="card" style={{ gridColumn: 'span 1', backgroundColor: 'var(--bg-dark)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Target size={20} color="var(--danger)" /> Why I Started
          </h3>
          <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} color="var(--success)" /> Financial Stability
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} color="var(--success)" /> Family Responsibility
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} color="var(--success)" /> Career Growth
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} color="var(--success)" /> Becoming a Top BI Professional
            </li>
          </ul>
        </div>

        {/* Priorities & Alerts */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '1rem' }}>Action Required</h3>
          {openWeaknesses > 0 ? (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{openWeaknesses} Unresolved Interview Weaknesses.</span>
              <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Fix your weaknesses before your next interview.</p>
            </div>
          ) : (
             <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderLeft: '4px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>No open weaknesses!</span>
              <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>You are interview ready. Keep applying.</p>
            </div>
          )}

          {activeApps === 0 && (
             <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid var(--warning)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Zero Active Applications.</span>
              <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Goal 1 is getting employed. Send out applications today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
