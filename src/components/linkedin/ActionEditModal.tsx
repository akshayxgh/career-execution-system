import React, { useState, useEffect } from 'react';
import { X, Check, FileEdit, AlertCircle } from 'lucide-react';
import type { LinkedInAction } from '../../types/linkedin';

interface ActionEditModalProps {
  action: LinkedInAction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedContent: string) => Promise<void>;
}

export const ActionEditModal: React.FC<ActionEditModalProps> = ({
  action,
  isOpen,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (action) {
      setContent(action.payload.content || '');
      setError(null);
    }
  }, [action]);

  if (!isOpen || !action) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Content cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(action.id, content.trim());
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save changes.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileEdit size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
              Edit LinkedIn Draft
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            style={{ padding: '0.35rem 0.5rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Topic: <strong style={{ color: 'var(--text-main)' }}>{action.payload.topic || 'General Technical Insight'}</strong>
          </span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Edits will be saved while maintaining <code>PENDING_APPROVAL</code> status until explicitly approved.
          </p>
        </div>

        <div style={{ flex: 1, minHeight: '260px', marginBottom: '1.25rem' }}>
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={saving}
            rows={12}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '260px',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-dark)',
              color: 'var(--text-main)',
              resize: 'vertical',
            }}
            placeholder="Write or refine the LinkedIn post copy here..."
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '0.75rem',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Check size={16} />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
