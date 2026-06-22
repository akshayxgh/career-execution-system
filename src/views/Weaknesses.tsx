import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Weakness, WeaknessStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Target, CheckCircle2 } from 'lucide-react';

export const Weaknesses = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<Partial<Weakness>>({
    topic: '', interviewCompany: '', dateIdentified: new Date().toISOString().split('T')[0],
    description: '', resolutionPlan: '', status: 'Open'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWeakness: Weakness = {
      id: uuidv4(),
      ...(formData as Omit<Weakness, 'id'>)
    };
    updateState({ weaknesses: [newWeakness, ...state.weaknesses] });
    setShowForm(false);
    setFormData({
      topic: '', interviewCompany: '', dateIdentified: new Date().toISOString().split('T')[0],
      description: '', resolutionPlan: '', status: 'Open'
    });
  };

  const updateStatus = (id: string, newStatus: WeaknessStatus) => {
    const updated = state.weaknesses.map(w => w.id === id ? { ...w, status: newStatus } : w);
    updateState({ weaknesses: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Weakness Tracker</h1>
          <p className="text-muted">Fix these before your next interview.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Log Weakness'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Log Interview Weakness</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Topic</label>
              <input required className="input" placeholder="e.g. Self Join" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Interview Company</label>
              <input required className="input" value={formData.interviewCompany} onChange={e => setFormData({...formData, interviewCompany: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Date Identified</label>
              <input type="date" className="input" value={formData.dateIdentified} onChange={e => setFormData({...formData, dateIdentified: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Status</label>
              <select className="select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as WeaknessStatus})}>
                {['Open', 'Learning', 'Fixed', 'Mastered'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Description (What exactly went wrong?)</label>
              <textarea required className="textarea" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Resolution Plan (How will you fix this?)</label>
              <textarea required className="textarea" rows={2} value={formData.resolutionPlan} onChange={e => setFormData({...formData, resolutionPlan: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Weakness</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}><Target size={20} /> Unresolved</h3>
          {state.weaknesses.filter(w => w.status === 'Open' || w.status === 'Learning').length === 0 && (
            <p className="text-muted text-sm">No unresolved weaknesses. Great job!</p>
          )}
          {state.weaknesses.filter(w => w.status === 'Open' || w.status === 'Learning').map(w => (
            <div key={w.id} className="card" style={{ borderLeft: `4px solid ${w.status === 'Open' ? 'var(--danger)' : 'var(--warning)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>{w.topic}</h4>
                <select className="select" style={{ width: 'auto', padding: '0.25rem' }} value={w.status} onChange={e => updateStatus(w.id, e.target.value as WeaknessStatus)}>
                  {['Open', 'Learning', 'Fixed', 'Mastered'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: '1rem' }}>Exposed at: {w.interviewCompany} ({w.dateIdentified})</p>
              <p className="text-sm" style={{ marginBottom: '0.5rem' }}><strong>Issue:</strong> {w.description}</p>
              <p className="text-sm"><strong>Plan:</strong> {w.resolutionPlan}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}><CheckCircle2 size={20} /> Resolved</h3>
          {state.weaknesses.filter(w => w.status === 'Fixed' || w.status === 'Mastered').length === 0 && (
            <p className="text-muted text-sm">Fix weaknesses to see them here.</p>
          )}
          {state.weaknesses.filter(w => w.status === 'Fixed' || w.status === 'Mastered').map(w => (
            <div key={w.id} className="card" style={{ borderLeft: `4px solid var(--success)`, opacity: 0.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, textDecoration: 'line-through' }}>{w.topic}</h4>
                <select className="select" style={{ width: 'auto', padding: '0.25rem' }} value={w.status} onChange={e => updateStatus(w.id, e.target.value as WeaknessStatus)}>
                  {['Open', 'Learning', 'Fixed', 'Mastered'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: '0.5rem' }}>Exposed at: {w.interviewCompany}</p>
              <p className="text-sm text-muted"><strong>Plan executed:</strong> {w.resolutionPlan}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
