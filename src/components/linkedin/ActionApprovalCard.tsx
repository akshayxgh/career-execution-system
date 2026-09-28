import React from 'react';
import {
  Check,
  X,
  Pencil,
  Sparkles,
  BookOpen,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';
import type { LinkedInAction } from '../../types/linkedin';

interface ActionApprovalCardProps {
  action: LinkedInAction;
  sourceConceptName?: string;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (action: LinkedInAction) => void;
  isProcessing?: boolean;
}

export const ActionApprovalCard: React.FC<ActionApprovalCardProps> = ({
  action,
  sourceConceptName,
  onApprove,
  onReject,
  onEdit,
  isProcessing = false,
}) => {
  const formattedDate = action.created_at
    ? new Date(action.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const isPending = action.status === 'PENDING_APPROVAL';

  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
        backgroundColor: 'var(--bg-card)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Top Header: Badge, Date, Proposed By */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              color: '#0284c7',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Send size={12} />
            {action.action_type}
          </span>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor:
                action.status === 'APPROVED'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : action.status === 'REJECTED'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
              color:
                action.status === 'APPROVED'
                  ? '#10b981'
                  : action.status === 'REJECTED'
                  ? '#ef4444'
                  : '#f59e0b',
              border: `1px solid ${
                action.status === 'APPROVED'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : action.status === 'REJECTED'
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(245, 158, 11, 0.3)'
              }`,
            }}
          >
            {action.status}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <Clock size={13} />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Source Concept indicator (if available) */}
      {(sourceConceptName || action.payload.topic) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <BookOpen size={15} style={{ color: 'var(--accent-primary)' }} />
          <span>
            Context Topic:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {sourceConceptName || action.payload.topic}
            </strong>
          </span>
        </div>
      )}

      {/* AI Reasoning Box */}
      {action.reasoning && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            fontSize: '0.825rem',
            color: 'var(--text-main)',
          }}
        >
          <Sparkles
            size={16}
            style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }}
          />
          <div>
            <span style={{ fontWeight: 600, color: '#8b5cf6' }}>AI Reasoning: </span>
            <span>{action.reasoning}</span>
          </div>
        </div>
      )}

      {/* Content Preview Block */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          fontSize: '0.925rem',
          lineHeight: '1.55',
          color: 'var(--text-main)',
          whiteSpace: 'pre-wrap',
          maxHeight: '340px',
          overflowY: 'auto',
          fontFamily: 'inherit',
        }}
      >
        {action.payload.content}
      </div>

      {/* Actions Row */}
      {isPending ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.65rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onReject(action.id)}
            disabled={isProcessing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#ef4444',
            }}
            title="Reject proposed action"
          >
            <X size={15} />
            <span>Reject</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onEdit(action)}
            disabled={isProcessing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Edit post draft"
          >
            <Pencil size={15} />
            <span>Edit Draft</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApprove(action.id)}
            disabled={isProcessing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Approve post for publication"
          >
            <Check size={16} />
            <span>Approve</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
            paddingTop: '0.4rem',
          }}
        >
          <AlertCircle size={14} />
          <span>
            Action marked as <strong>{action.status}</strong> on{' '}
            {action.reviewed_at
              ? new Date(action.reviewed_at).toLocaleDateString()
              : 'previously'}
            .
          </span>
        </div>
      )}
    </div>
  );
};
