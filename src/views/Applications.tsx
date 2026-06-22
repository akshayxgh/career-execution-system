import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { JobApplication, ApplicationStatus, PriorityLevel } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, ExternalLink, Calendar } from 'lucide-react';

export const Applications = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<JobApplication>>({
    company: '', position: '', location: '', salary: '', appliedDate: new Date().toISOString().split('T')[0],
    jobLink: '', recruiterName: '', recruiterContact: '', status: 'Applied', notes: '', 
    followUpDate: '', lastContactDate: '', nextAction: '', priorityLevel: 'Medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newApp: JobApplication = {
      id: uuidv4(),
      ...(formData as Omit<JobApplication, 'id'>)
    };
    updateState({ applications: [newApp, ...state.applications] });
    setShowForm(false);
    // reset form
    setFormData({
      company: '', position: '', location: '', salary: '', appliedDate: new Date().toISOString().split('T')[0],
      jobLink: '', recruiterName: '', recruiterContact: '', status: 'Applied', notes: '',
      followUpDate: '', lastContactDate: '', nextAction: '', priorityLevel: 'Medium'
    });
  };

  const filteredApps = state.applications.filter(app => 
    app.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Job Applications</h1>
          <p className="text-muted">Track your funnel and follow-ups aggressively.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Application'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Application</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted">Company</label>
              <input required className="input" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Position</label>
              <input required className="input" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Status</label>
              <select className="select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ApplicationStatus})}>
                {['Saved', 'Applied', 'Screening', 'Assessment', 'Interview Scheduled', 'Interview Completed', 'Rejected', 'Offer Received', 'Joined'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Applied Date</label>
              <input type="date" className="input" value={formData.appliedDate} onChange={e => setFormData({...formData, appliedDate: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Priority Level</label>
              <select className="select" value={formData.priorityLevel} onChange={e => setFormData({...formData, priorityLevel: e.target.value as PriorityLevel})}>
                {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Location / Remote</label>
              <input className="input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Next Action</label>
              <input className="input" placeholder="e.g. Email Recruiter" value={formData.nextAction} onChange={e => setFormData({...formData, nextAction: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Follow-Up Date</label>
              <input type="date" className="input" value={formData.followUpDate} onChange={e => setFormData({...formData, followUpDate: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Job Link</label>
              <input type="url" className="input" value={formData.jobLink} onChange={e => setFormData({...formData, jobLink: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Application</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Application Pipeline</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px' }}>
            <Search size={18} className="text-muted" />
            <input 
              className="input" 
              placeholder="Search company or position..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Company</th>
                <th style={{ padding: '0.75rem 1rem' }}>Position</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Applied Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Priority</th>
                <th style={{ padding: '0.75rem 1rem' }}>Next Action</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No applications found. Start applying!
                  </td>
                </tr>
              ) : filteredApps.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{app.company}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{app.position}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${app.status === 'Applied' ? 'badge-info' : app.status.includes('Interview') ? 'badge-warning' : app.status === 'Rejected' ? 'badge-danger' : 'badge-success'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{app.appliedDate}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${app.priorityLevel === 'Critical' || app.priorityLevel === 'High' ? 'badge-danger' : 'badge-info'}`}>
                      {app.priorityLevel}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {app.nextAction ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} className="text-muted" /> {app.nextAction}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {app.jobLink && (
                      <a href={app.jobLink} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }} title="View Job Description">
                        <ExternalLink size={18} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
