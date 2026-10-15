import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Plus,
  Trash2,
  X,
  CheckCircle,
  Flame,
  User,
} from 'lucide-react';
import type {
  LinkedInOpportunity,
  OpportunityType,
  OpportunityStatus,
  LinkedInPerson,
  AgentNetworkingContext,
} from '../../types/linkedin';
import { linkedinAgentService } from '../../services/linkedinAgentService';
import { copilotService } from '../../services/copilotService';

interface OpportunitiesTabProps {
  opportunities: LinkedInOpportunity[];
  people: LinkedInPerson[];
  context: AgentNetworkingContext | null;
  onRefresh: () => Promise<void>;
  onActionProposed: () => void;
}

export const OpportunitiesTab: React.FC<OpportunitiesTabProps> = ({
  opportunities,
  people,
  context,
  onRefresh,
  onActionProposed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Opportunity Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newType, setNewType] = useState<OpportunityType>('HIRING_MANAGER_POST');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScore, setNewScore] = useState<number>(85);
  const [newContactId, setNewContactId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesType = typeFilter === 'ALL' || opp.opportunity_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || opp.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.description && opp.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleAddOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCompany.trim() || !newSourceUrl.trim()) return;

    try {
      setIsSubmitting(true);
      await linkedinAgentService.createOpportunity({
        title: newTitle.trim(),
        company: newCompany.trim(),
        opportunity_type: newType,
        source_url: newSourceUrl.trim(),
        description: newDescription.trim() || null,
        score: newScore,
        contact_person_id: newContactId || null,
        status: 'NEW',
      });

      setNewTitle('');
      setNewCompany('');
      setNewSourceUrl('');
      setNewDescription('');
      setNewContactId('');
      setIsAddModalOpen(false);
      showToast('Opportunity added to Radar!');
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add opportunity';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from opportunity radar?`)) return;
    try {
      await linkedinAgentService.deleteOpportunity(id);
      showToast(`Removed "${title}"`);
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete opportunity';
      alert(msg);
    }
  };

  const handleStatusChange = async (id: string, status: OpportunityStatus) => {
    try {
      await linkedinAgentService.updateOpportunity(id, { status });
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      alert(msg);
    }
  };

  // Generate Insightful Discussion Comment on Hiring Post
  const handleGenerateComment = async (opp: LinkedInOpportunity) => {
    try {
      setIsGeneratingFor(opp.id);
      const skillsStr = (context?.skills || []).slice(0, 4).join(', ');
      const prompt = `You are a Senior Principal Data & BI Engineer commenting on a LinkedIn post by a hiring manager or tech lead.
Opportunity Title: ${opp.title}
Company: ${opp.company}
Post Context / Requirements: ${opp.description || 'Hiring senior data engineers / BI specialists with Fabric & Power BI expertise.'}
Candidate Core Skills: ${skillsStr}

TASK:
Write a high-value, practitioner-grade LinkedIn comment on this post.
RULES:
1. Demonstrate immediate hands-on technical understanding of the problem space (e.g. optimizing large semantic models, Direct Lake, star schema governance).
2. DO NOT say "Interested, sent DM" or "Please check my resume". Deliver value in the comment itself that makes the hiring manager want to click your profile.
3. Keep it crisp (60-90 words).
4. Output ONLY the raw comment text.`;

      const rawComment = await copilotService.generateMultimodalResponse(prompt);
      const commentContent = rawComment.trim().replace(/^["']|["']$/g, '');

      await linkedinAgentService.createProposedAction({
        action_type: 'COMMENT',
        payload: {
          topic: `Engagement on ${opp.company} Opportunity`,
          target_url: opp.source_url,
          company: opp.company,
          opportunity_id: opp.id,
          content: commentContent,
        },
        reasoning: `Technical comment proposed for ${opp.company} post ("${opp.title}") to trigger inbound curiosity from the hiring team.`,
        target_id: opp.id,
      });

      showToast('Discussion comment queued in Approvals queue!');
      onActionProposed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      alert(msg);
    } finally {
      setIsGeneratingFor(null);
    }
  };

  // Generate InMail / Direct Outreach Pitch
  const handleGenerateInMail = async (opp: LinkedInOpportunity) => {
    try {
      setIsGeneratingFor(opp.id);
      const project = context?.projects?.[0];
      const prompt = `You are an elite Data Engineer writing a direct message / InMail regarding an active opportunity.
Role / Post: ${opp.title} at ${opp.company}
Requirements: ${opp.description || 'Senior Data & BI Engineering'}
${project ? `Proof Project: ${project.name} (Built with ${project.technologiesUsed?.join(', ')})` : ''}

TASK:
Write a high-converting, 100-130 word pitch to the hiring team.
RULES:
1. Clear hook connecting your hands-on background to their exact tech stack.
2. Cite a specific production metric or architectural outcome.
3. Clear low-friction CTA (e.g. "Happy to share the architecture diagram if this aligns with what you need.").
4. Output ONLY the raw pitch content.`;

      const rawPitch = await copilotService.generateMultimodalResponse(prompt);
      const pitchContent = rawPitch.trim().replace(/^["']|["']$/g, '');

      await linkedinAgentService.createProposedAction({
        action_type: 'MESSAGE',
        payload: {
          topic: `Pitch for ${opp.title} (${opp.company})`,
          target_url: opp.source_url,
          company: opp.company,
          opportunity_id: opp.id,
          content: pitchContent,
        },
        reasoning: `Tailored outreach pitch drafted for ${opp.title} at ${opp.company} highlighting relevant project proof.`,
        target_id: opp.id,
      });

      showToast('Outreach pitch queued in Approvals queue!');
      onActionProposed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      alert(msg);
    } finally {
      setIsGeneratingFor(null);
    }
  };

  const getTypeBadge = (type: OpportunityType) => {
    switch (type) {
      case 'HIRING_MANAGER_POST':
        return { label: 'Hiring Manager Post', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'JOB_POSTING':
        return { label: 'Job Opening', bg: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', border: 'rgba(2, 132, 199, 0.3)' };
      case 'CONSULTING':
        return { label: 'Consulting / Contract', bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
      default:
        return { label: 'Networking', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 1200,
            background: '#10b981',
            color: '#ffffff',
            padding: '0.65rem 1.15rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Filter and Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, company, or tech keywords..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
            }}
          >
            <option value="ALL">All Types ({opportunities.length})</option>
            <option value="HIRING_MANAGER_POST">Hiring Manager Posts</option>
            <option value="JOB_POSTING">Job Postings</option>
            <option value="CONSULTING">Consulting / Contract</option>
            <option value="NETWORKING">Networking Leads</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.825rem',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="EVALUATING">Evaluating</option>
            <option value="ACTION_PROPOSED">Action Proposed</option>
            <option value="PURSUING">Pursuing</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.9rem',
            fontSize: '0.825rem',
            background: '#0a66c2',
            borderColor: '#0a66c2',
          }}
        >
          <Plus size={15} />
          <span>Track Opportunity</span>
        </button>
      </div>

      {/* Opportunities List */}
      {filteredOpportunities.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            border: '1px dashed var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Briefcase size={32} color="var(--text-muted)" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            {searchQuery ? 'No opportunities match your filter.' : 'No Tracked Opportunities Yet'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
            Track direct LinkedIn hiring posts, consulting inquiries, and high-match job openings to generate strategic comments and tailored InMail pitches.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', fontSize: '0.825rem' }}
          >
            <Plus size={14} style={{ display: 'inline', marginRight: '0.3rem' }} /> Track First Opportunity
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredOpportunities.map((opp) => {
            const typeBadge = getTypeBadge(opp.opportunity_type);
            const isProcessing = isGeneratingFor === opp.id;

            return (
              <div
                key={opp.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                        {opp.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: typeBadge.bg,
                          color: typeBadge.color,
                          border: `1px solid ${typeBadge.border}`,
                        }}
                      >
                        {typeBadge.label}
                      </span>
                      {opp.score && (
                        <span
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <Flame size={12} />
                          {opp.score}% Match
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {opp.company}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                      value={opp.status}
                      onChange={(e) => handleStatusChange(opp.id, e.target.value as OpportunityStatus)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '0.4rem',
                        fontSize: '0.75rem',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <option value="NEW">New</option>
                      <option value="EVALUATING">Evaluating</option>
                      <option value="ACTION_PROPOSED">Action Proposed</option>
                      <option value="PURSUING">Pursuing</option>
                      <option value="CLOSED">Closed</option>
                    </select>

                    <button
                      onClick={() => handleDelete(opp.id, opp.title)}
                      className="btn btn-secondary"
                      title="Delete opportunity"
                      style={{ padding: '0.3rem', color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Description Snippet */}
                {opp.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.825rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.5,
                      background: 'var(--bg-secondary, rgba(255,255,255,0.02))',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {opp.description}
                  </p>
                )}

                {/* Linked Contact Person if present */}
                {opp.contact_person && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    <User size={13} color="#10b981" />
                    <span>Contact: <strong>{opp.contact_person.full_name}</strong> ({opp.contact_person.role || 'Leader'})</span>
                  </div>
                )}

                {/* Bottom Actions Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <a
                    href={opp.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.775rem',
                      color: '#0a66c2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open LinkedIn Source Post</span>
                    <ExternalLink size={13} />
                  </a>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleGenerateComment(opp)}
                      disabled={isProcessing}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Sparkles size={13} color="#8b5cf6" />
                      <span>{isProcessing ? 'Generating...' : 'Propose Discussion Comment'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateInMail(opp)}
                      disabled={isProcessing}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <MessageSquare size={13} color="#0284c7" />
                      <span>{isProcessing ? 'Drafting...' : 'Draft InMail Pitch'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Opportunity Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsAddModalOpen(false);
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Track LinkedIn Opportunity
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddOpportunity} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Opportunity Title / Role *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lead BI Engineer / Fabric Architect"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Stripe / Accenture"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as OpportunityType)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="HIRING_MANAGER_POST">Hiring Manager Post</option>
                    <option value="JOB_POSTING">Job Opening</option>
                    <option value="CONSULTING">Consulting / Contract</option>
                    <option value="NETWORKING">Networking Lead</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  LinkedIn Post / Source URL *
                </label>
                <input
                  type="url"
                  required
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/posts/..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Linked Contact Person (Optional)
                  </label>
                  <select
                    value={newContactId}
                    onChange={(e) => setNewContactId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">None / Unassigned</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.company || 'Unknown'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Match Score %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Post Text / Key Notes
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Paste excerpt from hiring post or key technical requirements..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ background: '#0a66c2', borderColor: '#0a66c2' }}
                >
                  {isSubmitting ? 'Tracking...' : 'Save Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
