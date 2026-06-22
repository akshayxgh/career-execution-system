import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { differenceInDays } from 'date-fns';
import { Target, Calendar, Award } from 'lucide-react';

export const PL300Tracker = () => {
  const { state, updateState } = useStore();
  const [targetDate, setTargetDate] = useState(state.settings.pl300TargetDate || '');

  const saveTargetDate = () => {
    updateState({ settings: { ...state.settings, pl300TargetDate: targetDate } });
  };

  const daysLeft = targetDate ? differenceInDays(new Date(targetDate), new Date()) : null;

  // Calculate Readiness Score based on Power BI track
  const pbiTrack = state.learningTracks.find(t => t.id === 'power-bi');
  const totalModules = pbiTrack?.modules.length || 0;
  const masteredModules = pbiTrack?.modules.filter(m => m.status === 'Mastered').length || 0;
  const readinessScore = totalModules === 0 ? 0 : Math.round((masteredModules / totalModules) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>PL-300 Certification</h1>
        <p className="text-muted">Goal 2: Pass the Microsoft Power BI Data Analyst Certification.</p>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--info)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={20} /> Target Exam Date</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="date" className="input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            <button className="btn btn-secondary" onClick={saveTargetDate}>Save</button>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--warning)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={20} /> Countdown</h3>
          <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} days` : 'Past Due') : 'Not Set'}
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '4px solid var(--success)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Award size={20} /> Readiness Score</h3>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: readinessScore >= 80 ? 'var(--success)' : readinessScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
            {readinessScore}%
          </span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Domain Readiness</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pbiTrack?.modules.map(mod => (
            <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-dark)', borderRadius: 'var(--radius-md)' }}>
              <span>{mod.name}</span>
              <span className={`badge ${mod.status === 'Mastered' ? 'badge-success' : mod.status === 'Interview Ready' ? 'badge-info' : mod.status === 'Learning' || mod.status === 'Practicing' ? 'badge-warning' : ''}`}>
                {mod.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
