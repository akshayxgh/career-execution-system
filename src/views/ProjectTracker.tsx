import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Project, ProjectStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Code2, ExternalLink, FolderGit2, Calendar } from 'lucide-react';
import { formatToISTDate, formatToISTShortDate } from '../utils/dateUtils';

export const ProjectTracker = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);

  const getTodayDate = () => formatToISTDate(new Date().toISOString());

  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    category: 'Power BI',
    startDate: getTodayDate(),
    targetCompletionDate: '',
    status: 'Idea',
    technologiesUsed: [],
    githubLink: '',
    portfolioLink: '',
    lessonsLearned: ''
  });

  const [techInput, setTechInput] = useState('');
  const [dateErrors, setDateErrors] = useState<{ startDate?: string; targetCompletionDate?: string }>({});

  const isMidTypingYear = (yearStr: string) => {
    // If year starts with 0 (like 0002, 0020, 0202), user is actively typing in Chrome date picker
    return yearStr.length === 4 && yearStr.startsWith('0');
  };

  const validateDateString = (dateStr?: string, isRequired = false, minDate?: string): string | null => {
    if (!dateStr || !dateStr.trim()) {
      return isRequired ? 'Start date is required' : null;
    }

    const parts = dateStr.split('-');
    if (parts.length !== 3) return 'Please enter a complete date';

    const [yearStr, monthStr, dayStr] = parts;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return 'Please enter a valid date';
    }

    if (year < 2000 || year > 2035) {
      return 'Year must be between 2000 and 2035';
    }

    if (minDate && minDate.trim() && dateStr < minDate) {
      return 'Target date cannot be earlier than start date';
    }

    return null;
  };

  const hasDateErrors = Boolean(dateErrors.startDate || dateErrors.targetCompletionDate);

  const addTechItems = (text: string) => {
    const items = text
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (items.length > 0) {
      setFormData(prev => {
        const current = prev.technologiesUsed || [];
        const newItems = items.filter(item => !current.includes(item));
        return {
          ...prev,
          technologiesUsed: [...current, ...newItems]
        };
      });
    }
  };

  const handleAddTech = () => {
    if (techInput.trim()) {
      addTechItems(techInput);
      setTechInput('');
    }
  };

  const handleTechInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      const completeParts = parts.slice(0, -1).map(p => p.trim()).filter(Boolean);
      const lastPart = parts[parts.length - 1];

      if (completeParts.length > 0) {
        addTechItems(completeParts.join(','));
      }
      setTechInput(lastPart.trimStart());
    } else {
      setTechInput(val);
    }
  };

  const handleRemoveTech = (index: number) => {
    setFormData(prev => ({
      ...prev,
      technologiesUsed: (prev.technologiesUsed || []).filter((_, i) => i !== index)
    }));
  };

  const handleDateChange = (field: 'startDate' | 'targetCompletionDate', value: string) => {
    let sanitized = value;
    if (sanitized) {
      const parts = sanitized.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].slice(0, 4);
        sanitized = parts.join('-');
      }
    }

    const updatedForm = { ...formData, [field]: sanitized };
    setFormData(updatedForm);

    const yearStr = (sanitized || '').split('-')[0] || '';
    const isMidTyping = isMidTypingYear(yearStr);

    // Only validate full completed date, not mid-keystroke typing
    if (!isMidTyping) {
      const startErr = validateDateString(updatedForm.startDate, true);
      const targetErr = validateDateString(updatedForm.targetCompletionDate, false, updatedForm.startDate);
      setDateErrors({
        startDate: startErr || undefined,
        targetCompletionDate: targetErr || undefined
      });
    } else {
      // Clear error while mid-typing
      setDateErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleDateBlur = () => {
    const startErr = validateDateString(formData.startDate, true);
    const targetErr = validateDateString(formData.targetCompletionDate, false, formData.startDate);
    setDateErrors({
      startDate: startErr || undefined,
      targetCompletionDate: targetErr || undefined
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startErr = validateDateString(formData.startDate, true);
    const targetErr = validateDateString(formData.targetCompletionDate, false, formData.startDate);

    if (startErr || targetErr) {
      setDateErrors({
        startDate: startErr || undefined,
        targetCompletionDate: targetErr || undefined
      });
      return;
    }

    // If there's any remaining tech in the input, add it before submitting
    let finalTechs = [...(formData.technologiesUsed || [])];
    if (techInput.trim()) {
      const pending = techInput
        .split(',')
        .map(t => t.trim())
        .filter(t => Boolean(t) && !finalTechs.includes(t));
      finalTechs = [...finalTechs, ...pending];
    }

    const newProject: Project = {
      id: uuidv4(),
      name: formData.name || '',
      category: formData.category || 'Power BI',
      startDate: formData.startDate || getTodayDate(),
      targetCompletionDate: formData.targetCompletionDate || '',
      status: formData.status || 'Idea',
      technologiesUsed: finalTechs,
      githubLink: formData.githubLink || '',
      portfolioLink: formData.portfolioLink || '',
      lessonsLearned: formData.lessonsLearned || ''
    };

    updateState({ projects: [newProject, ...state.projects] });
    setShowForm(false);
    setTechInput('');
    setDateErrors({});
    setFormData({
      name: '',
      category: 'Power BI',
      startDate: getTodayDate(),
      targetCompletionDate: '',
      status: 'Idea',
      technologiesUsed: [],
      githubLink: '',
      portfolioLink: '',
      lessonsLearned: ''
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
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setDateErrors({}); }}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Project'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Project</h3>
          <form noValidate onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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
              <input
                type="date"
                className="input"
                style={{
                  borderColor: dateErrors.startDate ? 'var(--danger, #ef4444)' : undefined,
                  boxShadow: dateErrors.startDate ? '0 0 0 1px var(--danger, #ef4444)' : undefined
                }}
                value={formData.startDate || ''}
                onChange={e => handleDateChange('startDate', e.target.value)}
                onBlur={handleDateBlur}
              />
              {dateErrors.startDate && (
                <span style={{ color: 'var(--danger, #ef4444)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  {dateErrors.startDate}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm text-muted">Target Completion Date</label>
              <input
                type="date"
                className="input"
                style={{
                  borderColor: dateErrors.targetCompletionDate ? 'var(--danger, #ef4444)' : undefined,
                  boxShadow: dateErrors.targetCompletionDate ? '0 0 0 1px var(--danger, #ef4444)' : undefined
                }}
                value={formData.targetCompletionDate || ''}
                onChange={e => handleDateChange('targetCompletionDate', e.target.value)}
                onBlur={handleDateBlur}
              />
              {dateErrors.targetCompletionDate && (
                <span style={{ color: 'var(--danger, #ef4444)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  {dateErrors.targetCompletionDate}
                </span>
              )}
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
                <input
                  className="input"
                  placeholder="e.g. MySQL, Python, SQL (press Enter or comma)"
                  value={techInput}
                  onChange={handleTechInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTech();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted.includes(',')) {
                      e.preventDefault();
                      addTechItems(pasted);
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddTech}>Add</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {formData.technologiesUsed?.map((tech, idx) => (
                  <span key={idx} className="badge badge-info" style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    {tech} <span style={{ cursor: 'pointer', color: 'var(--text-main)', marginLeft: '4px' }} onClick={() => handleRemoveTech(idx)}>×</span>
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={hasDateErrors}
                style={hasDateErrors ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                Save Project
              </button>
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

            {(project.startDate || project.targetCompletionDate) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <Calendar size={14} />
                <span>
                  {project.startDate ? formatToISTShortDate(project.startDate) : '—'}
                  {project.targetCompletionDate ? ` → ${formatToISTShortDate(project.targetCompletionDate)}` : ''}
                </span>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(project.technologiesUsed || [])
                .flatMap(tech => tech.split(','))
                .map(t => t.trim())
                .filter(Boolean)
                .map((tech, i) => (
                  <span key={i} className="badge" style={{ backgroundColor: 'var(--bg-hover)' }}>{tech}</span>
                ))}
            </div>

            {project.lessonsLearned && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Lessons Learned</div>
                {project.lessonsLearned}
              </div>
            )}

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

