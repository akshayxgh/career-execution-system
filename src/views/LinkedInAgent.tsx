import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Share2,
  Sparkles,
  RefreshCw,
  BookOpen,
  Send,
  CheckCircle2,
  Check,
  CheckCheck,
  Filter,
  Users,
  Briefcase,
  Layers,
  TrendingUp,
  Zap,
  LayoutGrid,
  List,
  ExternalLink,
  Pencil,
  X,
  Building2,
} from 'lucide-react';
import { linkedinAgentService } from '../services/linkedinAgentService';
import { ActionApprovalCard } from '../components/linkedin/ActionApprovalCard';
import { ActionEditModal } from '../components/linkedin/ActionEditModal';
import { ManualExecutionModal } from '../components/linkedin/ManualExecutionModal';
import { NetworkingTab } from '../components/linkedin/NetworkingTab';
import { CompanyRadarTab } from '../components/linkedin/CompanyRadarTab';
import { OpportunitiesTab } from '../components/linkedin/OpportunitiesTab';
import { AnalyticsMemoryTab } from '../components/linkedin/AnalyticsMemoryTab';
import { LearnInPublicCopilotTab } from '../components/linkedin/LearnInPublicCopilotTab';
import type {
  LinkedInAction,
  AgentContentContext,
  AgentNetworkingContext,
  LinkedInPerson,
  LinkedInOpportunity,
  AnalyticsDashboardSummary,
  ActionStatus,
} from '../types/linkedin';

