import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { SkillAssessment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { isSameWeek } from 'date-fns';

export const Analytics = () => {
  const { state, updateState, exportData } = useStore();

  const [assessmentData, setAssessmentData] = useState<Partial<SkillAssessment>>({
    date: new Date().toISOString().slice(0, 7), // YYYY-MM
    powerBi: 5, sql: 5, python: 5, excel: 5, vba: 5, communication: 5, interviewSkills: 5
  });

  const handleAssessmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAssessment: SkillAssessment = {
      id: uuidv4(),
      ...(assessmentData as Omit<SkillAssessment, 'id'>)
    };
    updateState({ skillAssessments: [...state.skillAssessments, newAssessment].sort((a, b) => a.date.localeCompare(b.date)) });
  };

  // Funnel Data
  const funnelData = [
    { name: 'Applied', value: state.applications.filter(a => a.status !== 'Saved').length },
    { name: 'Screening', value: state.applications.filter(a => ['Screening', 'Assessment', 'Interview Scheduled', 'Interview Completed', 'Offer Received', 'Joined'].includes(a.status)).length },
    { name: 'Interview', value: state.applications.filter(a => ['Interview Scheduled', 'Interview Completed', 'Offer Received', 'Joined'].includes(a.status)).length },
    { name: 'Offer', value: state.applications.filter(a => ['Offer Received', 'Joined'].includes(a.status)).length },
  ];

  // Weekly Review Data (Current Week)
  const currentWeekLogs = state.studyLogs.filter(l => isSameWeek(new Date(l.date), new Date()));
  const currentWeekHours = currentWeekLogs.reduce((sum, l) => sum + l.actualHours, 0);
  const currentWeekApps = state.applications.filter(a => isSameWeek(new Date(a.appliedDate), new Date()) && a.status !== 'Saved').length;
  const currentWeekInterviews = state.interviews.filter(i => isSameWeek(new Date(i.date), new Date())).length;
  const currentWeekWeaknessesFixed = state.weaknesses.filter(w => (w.status === 'Fixed' || w.status === 'Mastered') && isSameWeek(new Date(w.dateIdentified), new Date())).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Analytics & Review</h1>
          <p className="text-muted">Measure what matters.</p>
        </div>
        <button className="btn btn-secondary" onClick={exportData}>Export Backup</button>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {/* Weekly Review */}
        <div className="card" style={{ gridColumn: 'span 1', backgroundColor: 'var(--bg-dark)' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Weekly Report</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Hours Studied</span>
              <span style={{ fontWeight: 600 }}>{currentWeekHours}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Applications Sent</span>
              <span style={{ fontWeight: 600 }}>{currentWeekApps}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Interviews Attended</span>
              <span style={{ fontWeight: 600 }}>{currentWeekInterviews}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-muted">Weaknesses Fixed</span>
              <span style={{ fontWeight: 600 }}>{currentWeekWeaknessesFixed}</span>
            </div>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '1rem' }}>Application Funnel</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" />
                <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                <Bar dataKey="value" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Skill Heatmap (Self-Assessment)</h3>
        
        <form onSubmit={handleAssessmentSubmit} className="grid grid-cols-4 gap-4" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--bg-dark)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h4 style={{ margin: 0 }}>Log Monthly Assessment</h4>
             <input type="month" className="input" style={{ width: 'auto' }} value={assessmentData.date} onChange={e => setAssessmentData({...assessmentData, date: e.target.value})} />
          </div>
          {['powerBi', 'sql', 'python', 'excel', 'vba', 'communication', 'interviewSkills'].map(skill => (
            <div key={skill}>
              <label className="text-sm text-muted capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}</label>
              <input type="number" min="1" max="10" className="input" value={(assessmentData as any)[skill]} onChange={e => setAssessmentData({...assessmentData, [skill]: Number(e.target.value)})} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Assessment</button>
          </div>
        </form>

        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={state.skillAssessments} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" />
              <YAxis domain={[0, 10]} stroke="var(--text-muted)" />
              <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              <Legend />
              <Line type="monotone" dataKey="powerBi" name="Power BI" stroke="#f2c811" strokeWidth={2} />
              <Line type="monotone" dataKey="sql" name="SQL" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="python" name="Python" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="interviewSkills" name="Interview" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
