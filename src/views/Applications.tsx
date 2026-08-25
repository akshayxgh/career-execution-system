import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import type { JobApplication, ApplicationStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, RotateCcw } from 'lucide-react';
import { 
  getAppliedJobs, 
  updateDecisionJobStatus,
  type AppliedJobFromDB, 
  type DecisionJob,
  type DecisionStatus 
} from '../services/decisionIntelligenceService';
import DecisionJobModal from '../components/decision/DecisionJobModal';
import { formatToISTDate } from '../utils/dateUtils';

interface UnifiedApplication {
  id: string;
  company: string;
  jobTitle: string;
  status: string;
  appliedDate: string;
  source: string;
  scraper?: string;
  score: number | undefined;
  jobLink: string;
  isAutomatic: boolean;
  raw: any;
}

type SortColumn = 'company' | 'jobTitle' | 'status' | 'appliedDate' | 'source' | 'scraper' | 'score';
type SortDirection = 'asc' | 'desc';


export const Applications = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dbApplications, setDbApplications] = useState<AppliedJobFromDB[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal & Row Interaction state
  const [selectedJob, setSelectedJob] = useState<DecisionJob | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaveError, setStatusSaveError] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<JobApplication>>({
    company: '', position: '', location: '', salary: '', appliedDate: new Date().toISOString().split('T')[0],
    jobLink: '', recruiterName: '', recruiterContact: '', status: 'Applied', notes: '', 
    followUpDate: '', lastContactDate: '', nextAction: '', priorityLevel: 'Medium',
    source: 'Manual', score: undefined
  });

  const fetchDbApplications = async () => {
    try {
      setLoading(true);
      const apps = await getAppliedJobs();
      setDbApplications(apps);
    } catch (error) {
      console.error('Failed to fetch DB applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbApplications();
  }, []);

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
      followUpDate: '', lastContactDate: '', nextAction: '', priorityLevel: 'Medium',
      source: 'Manual', score: undefined
    });
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      'APPLIED': 'Applied',
      'INTERVIEW': 'Interview Scheduled',
      'OFFER': 'Offer Received',
      'REJECTED': 'Rejected',
      'JOINED': 'Joined',
      'WITHDRAWN': 'Withdrawn',
      'DECLINED': 'Declined',
    };
    return map[status] || status;
  };

  const dbAppsMapped: UnifiedApplication[] = dbApplications.map(dbApp => ({
    id: dbApp.job_id,
    company: dbApp.jobs?.company_name || '—',
    jobTitle: dbApp.jobs?.title || '—',
    status: formatStatus(dbApp.status),
    appliedDate: dbApp.updated_at ? formatToISTDate(dbApp.updated_at) : '—',
    source: dbApp.jobs?.source || 'Manual',
    scraper: dbApp.jobs?.scraper || undefined,
    score: dbApp.jobs?.job_analysis?.score ?? undefined,
    jobLink: dbApp.jobs?.url || '',
    isAutomatic: true,
    raw: dbApp,
  }));


  const manualAppsMapped: UnifiedApplication[] = state.applications.map(app => ({
    id: app.id,
    company: app.company,
    jobTitle: app.position,
    status: app.status,
    appliedDate: app.appliedDate,
    source: app.source || 'Manual',
    score: app.score,
    jobLink: app.jobLink,
    isAutomatic: false,
    raw: app,
  }));

  const allApps = [...dbAppsMapped, ...manualAppsMapped];

  const filteredApps = allApps.filter(app => {
    const q = searchTerm.toLowerCase();
    if (
      app.company.toLowerCase().includes(q) || 
      app.jobTitle.toLowerCase().includes(q) ||
      app.source.toLowerCase().includes(q)
    ) return true;

    if (app.isAutomatic) {
      const dbApp = app.raw as AppliedJobFromDB;
      const email = (dbApp.jobs?.job_analysis?.hr_email || '').toLowerCase();
      const desc = (dbApp.jobs?.description || '').toLowerCase();
      const extId = (dbApp.jobs?.external_id || '').toLowerCase();
      const cleanId = (dbApp.jobs?.external_id || '').replace(/^[a-zA-Z0-9]+_/, '').toLowerCase();
      return email.includes(q) || desc.includes(q) || extId.includes(q) || cleanId.includes(q);
    } else {

      const manualApp = app.raw as any;
      const contact = (manualApp.recruiterContact || '').toLowerCase();
      const notes = (manualApp.notes || '').toLowerCase();
      return contact.includes(q) || notes.includes(q);
    }
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleResetSorting = async () => {
    setSortColumn(null);
    setSortDirection('asc');
    await fetchDbApplications();
  };

  const sortedApps = [...filteredApps].sort((a, b) => {
    if (!sortColumn) {
      // Default order: sort by appliedDate descending
      const dateA = new Date(a.appliedDate || 0).getTime();
      const dateB = new Date(b.appliedDate || 0).getTime();
      return dateB - dateA;
    }

    const directionModifier = sortDirection === 'asc' ? 1 : -1;

    if (sortColumn === 'score') {
      const scoreA = a.score !== undefined ? a.score : -1;
      const scoreB = b.score !== undefined ? b.score : -1;
      return (scoreA - scoreB) * directionModifier;
    }

    const valA = String(a[sortColumn] || '').toLowerCase();
    const valB = String(b[sortColumn] || '').toLowerCase();
    return valA.localeCompare(valB) * directionModifier;
  });

  const getScoreStyle = (score: number) => {
    if (score >= 90) return { color: 'var(--success)', fontWeight: 'bold' };
    if (score >= 75) return { color: 'var(--accent-primary)', fontWeight: 'bold' };
    if (score >= 60) return { color: 'var(--warning)', fontWeight: 'bold' };
    return { color: 'var(--danger)', fontWeight: 'bold' };
  };

  const getBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'applied' || s === 'screening' || s === 'assessment' || s === 'saved' || s === 'withdrawn') {
      return 'badge-info';
    }
    if (s.includes('interview')) {
      return 'badge-warning';
    }
    if (s.includes('offer') || s === 'joined') {
      return 'badge-success';
    }
    if (s === 'rejected' || s === 'declined') {
      return 'badge-danger';
    }
    return 'badge-info';
  };

  const constructDecisionJob = (dbApp: AppliedJobFromDB): DecisionJob => {
    return {
      id: dbApp.job_id,
      company_id: dbApp.jobs?.company_id || null,
      title: dbApp.jobs?.title || '—',
      company_name: dbApp.jobs?.company_name || '—',
      location: dbApp.jobs?.location || null,
      description: dbApp.jobs?.description || null,
      experience: dbApp.jobs?.experience || null,
      salary: dbApp.jobs?.salary || null,
      posted_date: dbApp.jobs?.posted_date || null,
      created_at: dbApp.updated_at || null,
      url: dbApp.jobs?.url || '',
      source: dbApp.jobs?.source || 'Manual',
      score: dbApp.jobs?.job_analysis?.score || 0,
      recommendation: (dbApp.jobs?.job_analysis?.recommendation as any) || 'Maybe',
      reason: dbApp.jobs?.job_analysis?.reason || '',
      recommended_resume: null,
      recommended_master_resume: null,
      email_to_hr: dbApp.jobs?.job_analysis?.email_to_hr || false,
      hr_email: dbApp.jobs?.job_analysis?.hr_email || null,
      confidence: dbApp.jobs?.job_analysis?.confidence ?? null,
      analyzed_at: dbApp.jobs?.job_analysis?.analyzed_at || dbApp.updated_at || '',
      my_status: dbApp.status,
      status_updated_at: dbApp.updated_at || null,
    };
  };

  const constructDecisionJobFromManual = (app: JobApplication): DecisionJob => {
    const map: Record<ApplicationStatus, DecisionStatus> = {
      'Saved': 'SAVED',
      'Applied': 'APPLIED',
      'Screening': 'APPLIED',
      'Assessment': 'APPLIED',
      'Interview Scheduled': 'INTERVIEW',
      'Interview Completed': 'INTERVIEW',
      'Rejected': 'REJECTED',
      'Offer Received': 'OFFER',
      'Joined': 'JOINED'
    };
    const decisionStatus = map[app.status] || 'APPLIED';
    return {
      id: app.id,
      company_id: null,
      title: app.position || '—',
      company_name: app.company || '—',
      location: app.location || null,
      description: app.notes || null,
      experience: null,
      salary: app.salary || null,
      posted_date: app.appliedDate || null,
      created_at: app.appliedDate || null,
      url: app.jobLink || '',
      source: app.source || 'Manual',
      score: app.score || 0,
      recommendation: 'Maybe',
      reason: app.notes || '',
      recommended_resume: null,
      recommended_master_resume: null,
      email_to_hr: false,
      hr_email: app.recruiterContact || null,
      confidence: null,
      analyzed_at: app.appliedDate || '',
      my_status: decisionStatus,
      status_updated_at: app.appliedDate || null,
    };
  };

  const handleRowClick = (app: UnifiedApplication) => {
    if (app.jobLink) {
      window.open(app.jobLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDetailsClick = (e: React.MouseEvent, app: UnifiedApplication) => {
    e.stopPropagation();
    setStatusSaveError('');
    const decisionJob = app.isAutomatic
      ? constructDecisionJob(app.raw)
      : constructDecisionJobFromManual(app.raw);
    setSelectedJob(decisionJob);
  };

  const handleSaveStatus = async (status: DecisionStatus) => {
    if (!selectedJob) return;

    const matchedApp = allApps.find(a => a.id === selectedJob.id);
    if (!matchedApp) return;

    if (matchedApp.isAutomatic) {
      setSavingStatus(true);
      setStatusSaveError('');
      try {
        await updateDecisionJobStatus(selectedJob.id, status);
        await fetchDbApplications();
        setSelectedJob(null);
      } catch (e: any) {
        setStatusSaveError(e.message || 'Failed to save status');
      } finally {
        setSavingStatus(false);
      }
    } else {
      // Manual application
      const map: Record<DecisionStatus, ApplicationStatus> = {
        'NEW': 'Applied',
        'SAVED': 'Saved',
        'APPLIED': 'Applied',
        'INTERVIEW': 'Interview Scheduled',
        'OFFER': 'Offer Received',
        'REJECTED': 'Rejected',
        'JOINED': 'Joined',
        'WITHDRAWN': 'Rejected',
        'DECLINED': 'Rejected',
        'HIDDEN': 'Rejected',
      };
      const appStatus = map[status] || 'Applied';
      const updatedApps = state.applications.map(app => 
        app.id === selectedJob.id ? { ...app, status: appStatus } : app
      );
      updateState({ applications: updatedApps });
      setSelectedJob(null);
    }
  };

  const renderSortHeader = (column: SortColumn, label: string, prefix?: React.ReactNode) => {
    const isSorted = sortColumn === column;
    return (
      <th 
        style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => handleSort(column)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {prefix}
          <span>{label}</span>
          {isSorted ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.3 }}>
              ↕
            </span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="decision-topbar">
        <div className="decision-header">
          <h1>Job Applications</h1>
          <p className="text-muted">Track your funnel and follow-ups aggressively.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="decision-search" style={{ width: '300px' }}>
            <Search className="decision-search-icon" />
            <input 
              type="search" 
              placeholder="Search company, job title or source..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '2.5rem' }}>
            <Plus size={18} /> {showForm ? 'Cancel' : 'New Application'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Application</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted">Company</label>
              <input required className="input" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-muted">Job Title</label>
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
              <label className="text-sm text-muted">Source</label>
              <select className="select" value={formData.source || 'Manual'} onChange={e => setFormData({...formData, source: e.target.value})}>
                {['LinkedIn', 'Naukri', 'Foundit', 'Indeed', 'TimesJobs', 'Manual'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">Score (%)</label>
              <input type="number" min={0} max={100} className="input" placeholder="e.g. 92" value={formData.score !== undefined ? formData.score : ''} onChange={e => setFormData({...formData, score: e.target.value ? Number(e.target.value) : undefined})} />
            </div>
            <div>
              <label className="text-sm text-muted">Location / Remote</label>
              <input className="input" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
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
        <div className="applications-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="applications-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {renderSortHeader('company', 'Company', (
                  <button
                    type="button"
                    className="decision-reset-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetSorting();
                    }}
                    title="Reset Sorting"
                    style={{ marginLeft: '-0.5rem', marginRight: '0.25rem' }}
                  >
                    <RotateCcw className="decision-reset-icon" />
                  </button>
                ))}
                {renderSortHeader('jobTitle', 'Job Title')}
                {renderSortHeader('status', 'Status')}
                {renderSortHeader('appliedDate', 'Applied Date')}
                {renderSortHeader('source', 'Source')}
                {renderSortHeader('scraper', 'Scraper')}
                {renderSortHeader('score', 'Score')}
                <th style={{ padding: '0.75rem 1rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading applications...
                  </td>
                </tr>
              ) : sortedApps.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No applications found. Start applying!
                  </td>
                </tr>
              ) : sortedApps.map(app => (
                <tr 
                  key={app.id} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    cursor: app.jobLink ? 'pointer' : 'default',
                    backgroundColor: hoveredRowId === app.id ? 'rgba(51, 65, 85, 0.3)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={() => setHoveredRowId(app.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onClick={() => handleRowClick(app)}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{app.company}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{app.jobTitle}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${getBadgeClass(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{app.appliedDate}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge badge-info" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                      {app.source}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge badge-secondary" style={{ textTransform: 'capitalize', fontSize: '0.75rem' }}>
                      {app.scraper || app.source || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {app.score !== undefined && app.score !== null ? (
                      <span style={getScoreStyle(app.score)}>{app.score}%</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>

                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={(e) => handleDetailsClick(e, app)}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedJob ? (
        <DecisionJobModal
          job={selectedJob}
          saving={savingStatus}
          saveError={statusSaveError}
          onClose={() => setSelectedJob(null)}
          onSaveStatus={handleSaveStatus}
        />
      ) : null}
    </div>
  );
};
