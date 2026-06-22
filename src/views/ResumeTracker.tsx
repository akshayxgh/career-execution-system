import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Resume } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, FileText } from 'lucide-react';

export const ResumeTracker = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<Partial<Resume>>({
    versionName: '', roleTargeted: '', dateCreated: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString().split('T')[0], notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newResume: Resume = {
      id: uuidv4(),
      ...(formData as Omit<Resume, 'id'>)
    };
    updateState({ resumes: [newResume, ...state.resumes] });
    setShowForm(false);
    setFormData({
      versionName: '', roleTargeted: '', dateCreated: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0], notes: ''
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Resume Tracker</h1>
          <p className="text-muted">Manage targeted resumes for different roles.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Resume Version'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add Resume Version</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Version Name (e.g. Power BI Resume)</label>
              <input required className="input" value={formData.versionName} onChange={e => setFormData({...formData, versionName: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Role Targeted</label>
              <input required className="input" value={formData.roleTargeted} onChange={e => setFormData({...formData, roleTargeted: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Date Created</label>
              <input type="date" required className="input" value={formData.dateCreated} onChange={e => setFormData({...formData, dateCreated: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Last Updated</label>
              <input type="date" required className="input" value={formData.lastUpdated} onChange={e => setFormData({...formData, lastUpdated: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Notes (Focus areas, keywords included)</label>
              <textarea className="textarea" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Resume</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {state.resumes.length === 0 ? (
          <div style={{ gridColumn: 'span 3' }} className="card text-center text-muted">
            No resume versions tracked.
          </div>
        ) : state.resumes.map(resume => (
          <div key={resume.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><FileText size={18} className="text-accent-primary" /> {resume.versionName}</h3>
            <span className="badge badge-info" style={{ alignSelf: 'flex-start' }}>{resume.roleTargeted}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Created: {resume.dateCreated}</span>
              <span>Updated: {resume.lastUpdated}</span>
            </div>
            {resume.notes && (
              <p className="text-sm text-muted" style={{ backgroundColor: 'var(--bg-dark)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                {resume.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
