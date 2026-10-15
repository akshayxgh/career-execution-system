import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Users,
  Building2,
  Trash2,
  Plus,
  X,
  CheckCircle,
} from 'lucide-react';
import type {
  LinkedInPerson,
  ConnectionStatus,
  AgentNetworkingContext,
} from '../../types/linkedin';
import { linkedinAgentService } from '../../services/linkedinAgentService';
import { copilotService } from '../../services/copilotService';

interface NetworkingTabProps {
  people: LinkedInPerson[];
  context: AgentNetworkingContext | null;
  onRefresh: () => Promise<void>;
  onActionProposed: () => void;
}

export const NetworkingTab: React.FC<NetworkingTabProps> = ({
  people,
  context,
  onRefresh,
  onActionProposed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Contact Form State
  const [newName, setNewName] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newHeadline, setNewHeadline] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<ConnectionStatus>('NOT_CONNECTED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPeople = people.filter((p) => {
    const matchesStatus =
      statusFilter === 'ALL' || p.connection_status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.company && p.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.role && p.role.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newProfileUrl.trim()) return;

    try {
      setIsSubmitting(true);
      await linkedinAgentService.createPerson({
        full_name: newName.trim(),
        profile_url: newProfileUrl.trim(),
        company: newCompany.trim() || null,
        role: newRole.trim() || null,
        headline: newHeadline.trim() || null,
        interaction_notes: newNotes.trim() || null,
        connection_status: newStatus,
        tags: [newRole.trim(), newCompany.trim()].filter(Boolean),
      });

      setNewName('');
      setNewProfileUrl('');
      setNewCompany('');
      setNewRole('');
      setNewHeadline('');
      setNewNotes('');
      setIsAddModalOpen(false);
      showToast('Contact added to networking directory!');
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add contact';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from your tracked contacts?`)) return;
    try {
      await linkedinAgentService.deletePerson(id);
      showToast(`Removed ${name}`);
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete contact';
      alert(msg);
    }
  };

  // Generate Personalized Connection Note (Strictly <= 300 chars)
  const handleGenerateConnectionNote = async (person: LinkedInPerson) => {
    try {
      setIsGeneratingFor(person.id);
      const skillsStr = (context?.skills || []).slice(0, 3).join(', ');
      const prompt = `You are a Senior Principal Data Engineer connecting with a peer/leader on LinkedIn.
Target Name: ${person.full_name}
Target Role: ${person.role || person.headline || 'Engineering Leader'}
Target Company: ${person.company || 'Top Tech'}
Candidate Stack: ${skillsStr || 'Power BI, DAX, Fabric, SQL'}

TASK:
Write a personalized, humble, authentic LinkedIn connection request note.
MANDATORY RULES:
1. MUST BE STRICTLY UNDER 280 CHARACTERS TOTAL (including spaces). This is a hard limit for LinkedIn.
2. Mention their work/company or common technical interest.
3. No cheesy sales pitch, no fluff.
4. Output ONLY the raw message text.`;

      const rawNote = await copilotService.generateMultimodalResponse(prompt);
      let note = rawNote.trim().replace(/^["']|["']$/g, '');
      if (note.length > 295) {
        note = note.slice(0, 290) + '...';
      }

      await linkedinAgentService.createProposedAction({
        action_type: 'SEND_CONNECTION',
        payload: {
          recipient_name: person.full_name,
          recipient_role: person.role || person.headline || 'Professional',
          company: person.company || '',
          recipient_profile_url: person.profile_url,
          person_id: person.id,
          content: note,
        },
        reasoning: `Personalized connection invitation crafted for ${person.full_name} (${person.role || 'Leader'} at ${person.company || 'Tech'}). Tailored to under 300 chars.`,
        target_id: person.id,
      });

      showToast(`Proposed connection note for ${person.full_name} queued in Approvals!`);
      onActionProposed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      alert(msg);
    } finally {
      setIsGeneratingFor(null);
    }
  };

  // Generate Direct Outreach / Follow-up Message
  const handleGenerateMessage = async (person: LinkedInPerson) => {
    try {
      setIsGeneratingFor(person.id);
      const project = context?.projects?.[0];
      const prompt = `You are an expert Data Engineer reaching out to ${person.full_name} (${person.role || 'Leader'} at ${person.company || 'their organization'}).
Candidate Experience: 4.5+ years building scalable BI & Lakehouse architectures.
${project ? `Reference Project: ${project.name} (${project.technologiesUsed?.join(', ')})` : ''}

TASK:
Write a concise, high-value direct message (100-140 words).
Focus on:
1. Warm, respectful practitioner tone.
2. Shared engineering challenges in data analytics or Fabric/BI.
3. Concrete value without demanding an interview or favor.
4. Output ONLY the raw message content.`;

      const rawMsg = await copilotService.generateMultimodalResponse(prompt);
      const msgContent = rawMsg.trim().replace(/^["']|["']$/g, '');

      await linkedinAgentService.createProposedAction({
        action_type: 'MESSAGE',
        payload: {
          recipient_name: person.full_name,
          recipient_role: person.role || person.headline || 'Professional',
          company: person.company || '',
          recipient_profile_url: person.profile_url,
          person_id: person.id,
          content: msgContent,
        },
        reasoning: `Direct outreach message proposed for ${person.full_name} focusing on technical alignment and project proof.`,
        target_id: person.id,
      });

      showToast(`Outreach message for ${person.full_name} queued in Approvals!`);
      onActionProposed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      alert(msg);
    } finally {
      setIsGeneratingFor(null);
    }
  };

  const getStatusBadge = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED':
        return { label: 'Connected', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'INVITATION_SENT':
        return { label: 'Invitation Sent', bg: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', border: 'rgba(2, 132, 199, 0.3)' };
      case 'PENDING_OUTREACH':
        return { label: 'Pending Outreach', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      default:
        return { label: 'Not Connected', bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: 'var(--border-color)' };
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

      {/* Target Companies Quick Radar from MYCES applications */}
      {context?.targetCompanies && context.targetCompanies.length > 0 && (
        <div
          className="card"
          style={{
            padding: '0.85rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            background: 'rgba(2, 132, 199, 0.04)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7' }}>
            <Building2 size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              MYCES Active Target Companies:
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {context.targetCompanies.slice(0, 8).map((comp) => (
              <span
                key={comp}
                style={{
                  fontSize: '0.725rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                }}
              >
                {comp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Action Bar: Search, Filters, Add Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
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
              placeholder="Search contacts by name, company, or role..."
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
            <option value="ALL">All Statuses ({people.length})</option>
            <option value="NOT_CONNECTED">Not Connected</option>
            <option value="PENDING_OUTREACH">Pending Outreach</option>
            <option value="INVITATION_SENT">Invitation Sent</option>
            <option value="CONNECTED">Connected</option>
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
          <UserPlus size={15} />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Directory Grid */}
      {filteredPeople.length === 0 ? (
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
          <Users size={32} color="var(--text-muted)" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            {searchQuery ? 'No contacts match your query.' : 'No Tracked Contacts Yet'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
            Add recruiters, hiring managers, and senior engineers from your target companies to propose personalized AI connection requests and follow-ups.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', fontSize: '0.825rem' }}
          >
            <Plus size={14} style={{ display: 'inline', marginRight: '0.3rem' }} /> Add First Contact
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredPeople.map((person) => {
            const badge = getStatusBadge(person.connection_status);
            const isProcessing = isGeneratingFor === person.id;

            return (
              <div
                key={person.id}
                className="card"
                style={{
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                }}
              >
                {/* Person Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0a66c2, #0284c7)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {person.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                        {person.full_name}
                      </h4>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                        {person.role || 'Technology Leader'}
                        {person.company ? ` • ${person.company}` : ''}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(person.id, person.full_name)}
                    className="btn btn-secondary"
                    title="Delete contact"
                    style={{ padding: '0.3rem', color: '#ef4444' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Headline or Notes */}
                {person.headline && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.775rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {person.headline}
                  </p>
                )}

                {/* Status & Timing */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>

                  <a
                    href={person.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      color: '#0a66c2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>LinkedIn Profile</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* AI Copilot Action Buttons */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleGenerateConnectionNote(person)}
                    disabled={isProcessing}
                    className="btn btn-secondary"
                    title="Generate 300-char connection invitation"
                    style={{
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.725rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Sparkles size={12} color="#10b981" />
                    <span>{isProcessing ? 'Generating...' : 'Connection Note'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateMessage(person)}
                    disabled={isProcessing}
                    className="btn btn-secondary"
                    title="Draft direct outreach message"
                    style={{
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.725rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <MessageSquare size={12} color="#0284c7" />
                    <span>{isProcessing ? 'Drafting...' : 'Direct Outreach'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Contact Modal */}
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
              maxWidth: '520px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Add Tracked Contact
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddPerson} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
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
                  LinkedIn Profile URL *
                </label>
                <input
                  type="url"
                  required
                  value={newProfileUrl}
                  onChange={(e) => setNewProfileUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/sarah-jenkins"
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
                    Company
                  </label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Microsoft"
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
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. Engineering Manager"
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
                  Headline / Bio Snippet
                </label>
                <input
                  type="text"
                  value={newHeadline}
                  onChange={(e) => setNewHeadline(e.target.value)}
                  placeholder="e.g. Hiring for Data & BI Team in Azure"
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
                  Connection Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ConnectionStatus)}
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
                  <option value="NOT_CONNECTED">Not Connected</option>
                  <option value="PENDING_OUTREACH">Pending Outreach</option>
                  <option value="INVITATION_SENT">Invitation Sent</option>
                  <option value="CONNECTED">Connected</option>
                </select>
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
                  {isSubmitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
