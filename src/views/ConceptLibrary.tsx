import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { Concept, ConceptStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Library, Search, Headphones, Link, FileText, ChevronDown, ChevronRight, Clock } from 'lucide-react';

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
    notes: ''
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
      notes: ''
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
              <textarea 
                className="textarea" 
                rows={3} 
                placeholder='e.g. "OLTP helps run the business; OLAP helps understand the business."'
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
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
            {concepts.map(concept => (
              <div key={concept.id} style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: 'var(--bg-card)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div 
                      onClick={() => toggleExpansion(concept.id)}
                      style={{ cursor: 'pointer', marginTop: '4px', color: 'var(--text-muted)' }}
                    >
                      {expandedConcepts.has(concept.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
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

                {expandedConcepts.has(concept.id) && concept.notes && (
                  <div style={{ 
                    marginTop: '1rem', 
                    marginLeft: '2.5rem',
                    padding: '1rem', 
                    backgroundColor: 'rgba(0,0,0,0.2)', 
                    borderRadius: '6px',
                    borderLeft: '2px solid var(--accent-primary)'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <FileText size={16} /> Key Takeaway
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                      {concept.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
