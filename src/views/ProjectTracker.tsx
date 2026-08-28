import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import type { Project, ProjectStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Code2, ExternalLink, Calendar, Pencil, Trash2, Link2, Search, X, ChevronDown } from 'lucide-react';
import { formatToISTDate, formatToISTShortDate } from '../utils/dateUtils';

export const getCategoryTheme = (category?: string) => {
  const cat = (category || '').toLowerCase().trim();
  if (cat.includes('power bi')) {
    return {
      text: '#d97706',
      bg: 'rgba(245, 158, 11, 0.14)',
      border: '#f59e0b'
    };
  }
  if (cat.includes('sql')) {
    return {
      text: '#0284c7',
      bg: 'rgba(14, 165, 233, 0.14)',
      border: '#0ea5e9'
    };
  }
  if (cat.includes('python')) {
    return {
      text: '#059669',
      bg: 'rgba(16, 185, 129, 0.14)',
      border: '#10b981'
    };
  }
  if (cat.includes('full stack') || cat.includes('web') || cat.includes('react')) {
    return {
      text: '#7c3aed',
      bg: 'rgba(139, 92, 246, 0.14)',
      border: '#8b5cf6'
    };
  }
  return {
    text: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.14)',
    border: '#ec4899'
  };
};

export const ProjectTracker = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  const getTodayDate = () => formatToISTDate(new Date().toISOString());

  const getStatusBadgeClass = (status: ProjectStatus) => {
    switch (status) {
      case 'Completed':
      case 'Published':
        return 'badge badge-success';
      case 'Building':
      case 'Planning':
        return 'badge badge-info';
      case 'Testing':
        return 'badge badge-warning';
      case 'Idea':
      default:
        return 'badge';
    }
  };

  const initialFormData: Partial<Project> = {
    name: '',
    category: 'Power BI',
    startDate: getTodayDate(),
    targetCompletionDate: '',
    status: 'Idea',
    technologiesUsed: [],
    githubLink: '',
    portfolioLink: '',
    resources: [],
    lessonsLearned: ''
  };

  const [formData, setFormData] = useState<Partial<Project>>(initialFormData);
  const [techInput, setTechInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [dateErrors, setDateErrors] = useState<{ startDate?: string; targetCompletionDate?: string }>({});

  const isMidTypingYear = (yearStr: string) => {
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

  // Technologies handlers
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

  // Resources handlers
  const addResourceItems = (text: string) => {
    const items = text
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (items.length > 0) {
      setFormData(prev => {
        const current = prev.resources || [];
        const newItems = items.filter(item => !current.includes(item));
        return {
          ...prev,
          resources: [...current, ...newItems]
        };
      });
    }
  };

  const handleAddResource = () => {
    if (resourceInput.trim()) {
      addResourceItems(resourceInput);
      setResourceInput('');
    }
  };

  const handleResourceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      const completeParts = parts.slice(0, -1).map(p => p.trim()).filter(Boolean);
      const lastPart = parts[parts.length - 1];

      if (completeParts.length > 0) {
        addResourceItems(completeParts.join(','));
      }
      setResourceInput(lastPart.trimStart());
    } else {
      setResourceInput(val);
    }
  };

  const handleRemoveResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      resources: (prev.resources || []).filter((_, i) => i !== index)
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

    if (!isMidTyping) {
      const startErr = validateDateString(updatedForm.startDate, true);
      const targetErr = validateDateString(updatedForm.targetCompletionDate, false, updatedForm.startDate);
      setDateErrors({
        startDate: startErr || undefined,
        targetCompletionDate: targetErr || undefined
      });
    } else {
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

  const handleStartEdit = (project: Project) => {
    setFormData({
      name: project.name,
      category: project.category,
      startDate: project.startDate,
      targetCompletionDate: project.targetCompletionDate,
      status: project.status,
      technologiesUsed: (project.technologiesUsed || []).flatMap(t => t.split(',')).map(t => t.trim()).filter(Boolean),
      githubLink: project.githubLink || '',
      portfolioLink: project.portfolioLink || '',
      resources: (project.resources || []).flatMap(r => r.split(',')).map(r => r.trim()).filter(Boolean),
      lessonsLearned: project.lessonsLearned || ''
    });
    setEditingProjectId(project.id);
    setShowForm(true);
    setDateErrors({});
    setTechInput('');
    setResourceInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingProjectId(null);
    setTechInput('');
    setResourceInput('');
    setDateErrors({});
    setFormData(initialFormData);
  };

  const handleDelete = (id: string, projectName?: string) => {
    const label = projectName ? `"${projectName}"` : 'this project';
    if (window.confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) {
      const updated = state.projects.filter(p => p.id !== id);
      updateState({ projects: updated });
      if (editingProjectId === id) {
        handleCancelForm();
      }
    }
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

    let finalTechs = [...(formData.technologiesUsed || [])];
    if (techInput.trim()) {
      const pending = techInput
        .split(',')
        .map(t => t.trim())
        .filter(t => Boolean(t) && !finalTechs.includes(t));
      finalTechs = [...finalTechs, ...pending];
    }

    let finalResources = [...(formData.resources || [])];
    if (resourceInput.trim()) {
      const pending = resourceInput
        .split(',')
        .map(r => r.trim())
        .filter(r => Boolean(r) && !finalResources.includes(r));
      finalResources = [...finalResources, ...pending];
    }

    if (editingProjectId) {
      const updated = state.projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            name: formData.name || '',
            category: formData.category || 'Power BI',
            startDate: formData.startDate || getTodayDate(),
            targetCompletionDate: formData.targetCompletionDate || '',
            status: formData.status || 'Idea',
            technologiesUsed: finalTechs,
            githubLink: formData.githubLink || '',
            portfolioLink: formData.portfolioLink || '',
            resources: finalResources,
            lessonsLearned: formData.lessonsLearned || ''
          };
        }
        return p;
      });
      updateState({ projects: updated });
    } else {
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
        resources: finalResources,
        lessonsLearned: formData.lessonsLearned || ''
      };
      updateState({ projects: [newProject, ...state.projects] });
    }

    handleCancelForm();
  };

  // Filter Projects logic
  const filteredProjects = useMemo(() => {
    return state.projects.filter(project => {
      // Category filter
      if (selectedCategory && project.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Tech filter
      if (selectedTech) {
        const techs = (project.technologiesUsed || [])
          .flatMap(t => t.split(','))
          .map(t => t.trim().toLowerCase());
        if (!techs.includes(selectedTech.toLowerCase())) {
          return false;
        }
      }

      // Resource filter
      if (selectedResource) {
        const resources = (project.resources || [])
          .flatMap(r => r.split(','))
          .map(r => r.trim().toLowerCase());
        if (!resources.some(r => r.includes(selectedResource.toLowerCase()))) {
          return false;
        }
      }

      // Date range filter
      if (dateRange.start && dateRange.end) {
        const pStart = project.startDate || '';
        const pEnd = project.targetCompletionDate || project.startDate || '';
        if (pStart > dateRange.end || pEnd < dateRange.start) {
          return false;
        }
      } else if (dateRange.start) {
        const pEnd = project.targetCompletionDate || project.startDate || '';
        if (pEnd < dateRange.start) {
          return false;
        }
      } else if (dateRange.end) {
        const pStart = project.startDate || '';
        if (pStart > dateRange.end) {
          return false;
        }
      }

      // Search query across all fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (project.name || '').toLowerCase().includes(q);
        const catMatch = (project.category || '').toLowerCase().includes(q);
        const techMatch = (project.technologiesUsed || []).some(t => t.toLowerCase().includes(q));
        const resMatch = (project.resources || []).some(r => r.toLowerCase().includes(q));
        const lessonsMatch = (project.lessonsLearned || '').toLowerCase().includes(q);
        const statusMatch = (project.status || '').toLowerCase().includes(q);
        const githubMatch = (project.githubLink || '').toLowerCase().includes(q);
        const portfolioMatch = (project.portfolioLink || '').toLowerCase().includes(q);

        const startRaw = project.startDate || '';
        const endRaw = project.targetCompletionDate || '';
        const startFmt = formatToISTShortDate(startRaw).toLowerCase();
        const endFmt = formatToISTShortDate(endRaw).toLowerCase();
        const dateMatch = startRaw.includes(q) || endRaw.includes(q) || startFmt.includes(q) || endFmt.includes(q);

        return nameMatch || catMatch || techMatch || resMatch || lessonsMatch || statusMatch || githubMatch || portfolioMatch || dateMatch;
      }

      return true;
    });
  }, [state.projects, selectedCategory, selectedTech, selectedResource, dateRange, searchQuery]);

  const hasDateFilter = Boolean(dateRange.start || dateRange.end);
  const hasActiveFilters = Boolean(selectedCategory || selectedTech || selectedResource || hasDateFilter || searchQuery);

  const getDateFilterLabel = () => {
    if (dateRange.start && dateRange.end) {
      if (dateRange.start === dateRange.end) {
        return formatToISTShortDate(dateRange.start);
      }
      return `${formatToISTShortDate(dateRange.start)} – ${formatToISTShortDate(dateRange.end)}`;
    }
    if (dateRange.start) {
      return `From ${formatToISTShortDate(dateRange.start)}`;
    }
    if (dateRange.end) {
      return `Until ${formatToISTShortDate(dateRange.end)}`;
    }
    return 'Dates';
  };

  const handleClearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedTech(null);
    setSelectedResource(null);
    setDateRange({ start: '', end: '' });
    setTempDateRange({ start: '', end: '' });
    setSearchQuery('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Modern ERP Topbar Header */}
      <div className="decision-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="decision-header">
          <h1 style={{ marginBottom: '0.25rem' }}>Project Portfolio</h1>
          <p className="text-muted">Build things to prove you can do the job.</p>
        </div>

        {/* Right Action & Search Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Decision Search Pill */}
          <div className="decision-search" style={{ width: '260px' }}>
            <Search className="decision-search-icon" />
            <input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* ERP Date Filter Dropdown Popover */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                height: '2.5rem',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0 0.875rem',
                fontSize: '0.8125rem',
                borderColor: hasDateFilter ? 'var(--accent-primary)' : undefined,
                color: hasDateFilter ? 'var(--accent-primary)' : 'var(--text-main)',
                backgroundColor: hasDateFilter ? 'rgba(5, 150, 105, 0.08)' : undefined
              }}
              onClick={() => {
                setTempDateRange(dateRange);
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
            >
              <Calendar size={14} />
              <span>{getDateFilterLabel()}</span>
              {hasDateFilter ? (
                <span
                  style={{ cursor: 'pointer', padding: '0 0.125rem', display: 'flex', alignItems: 'center' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRange({ start: '', end: '' });
                    setTempDateRange({ start: '', end: '' });
                  }}
                  title="Clear date filter"
                >
                  <X size={13} />
                </span>
              ) : (
                <ChevronDown size={13} style={{ opacity: 0.6 }} />
              )}
            </button>

            {/* Floating Date Range Popover */}
            {isDatePickerOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setIsDatePickerOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 50,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md, 12px)',
                    padding: '1rem',
                    width: '300px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Filter by Timeline
                  </div>

                  {/* Quick Presets */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        justifyContent: 'center',
                        backgroundColor: !dateRange.start && !dateRange.end ? 'var(--accent-primary)' : undefined,
                        color: !dateRange.start && !dateRange.end ? '#fff' : undefined
                      }}
                      onClick={() => {
                        setDateRange({ start: '', end: '' });
                        setTempDateRange({ start: '', end: '' });
                        setIsDatePickerOpen(false);
                      }}
                    >
                      All Dates
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        const today = getTodayDate();
                        setDateRange({ start: today, end: today });
                        setTempDateRange({ start: today, end: today });
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Active Today
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        const now = new Date();
                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                        setDateRange({ start: firstDay, end: lastDay });
                        setTempDateRange({ start: firstDay, end: lastDay });
                        setIsDatePickerOpen(false);
                      }}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        const now = new Date();
                        const firstDay = `${now.getFullYear()}-01-01`;
                        const lastDay = `${now.getFullYear()}-12-31`;
                        setDateRange({ start: firstDay, end: lastDay });
                        setTempDateRange({ start: firstDay, end: lastDay });
                        setIsDatePickerOpen(false);
                      }}
                    >
                      This Year
                    </button>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.1rem 0' }} />

                  {/* Custom Range Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>From (Start Date)</label>
                      <input
                        type="date"
                        className="input"
                        style={{ fontSize: '0.8125rem', height: '34px', padding: '0 0.5rem', width: '100%' }}
                        value={tempDateRange.start}
                        onChange={e => setTempDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>To (End Date)</label>
                      <input
                        type="date"
                        className="input"
                        style={{ fontSize: '0.8125rem', height: '34px', padding: '0 0.5rem', width: '100%' }}
                        value={tempDateRange.end}
                        onChange={e => setTempDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setDateRange({ start: '', end: '' });
                        setTempDateRange({ start: '', end: '' });
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setDateRange(tempDateRange);
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Project Primary Action */}
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.5rem' }}
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setFormData(initialFormData);
                setEditingProjectId(null);
                setShowForm(true);
              }
            }}
          >
            <Plus size={18} /> {showForm ? 'Cancel' : 'New Project'}
          </button>
        </div>
      </div>

      {/* Active Filters Row */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
          <span style={{ fontWeight: 600 }}>Active filters:</span>
          {selectedCategory && (
            <span
              className="badge"
              style={{
                backgroundColor: getCategoryTheme(selectedCategory).bg,
                color: getCategoryTheme(selectedCategory).text,
                border: `1px solid ${getCategoryTheme(selectedCategory).border}40`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.5rem'
              }}
            >
              Category: {selectedCategory}
              <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }} onClick={() => setSelectedCategory(null)}>×</span>
            </span>
          )}
          {selectedTech && (
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}>
              Tech: {selectedTech}
              <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }} onClick={() => setSelectedTech(null)}>×</span>
            </span>
          )}
          {selectedResource && (
            <span className="badge" style={{ backgroundColor: 'var(--bg-hover)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}>
              Resource: {selectedResource}
              <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }} onClick={() => setSelectedResource(null)}>×</span>
            </span>
          )}
          {hasDateFilter && (
            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}>
              Dates: {getDateFilterLabel()}
              <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }} onClick={() => setDateRange({ start: '', end: '' })}>×</span>
            </span>
          )}
          {searchQuery && (
            <span className="badge" style={{ backgroundColor: 'var(--bg-hover)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem' }}>
              Search: "{searchQuery}"
              <span style={{ cursor: 'pointer', marginLeft: '2px', fontWeight: 'bold' }} onClick={() => setSearchQuery('')}>×</span>
            </span>
          )}
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--danger, #ef4444)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              textDecoration: 'underline',
              padding: '0 0.25rem'
            }}
            onClick={handleClearAllFilters}
          >
            Reset all
          </button>
        </div>
      )}

      {/* Add / Edit Form Modal Card */}
      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>{editingProjectId ? 'Edit Project' : 'Add New Project'}</h3>
            {editingProjectId && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>Editing</span>
            )}
          </div>
          <form noValidate onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Project Name</label>
              <input required className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
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
              <input type="url" className="input" placeholder="https://github.com/..." value={formData.githubLink || ''} onChange={e => setFormData({...formData, githubLink: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Portfolio Link</label>
              <input type="url" className="input" placeholder="https://..." value={formData.portfolioLink || ''} onChange={e => setFormData({...formData, portfolioLink: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Resources & Reference Links</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="input"
                  placeholder="e.g. https://kaggle.com/dataset, https://notion.so/docs (press Enter or comma)"
                  value={resourceInput}
                  onChange={handleResourceInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddResource();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted.includes(',')) {
                      e.preventDefault();
                      addResourceItems(pasted);
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddResource}>Add</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {formData.resources?.map((res, idx) => (
                  <span key={idx} className="badge" style={{ backgroundColor: 'var(--bg-hover)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <Link2 size={12} /> {res} <span style={{ cursor: 'pointer', color: 'var(--text-main)', marginLeft: '4px' }} onClick={() => handleRemoveResource(idx)}>×</span>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Lessons Learned</label>
              <textarea className="textarea" rows={2} value={formData.lessonsLearned || ''} onChange={e => setFormData({...formData, lessonsLearned: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <div>
                {editingProjectId && (
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger, #ef4444)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0'
                    }}
                    onClick={() => handleDelete(editingProjectId, formData.name)}
                  >
                    <Trash2 size={15} /> Delete Project
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCancelForm}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={hasDateErrors}
                  style={hasDateErrors ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                  {editingProjectId ? 'Update Project' : 'Save Project'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-2 gap-6">
        {state.projects.length === 0 ? (
          <div style={{ gridColumn: 'span 2' }} className="card text-center text-muted">
            No projects added yet. Start building your portfolio.
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ gridColumn: 'span 2', padding: '2.5rem' }} className="card text-center text-muted">
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>No projects match your active search and filters.</p>
            <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={handleClearAllFilters}>
              Clear Filters
            </button>
          </div>
        ) : filteredProjects.map(project => {
          const catTheme = getCategoryTheme(project.category);
          const isCategorySelected = selectedCategory?.toLowerCase() === (project.category || '').toLowerCase();

          return (
            <div key={project.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              {/* Header: Title + Category/Date Meta + Icons Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: 'var(--text-main)',
                    wordBreak: 'break-word'
                  }}>
                    {project.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    {project.category && (
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.125rem 0.5rem',
                          fontWeight: 600,
                          backgroundColor: catTheme.bg,
                          color: catTheme.text,
                          border: `1px solid ${catTheme.border}40`,
                          cursor: 'pointer',
                          boxShadow: isCategorySelected ? `0 0 0 2px ${catTheme.border}` : undefined,
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setSelectedCategory(prev => prev === project.category ? null : project.category)}
                        title={`Click to filter by ${project.category}`}
                      >
                        {project.category}
                      </span>
                    )}
                    {(project.startDate || project.targetCompletionDate) && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Calendar size={13} style={{ opacity: 0.8 }} />
                        <span>
                          {project.startDate ? formatToISTShortDate(project.startDate) : '—'}
                          {project.targetCompletionDate ? ` → ${formatToISTShortDate(project.targetCompletionDate)}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Icons & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <span className={getStatusBadgeClass(project.status)} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem' }}>
                    {project.status}
                  </span>

                  {/* GitHub Code Icon Link */}
                  {project.githubLink && (
                    <a
                      href={project.githubLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        padding: '0.35rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-sm, 6px)',
                        transition: 'all 0.15s ease',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                      title="View GitHub Code"
                    >
                      <Code2 size={15} />
                    </a>
                  )}

                  {/* Live Demo / Portfolio Icon Link */}
                  {project.portfolioLink && (
                    <a
                      href={project.portfolioLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--info)',
                        cursor: 'pointer',
                        padding: '0.35rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-sm, 6px)',
                        transition: 'all 0.15s ease',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--info)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                      title="View Live Demo"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}

                  {/* Edit Pencil Icon Button */}
                  <button
                    type="button"
                    style={{
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm, 6px)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                    onClick={() => handleStartEdit(project)}
                    title="Edit Project"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {/* Technologies Badges (Clickable filters) */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(project.technologiesUsed || [])
                  .flatMap(tech => tech.split(','))
                  .map(t => t.trim())
                  .filter(Boolean)
                  .map((tech, i) => {
                    const isSelected = selectedTech?.toLowerCase() === tech.toLowerCase();
                    return (
                      <span
                        key={i}
                        className="badge"
                        style={{
                          backgroundColor: isSelected ? 'var(--info)' : 'var(--bg-hover)',
                          color: isSelected ? '#ffffff' : 'var(--text-main)',
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setSelectedTech(prev => prev?.toLowerCase() === tech.toLowerCase() ? null : tech)}
                        title={`Click to filter by ${tech}`}
                      >
                        {tech}
                      </span>
                    );
                  })}
              </div>

              {/* Resources & Links (Clickable badges / links) */}
              {project.resources && project.resources.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Resources & Links
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {project.resources.flatMap(r => r.split(',')).map(r => r.trim()).filter(Boolean).map((res, i) => {
                      const isUrl = /^https?:\/\//i.test(res);
                      const isSelected = selectedResource?.toLowerCase() === res.toLowerCase();

                      return (
                        <div
                          key={i}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            borderRadius: 'var(--radius-sm, 6px)',
                            padding: '0.15rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: isSelected ? 'rgba(14, 165, 233, 0.2)' : 'var(--bg-hover)',
                            border: isSelected ? '1px solid var(--info)' : '1px solid var(--border-color)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: isUrl ? 'var(--info)' : 'var(--text-main)' }}
                            onClick={() => setSelectedResource(prev => prev === res ? null : res)}
                            title={`Click to filter by ${res}`}
                          >
                            <Link2 size={12} />
                            {res.replace(/^https?:\/\/(www\.)?/, '').slice(0, 32)}
                            {res.replace(/^https?:\/\/(www\.)?/, '').length > 32 ? '...' : ''}
                          </span>
                          {isUrl && (
                            <a
                              href={res}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}
                              title="Open link in new tab"
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lessons Learned Callout (Matched to Category Color) */}
              {project.lessonsLearned && (
                <div style={{
                  backgroundColor: 'var(--bg-hover)',
                  borderLeft: `3px solid ${catTheme.border}`,
                  borderRadius: '0 var(--radius-sm, 6px) var(--radius-sm, 6px) 0',
                  padding: '0.625rem 0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}>
                  <div style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: catTheme.border,
                    textTransform: 'uppercase'
                  }}>
                    Lessons Learned
                  </div>
                  <div style={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                    color: 'var(--text-main)',
                    opacity: 0.9,
                    whiteSpace: 'pre-line'
                  }}>
                    {project.lessonsLearned}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
