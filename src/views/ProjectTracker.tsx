import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Project, ProjectStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Code2, ExternalLink, FolderGit2 } from 'lucide-react';

export const ProjectTracker = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '', category: 'Power BI', startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: '', status: 'Idea', technologiesUsed: [], githubLink: '', portfolioLink: '', lessonsLearned: ''
  });

  const [techInput, setTechInput] = useState('');

  const handleAddTech = () => {
    if (techInput.trim()) {
      setFormData({ ...formData, technologiesUsed: [...(formData.technologiesUsed || []), techInput.trim()] });
      setTechInput('');
    }
  };

  const handleRemoveTech = (index: number) => {
    setFormData({ ...formData, technologiesUsed: (formData.technologiesUsed || []).filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProject: Project = {
      id: uuidv4(),
      ...(formData as Omit<Project, 'id'>)
    };
    updateState({ projects: [newProject, ...state.projects] });
    setShowForm(false);
    setFormData({
      name: '', category: 'Power BI', startDate: new Date().toISOString().split('T')[0],
      targetCompletionDate: '', status: 'Idea', technologiesUsed: [], githubLink: '', portfolioLink: '', lessonsLearned: ''
    });
  };

  const updateStatus = (id: string, newStatus: ProjectStatus) => {
    const updated = state.projects.map(p => p.id === id ? { ...p, status: newStatus } : p);
    updateState({ projects: updated });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Project Portfolio</h1>
          <p className="text-muted">Build things to prove you can do the job.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Project'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Project</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Project Name</label>
              <input required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Category</label>
              <select className="select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {['Power BI', 'SQL', 'Python', 'Full Stack', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Start Date</label>
              <input type="date" required className="input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Target Completion Date</label>
              <input type="date" className="input" value={formData.targetCompletionDate} onChange={e => setFormData({...formData, targetCompletionDate: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Status</label>
              <select className="select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})}>
                {['Idea', 'Planning', 'Building', 'Testing', 'Completed', 'Published'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Technologies Used</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="input" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())} />
                <button type="button" className="btn btn-secondary" onClick={handleAddTech}>Add</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {formData.technologiesUsed?.map((tech, idx) => (
                  <span key={idx} className="badge badge-info" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    {tech} <span style={{ cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => handleRemoveTech(idx)}>×</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted">GitHub Link</label>
              <input type="url" className="input" value={formData.githubLink} onChange={e => setFormData({...formData, githubLink: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Portfolio Link</label>
              <input type="url" className="input" value={formData.portfolioLink} onChange={e => setFormData({...formData, portfolioLink: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Lessons Learned</label>
              <textarea className="textarea" rows={2} value={formData.lessonsLearned} onChange={e => setFormData({...formData, lessonsLearned: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Project</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {state.projects.length === 0 ? (
          <div style={{ gridColumn: 'span 2' }} className="card text-center text-muted">
            No projects added yet. Start building your portfolio.
          </div>
        ) : state.projects.map(project => (
          <div key={project.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><FolderGit2 size={18} className="text-accent-primary" /> {project.name}</h3>
                <span className="text-xs text-muted">{project.category}</span>
              </div>
              <select className="select" style={{ width: 'auto', padding: '0.25rem', fontSize: '0.75rem' }} value={project.status} onChange={e => updateStatus(project.id, e.target.value as ProjectStatus)}>
                {['Idea', 'Planning', 'Building', 'Testing', 'Completed', 'Published'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {project.technologiesUsed.map((tech, i) => (
                <span key={i} className="badge" style={{ backgroundColor: 'var(--bg-hover)' }}>{tech}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
              {project.githubLink && (
                <a href={project.githubLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                  <Code2 size={16} /> Code
                </a>
              )}
              {project.portfolioLink && (
                <a href={project.portfolioLink} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                  <ExternalLink size={16} /> Live Demo
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
