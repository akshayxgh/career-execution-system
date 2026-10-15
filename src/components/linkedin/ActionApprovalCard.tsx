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
  UserPlus,
  MessageSquare,
  Users,
} from 'lucide-react';
import type { LinkedInAction } from '../../types/linkedin';

interface ActionApprovalCardProps {
  action: LinkedInAction;
  sourceConceptName?: string;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (action: LinkedInAction) => void;
  onPreparePublish?: (action: LinkedInAction) => void;
  isProcessing?: boolean;
}

export const ActionApprovalCard: React.FC<ActionApprovalCardProps> = ({
  action,
  sourceConceptName,
  onApprove,
  onReject,
  onEdit,
  onPreparePublish,
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

  const getActionTypeIcon = () => {
    switch (action.action_type) {
      case 'SEND_CONNECTION':
        return <UserPlus size={12} />;
      case 'COMMENT':
      case 'REPLY':
        return <MessageSquare size={12} />;
      case 'MESSAGE':
      case 'FOLLOW_UP':
        return <Users size={12} />;
      default:
        return <Send size={12} />;
    }
  };

  const getActionTypeStyle = () => {
    switch (action.action_type) {
      case 'SEND_CONNECTION':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'COMMENT':
      case 'REPLY':
        return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
      case 'MESSAGE':
      case 'FOLLOW_UP':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      default:
        return { bg: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', border: 'rgba(2, 132, 199, 0.3)' };
    }
  };

  const actionStyle = getActionTypeStyle();

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
              backgroundColor: actionStyle.bg,
              color: actionStyle.color,
              border: `1px solid ${actionStyle.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            {getActionTypeIcon()}
            {action.action_type.replace('_', ' ')}
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

      {/* Recipient / Target Context if available */}
      {action.payload.recipient_name && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <Users size={15} style={{ color: '#10b981' }} />
          <span>
            Recipient:{' '}
            <strong style={{ color: 'var(--text-main)' }}>
              {action.payload.recipient_name}
            </strong>
            {action.payload.recipient_role ? ` • ${action.payload.recipient_role}` : ''}
            {action.payload.company ? ` at ${action.payload.company}` : ''}
          </span>
        </div>
      )}

      {/* Source Concept / Topic indicator */}
      {(sourceConceptName || action.payload.topic) && !action.payload.recipient_name && (
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
      ) : action.status === 'APPROVED' || action.status === 'READY_FOR_MANUAL' ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.825rem',
              color: '#10b981',
            }}
          >
            <Check size={15} />
            <span>Approved by human reviewer</span>
          </div>

          {onPreparePublish && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onPreparePublish(action)}
              disabled={isProcessing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#0284c7',
                borderColor: '#0284c7',
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
              }}
            >
              <Send size={14} />
              <span>
                {action.status === 'READY_FOR_MANUAL'
                  ? 'Complete Manual Action'
                  : action.action_type === 'SEND_CONNECTION'
                  ? 'Send Connection Request'
                  : action.action_type === 'COMMENT'
                  ? 'Post Comment'
                  : action.action_type === 'MESSAGE' || action.action_type === 'FOLLOW_UP'
                  ? 'Send Message'
                  : 'Publish on LinkedIn'}
              </span>
            </button>
          )}
        </div>
      ) : action.status === 'EXECUTED' ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.825rem',
              color: '#10b981',
              fontWeight: 500,
            }}
          >
            <Check size={15} strokeWidth={2.5} />
            <span>
              {action.action_type === 'SEND_CONNECTION'
                ? `Invitation Sent on LinkedIn ${action.executed_at ? `on ${new Date(action.executed_at).toLocaleDateString()}` : ''}`
                : action.action_type === 'COMMENT'
                ? `Comment Posted on LinkedIn ${action.executed_at ? `on ${new Date(action.executed_at).toLocaleDateString()}` : ''}`
                : `Executed on LinkedIn ${action.executed_at ? `on ${new Date(action.executed_at).toLocaleDateString()}` : ''}`}
            </span>
          </div>

          {action.payload.post_url && (
            <a
              href={String(action.payload.post_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                color: '#0284c7',
                padding: '0.3rem 0.65rem',
                textDecoration: 'none',
              }}
            >
              <span>View Post</span>
            </a>
          )}
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
