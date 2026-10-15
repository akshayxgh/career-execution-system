import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Share2,
  CheckCircle2,
  UserPlus,
  MessageSquare,
  Send,
} from 'lucide-react';
import type { LinkedInAction } from '../../types/linkedin';

interface ManualExecutionModalProps {
  action: LinkedInAction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublished: (
    actionId: string,
    url?: string,
    conceptId?: string | null
  ) => Promise<void>;
}

export const ManualExecutionModal: React.FC<ManualExecutionModalProps> = ({
  action,
  isOpen,
  onClose,
  onConfirmPublished,
}) => {
  const [copied, setCopied] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !action) return null;

  const actionType = action.action_type;
  const isPost = actionType === 'PUBLISH_POST';
  const isConnection = actionType === 'SEND_CONNECTION';
  const isComment = actionType === 'COMMENT';
  const isMessage = actionType === 'MESSAGE' || actionType === 'FOLLOW_UP';

  const charCount = (action.payload.content || '').length;
  const isConnectionOverLimit = isConnection && charCount > 300;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(action.payload.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Failed to copy to clipboard. Please copy manually.');
    }
  };

  const handleOpenLinkedIn = () => {
    if (isPost) {
      window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer');
    } else if (isConnection || isMessage) {
      const targetUrl = action.payload.recipient_profile_url || action.payload.target_url || 'https://www.linkedin.com/mynetwork/';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else if (isComment) {
      const targetUrl = action.payload.target_url || action.payload.post_url || 'https://www.linkedin.com/feed/';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://www.linkedin.com/', '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirm = async () => {
    if (isPost && !linkedinUrl.trim()) {
      setError('Please paste the URL of your published LinkedIn post to maintain verification.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmPublished(
        action.id,
        linkedinUrl.trim() || undefined,
        action.payload.concept_id
      );
      setLinkedinUrl('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm execution.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalTitle = () => {
    if (isPost) return 'Manual Post Execution';
    if (isConnection) return 'Send Personalized Connection Request';
    if (isComment) return 'Post Discussion Comment';
    if (isMessage) return 'Send Direct Outreach Message';
    return 'Manual Action Execution';
  };

  const getModalIcon = () => {
    if (isPost) return <Share2 size={20} color="#0a66c2" />;
    if (isConnection) return <UserPlus size={20} color="#10b981" />;
    if (isComment) return <MessageSquare size={20} color="#8b5cf6" />;
    return <Send size={20} color="#0284c7" />;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-primary, #1e293b)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.85rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(10, 102, 194, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getModalIcon()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {getModalTitle()}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Zero fake automation • Verified human-in-the-loop completion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            overflowY: 'auto',
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.825rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient / Target Metadata if applicable */}
          {(action.payload.recipient_name || action.payload.company || action.payload.target_url) && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem 1rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
              }}
            >
              {action.payload.recipient_name && (
                <div>
                  <span className="text-muted">Target: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{action.payload.recipient_name}</strong>
                  {action.payload.recipient_role ? ` (${action.payload.recipient_role})` : ''}
                </div>
              )}
              {action.payload.company && (
                <div>
                  <span className="text-muted">Company: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{action.payload.company}</strong>
                </div>
              )}
              {action.payload.recipient_profile_url && (
                <a
                  href={action.payload.recipient_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0a66c2', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <span>Profile Link</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Step 1: Copy Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Step 1: Copy {isConnection ? 'Connection Note' : isComment ? 'Comment' : 'Approved Text'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: isConnectionOverLimit ? '#ef4444' : 'var(--text-muted)',
                }}
              >
                {charCount} {isConnection ? '/ 300 characters' : 'characters'}
              </span>
            </div>

            {isConnectionOverLimit && (
              <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                ⚠️ LinkedIn connection notes are limited to 300 characters. Please edit the draft before sending.
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <textarea
                readOnly
                value={action.payload.content || ''}
                rows={isConnection ? 4 : 8}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '2.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary, rgba(0, 0, 0, 0.2))',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  lineHeight: '1.45',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary"
                title="Copy to clipboard"
                style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.6rem',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  backgroundColor: copied ? '#10b981' : undefined,
                  color: copied ? '#ffffff' : undefined,
                  borderColor: copied ? '#10b981' : undefined,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Open LinkedIn */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Step 2: Open LinkedIn & Perform Action
            </span>
            <button
              type="button"
              onClick={handleOpenLinkedIn}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderColor: '#0a66c2',
                color: '#0a66c2',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <span>
                {isPost
                  ? 'Open LinkedIn Post Composer'
                  : isConnection
                  ? 'Open Recipient LinkedIn Profile'
                  : isComment
                  ? 'Open Target LinkedIn Post'
                  : 'Open LinkedIn'}
              </span>
              <ExternalLink size={15} />
            </button>
          </div>

          {/* Step 3: Confirmation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Step 3: {isPost ? 'Paste Post URL & Confirm Execution' : 'Confirm Action Executed'}
            </span>

            {isPost ? (
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/posts/your-handle_..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary, rgba(0, 0, 0, 0.2))',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Once you have performed the action on LinkedIn, click below to mark this proposal as executed and update your networking timeline.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || (isPost && !linkedinUrl.trim())}
            className="btn btn-primary"
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.85rem',
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isSubmitting ? (
              <span>Confirming...</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>
                  {isPost
                    ? 'Mark as Executed & Sync'
                    : isConnection
                    ? 'Mark Invitation Sent'
                    : 'Mark Completed'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
