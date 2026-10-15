import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  Clock,
  CheckCircle2,
  Send,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Bot,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { linkedinAgentService } from '../../services/linkedinAgentService';
import type { LinkedInAction } from '../../types/linkedin';

export const LinkedInAgentWidget: React.FC = () => {
  const navigate = useNavigate();
  const [actions, setActions] = useState<LinkedInAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const data = await linkedinAgentService.fetchActions();
      setActions(data);
    } catch (err) {
      console.error('Failed to fetch LinkedIn actions in widget:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const pendingActions = actions.filter((a) => a.status === 'PENDING_APPROVAL');
  const readyActions = actions.filter(
    (a) => a.status === 'APPROVED' || a.status === 'READY_FOR_MANUAL'
  );
  const executedActions = actions.filter((a) => a.status === 'EXECUTED');

  const latestPending = pendingActions[0] || null;

  const handleQuickApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(id);
      await linkedinAgentService.approveAction(id);
      await fetchActions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve action';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        borderLeft: '4px solid #0a66c2',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Banner / Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, rgba(10, 102, 194, 0.2), rgba(10, 102, 194, 0.05))',
              border: '1px solid rgba(10, 102, 194, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a66c2',
            }}
          >
            <Share2 size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                LinkedIn AI Agent Surveillance
              </h3>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                />
                Autonomous Cloud Ready
              </span>
            </div>
            <p
              className="text-muted"
              style={{ margin: 0, fontSize: '0.75rem', marginTop: '0.15rem' }}
            >
              MYCES Concept-to-Post pipeline • Human Approval Guardrail Active
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={fetchActions}
            className="btn btn-secondary"
            title="Refresh Status"
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/linkedin-agent')}
            className="btn btn-primary"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#0a66c2',
              borderColor: '#0a66c2',
            }}
          >
            <span>Open Agent</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <div
          onClick={() => navigate('/linkedin-agent')}
          style={{
            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.65rem 0.85rem',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
            <Clock size={14} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Needs Review</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>
            {loading ? '...' : pendingActions.length}
          </div>
        </div>

        <div
          onClick={() => navigate('/linkedin-agent')}
          style={{
            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.65rem 0.85rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7' }}>
            <CheckCircle2 size={14} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Ready to Publish</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>
            {loading ? '...' : readyActions.length}
          </div>
        </div>

        <div
          onClick={() => navigate('/linkedin-agent')}
          style={{
            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.65rem 0.85rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
            <Send size={14} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Published</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.2rem' }}>
            {loading ? '...' : executedActions.length}
          </div>
        </div>
      </div>

      {/* Focus Area: Latest Pending Draft or Status Callout */}
      {latestPending ? (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '0.625rem',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                Latest AI Proposed Draft
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                }}
              >
                {latestPending.proposed_by === 'agent' ? 'Autonomous Cloud Agent' : 'Human Copilot'}
              </span>
            </div>

            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {new Date(latestPending.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {latestPending.payload.topic || 'Technical Concept Breakdown'}
          </div>

          <p
            style={{
              fontSize: '0.775rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontStyle: 'italic',
            }}
          >
            "{latestPending.payload.content}"
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.25rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(245, 158, 11, 0.15)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Requires human approval before publication
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => navigate('/linkedin-agent')}
                className="btn btn-secondary"
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>Review & Edit</span>
                <ChevronRight size={13} />
              </button>
              <button
                onClick={(e) => handleQuickApprove(latestPending.id, e)}
                disabled={actionLoading === latestPending.id}
                className="btn btn-primary"
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  background: '#10b981',
                  borderColor: '#10b981',
                }}
              >
                {actionLoading === latestPending.id ? 'Approving...' : 'Quick Approve'}
              </button>
            </div>
          </div>
        </div>
      ) : readyActions.length > 0 ? (
        <div
          style={{
            background: 'rgba(2, 132, 199, 0.05)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '0.625rem',
            padding: '0.85rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0284c7' }}>
              {readyActions.length} Approved Post{readyActions.length > 1 ? 's' : ''} Ready to Publish
            </div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              Posts have been reviewed and are ready for manual execution via LinkedIn.
            </div>
          </div>
          <button
            onClick={() => navigate('/linkedin-agent')}
            className="btn btn-primary"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              background: '#0284c7',
              borderColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span>Publish Now</span>
            <ExternalLink size={13} />
          </button>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-secondary, rgba(255, 255, 255, 0.02))',
            border: '1px dashed var(--border-color)',
            borderRadius: '0.625rem',
            padding: '0.85rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Queue clear. The autonomous agent runs daily, or you can draft instantly.
            </span>
          </div>
          <button
            onClick={() => navigate('/linkedin-agent')}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.65rem', fontSize: '0.725rem' }}
          >
            Draft Concept Post
          </button>
        </div>
      )}
    </div>
  );
};
