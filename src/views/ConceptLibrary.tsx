import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Concept, ConceptStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Library, Search, Headphones, Link, FileText, ChevronDown, ChevronRight, Clock, MessageSquare, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownEditor = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .markdown-preview ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-preview ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-preview li { margin-bottom: 0.25rem; }
        .markdown-preview p { margin-bottom: 1rem; }
        .markdown-preview p:last-child { margin-bottom: 0; }
        .markdown-preview a { color: var(--accent-primary); text-decoration: underline; }
        .markdown-preview code { background-color: rgba(0,0,0,0.3); padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.85em; }
        .markdown-preview pre code { background-color: transparent; padding: 0; }
        .markdown-preview pre { background-color: rgba(0,0,0,0.3); padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; }
        .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 { font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--text-main); }
        .markdown-preview h1 { font-size: 1.5em; }
        .markdown-preview h2 { font-size: 1.25em; }
        .markdown-preview h3 { font-size: 1.1em; }
      `}</style>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-dark)' }}>
        <button type="button" onClick={() => setTab('write')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: tab === 'write' ? 'var(--bg-card)' : 'transparent', color: tab === 'write' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Write</button>
        <button type="button" onClick={() => setTab('preview')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', backgroundColor: tab === 'preview' ? 'var(--bg-card)' : 'transparent', color: tab === 'preview' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Preview</button>
      </div>
      <div style={{ backgroundColor: 'var(--bg-card)', minHeight: '160px', maxHeight: '360px', overflowY: 'auto' }}>
        {tab === 'write' ? (
          <textarea 
            className="textarea" 
            style={{ minHeight: '160px', border: 'none', borderRadius: 0, width: '100%', resize: 'none', outline: 'none', backgroundColor: 'transparent' }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <div style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.875rem', whiteSpace: 'normal' }} className="markdown-preview">
            {value ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown> : <span className="text-muted">Nothing to preview</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export const ConceptLibrary = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<Partial<Concept>>({
    name: '',
    learningDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    status: 'Planned',
    notebookLmResearchLink: '',
    notebookLmAudioLink: '',
    linkedinPostLink: '',
    notes: '',
    interviewQuestions: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newConcept: Concept = {
      id: uuidv4(),
      ...(formData as Omit<Concept, 'id'>)
    };
    const updatedConcepts = state.concepts ? [newConcept, ...state.concepts] : [newConcept];
    updateState({ concepts: updatedConcepts });
    setShowForm(false);
    setFormData({
      name: '',
      learningDate: new Date().toISOString().slice(0, 10),
      status: 'Planned',
      notebookLmResearchLink: '',
      notebookLmAudioLink: '',
      linkedinPostLink: '',
      notes: '',
      interviewQuestions: []
    });
  };

  const handleUpdateStatus = (id: string, newStatus: ConceptStatus) => {
    const updatedConcepts = state.concepts.map(c => 
      c.id === id ? { ...c, status: newStatus } : c
    );
    updateState({ concepts: updatedConcepts });
  };

  const toggleExpansion = (id: string) => {
    const newExpanded = new Set(expandedConcepts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedConcepts(newExpanded);
  };

  const addQuestion = () => {
    const newQs = [...(formData.interviewQuestions || []), { question: '', answer: '' }];
    setFormData({ ...formData, interviewQuestions: newQs });
  };

  const updateQuestion = (index: number, field: 'question' | 'answer', value: string) => {
    const newQs = [...(formData.interviewQuestions || [])];
    newQs[index] = { ...newQs[index], [field]: value };
    setFormData({ ...formData, interviewQuestions: newQs });
  };

  const removeQuestion = (index: number) => {
    const newQs = [...(formData.interviewQuestions || [])];
    newQs.splice(index, 1);
    setFormData({ ...formData, interviewQuestions: newQs });
  };

  const concepts = state.concepts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Library size={28} className="text-accent-primary" />
            Concept Library
          </h1>
          <p className="text-muted">Store and track concepts from the Data Industry Roadmap.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Concept'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Concept</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Concept Name</label>
              <input 
                required 
                className="input" 
                placeholder="e.g. OLTP vs OLAP" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-sm text-muted">Learning Date</label>
              <input 
                type="date" 
                required 
                className="input" 
                value={formData.learningDate} 
                onChange={e => setFormData({...formData, learningDate: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-sm text-muted">Status</label>
              <select 
                className="select" 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: e.target.value as ConceptStatus})}
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted">NotebookLM Research Link</label>
              <input 
                className="input" 
                placeholder="URL" 
                value={formData.notebookLmResearchLink} 
                onChange={e => setFormData({...formData, notebookLmResearchLink: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-sm text-muted">NotebookLM Audio Link</label>
              <input 
                className="input" 
                placeholder="URL" 
                value={formData.notebookLmAudioLink} 
                onChange={e => setFormData({...formData, notebookLmAudioLink: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-sm text-muted">LinkedIn Post Link</label>
              <input 
                className="input" 
                placeholder="URL" 
                value={formData.linkedinPostLink} 
                onChange={e => setFormData({...formData, linkedinPostLink: e.target.value})} 
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="text-sm text-muted">Key Takeaway / Notes</label>
              <div style={{ marginTop: '0.5rem' }}>
                <MarkdownEditor 
                  value={formData.notes || ''} 
                  onChange={(val) => setFormData({...formData, notes: val})} 
                  placeholder="Paste or write formatted notes (Markdown supported)..."
                />
              </div>
            </div>
            
            {/* Interview Questions Dynamic List */}
            <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="text-sm text-muted">Interview Questions (Optional)</label>
                <button type="button" onClick={addQuestion} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                  + Add Question
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {formData.interviewQuestions && formData.interviewQuestions.map((q, idx) => (
                  <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-dark)', borderRadius: '6px', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <button type="button" onClick={() => removeQuestion(idx)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Remove Question">
                      <Trash2 size={16} />
                    </button>
                    <div style={{ marginBottom: '1rem', paddingRight: '2rem' }}>
                      <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Question</label>
                      <input 
                        className="input" 
                        placeholder="e.g. What is the main bottleneck of HTAP architectures?" 
                        value={q.question} 
                        onChange={e => updateQuestion(idx, 'question', e.target.value)} 
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Key Answer Points / Cheatsheet</label>
                      <textarea 
                        className="textarea" 
                        rows={3} 
                        placeholder="e.g. Memory contention between OLTP writes and OLAP reads..." 
                        value={q.answer} 
                        onChange={e => updateQuestion(idx, 'answer', e.target.value)} 
                        style={{ width: '100%', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                ))}
                
                {(!formData.interviewQuestions || formData.interviewQuestions.length === 0) && (
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-dark)', borderRadius: '6px', border: '1px dashed var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No interview questions added yet. Click "+ Add Question" to start.
                  </div>
                )}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Concept</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {concepts.length === 0 ? (
          <p className="text-muted">No concepts added yet. Start building your library.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {concepts.map(concept => {
              const hasInterviewQuestions = (concept.interviewQuestions && concept.interviewQuestions.length > 0) || concept.interviewQuestion;
              
              return (
                <div key={concept.id} style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-card)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      {(concept.notes || hasInterviewQuestions) ? (
                        <div 
                          onClick={() => toggleExpansion(concept.id)}
                          style={{ cursor: 'pointer', marginTop: '4px', color: 'var(--text-muted)' }}
                        >
                          {expandedConcepts.has(concept.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      ) : (
                        <div style={{ width: '20px', height: '20px' }}></div>
                      )}
                      <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {concept.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={14} /> {concept.learningDate}
                          </span>
                          <span>•</span>
                          <select 
                            className="select" 
                            style={{ 
                              padding: '0.1rem 0.5rem', 
                              fontSize: '0.75rem', 
                              height: 'auto',
                              backgroundColor: concept.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                               concept.status === 'In Progress' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-dark)',
                              color: concept.status === 'Completed' ? 'var(--success)' : 
                                     concept.status === 'In Progress' ? 'var(--accent-primary)' : 'var(--text-muted)'
                            }} 
                            value={concept.status} 
                            onChange={e => handleUpdateStatus(concept.id, e.target.value as ConceptStatus)}
                          >
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {concept.notebookLmResearchLink && (
                        <a href={concept.notebookLmResearchLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} title="NotebookLM Research">
                          <Search size={16} />
                        </a>
                      )}
                      {concept.notebookLmAudioLink && (
                        <a href={concept.notebookLmAudioLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} title="NotebookLM Audio">
                          <Headphones size={16} />
                        </a>
                      )}
                      {concept.linkedinPostLink && (
                        <a href={concept.linkedinPostLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} title="LinkedIn Post">
                          <Link size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  {expandedConcepts.has(concept.id) && (
                    <div style={{ 
                      marginTop: '1rem', 
                      marginLeft: '2.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem'
                    }}>
                      {concept.notes && (
                        <div style={{ 
                          padding: '1rem', 
                          backgroundColor: 'var(--bg-dark)', 
                          borderRadius: '6px',
                          borderLeft: '2px solid var(--accent-primary)'
                        }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <FileText size={16} /> Key Takeaway / Notes
                          </h4>
                          <div style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            <div className="markdown-preview">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{concept.notes}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Render Legacy Single Interview Question */}
                      {concept.interviewQuestion && (
                        <div style={{ 
                          padding: '1rem', 
                          backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                          borderRadius: '6px',
                          borderLeft: '2px solid var(--info, #3b82f6)'
                        }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                            <MessageSquare size={16} /> Interview Question (Legacy)
                          </h4>
                          <div 
                            style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}
                            dangerouslySetInnerHTML={{ __html: concept.interviewQuestion }} 
                          />
                        </div>
                      )}

                      {/* Render New Interview Questions List */}
                      {concept.interviewQuestions && concept.interviewQuestions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <h4 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-main)' }}>
                            <MessageSquare size={16} /> Interview Prep
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {concept.interviewQuestions.map((q, idx) => (
                              <div key={idx} style={{ 
                                padding: '1rem', 
                                backgroundColor: 'var(--bg-dark)', 
                                borderRadius: '6px',
                                borderLeft: '2px solid var(--info, #3b82f6)'
                              }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                  Q: {q.question || 'Untitled Question'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                  {q.answer || 'No answer provided.'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
