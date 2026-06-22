import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Interview } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Search, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

export const Interviews = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<Interview>>({
    company: '', round: '', date: new Date().toISOString().split('T')[0],
    questionsAsked: [], answersGiven: [], mistakesMade: [], correctAnswers: [],
    lessonsLearned: [], confidenceRating: 5
  });

  const [tempListItems, setTempListItems] = useState({
    question: '', answer: '', mistake: '', correctAnswer: '', lesson: ''
  });

  const handleAddItem = (field: keyof typeof tempListItems, arrayField: keyof Interview) => {
    if (tempListItems[field].trim() === '') return;
    setFormData(prev => ({
      ...prev,
      [arrayField]: [...(prev[arrayField] as string[] || []), tempListItems[field]]
    }));
    setTempListItems(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemoveItem = (arrayField: keyof Interview, index: number) => {
    setFormData(prev => ({
      ...prev,
      [arrayField]: (prev[arrayField] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newInterview: Interview = {
      id: uuidv4(),
      ...(formData as Omit<Interview, 'id'>)
    };
    updateState({ interviews: [newInterview, ...state.interviews] });
    setShowForm(false);
    setFormData({
      company: '', round: '', date: new Date().toISOString().split('T')[0],
      questionsAsked: [], answersGiven: [], mistakesMade: [], correctAnswers: [],
      lessonsLearned: [], confidenceRating: 5
    });
  };

  const filteredInterviews = state.interviews.filter(i => 
    i.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.questionsAsked.some(q => q.toLowerCase().includes(searchTerm.toLowerCase())) ||
    i.lessonsLearned.some(l => l.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Interview Knowledge Base</h1>
          <p className="text-muted">Document every question, mistake, and lesson learned.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Log Interview'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Log Interview Experience</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted">Company</label>
                <input required className="input" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
              </div>
              <div>
                <label className="text-sm text-muted">Round</label>
                <input required className="input" placeholder="e.g. Technical Round 1" value={formData.round} onChange={e => setFormData({...formData, round: e.target.value})} />
              </div>
              <div>
                <label className="text-sm text-muted">Date</label>
                <input type="date" className="input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Questions Array */}
              <div>
                <label className="text-sm text-muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Questions Asked
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input className="input" value={tempListItems.question} onChange={e => setTempListItems({...tempListItems, question: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('question', 'questionsAsked'))} />
                  <button type="button" className="btn btn-secondary" onClick={() => handleAddItem('question', 'questionsAsked')}>Add</button>
                </div>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  {formData.questionsAsked?.map((q, idx) => (
                    <li key={idx}>
                      {q} <span style={{ cursor: 'pointer', color: 'var(--danger)', marginLeft: '0.5rem' }} onClick={() => handleRemoveItem('questionsAsked', idx)}>×</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mistakes Array */}
              <div>
                <label className="text-sm text-muted">Mistakes Made (Be brutally honest)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input className="input" value={tempListItems.mistake} onChange={e => setTempListItems({...tempListItems, mistake: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('mistake', 'mistakesMade'))} />
                  <button type="button" className="btn btn-secondary" onClick={() => handleAddItem('mistake', 'mistakesMade')}>Add</button>
                </div>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  {formData.mistakesMade?.map((m, idx) => (
                    <li key={idx}>
                      {m} <span style={{ cursor: 'pointer', color: 'var(--danger)', marginLeft: '0.5rem' }} onClick={() => handleRemoveItem('mistakesMade', idx)}>×</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lessons Array */}
              <div>
                <label className="text-sm text-muted">Lessons Learned</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input className="input" value={tempListItems.lesson} onChange={e => setTempListItems({...tempListItems, lesson: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem('lesson', 'lessonsLearned'))} />
                  <button type="button" className="btn btn-secondary" onClick={() => handleAddItem('lesson', 'lessonsLearned')}>Add</button>
                </div>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  {formData.lessonsLearned?.map((l, idx) => (
                    <li key={idx}>
                      {l} <span style={{ cursor: 'pointer', color: 'var(--danger)', marginLeft: '0.5rem' }} onClick={() => handleRemoveItem('lessonsLearned', idx)}>×</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confidence */}
              <div>
                <label className="text-sm text-muted">Confidence Rating (1-10)</label>
                <input type="number" min="1" max="10" className="input" value={formData.confidenceRating} onChange={e => setFormData({...formData, confidenceRating: Number(e.target.value)})} style={{ marginTop: '0.25rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Interview Data</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Knowledge Base Search</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '400px' }}>
            <Search size={18} className="text-muted" />
            <input 
              className="input" 
              placeholder="Search topics (e.g. Self Join, RLS)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredInterviews.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>No records found.</p>
          ) : filteredInterviews.map(interview => (
            <div key={interview.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{interview.company}</h4>
                  <span className="text-xs text-muted">{interview.round} | {interview.date}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-info">Confidence: {interview.confidenceRating}/10</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {interview.questionsAsked.length > 0 && (
                  <div>
                    <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--info)' }}><BookOpen size={14} /> Questions Asked</h5>
                    <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                      {interview.questionsAsked.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}
                {interview.mistakesMade.length > 0 && (
                  <div>
                    <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}><AlertCircle size={14} /> Mistakes</h5>
                    <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                      {interview.mistakesMade.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
                {interview.lessonsLearned.length > 0 && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}><CheckCircle size={14} /> Lessons Learned</h5>
                    <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
                      {interview.lessonsLearned.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
