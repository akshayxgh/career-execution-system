import {
  uploadDocument,
  getDocuments,
  getDocumentUrl,
  mapDocument,
  deleteDocument as deleteDocumentService,
} from "../services/documentService";
import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import type { DocumentRecord } from '../types';

export const Documents = () => {
  const {} = useStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [formData, setFormData] = useState<Partial<DocumentRecord>>({
    docName: '',
    documentNo: '',
    issueDate: '',
    storagePath: '',
    fileName: '',
    fileSize: 0,
    mimeType: ''
  });
  
  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const data = await getDocuments();
      setDocuments(data.map(mapDocument));
    } catch (err) {
      console.error(err);
    }
  }

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter(document =>
      document.docName.toLowerCase().includes(query) ||
      document.documentNo.toLowerCase().includes(query)
    );
  }, [documents, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Please select a file.");
      return;
    }

    try {
      await uploadDocument(
        selectedFile,
        formData.docName?.trim() || "",
        formData.documentNo?.trim(),
        formData.issueDate
      );
      await loadDocuments();
      alert("Document uploaded successfully.");

      setShowForm(false);
      setSelectedFile(null);

      setFormData({
        docName: "",
        documentNo: "",
        issueDate: "",
        storagePath: "",
        fileName: "",
        fileSize: 0,
        mimeType: "",
      });

    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }
  };
  const openDocument = async (storagePath: string) => {
    console.log("Storage Path:", storagePath);

    try {
      const url = await getDocumentUrl(storagePath);
      window.open(url, "_blank");
    } catch (err) {
      console.error(err);
      alert(JSON.stringify(err));
    }
  };
    const deleteDocument = async (id: string, storagePath: string) => {
      if (!confirm("Delete this document?")) return;

      try {
        await deleteDocumentService(id, storagePath);
        loadDocuments();
      } catch (err) {
        console.error(err);
        alert("Delete failed.");
      }
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
              <label className="text-sm text-muted">Document File</label>
                <input
                  type="file"
                  className="input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    if (file.size > 10 * 1024 * 1024) {
                      alert("Maximum file size is 10 MB.");
                      e.target.value = "";
                      return;
                    }

                    setSelectedFile(file);
                  }}
                />
                {selectedFile && (
                  <p className="text-sm text-muted" style={{ marginTop: "0.5rem" }}>
                    Selected: {selectedFile.name}
                  </p>
                )}
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
                      <button
                        className="btn btn-secondary"
                        onClick={() => openDocument(document.storagePath)}
                      >
                      <ExternalLink size={16} /> Open
                    </button>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => deleteDocument(document.id, document.storagePath)}
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