export const LinkedInAgent: React.FC = () => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'content' | 'networking' | 'radar' | 'opportunities' | 'approvals' | 'analytics'>('content');

  // Context & Content state
  const [contentContext, setContentContext] = useState<AgentContentContext | null>(null);
  const [networkingContext, setNetworkingContext] = useState<AgentNetworkingContext | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsDashboardSummary | null>(null);
  const [people, setPeople] = useState<LinkedInPerson[]>([]);
  const [opportunities, setOpportunities] = useState<LinkedInOpportunity[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  // Actions / Approvals state
  const [actions, setActions] = useState<LinkedInAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'ALL'>('PENDING_APPROVAL');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Approvals Redesign State (Split Reviewer & Batch Approval)
  const [approvalsViewMode, setApprovalsViewMode] = useState<'split' | 'stream'>('split');
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [inspectorDraft, setInspectorDraft] = useState<string>('');
  const [isSavingInspectorDraft, setIsSavingInspectorDraft] = useState(false);
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Modals state
  const [editingAction, setEditingAction] = useState<LinkedInAction | null>(null);
  const [publishingAction, setPublishingAction] = useState<LinkedInAction | null>(null);

  // Initial data loading
  const refreshAll = useCallback(async () => {
    setLoadingContext(true);
    setLoadingActions(true);
    try {
      const [cCtx, nCtx, acts, ppl, opps, aSummary] = await Promise.all([
        linkedinAgentService.fetchContentContext().catch(() => null),
        linkedinAgentService.fetchNetworkingContext().catch(() => null),
        linkedinAgentService.fetchActions(statusFilter === 'ALL' ? undefined : statusFilter).catch(() => []),
        linkedinAgentService.fetchPeople().catch(() => []),
        linkedinAgentService.fetchOpportunities().catch(() => []),
        linkedinAgentService.fetchAnalyticsSummary().catch(() => null),
      ]);

      if (cCtx) {
        setContentContext(cCtx);
      }
      if (nCtx) setNetworkingContext(nCtx);
      setActions(acts);
      setPeople(ppl);
      setOpportunities(opps);
      if (aSummary) setAnalyticsSummary(aSummary);
    } catch (err: unknown) {
      console.error('Failed to refresh LinkedIn Agent:', err);
    } finally {
      setLoadingContext(false);
      setLoadingActions(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const refreshActions = useCallback(async () => {
    try {
      const filter = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await linkedinAgentService.fetchActions(filter);
      setActions(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load actions.';
      setActionError(message);
    }
  }, [statusFilter]);

  const conceptMap = useMemo(() => {
    const map = new Map<string, string>();
    (contentContext?.concepts || []).forEach((c) => {
      map.set(c.id, c.name);
    });
    return map;
  }, [contentContext]);

  const pendingApprovalsCount = useMemo(() => {
    const pending = actions.filter((a) => a.status === 'PENDING_APPROVAL');
    const seen = new Set<string>();
    return pending.filter((a) => {
      const key = `${a.action_type}-${a.target_id || a.payload?.recipient_name || a.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).length;
  }, [actions]);

  // Approval Handlers
  const handleApprove = async (id: string) => {
    try {
      setActionProcessingId(id);
      await linkedinAgentService.approveAction(id);
      await refreshActions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve action.';
      alert(msg);
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionProcessingId(id);
      await linkedinAgentService.rejectAction(id);
      await refreshActions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject action.';
      alert(msg);
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleSaveEdit = async (id: string, updatedContent: string) => {
    await linkedinAgentService.updateActionContent(id, updatedContent);
    await refreshActions();
  };

  const handleOpenPublish = async (action: LinkedInAction) => {
    try {
      if (action.status === 'APPROVED') {
        const updated = await linkedinAgentService.prepareManualExecution(action.id);
        setPublishingAction(updated);
        await refreshActions();
      } else {
        setPublishingAction(action);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to prepare execution.';
      alert(msg);
    }
  };

  const handleConfirmPublished = async (
    actionId: string,
    url?: string,
    conceptId?: string | null
  ) => {
    await linkedinAgentService.confirmPublished({
      action_id: actionId,
      linkedin_url: url,
      concept_id: conceptId,
    });
    await refreshAll();
  };

  // Filter actions by type and defensively deduplicate by recipient
  const filteredActions = useMemo(() => {
    const list = actions.filter((act) => {
      if (actionTypeFilter === 'ALL') return true;
      return act.action_type === actionTypeFilter;
    });

    const seen = new Set<string>();
    return list.filter((act) => {
      const key = `${act.action_type}-${act.target_id || act.payload?.recipient_name || act.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [actions, actionTypeFilter]);

  const [networkingFilterPill, setNetworkingFilterPill] = useState<'ALL' | 'RECRUITERS' | 'INTRO_SENT' | 'PENDING_INVITES' | 'CONNECTED' | 'CONNECTED_TODAY'>('ALL');

  const checkIsRecruiterPerson = (p?: LinkedInPerson | null): boolean => {
    if (!p) return false;
    const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : (typeof p.tags === 'string' ? p.tags : '');
    const text = `${p.role || ''} ${p.headline || ''} ${tagsStr}`.toLowerCase();
    return (
      text.includes('recruiter') ||
      text.includes('talent acquisition') ||
      text.includes('hiring') ||
      text.includes('sourcer') ||
      text.includes('staffing') ||
      text.includes('human resources') ||
      text.includes('hrbp')
    );
  };

  // Today's Routine Pulse stats (5 Peers + 2 Recruiter Invites + 2 Recruiter Intros + Connected Today)
  // Strictly isolated to today's data (UTC and local day)
  const routineStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLocalStr = new Date().toLocaleDateString('en-CA');
    const safeActions = Array.isArray(actions) ? actions : [];
    const safePeople = Array.isArray(people) ? people : [];

    // 1. Sent Connection Requests Today (strictly today only):
    const sentActionsToday = safeActions.filter((a) => {
      if (!a || a.action_type !== 'SEND_CONNECTION') return false;
      const aDate = (a.executed_at || a.created_at || '').split('T')[0];
      return aDate === todayStr || aDate === todayLocalStr;
    });

    const sentPeopleToday = safePeople.filter((p) => {
      if (!p) return false;
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const invTag = tags.find((t) => typeof t === 'string' && t.startsWith('Invited:'));
      if (invTag && (invTag.includes(todayStr) || invTag.includes(todayLocalStr))) return true;

      const pCreateDate = (p.created_at || '').split('T')[0];
      const pInteractDate = (p.last_interaction_at || '').split('T')[0];

      // If created today and invited/connected:
      if (
        (pCreateDate === todayStr || pCreateDate === todayLocalStr) &&
        ['INVITATION_SENT', 'CONNECTED'].includes(p.connection_status)
      ) {
        return true;
      }

      // If invitation was sent today:
      if (
        p.connection_status === 'INVITATION_SENT' &&
        (pInteractDate === todayStr || pInteractDate === todayLocalStr)
      ) {
        return true;
      }

      return false;
    });

    const sentRecruiters = sentPeopleToday.filter(checkIsRecruiterPerson).length;
    const sentPeers = sentPeopleToday.filter((p) => !checkIsRecruiterPerson(p)).length;
    const totalSent = Math.max(sentActionsToday.length, sentPeopleToday.length);
    const peerInvitesSent = Math.max(sentPeers, totalSent - sentRecruiters);
    const recruiterInvitesSent = sentRecruiters;

    // 2. Recruiter Intros Dispatched Today (strictly today only):
    const introActionsToday = safeActions.filter((a) => {
      if (!a || (a.action_type !== 'FOLLOW_UP' && (a.action_type as string) !== 'MESSAGE')) return false;
      if (!['EXECUTED', 'APPROVED', 'READY_FOR_MANUAL'].includes(a.status)) return false;
      const aDate = (a.executed_at || a.updated_at || a.created_at || '').split('T')[0];
      return aDate === todayStr || aDate === todayLocalStr;
    });
    const introPeopleToday = safePeople.filter((p) => {
      if (!p) return false;
      const tags = Array.isArray(p.tags) ? p.tags : [];
      if (!tags.includes('Intro Sent')) return false;
      const pInteract = (p.last_interaction_at || '').split('T')[0];
      return pInteract === todayStr || pInteract === todayLocalStr;
    });
    const introsDispatched = Math.max(introActionsToday.length, introPeopleToday.length);

    // 3. Connected / Accepted Today (strictly today only):
    const connectedTodayList = safePeople.filter((p) => {
      if (!p || p.connection_status !== 'CONNECTED') return false;
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const tag = tags.find((t) => typeof t === 'string' && t.startsWith('Connected:'));
      if (tag && (tag.includes(todayStr) || tag.includes(todayLocalStr))) return true;

      const pInteract = (p.last_interaction_at || '').split('T')[0];
      if (pInteract === todayStr || pInteract === todayLocalStr) return true;

      const pDate = (p.created_at || '').split('T')[0];
      if (pDate === todayStr || pDate === todayLocalStr) return true;
      return false;
    });

    const connectedToday = connectedTodayList.length;
    const connectedRecruitersToday = connectedTodayList.filter(checkIsRecruiterPerson).length;
    const connectedPeersToday = connectedToday - connectedRecruitersToday;

    // Targets: 5 Peers + 2 Recruiter Invites + 2 Recruiter Intros
    const peerTarget = 5;
    const recruiterInviteTarget = 2;
    const recruiterTarget = 2;
    const totalTarget = peerTarget + recruiterInviteTarget + recruiterTarget;
    const totalDispatched =
      Math.min(peerInvitesSent, peerTarget) +
      Math.min(recruiterInvitesSent, recruiterInviteTarget) +
      Math.min(introsDispatched, recruiterTarget);
    const percentComplete = Math.min(Math.round((totalDispatched / totalTarget) * 100), 100);

    return {
      peerInvitesSent,
      peerTarget,
      recruiterInvitesSent,
      recruiterInviteTarget,
      introsDispatched,
      recruiterTarget,
      totalDispatched,
      totalTarget,
      percentComplete,
      connectedToday,
      connectedRecruitersToday,
      connectedPeersToday,
    };
  }, [people, actions]);

  // Active action for split-pane reviewer
  const activeAction = useMemo(() => {
    if (filteredActions.length === 0) return null;
    return filteredActions.find((a) => a.id === selectedActionId) || filteredActions[0];
  }, [filteredActions, selectedActionId]);

  useEffect(() => {
    if (activeAction) {
      setInspectorDraft(activeAction.payload.content || '');
      if (selectedActionId !== activeAction.id) {
        setSelectedActionId(activeAction.id);
      }
    }
  }, [activeAction?.id]);

  const handleSaveInspectorDraft = async () => {
    if (!activeAction) return;
    try {
      setIsSavingInspectorDraft(true);
      await linkedinAgentService.updateActionContent(activeAction.id, inspectorDraft);
      await refreshActions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save edits';
      alert(msg);
    } finally {
      setIsSavingInspectorDraft(false);
    }
  };

  const handleApproveAllPending = async () => {
    const pendingActions = filteredActions.filter((a) => a.status === 'PENDING_APPROVAL');
    if (pendingActions.length === 0) return;
    if (!confirm(`Batch-approve all ${pendingActions.length} pending action(s)?`)) return;

    try {
      setIsBatchApproving(true);
      await Promise.allSettled(
        pendingActions.map((action) => linkedinAgentService.approveAction(action.id))
      );
      await refreshActions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to batch approve actions.';
      setActionError(msg);
    } finally {
      setIsBatchApproving(false);
    }
  };

  // Keyboard shortcut: Ctrl+Enter to approve active draft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (activeTab === 'approvals' && activeAction && activeAction.status === 'PENDING_APPROVAL') {
          e.preventDefault();
          handleApprove(activeAction.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeAction]);

  // Unique organizations count for primary Company Radar tab pill
  const uniqueCompaniesCount = useMemo(() => {
    const set = new Set<string>();
    people.forEach((p) => {
      if (p.company) set.add(p.company.trim());
      (p.tags || []).forEach((t) => {
        if (t.startsWith('Alumni:')) set.add(t.replace('Alumni:', '').trim());
      });
    });
    return set.size;
  }, [people]);

  return (
    <div className="view-container" style={{ padding: '1.5rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
              }}
            >
              <Share2 size={22} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-main)' }}>
              LinkedIn AI Agent
            </h1>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Career Command Center • Content Generation, Strategic Networking & Opportunity Radar
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            onClick={() => setActiveTab('approvals')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor:
                pendingApprovalsCount > 0
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${
                pendingApprovalsCount > 0
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(16, 185, 129, 0.3)'
              }`,
              color: pendingApprovalsCount > 0 ? '#f59e0b' : '#10b981',
              fontSize: '0.825rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            <CheckCircle2 size={15} />
            <span>
              {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'Action' : 'Actions'} Pending Approval
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={refreshAll}
            disabled={loadingActions || loadingContext}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
          >
            <RefreshCw
              size={14}
              className={loadingActions || loadingContext ? 'animate-spin' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Today's Routine Pulse Bar */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '0.75rem',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981',
            }}
          >
            <Zap size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Today's Networking Routine Pulse
              </span>
              <span
                style={{
                  fontSize: '0.675rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                  background: routineStats.percentComplete === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  color: routineStats.percentComplete === 100 ? '#10b981' : '#38bdf8',
                  border: routineStats.percentComplete === 100 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 700,
                }}
              >
                {routineStats.percentComplete}% Complete
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Target: 5 Data/BI Peers + 2 Recruiter Invites + 2 Intros Daily Routine
            </div>
          </div>
        </div>

        {/* Progress Trackers - Matching Card Containers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Peer Invites Card */}
          <div
            onClick={() => {
              setNetworkingFilterPill('PENDING_INVITES');
              setActiveTab('networking');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: '145px',
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Click to view pending peer invitations"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                Peer Invites
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.22)',
                  padding: '0.05rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                }}
              >
                {routineStats.peerInvitesSent}/{routineStats.peerTarget}
              </span>
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
              Target: 5 Data/BI Peers
            </div>
          </div>

          {/* Recruiter Invites Card */}
          <div
            onClick={() => {
              setNetworkingFilterPill('RECRUITERS');
              setActiveTab('networking');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: '145px',
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Click to view recruiters directory"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                Recruiter Invites
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.22)',
                  padding: '0.05rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                }}
              >
                {routineStats.recruiterInvitesSent}/{routineStats.recruiterInviteTarget}
              </span>
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
              Target: 2 Recruiters
            </div>
          </div>

          {/* Recruiter Intros Card */}
          <div
            onClick={() => {
              setNetworkingFilterPill('INTRO_SENT');
              setActiveTab('networking');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: '145px',
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              background: 'rgba(192, 132, 252, 0.08)',
              border: '1px solid rgba(192, 132, 252, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Click to view contacts with intro sent"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#c084fc', fontWeight: 700 }}>
                Recruiter Intros
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: '#c084fc',
                  background: 'rgba(192, 132, 252, 0.22)',
                  padding: '0.05rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                }}
              >
                {routineStats.introsDispatched}/{routineStats.recruiterTarget}
              </span>
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
              Target: 2 Recruiters
            </div>
          </div>

          {/* Connected Today Card */}
          <div
            onClick={() => {
              setNetworkingFilterPill('CONNECTED_TODAY');
              setActiveTab('networking');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              minWidth: '145px',
              padding: '0.45rem 0.75rem',
              borderRadius: '0.5rem',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Click to view contacts who connected today"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>
                Connected Today
              </span>
              <span
                style={{
                  fontWeight: 800,
                  color: '#10b981',
                  background: 'rgba(16, 185, 129, 0.25)',
                  padding: '0.05rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                }}
              >
                +{routineStats.connectedToday}
              </span>
            </div>
            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
              {routineStats.connectedRecruitersToday} Recr • {routineStats.connectedPeersToday} Peers
            </div>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '0.5rem',
            border: activeTab === 'content' ? '1px solid #0a66c2' : '1px solid transparent',
            background: activeTab === 'content' ? 'rgba(10, 102, 194, 0.15)' : 'transparent',
            color: activeTab === 'content' ? '#0a66c2' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={16} />
          <span>Learn in Public</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            Copilot
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('networking')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '0.5rem',
            border: activeTab === 'networking' ? '1px solid #10b981' : '1px solid transparent',
            background: activeTab === 'networking' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'networking' ? '#10b981' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <Users size={16} />
          <span>Strategic Networking</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {people.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('radar')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '0.5rem',
            border: activeTab === 'radar' ? '1px solid #0284c7' : '1px solid transparent',
            background: activeTab === 'radar' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
            color: activeTab === 'radar' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <Building2 size={16} />
          <span>Company Radar</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {uniqueCompaniesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('opportunities')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '0.5rem',
            border: activeTab === 'opportunities' ? '1px solid #8b5cf6' : '1px solid transparent',
            background: activeTab === 'opportunities' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            color: activeTab === 'opportunities' ? '#8b5cf6' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <Briefcase size={16} />
          <span>Opportunity Radar</span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {opportunities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '0.5rem',
            border: activeTab === 'approvals' ? '1px solid #f59e0b' : '1px solid transparent',
            background: activeTab === 'approvals' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeTab === 'approvals' ? '#f59e0b' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <Layers size={16} />
          <span>Approvals Queue</span>
          {pendingApprovalsCount > 0 && (
            <span
              style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
                background: '#f59e0b',
                color: '#000000',
                fontWeight: 800,
              }}
            >
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '0.5rem',
            border: activeTab === 'analytics' ? '1px solid #10b981' : '1px solid transparent',
            background: activeTab === 'analytics' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'analytics' ? '#10b981' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            cursor: 'pointer',
          }}
        >
          <TrendingUp size={16} />
          <span>Analytics & Strategy</span>
        </button>
      </div>

      {/* TAB 1: LEARN IN PUBLIC COPILOT */}
      {activeTab === 'content' && (
        <LearnInPublicCopilotTab
          contentContext={contentContext}
          onActionProposed={() => {
            refreshActions();
            setActiveTab('approvals');
          }}
          onRefreshActions={refreshActions}
        />
      )}

      {/* TAB 2: STRATEGIC NETWORKING */}
      {activeTab === 'networking' && (
        <NetworkingTab
          people={people}
          context={networkingContext}
          onRefresh={refreshAll}
          onActionProposed={() => {
            refreshActions();
            setActiveTab('approvals');
          }}
          initialPill={networkingFilterPill}
          onPillChange={setNetworkingFilterPill}
        />
      )}

      {/* PRIMARY TAB: COMPANY RADAR */}
      {activeTab === 'radar' && (
        <CompanyRadarTab
          people={people}
          onRefresh={refreshAll}
        />
      )}

      {/* TAB 3: OPPORTUNITY RADAR */}
      {activeTab === 'opportunities' && (
        <OpportunitiesTab
          opportunities={opportunities}
          people={people}
          context={networkingContext}
          onRefresh={refreshAll}
          onActionProposed={() => {
            refreshActions();
            setActiveTab('approvals');
          }}
        />
      )}

      {/* TAB 4: ACTION APPROVALS QUEUE */}
      {activeTab === 'approvals' && (
        <section
          style={{
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Header & Controls Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Proposed Actions & Approvals
              </h2>
            </div>

            {/* Quick Actions & Filter Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Batch Approve All Button */}
              {pendingApprovalsCount > 0 && statusFilter === 'PENDING_APPROVAL' && (
                <button
                  type="button"
                  onClick={handleApproveAllPending}
                  disabled={isBatchApproving}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: isBatchApproving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Approve all currently pending outreach drafts"
                >
                  <CheckCheck size={15} />
                  <span>{isBatchApproving ? 'Approving All...' : `Approve All (${pendingApprovalsCount})`}</span>
                </button>
              )}

              {/* View Switcher: Split Reviewer vs Stream View */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(6, 10, 18, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.5rem',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setApprovalsViewMode('split')}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '0.35rem',
                    border: 'none',
                    background: approvalsViewMode === 'split' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: approvalsViewMode === 'split' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  title="Split-Pane Reviewer"
                >
                  <LayoutGrid size={13} />
                  <span>Split View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalsViewMode('stream')}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '0.35rem',
                    border: 'none',
                    background: approvalsViewMode === 'stream' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: approvalsViewMode === 'stream' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  title="Stream Cards View"
                >
                  <List size={13} />
                  <span>Cards</span>
                </button>
              </div>

              <Filter size={14} style={{ color: 'var(--text-muted)' }} />

              <select
                className="input"
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  background: 'rgba(6, 10, 18, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-main)',
                }}
              >
                <option value="ALL">All Types</option>
                <option value="MESSAGE">Direct Outreaches</option>
                <option value="SEND_CONNECTION">Connection Notes</option>
                <option value="PUBLISH_POST">Post Publishing</option>
                <option value="COMMENT">Post Comments</option>
              </select>

              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ActionStatus | 'ALL')}
                style={{
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  background: 'rgba(6, 10, 18, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-main)',
                }}
              >
                <option value="PENDING_APPROVAL">Pending Approval ({pendingApprovalsCount})</option>
                <option value="APPROVED">Approved</option>
                <option value="READY_FOR_MANUAL">Ready for Manual</option>
                <option value="EXECUTED">Executed</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>
          </div>

          {actionError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {actionError}
            </div>
          )}

          {loadingActions ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading action queue...
            </div>
          ) : filteredActions.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'rgba(6, 10, 18, 0.4)',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
              }}
            >
              <CheckCircle2 size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                No actions currently {statusFilter === 'ALL' ? 'found' : `in ${statusFilter}`}
              </h3>
              <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                Queue new recruiter messages or peer connection notes from the Strategic Networking tab.
              </p>
            </div>
          ) : approvalsViewMode === 'split' ? (
            /* SPLIT-PANE REVIEWER */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px, 340px) 1fr',
                gap: '1.25rem',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Candidates / Actions List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  maxHeight: '620px',
                  overflowY: 'auto',
                  paddingRight: '0.35rem',
                }}
              >
                {filteredActions.map((action) => {
                  const isSelected = action.id === activeAction?.id;

                  return (
                    <div
                      key={action.id}
                      onClick={() => {
                        setSelectedActionId(action.id);
                        setInspectorDraft(action.payload.content || '');
                      }}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '0.65rem',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.55)',
                        border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                        backdropFilter: 'blur(12px)',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '999px',
                            background:
                              action.action_type === 'SEND_CONNECTION'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(2, 132, 199, 0.15)',
                            color: action.action_type === 'SEND_CONNECTION' ? '#10b981' : '#38bdf8',
                            border:
                              action.action_type === 'SEND_CONNECTION'
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid rgba(2, 132, 199, 0.3)',
                          }}
                        >
                          {action.action_type === 'SEND_CONNECTION' ? 'Connection Note' : 'Direct Message'}
                        </span>

                        <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          {action.created_at
                            ? new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#34d399' : 'var(--text-main)' }}>
                        {action.payload.recipient_name || action.payload.topic || 'Outreach Target'}
                      </div>

                      {(action.payload.recipient_role || action.payload.company) && (
                        <div
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {action.payload.recipient_role || ''} {action.payload.company ? `@ ${action.payload.company}` : ''}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          opacity: 0.85,
                        }}
                      >
                        {action.payload.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Full Draft Inspector & Inline Editor */}
              {activeAction ? (
                <div
                  style={{
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.65)',
                    backdropFilter: 'blur(20px)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {/* Recipient Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {activeAction.payload.recipient_name || activeAction.payload.topic || 'Outreach Target'}
                        </h3>
                        <span
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background:
                              activeAction.status === 'APPROVED'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : activeAction.status === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              activeAction.status === 'APPROVED'
                                ? '#10b981'
                                : activeAction.status === 'REJECTED'
                                ? '#ef4444'
                                : '#f59e0b',
                            border:
                              activeAction.status === 'APPROVED'
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : activeAction.status === 'REJECTED'
                                ? '1px solid rgba(239, 68, 68, 0.3)'
                                : '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {activeAction.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {activeAction.payload.recipient_role || 'Professional'}
                        {activeAction.payload.company ? ` • ${activeAction.payload.company}` : ''}
                      </div>
                    </div>

                    {activeAction.payload.recipient_profile_url && (
                      <a
                        href={activeAction.payload.recipient_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.775rem',
                          color: '#0a66c2',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          textDecoration: 'none',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.4rem',
                          border: '1px solid rgba(10, 102, 194, 0.3)',
                          background: 'rgba(10, 102, 194, 0.1)',
                        }}
                      >
                        <span>Open LinkedIn</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* AI Reasoning Callout */}
                  {activeAction.reasoning && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      <Sparkles size={15} style={{ color: '#8b5cf6', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <span style={{ fontWeight: 600, color: '#c084fc' }}>AI Context: </span>
                        <span>{activeAction.reasoning}</span>
                      </div>
                    </div>
                  )}

                  {/* Draft Inspector & Inline Editor */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Draft Message (Editable)
                      </label>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color:
                            activeAction.action_type === 'SEND_CONNECTION' && inspectorDraft.length > 280
                              ? '#ef4444'
                              : 'var(--text-muted)',
                        }}
                      >
                        {inspectorDraft.length} chars {activeAction.action_type === 'SEND_CONNECTION' ? '/ 280 max' : ''}
                      </span>
                    </div>

                    <textarea
                      value={inspectorDraft}
                      onChange={(e) => setInspectorDraft(e.target.value)}
                      disabled={activeAction.status !== 'PENDING_APPROVAL'}
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        resize: 'vertical',
                      }}
                    />

                    {inspectorDraft !== activeAction.payload.content && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setInspectorDraft(activeAction.payload.content || '')}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveInspectorDraft}
                          disabled={isSavingInspectorDraft}
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                        >
                          {isSavingInspectorDraft ? 'Saving...' : 'Save Edits'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inspector Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      💡 Shortcut: <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Ctrl + Enter</kbd> to Approve
                    </div>

                    {activeAction.status === 'PENDING_APPROVAL' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleReject(activeAction.id)}
                          disabled={actionProcessingId === activeAction.id}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#ef4444',
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.85rem',
                          }}
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingAction(activeAction)}
                          disabled={actionProcessingId === activeAction.id}
                          className="btn btn-secondary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.85rem',
                          }}
                        >
                          <Pencil size={14} />
                          <span>Edit Modal</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(activeAction.id)}
                          disabled={actionProcessingId === activeAction.id}
                          className="btn btn-primary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            padding: '0.45rem 1rem',
                            background: '#10b981',
                            borderColor: '#10b981',
                            color: '#ffffff',
                            fontWeight: 700,
                          }}
                        >
                          <Check size={15} />
                          <span>{actionProcessingId === activeAction.id ? 'Approving...' : 'Approve Draft'}</span>
                        </button>
                      </div>
                    ) : (activeAction.status === 'APPROVED' || activeAction.status === 'READY_FOR_MANUAL') ? (
                      <button
                        type="button"
                        onClick={() => handleOpenPublish(activeAction)}
                        className="btn btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          backgroundColor: '#0284c7',
                          borderColor: '#0284c7',
                          fontSize: '0.825rem',
                          padding: '0.45rem 1rem',
                        }}
                      >
                        <Send size={14} />
                        <span>Dispatch Outreach Now</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Action status: <strong>{activeAction.status}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* STREAM CARDS VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredActions.map((action) => (
                <ActionApprovalCard
                  key={action.id}
                  action={action}
                  sourceConceptName={
                    action.payload.concept_id
                      ? conceptMap.get(action.payload.concept_id)
                      : undefined
                  }
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onEdit={(act) => setEditingAction(act)}
                  onPreparePublish={handleOpenPublish}
                  isProcessing={actionProcessingId === action.id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 5: ANALYTICS & STRATEGIC MEMORY */}
      {activeTab === 'analytics' && (
        <AnalyticsMemoryTab
          summary={analyticsSummary}
          people={people}
          actions={actions}
          onRefresh={refreshAll}
        />
      )}

      {/* Edit Modal */}
      <ActionEditModal
        action={editingAction}
        isOpen={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
        onSave={handleSaveEdit}
      />

      {/* Manual Execution Fallback Modal */}
      <ManualExecutionModal
        action={publishingAction}
        isOpen={Boolean(publishingAction)}
        onClose={() => setPublishingAction(null)}
        onConfirmPublished={handleConfirmPublished}
      />
    </div>
  );
};
