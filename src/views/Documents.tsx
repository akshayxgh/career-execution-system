import React, { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ExternalLink, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { DocumentRecord } from '../types';

export const Documents = () => {
  const { state, updateState } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<DocumentRecord>>({
    docName: '',
    documentNo: '',
    issueDate: '',
    directLink: ''
  });

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return state.documents;

    return state.documents.filter(document =>
      document.docName.toLowerCase().includes(query) ||
      document.documentNo.toLowerCase().includes(query)
    );
  }, [state.documents, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDocument: DocumentRecord = {
      id: uuidv4(),
      docName: formData.docName?.trim() || '',
      documentNo: formData.documentNo?.trim() || '',
      issueDate: formData.issueDate || '',
      directLink: formData.directLink?.trim() || ''
    };

    updateState({ documents: [newDocument, ...state.documents] });
    setShowForm(false);
    setFormData({
      docName: '',
      documentNo: '',
      issueDate: '',
      directLink: ''
    });
  };

  const deleteDocument = (id: string) => {
    updateState({ documents: state.documents.filter(document => document.id !== id) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Documents</h1>
          <p className="text-muted">Store Dropbox links and find documents by name or ID number.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Document'}
        </button>
      </header>

      {showForm && (
        <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add Document</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted">Doc Name</label>
              <input
                required
                className="input"
                value={formData.docName}
                onChange={e => setFormData({ ...formData, docName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted">ID No.</label>
              <input
                required
                className="input"
                value={formData.documentNo}
                onChange={e => setFormData({ ...formData, documentNo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted">Issue Date</label>
              <input
                type="date"
                className="input"
                value={formData.issueDate}
                onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted">Dropbox Link</label>
              <input
                required
                type="url"
                className="input"
                placeholder="https://www.dropbox.com/..."
                value={formData.directLink}
                onChange={e => setFormData({ ...formData, directLink: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Document</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={20} className="text-muted" />
          <input
            className="input"
            placeholder="Search by document name or ID no..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ minHeight: '3rem', fontSize: '1rem' }}
          />
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--accent-primary)' }}>
                <th style={{ padding: '1rem' }}>Doc Name</th>
                <th style={{ padding: '1rem' }}>ID No.</th>
                <th style={{ padding: '1rem' }}>Issue Date</th>
                <th style={{ padding: '1rem' }}>Direct Link</th>
                <th style={{ padding: '1rem', width: '72px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={24} style={{ marginBottom: '0.5rem' }} />
                    <div>No documents found.</div>
                  </td>
                </tr>
              ) : filteredDocuments.map(document => (
                <tr key={document.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{document.docName}</td>
                  <td style={{ padding: '1rem' }}>{document.documentNo}</td>
                  <td style={{ padding: '1rem' }}>{document.issueDate || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <a
                      href={document.directLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      title="Open document"
                    >
                      <ExternalLink size={16} /> Open
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => deleteDocument(document.id)}
                      title="Delete document"
                      aria-label={`Delete ${document.docName}`}
                      style={{ padding: '0.5rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
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
