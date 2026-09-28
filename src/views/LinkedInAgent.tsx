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
} from 'lucide-react';
import { linkedinAgentService } from '../services/linkedinAgentService';
import { copilotService } from '../services/copilotService';
import { ActionApprovalCard } from '../components/linkedin/ActionApprovalCard';
import { ActionEditModal } from '../components/linkedin/ActionEditModal';
import type {
  LinkedInAction,
  ContentContextConcept,
  AgentContentContext,
  ActionStatus,
} from '../types/linkedin';

export const LinkedInAgent: React.FC = () => {
  // Context & Content state
  const [context, setContext] = useState<AgentContentContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Actions / Approvals state
  const [actions, setActions] = useState<LinkedInAction[]>([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | 'ALL'>('PENDING_APPROVAL');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Edit Modal state
  const [editingAction, setEditingAction] = useState<LinkedInAction | null>(null);

  // Initial data loading effects
  useEffect(() => {
    let isMounted = true;
    linkedinAgentService
      .fetchContentContext()
      .then((data) => {
        if (isMounted) {
          setContext(data);
          if (data.concepts.length > 0 && !selectedConceptId) {
            setSelectedConceptId(data.concepts[0].id);
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) console.error('Failed to load MYCES context:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingContext(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedConceptId]);

  useEffect(() => {
    let isMounted = true;
    const filter = statusFilter === 'ALL' ? undefined : statusFilter;
    linkedinAgentService
      .fetchActions(filter)
      .then((data) => {
        if (isMounted) setActions(data);
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load actions.';
          setActionError(message);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingActions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

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

  const refreshAll = useCallback(async () => {
    setLoadingContext(true);
    setLoadingActions(true);
    try {
      const [ctx, acts] = await Promise.all([
        linkedinAgentService.fetchContentContext(),
        linkedinAgentService.fetchActions(statusFilter === 'ALL' ? undefined : statusFilter),
      ]);
      setContext(ctx);
      setActions(acts);
    } catch (err: unknown) {
      console.error('Failed to refresh LinkedIn Agent:', err);
    } finally {
      setLoadingContext(false);
      setLoadingActions(false);
    }
  }, [statusFilter]);

  const selectedConcept = useMemo<ContentContextConcept | undefined>(() => {
    return context?.concepts.find((c) => c.id === selectedConceptId);
  }, [context, selectedConceptId]);

  const conceptMap = useMemo(() => {
    const map = new Map<string, string>();
    (context?.concepts || []).forEach((c) => {
      map.set(c.id, c.name);
    });
    return map;
  }, [context]);

  const pendingApprovalsCount = useMemo(() => {
    return actions.filter((a) => a.status === 'PENDING_APPROVAL').length;
  }, [actions]);

  // AI LinkedIn Post Draft Generator
  const handleGenerateDraft = async () => {
    if (!selectedConcept) return;

    try {
      setIsGenerating(true);
      setGenerationError(null);
      setGenerationSuccess(null);
      setGeneratedDraft('');

      const prompt = `You are a Senior Principal Data & BI Engineer writing a high-impact, technical LinkedIn post.
Topic: ${selectedConcept.name}
${selectedConcept.notes ? `Technical Notes / Context:\n${selectedConcept.notes}\n` : ''}
${selectedConcept.notebookLmAudioLink ? `NotebookLM Podcast Audio Available: ${selectedConcept.notebookLmAudioLink}\n` : ''}

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

  // Submit Draft to the Pending Approval Queue
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

  return (
    <div className="view-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
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
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Autonomous Drafting & Human-in-the-Loop Action Approval Center
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
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
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'Action' : 'Actions'} Pending Approval
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={refreshAll}
            disabled={loadingActions || loadingContext}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw
              size={15}
              className={loadingActions || loadingContext ? 'animate-spin' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>
        {/* SECTION 1: Draft Post Generator */}
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
            {/* Concept Selector */}
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
                {context?.concepts.map((concept) => (
                  <option key={concept.id} value={concept.id}>
                    {concept.hasPost ? '✓ [Published] ' : '★ [Unposted] '}
                    {concept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Concept Info Preview */}
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

          {/* Action Trigger */}
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

          {/* Draft Preview & Submit Area */}
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

        {/* SECTION 2: Pending Approvals Queue */}
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

            {/* Filter Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                className="input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ActionStatus | 'ALL')}
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.825rem', borderRadius: '6px' }}
              >
                <option value="PENDING_APPROVAL">Pending Approval ({pendingApprovalsCount})</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All Actions</option>
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
          ) : actions.length === 0 ? (
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
                Use the draft generator above or let the scheduled agent propose posts.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {actions.map((action) => (
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
                  isProcessing={actionProcessingId === action.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Edit Modal */}
      <ActionEditModal
        action={editingAction}
        isOpen={Boolean(editingAction)}
        onClose={() => setEditingAction(null)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
