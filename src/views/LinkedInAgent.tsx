import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Share2,
  Sparkles,
  RefreshCw,
  BookOpen,
  Send,
  CheckCircle2,
  AlertCircle,
  Headphones,
  Check,
  Filter,
  Users,
  Briefcase,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { linkedinAgentService } from '../services/linkedinAgentService';
import { copilotService } from '../services/copilotService';
import { ActionApprovalCard } from '../components/linkedin/ActionApprovalCard';
import { ActionEditModal } from '../components/linkedin/ActionEditModal';
import { ManualExecutionModal } from '../components/linkedin/ManualExecutionModal';
import { NetworkingTab } from '../components/linkedin/NetworkingTab';
import { OpportunitiesTab } from '../components/linkedin/OpportunitiesTab';
import { AnalyticsMemoryTab } from '../components/linkedin/AnalyticsMemoryTab';
import type {
  LinkedInAction,
  ContentContextConcept,
  AgentContentContext,
  AgentNetworkingContext,
  LinkedInPerson,
  LinkedInOpportunity,
  AnalyticsDashboardSummary,
  ActionStatus,
} from '../types/linkedin';

export const LinkedInAgent: React.FC = () => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'content' | 'networking' | 'opportunities' | 'approvals' | 'analytics'>('content');

  // Context & Content state
  const [contentContext, setContentContext] = useState<AgentContentContext | null>(null);
  const [networkingContext, setNetworkingContext] = useState<AgentNetworkingContext | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsDashboardSummary | null>(null);
  const [people, setPeople] = useState<LinkedInPerson[]>([]);
  const [opportunities, setOpportunities] = useState<LinkedInOpportunity[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');

  // Generation state (Content)
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Actions / Approvals state
  const [actions, setActions] = useState<LinkedInAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'ALL'>('PENDING_APPROVAL');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

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
        if (cCtx.concepts.length > 0 && !selectedConceptId) {
          setSelectedConceptId(cCtx.concepts[0].id);
        }
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
  }, [statusFilter, selectedConceptId]);

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

  const selectedConcept = useMemo<ContentContextConcept | undefined>(() => {
    return contentContext?.concepts.find((c) => c.id === selectedConceptId);
  }, [contentContext, selectedConceptId]);

  const conceptMap = useMemo(() => {
    const map = new Map<string, string>();
    (contentContext?.concepts || []).forEach((c) => {
      map.set(c.id, c.name);
    });
    return map;
  }, [contentContext]);

  const pendingApprovalsCount = useMemo(() => {
    return actions.filter((a) => a.status === 'PENDING_APPROVAL').length;
  }, [actions]);

  // AI Content Post Generator
  const handleGenerateDraft = async () => {
    if (!selectedConcept) return;

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setGenerationSuccess(null);
      setGeneratedDraft('');

      const memoryDirectives =
        contentContext?.memories && contentContext.memories.length > 0
          ? `\nStrategic Memory Directives (Confirmed Style & Tone Rules):\n` +
            contentContext.memories
              .map((m) => {
                const val = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
                return `• [${m.memory_type}] ${m.key}: ${val}`;
              })
              .join('\n') +
            '\n'
          : '';

      const prompt = `You are a Senior Principal Data & BI Engineer writing a high-impact, technical LinkedIn post.
Topic: ${selectedConcept.name}
${selectedConcept.notes ? `Technical Notes / Context:\n${selectedConcept.notes}\n` : ''}
${selectedConcept.notebookLmAudioLink ? `NotebookLM Podcast Audio Available: ${selectedConcept.notebookLmAudioLink}\n` : ''}
${memoryDirectives}
Rules for the post:
1. Hook (Lines 1-2): Direct, non-generic problem statement or practitioner observation. DO NOT start with "In today's fast-paced world...", "Excited to share...", or questions like "Have you ever wondered...?".
2. Practical Architecture / Execution: Explain the DAX / SQL / Power BI / data pattern clearly with skimmable bullet points or short paragraphs.
3. The Gotcha: Include one senior gotcha or performance nuance that most juniors miss.
4. Call to Action: A sharp technical discussion question encouraging peers to share their production experience.
5. Hashtags: End with 3-5 clean hashtags (e.g. #PowerBI #DAX #DataEngineering #BusinessIntelligence).

Return ONLY the ready-to-publish post content.`;

      const response = await copilotService.generateMultimodalResponse(prompt);
      setGeneratedDraft(response.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI post generation failed.';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitProposedAction = async () => {
    if (!generatedDraft.trim() || !selectedConcept) return;

    try {
      setIsSubmittingProposal(true);
      setGenerationError(null);

      await linkedinAgentService.createProposedAction({
        content: generatedDraft.trim(),
        topic: selectedConcept.name,
        reasoning: `AI draft generated from concept '${selectedConcept.name}' with focus on real-world engineering patterns.`,
        concept_id: selectedConcept.id,
        action_type: 'PUBLISH_POST',
        tags: ['#PowerBI', '#DAX', '#DataEngineering'],
      });

      setGenerationSuccess('Draft submitted to Pending Approvals queue!');
      setGeneratedDraft('');
      await refreshActions();
      setActiveTab('approvals');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit proposed action.';
      setGenerationError(msg);
    } finally {
      setIsSubmittingProposal(false);
    }
  };

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

  // Filter actions by type if set
  const filteredActions = actions.filter((act) => {
    if (actionTypeFilter === 'ALL') return true;
    return act.action_type === actionTypeFilter;
  });

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
          marginBottom: '1.5rem',
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
          <span>Content Copilot</span>
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

      {/* TAB 1: CONTENT COPILOT */}
      {activeTab === 'content' && (
        <section
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
            }}
          >
            <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
              Draft New Post from MYCES Concept
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Select Concept Context:
              </label>
              <select
                className="input"
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px' }}
              >
                {contentContext?.concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.hasPost ? '✓ [Published] ' : '★ [Unposted] '}
                    {concept.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedConcept && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.825rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  justifyContent: 'center',
                }}
              >
                <div>
                  Status: <strong style={{ color: 'var(--text-main)' }}>{selectedConcept.status}</strong>
                  {selectedConcept.hasPost && (
                    <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓ Already on LinkedIn</span>
                  )}
                </div>
                {selectedConcept.notebookLmAudioLink && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)' }}>
                    <Headphones size={13} />
                    <span>NotebookLM Audio / Podcast Attached</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateDraft}
              disabled={isGenerating || !selectedConcept}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Sparkles size={16} />
              <span>{isGenerating ? 'AI Generating Draft...' : 'Generate LinkedIn Draft'}</span>
            </button>
          </div>

          {generationError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{generationError}</span>
            </div>
          )}

          {generationSuccess && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <Check size={16} />
              <span>{generationSuccess}</span>
            </div>
          )}

          {generatedDraft && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                marginTop: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Generated Draft Preview:
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Review and submit to Approval Queue
                </span>
              </div>

              <textarea
                className="textarea"
                value={generatedDraft}
                onChange={(e) => setGeneratedDraft(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  fontFamily: 'inherit',
                  fontSize: '0.925rem',
                  lineHeight: '1.5',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  resize: 'vertical',
                  marginBottom: '1rem',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setGeneratedDraft('')}
                  disabled={isSubmittingProposal}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitProposedAction}
                  disabled={isSubmittingProposal || !generatedDraft.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <Send size={15} />
                  <span>{isSubmittingProposal ? 'Submitting...' : 'Save as PENDING_APPROVAL Action'}</span>
                </button>
              </div>
            </div>
          )}
        </section>
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
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                Proposed Actions & Approvals
              </h2>
            </div>

            {/* Filter Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />

              <select
                className="input"
                value={actionTypeFilter}
                onChange={(e) => setActionTypeFilter(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.825rem', borderRadius: '6px' }}
              >
                <option value="ALL">All Action Types</option>
                <option value="PUBLISH_POST">Post Publishing</option>
                <option value="SEND_CONNECTION">Connection Requests</option>
                <option value="COMMENT">Post Comments</option>
                <option value="MESSAGE">Direct Outreaches</option>
              </select>

              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ActionStatus | 'ALL')}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.825rem', borderRadius: '6px' }}
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
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading action queue...
            </div>
          ) : filteredActions.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-dark)',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
              }}
            >
              <CheckCircle2 size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                No actions currently {statusFilter === 'ALL' ? 'found' : `in ${statusFilter}`}
              </h3>
              <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Generate posts in Content Copilot, connection notes in Networking, or pitch comments in Opportunities.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
