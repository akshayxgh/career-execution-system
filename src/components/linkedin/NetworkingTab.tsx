import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserPlus,
  Search,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Users,
  Trash2,
  Plus,
  X,
  CheckCircle,
  LayoutGrid,
  List,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Wand2,
  Send,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  LinkedInPerson,
  ConnectionStatus,
  AgentNetworkingContext,
} from '../../types/linkedin';
import { linkedinAgentService } from '../../services/linkedinAgentService';
import { copilotService } from '../../services/copilotService';
import { networkHygieneService, type HygieneResult } from '../../services/networkHygieneService';

interface NetworkingTabProps {
  people: LinkedInPerson[];
  context: AgentNetworkingContext | null;
  onRefresh: () => Promise<void>;
  onActionProposed: () => void;
  initialPill?: FilterPill;
  onPillChange?: (pill: FilterPill) => void;
}

type FilterPill = 'ALL' | 'RECRUITERS' | 'INTRO_SENT' | 'PENDING_INVITES' | 'CONNECTED' | 'CONNECTED_TODAY';

export const NetworkingTab: React.FC<NetworkingTabProps> = ({
  people,
  context,
  onRefresh,
  onActionProposed,
  initialPill,
  onPillChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePill, setActivePillState] = useState<FilterPill>(initialPill || 'ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modern Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    if (isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  const formatDateDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const [y, m, d] = isoStr.split('-');
      const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return isoStr;
    }
  };

  useEffect(() => {
    if (initialPill) {
      setActivePillState(initialPill);
    }
  }, [initialPill]);

  const setActivePill = (pill: FilterPill) => {
    setActivePillState(pill);
    if (onPillChange) onPillChange(pill);
  };
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGeneratingFor, setIsGeneratingFor] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Batch Queueing State
  const [isBatchQueueing, setIsBatchQueueing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // AI Hygiene Agent State
  const [isHygieneRunning, setIsHygieneRunning] = useState(false);
  const [hygieneProgress, setHygieneProgress] = useState<string | null>(null);
  const [hygieneResult, setHygieneResult] = useState<HygieneResult | null>(null);
  const [isHygieneModalOpen, setIsHygieneModalOpen] = useState(false);

  // New Contact Form State
  const [newName, setNewName] = useState('');
  const [newProfileUrl, setNewProfileUrl] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newHeadline, setNewHeadline] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<ConnectionStatus>('NOT_CONNECTED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification helper: Intro Sent badge is strictly scoped to tags
  const checkIsIntroSent = (p: LinkedInPerson): boolean => {
    return Boolean(Array.isArray(p.tags) && p.tags.includes('Intro Sent'));
  };

  // Recruiter detection helper
  const checkIsRecruiter = (p: LinkedInPerson): boolean => {
    const text = `${p.role || ''} ${p.headline || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
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

  // Pipeline stage: 0 = Not Connected, 1 = Invited, 2 = Connected, 3 = Intro Sent
  const getPipelineStage = (p: LinkedInPerson): number => {
    if (checkIsIntroSent(p)) return 3;
    if (p.connection_status === 'CONNECTED') return 2;
    if (p.connection_status === 'INVITATION_SENT') return 1;
    return 0;
  };

  // Activity dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getContactActivityDate = (p: LinkedInPerson): string | null => {
    const connTag = (p.tags || []).find((t) => t.startsWith('Connected:'));
    if (connTag) return connTag.replace('Connected:', '').trim();
    if (p.connection_status === 'CONNECTED' && p.last_interaction_at) return p.last_interaction_at.split('T')[0];
    const invTag = (p.tags || []).find((t) => t.startsWith('Invited:'));
    if (invTag) return invTag.replace('Invited:', '').trim();
    if (p.created_at) return p.created_at.split('T')[0];
    return null;
  };

  const checkIsConnectedToday = (p: LinkedInPerson): boolean => {
    if (p.connection_status !== 'CONNECTED') return false;
    const tag = (p.tags || []).find((t) => t.startsWith('Connected:'));
    if (tag && tag.includes(todayStr)) return true;
    if (p.last_interaction_at && p.last_interaction_at.startsWith(todayStr)) return true;
    return false;
  };

  // Live filter counts
  const counts = useMemo(() => {
    const all = people.length;
    const recruiters = people.filter(checkIsRecruiter).length;
    const introSent = people.filter(checkIsIntroSent).length;
    const pendingInvites = people.filter((p) => p.connection_status === 'INVITATION_SENT').length;
    const connected = people.filter((p) => p.connection_status === 'CONNECTED').length;
    const connectedToday = people.filter(checkIsConnectedToday).length;
    return { all, recruiters, introSent, pendingInvites, connected, connectedToday };
  }, [people, todayStr]);

  // Filtered dataset
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const isIntro = checkIsIntroSent(p);
      const isRec = checkIsRecruiter(p);

      // Pill filter
      if (activePill === 'RECRUITERS' && !isRec) return false;
      if (activePill === 'INTRO_SENT' && !isIntro) return false;
      if (activePill === 'PENDING_INVITES' && p.connection_status !== 'INVITATION_SENT') return false;
      if (activePill === 'CONNECTED' && p.connection_status !== 'CONNECTED') return false;
      if (activePill === 'CONNECTED_TODAY' && !checkIsConnectedToday(p)) return false;

      // Dropdown status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'INTRO_SENT' && !isIntro) return false;
        if (statusFilter === 'NO_INTRO' && isIntro) return false;
        if (statusFilter === 'CONNECTED_NO_INTRO' && (p.connection_status !== 'CONNECTED' || isIntro)) return false;
        if (
          statusFilter !== 'INTRO_SENT' &&
          statusFilter !== 'NO_INTRO' &&
          statusFilter !== 'CONNECTED_NO_INTRO' &&
          p.connection_status !== statusFilter
        ) {
          return false;
        }
      }

      // Date filter
      const actDate = getContactActivityDate(p);
      if (customDate && actDate !== customDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.full_name.toLowerCase().includes(q);
        const matchesHeadline = Boolean(p.headline && p.headline.toLowerCase().includes(q));
        const matchesCompany = Boolean(p.company && p.company.toLowerCase().includes(q));
        const matchesRole = Boolean(p.role && p.role.toLowerCase().includes(q));
        if (!matchesName && !matchesHeadline && !matchesCompany && !matchesRole) return false;
      }

      return true;
    });
  }, [people, activePill, statusFilter, customDate, searchQuery, todayStr]);

  // Contacts needing intro from current filtered view
  const contactsNeedingIntro = useMemo(() => {
    return filteredPeople.filter(
      (p) => p.connection_status === 'CONNECTED' && !checkIsIntroSent(p)
    );
  }, [filteredPeople]);

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

  const handleRunHygiene = async () => {
    if (people.length === 0) {
      showToast('No contacts in directory to clean.');
      return;
    }

    try {
      setIsHygieneRunning(true);
      setHygieneProgress('Auditing contact names, vanity slugs, and tags...');
      const res = await networkHygieneService.runNetworkHygiene(people, (msg) => {
        setHygieneProgress(msg);
      });
      setHygieneResult(res);
      setIsHygieneModalOpen(true);
      showToast(`Hygiene complete: ${res.namesCleaned} names cleaned, ${res.contactsTagged} contacts tagged.`);
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hygiene run failed';
      alert(msg);
    } finally {
      setIsHygieneRunning(false);
      setHygieneProgress(null);
    }
  };

  // Sync Sent Requests (Dispatches to Companion Extension with automated Sent Manager fallback)
  const [isSyncingSent, setIsSyncingSent] = useState(false);
  const [isSyncingConnections, setIsSyncingConnections] = useState(false);

  const handleSyncSentRequestsWeb = () => {
    setIsSyncingSent(true);
    showToast('Dispatching Sent Requests Sync to Companion Extension...');

    let handled = false;
    const listener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MYCES_SYNC_SENT_RESULT') {
        handled = true;
        window.removeEventListener('message', listener);
        setIsSyncingSent(false);
        if (event.data.count > 0) {
          showToast(`✓ Successfully synced ${event.data.count} sent invitations!`);
          onRefresh();
        } else if (event.data.method === 'TAB_OPENED') {
          showToast('Opened LinkedIn Sent Manager to auto-scan & import invitations.');
        } else {
          showToast('Sent requests already up to date.');
        }
      }
    };

    window.addEventListener('message', listener);
    window.postMessage({ type: 'MYCES_SYNC_SENT_REQUESTS' }, '*');

    // Friendly fallback if extension is not actively bridged
    setTimeout(() => {
      if (!handled) {
        window.removeEventListener('message', listener);
        setIsSyncingSent(false);
        window.open('https://www.linkedin.com/mynetwork/invitation-manager/sent/?myces_sync=1', '_blank');
        showToast('Opened LinkedIn Sent Manager. The Job Autofill Pro extension will scan & import your sent requests.');
      }
    }, 2000);
  };

  const handleSyncAllConnectionsWeb = () => {
    setIsSyncingConnections(true);
    showToast('Querying 1st-degree connections via Voyager API...');

    let handled = false;
    const listener = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MYCES_SYNC_CONNECTIONS_RESULT') {
        handled = true;
        window.removeEventListener('message', listener);
        setIsSyncingConnections(false);
        if (event.data.newlyAdded > 0 || event.data.updated > 0) {
          showToast(`✓ Synced ${event.data.total} connections (+${event.data.newlyAdded} new, ${event.data.updated} updated)!`);
          onRefresh();
        } else if (event.data.total > 0) {
          showToast(`✓ Verified ${event.data.total} connections up to date.`);
          onRefresh();
        } else {
          showToast(event.data.message || 'Make sure you are logged into LinkedIn to sync connections.');
        }
      }
    };

    window.addEventListener('message', listener);
    window.postMessage({ type: 'MYCES_SYNC_ALL_CONNECTIONS' }, '*');

    setTimeout(() => {
      if (!handled) {
        window.removeEventListener('message', listener);
        setIsSyncingConnections(false);
        showToast('Please open the Job Autofill Pro extension popup in your browser to run 1-Click Connection Sync.');
      }
    }, 3500);
  };

  // Generate Personalized Connection Note (Strictly Akshay Kumar Sarkar Persona, <= 280 chars, NO quotes)
  const handleGenerateConnectionNote = async (person: LinkedInPerson) => {
    try {
      setIsGeneratingFor(person.id);
      const skillsStr = (context?.skills || []).slice(0, 3).join(', ');
      const prompt = `You are Akshay Kumar Sarkar, a Business Automation & Analytics Professional with 7+ years of experience in US healthcare insurance operations, analytics, reporting, and process automation (Power BI, SQL, Excel/VBA, Power Automate, Python).
Target Name: ${person.full_name}
Target Role: ${person.role || person.headline || 'Professional'}
Target Company: ${person.company || 'Leading Organization'}
Primary Tech: ${skillsStr || 'Power BI, SQL, Process Automation, Power Automate'}

TASK:
Write a personalized, humble, authentic LinkedIn connection request note.
MANDATORY RULES:
1. STRICTLY UNDER 280 CHARACTERS TOTAL (including spaces). This is a hard limit for LinkedIn.
2. DO NOT use any quotation marks anywhere in the message (no ", ', “, ”).
3. Mention their organization or shared interest in business intelligence, operations analytics, or workflow automation.
4. No cheesy sales pitch or generic fluff.
5. Output ONLY the raw message text.`;

      const rawNote = await copilotService.generateMultimodalResponse(prompt);
      let note = rawNote.trim().replace(/["'“”]/g, '');
      if (note.length > 280) {
        note = note.slice(0, 277) + '...';
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
        reasoning: `Personalized connection invitation crafted for ${person.full_name} (${person.role || 'Leader'} at ${person.company || 'Tech'}). Tailored to under 280 chars.`,
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

  // Generate Direct Outreach / Follow-up Message (Akshay Kumar Sarkar Persona, NO quotes)
  const handleGenerateMessage = async (person: LinkedInPerson) => {
    try {
      setIsGeneratingFor(person.id);
      const isIntro = checkIsIntroSent(person);
      const prompt = `You are Akshay Kumar Sarkar, a Business Automation & Analytics Professional with 7+ years of experience in US healthcare insurance operations, analytics, reporting, and process automation (Power BI, SQL, Excel/VBA, Power Automate, Python).
Reaching out to: ${person.full_name} (${person.role || 'Leader'} at ${person.company || 'their organization'}).
Message Intent: ${isIntro ? 'Follow-up on previous introduction or conversation' : 'Direct value-driven recruiter or peer intro message'}.

TASK:
Write a concise, high-value professional message (80-120 words).
Focus on:
1. Warm, respectful practitioner tone.
2. Shared challenges in business analytics, operations reporting, Power BI, or workflow automation.
3. DO NOT use quotation marks around greetings or anywhere in the text (no ", ', “, ”).
4. Concrete value without demanding an interview or favor.
5. Output ONLY the raw message content.`;

      const rawMsg = await copilotService.generateMultimodalResponse(prompt);
      const msgContent = rawMsg.trim().replace(/["'“”]/g, '');

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
        reasoning: `${isIntro ? 'Follow-up' : 'Direct outreach'} message proposed for ${person.full_name} tailored to business analytics & operations leadership.`,
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

  // Batch queue all intros for contacts needing intro in view
  const handleBatchQueueIntros = async () => {
    if (contactsNeedingIntro.length === 0 || isBatchQueueing) return;

    // Check existing actions to avoid duplicates
    let pendingOrApprovedIds = new Set<string>();
    try {
      const existing = await linkedinAgentService.fetchActions();
      pendingOrApprovedIds = new Set(
        existing
          .filter((a) => a.status === 'PENDING_APPROVAL' || a.status === 'APPROVED')
          .map((a) => a.target_id || (a.payload as { person_id?: string })?.person_id)
          .filter((id): id is string => Boolean(id))
      );
    } catch {
      // ignore
    }

    const targets = contactsNeedingIntro.filter((p) => !pendingOrApprovedIds.has(p.id));

    if (targets.length === 0) {
      showToast('All contacts in view already have intros drafted or approved!');
      return;
    }

    if (!confirm(`Batch-draft and queue personalized intros for ${targets.length} connected contact(s) for approval?`)) {
      return;
    }

    setIsBatchQueueing(true);
    setBatchProgress({ current: 0, total: targets.length });

    let successCount = 0;
    const chunkSize = 3;

    try {
      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        await Promise.allSettled(
          chunk.map(async (person) => {
            try {
              const prompt = `You are Akshay Kumar Sarkar, a Business Automation & Analytics Professional with 7+ years of experience in US healthcare insurance operations, analytics, reporting, and process automation (Power BI, SQL, Excel/VBA, Power Automate, Python).
Reaching out to: ${person.full_name} (${person.role || 'Leader'} at ${person.company || 'their organization'}).
Message Intent: Direct value-driven recruiter or peer intro message.

TASK:
Write a concise, high-value professional message (80-120 words).
Focus on:
1. Warm, respectful practitioner tone.
2. Shared challenges in business analytics, operations reporting, Power BI, or workflow automation.
3. DO NOT use quotation marks around greetings or anywhere in the text (no ", ', “, ”).
4. Concrete value without demanding an interview or favor.
5. Output ONLY the raw message content.`;

              let msgContent = '';
              try {
                const rawMsg = await copilotService.generateMultimodalResponse(prompt);
                msgContent = rawMsg.trim().replace(/["'“”]/g, '');
              } catch {
                const firstName = (person.full_name || '').split(' ')[0] || 'there';
                msgContent = `Hi ${firstName}, thank you for connecting! I have been following work at ${person.company || 'your organization'} and wanted to reach out. With 7+ years in business analytics, operations reporting, and process automation across Power BI, SQL, and Python, I always enjoy connecting with professionals in the space. Would love to stay in touch and exchange insights as opportunities evolve.`;
              }

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
                reasoning: `Direct outreach intro proposed for ${person.full_name} tailored to business analytics & operations leadership.`,
                target_id: person.id,
              });

              successCount++;
            } catch (pErr) {
              console.warn(`Failed to queue intro for ${person.full_name}:`, pErr);
            }
          })
        );

        setBatchProgress({ current: Math.min(i + chunkSize, targets.length), total: targets.length });
      }

      showToast(`✓ Queued ${successCount} intro(s) in Approvals Queue!`);
      onActionProposed();
    } catch (batchErr) {
      console.error('Batch queue error:', batchErr);
      showToast('Finished batch queue with some warnings.');
    } finally {
      setIsBatchQueueing(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  // 1-Click Toggle for Intro Sent status
  const handleToggleIntroSent = async (person: LinkedInPerson) => {
    try {
      const currentTags = Array.isArray(person.tags) ? [...person.tags] : [];
      const hasIntro = currentTags.includes('Intro Sent');
      const updatedTags = hasIntro
        ? currentTags.filter((t) => t !== 'Intro Sent')
        : Array.from(new Set([...currentTags, 'Intro Sent']));

      await linkedinAgentService.updatePerson(person.id, {
        tags: updatedTags,
        last_interaction_at: hasIntro ? person.last_interaction_at : new Date().toISOString(),
      });

      showToast(
        hasIntro
          ? `Removed Intro Sent tag from ${person.full_name}`
          : `Marked ${person.full_name} as Intro Sent ✓`
      );
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update tag';
      showToast(msg);
    }
  };

  // Render relationship pipeline tracker
  const renderPipeline = (stage: number, person?: LinkedInPerson) => {
    const steps = [
      { num: 1, label: 'Invited' },
      { num: 2, label: 'Connected' },
      { num: 3, label: 'Intro Sent' },
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {steps.map((st, i) => {
          const isDone = stage >= st.num;
          const isCurrent = stage === st.num;
          const isIntroStep = st.num === 3;
          return (
            <React.Fragment key={st.label}>
              <div
                onClick={() => {
                  if (isIntroStep && person && person.connection_status === 'CONNECTED') {
                    handleToggleIntroSent(person);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.675rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isDone ? (st.num === 3 ? '#38bdf8' : '#10b981') : 'var(--text-muted)',
                  opacity: isDone ? 1 : 0.4,
                  cursor: isIntroStep && person && person.connection_status === 'CONNECTED' ? 'pointer' : 'default',
                }}
                title={
                  isIntroStep && person && person.connection_status === 'CONNECTED'
                    ? isDone
                      ? 'Click to remove Intro Sent'
                      : 'Click to mark as Intro Sent'
                    : undefined
                }
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isDone ? (st.num === 3 ? '#38bdf8' : '#10b981') : 'var(--text-muted)',
                    boxShadow: isCurrent ? `0 0 6px ${st.num === 3 ? '#38bdf8' : '#10b981'}` : 'none',
                  }}
                />
                <span>{st.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight size={10} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
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

      {/* Filter Pills with Live Counters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActivePill('ALL')}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activePill === 'ALL' ? '1px solid #0a66c2' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activePill === 'ALL' ? 'rgba(10, 102, 194, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activePill === 'ALL' ? '#38bdf8' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>All</span>
          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({counts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePill('RECRUITERS')}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activePill === 'RECRUITERS' ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activePill === 'RECRUITERS' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activePill === 'RECRUITERS' ? '#c084fc' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Recruiters</span>
          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({counts.recruiters})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePill('INTRO_SENT')}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activePill === 'INTRO_SENT' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activePill === 'INTRO_SENT' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activePill === 'INTRO_SENT' ? '#38bdf8' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Intro Sent</span>
          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({counts.introSent})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePill('PENDING_INVITES')}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activePill === 'PENDING_INVITES' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activePill === 'PENDING_INVITES' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activePill === 'PENDING_INVITES' ? '#fbbf24' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Pending Invites</span>
          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({counts.pendingInvites})</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePill('CONNECTED')}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activePill === 'CONNECTED' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activePill === 'CONNECTED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activePill === 'CONNECTED' ? '#34d399' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Connected</span>
          <span style={{ opacity: 0.8, fontSize: '0.7rem' }}>({counts.connected})</span>
        </button>

        {/* Connected Today Pill */}
        <button
          type="button"
          onClick={() => {
            setActivePill('CONNECTED_TODAY');
            setCustomDate('');
          }}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activePill === 'CONNECTED_TODAY' && !customDate ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activePill === 'CONNECTED_TODAY' && !customDate ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
            color: activePill === 'CONNECTED_TODAY' && !customDate ? '#34d399' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease',
            boxShadow: activePill === 'CONNECTED_TODAY' && !customDate ? '0 0 10px rgba(16, 185, 129, 0.25)' : 'none',
          }}
          title="Filter contacts who accepted your connection request today"
        >
          <span>Connected Today</span>
          <span
            style={{
              opacity: activePill === 'CONNECTED_TODAY' && !customDate ? 1 : 0.8,
              fontSize: '0.7rem',
              color: activePill === 'CONNECTED_TODAY' && !customDate ? '#34d399' : 'inherit',
              fontWeight: 700,
            }}
          >
            ({counts.connectedToday})
          </span>
        </button>

        {/* All Statuses Dropdown beside Connected Today */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: '32px',
            boxSizing: 'border-box',
            padding: '0 0.75rem',
            borderRadius: '999px',
            border: statusFilter !== 'ALL' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
            background: statusFilter !== 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
            color: statusFilter !== 'ALL' ? '#38bdf8' : 'var(--text-muted)',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          title="Filter contacts by relationship status"
        >
          <option value="ALL" style={{ background: '#0f172a', color: '#f8fafc' }}>All Statuses</option>
          <option value="CONNECTED_NO_INTRO" style={{ background: '#0f172a', color: '#f8fafc' }}>Connected (Needs Intro)</option>
          <option value="NO_INTRO" style={{ background: '#0f172a', color: '#f8fafc' }}>Without Intro Sent</option>
          <option value="INTRO_SENT" style={{ background: '#0f172a', color: '#f8fafc' }}>Intro Sent</option>
          <option value="CONNECTED" style={{ background: '#0f172a', color: '#f8fafc' }}>Connected</option>
          <option value="INVITATION_SENT" style={{ background: '#0f172a', color: '#f8fafc' }}>Invitation Sent</option>
          <option value="PENDING_OUTREACH" style={{ background: '#0f172a', color: '#f8fafc' }}>Pending Outreach</option>
          <option value="NOT_CONNECTED" style={{ background: '#0f172a', color: '#f8fafc' }}>Not Connected</option>
        </select>

        {/* Modern Date Picker Pill & Popover alongside Connected Today */}
        <div ref={datePickerRef} style={{ position: 'relative', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          {customDate ? (
            <div
              style={{
                height: '32px',
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '999px',
                border: '1px solid #38bdf8',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                padding: '0 0.45rem 0 0.75rem',
                gap: '0.45rem',
                fontSize: '0.775rem',
                fontWeight: 700,
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)',
              }}
            >
              <span
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                style={{ cursor: 'pointer' }}
                title="Change selected date"
              >
                {formatDateDisplay(customDate)}
              </span>
              <button
                type="button"
                onClick={() => setCustomDate('')}
                style={{
                  background: 'rgba(56, 189, 248, 0.25)',
                  border: 'none',
                  color: '#38bdf8',
                  borderRadius: '999px',
                  width: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: 0,
                }}
                title="Clear date filter"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              style={{
                height: '32px',
                boxSizing: 'border-box',
                padding: '0 0.75rem',
                borderRadius: '999px',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: isDatePickerOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isDatePickerOpen ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                color: isDatePickerOpen ? '#38bdf8' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Pick Day ▾</span>
            </button>
          )}

          {/* Floating Modern Dark-Glass Calendar Popover */}
          {isDatePickerOpen && (() => {
            const calYear = calendarViewDate.getFullYear();
            const calMonth = calendarViewDate.getMonth();
            const monthName = calendarViewDate.toLocaleString('default', { month: 'long' });
            const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const startDayOfWeek = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Mon = 0

            return (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 50,
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '0.75rem',
                  padding: '0.85rem',
                  width: '260px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                {/* Month & Nav Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setCalendarViewDate(new Date(calYear, calMonth - 1, 1))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-main)',
                      borderRadius: '0.35rem',
                      cursor: 'pointer',
                      padding: '0.25rem 0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {monthName} {calYear}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCalendarViewDate(new Date(calYear, calMonth + 1, 1))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-main)',
                      borderRadius: '0.35rem',
                      cursor: 'pointer',
                      padding: '0.25rem 0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDate(todayStr);
                      setActivePill('ALL');
                      setIsDatePickerOpen(false);
                    }}
                    style={{
                      padding: '0.3rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      background: customDate === todayStr ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: customDate === todayStr ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: customDate === todayStr ? '#38bdf8' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setCustomDate(y.toISOString().split('T')[0]);
                      setActivePill('ALL');
                      setIsDatePickerOpen(false);
                    }}
                    style={{
                      padding: '0.3rem',
                      borderRadius: '0.35rem',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Yesterday
                  </button>
                </div>

                {/* Day of Week Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.675rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const currentIso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isSelected = customDate === currentIso;
                    const isToday = todayStr === currentIso;

                    return (
                      <button
                        key={currentIso}
                        type="button"
                        onClick={() => {
                          setCustomDate(currentIso);
                          setActivePill('ALL');
                          setIsDatePickerOpen(false);
                        }}
                        style={{
                          padding: '0.35rem 0',
                          borderRadius: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: isSelected || isToday ? 700 : 500,
                          background: isSelected ? '#38bdf8' : isToday ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                          border: isSelected ? '1px solid #38bdf8' : isToday ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                          color: isSelected ? '#0f172a' : isToday ? '#10b981' : 'var(--text-main)',
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Clear */}
                {customDate && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDate('');
                        setIsDatePickerOpen(false);
                      }}
                      style={{
                        fontSize: '0.725rem',
                        color: '#ef4444',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Reset Filter
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Top Controls: Search Bar, Status Dropdown, View Mode Toggle, Add Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
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
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* View Mode Toggle: Grid vs Table */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '0.35rem',
                border: 'none',
                background: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'grid' ? '#38bdf8' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.775rem',
                fontWeight: 600,
              }}
              title="Grid View"
            >
              <LayoutGrid size={14} />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '0.35rem',
                border: 'none',
                background: viewMode === 'table' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: viewMode === 'table' ? '#38bdf8' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.775rem',
                fontWeight: 600,
              }}
              title="Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>

          {/* Sync Sent Requests */}
          <button
            type="button"
            onClick={handleSyncSentRequestsWeb}
            disabled={isSyncingSent}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.8rem',
              fontSize: '0.825rem',
              background: 'rgba(13, 148, 136, 0.15)',
              border: '1px solid rgba(13, 148, 136, 0.45)',
              color: '#2dd4bf',
              borderRadius: '0.5rem',
              cursor: isSyncingSent ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            title="Sync all pending sent requests from LinkedIn into MYCES directory"
          >
            {isSyncingSent ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Syncing Sent...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Sync Sent Requests</span>
              </>
            )}
          </button>

          {/* Sync 1st-Degree Connections */}
          <button
            type="button"
            onClick={handleSyncAllConnectionsWeb}
            disabled={isSyncingConnections}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.8rem',
              fontSize: '0.825rem',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.45)',
              color: '#60a5fa',
              borderRadius: '0.5rem',
              cursor: isSyncingConnections ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            title="Import all 1st-degree connections from LinkedIn to MYCES directory via Voyager API"
          >
            {isSyncingConnections ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Syncing Conn...</span>
              </>
            ) : (
              <>
                <UserCheck size={14} />
                <span>Sync Connections</span>
              </>
            )}
          </button>

          {/* AI Network Hygiene Action */}
          <button
            type="button"
            onClick={handleRunHygiene}
            disabled={isHygieneRunning}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              fontSize: '0.825rem',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2), rgba(59, 130, 246, 0.2))',
              border: '1px solid rgba(168, 85, 247, 0.45)',
              color: '#c084fc',
              borderRadius: '0.5rem',
              cursor: isHygieneRunning ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            title="Clean bloated names (strip emojis, pronouns, credential spam), auto-tag domains, deduplicate contacts"
          >
            {isHygieneRunning ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{hygieneProgress ? 'Cleaning...' : 'Running...'}</span>
              </>
            ) : (
              <>
                <Wand2 size={14} />
                <span>Run AI Hygiene</span>
              </>
            )}
          </button>

          {/* Queue All Intros for Approval */}
          {contactsNeedingIntro.length > 0 && (
            <button
              type="button"
              onClick={handleBatchQueueIntros}
              disabled={isBatchQueueing}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                fontSize: '0.825rem',
                background: 'rgba(168, 85, 247, 0.18)',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#c084fc',
                borderRadius: '0.5rem',
                cursor: isBatchQueueing ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                transition: 'all 0.15s ease',
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.2)',
              }}
              title="Batch-draft personalized AI intro messages for all connected contacts in view and queue them in Approvals"
            >
              {isBatchQueueing ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Queueing ({batchProgress.current}/{batchProgress.total})...</span>
                </>
              ) : (
                <>
                  <MessageSquare size={14} />
                  <span>Queue All Intros ({contactsNeedingIntro.length})</span>
                </>
              )}
            </button>
          )}

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
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Directory Content */}
      {filteredPeople.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            borderRadius: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(15, 23, 42, 0.4)',
          }}
        >
          <Users size={32} color="var(--text-muted)" />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            {searchQuery ? 'No contacts match your query.' : 'No Tracked Contacts Yet'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
            Add recruiters, hiring managers, and data analytics peers to dispatch 1-Click connection requests and follow-ups.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-secondary"
            style={{ marginTop: '0.5rem', fontSize: '0.825rem' }}
          >
            <Plus size={14} style={{ display: 'inline', marginRight: '0.3rem' }} /> Add First Contact
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div
          style={{
            overflowX: 'auto',
            borderRadius: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(6, 10, 18, 0.4)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Contact</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Company</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Role & Headline</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Relationship Pipeline</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map((person) => {
                const stage = getPipelineStage(person);
                const isProcessing = isGeneratingFor === person.id;
                const isIntro = checkIsIntroSent(person);
                const isConnected = person.connection_status === 'CONNECTED';

                return (
                  <tr
                    key={person.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            background: checkIsRecruiter(person)
                              ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                              : 'linear-gradient(135deg, #0a66c2, #0284c7)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {person.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{person.full_name}</span>
                            {checkIsRecruiter(person) && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: '#c084fc',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                  fontWeight: 600,
                                }}
                              >
                                Recruiter
                              </span>
                            )}
                          </div>
                          <a
                            href={person.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.725rem',
                              color: '#0a66c2',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Profile</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      {person.company ? (
                        <span
                          style={{
                            fontSize: '0.725rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-main)',
                            fontWeight: 500,
                          }}
                        >
                          {person.company}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 1rem', maxWidth: '260px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {person.role || 'Analytics Peer'}
                      </div>
                      {person.headline && (
                        <div
                          style={{
                            fontSize: '0.725rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={person.headline}
                        >
                          {person.headline}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      {renderPipeline(stage, person)}
                    </td>

                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isConnected ? (
                          <button
                            type="button"
                            onClick={() => handleGenerateMessage(person)}
                            disabled={isProcessing}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.725rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              border: isIntro ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                              color: isIntro ? '#38bdf8' : '#10b981',
                            }}
                          >
                            <MessageSquare size={12} />
                            <span>{isProcessing ? 'Drafting...' : isIntro ? 'Follow-up' : 'Send Intro'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateConnectionNote(person)}
                            disabled={isProcessing}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.725rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Sparkles size={12} color="#10b981" />
                            <span>{isProcessing ? 'Generating...' : 'Connect Note'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(person.id, person.full_name)}
                          className="btn btn-secondary"
                          title="Delete contact"
                          style={{ padding: '0.35rem', color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* SLEEK MICRO-CARDS GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '0.9rem',
          }}
        >
          {filteredPeople.map((person) => {
            const isProcessing = isGeneratingFor === person.id;
            const stage = getPipelineStage(person);
            const isIntro = checkIsIntroSent(person);
            const isRecruiter = checkIsRecruiter(person);
            const isConnected = person.connection_status === 'CONNECTED';

            return (
              <div
                key={person.id}
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(16px)',
                  border: isIntro
                    ? '1px solid rgba(56, 189, 248, 0.25)'
                    : isRecruiter
                    ? '1px solid rgba(139, 92, 246, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* Person Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', minWidth: 0 }}>
                    <div
                      style={{
                        width: '2.35rem',
                        height: '2.35rem',
                        borderRadius: '50%',
                        background: isRecruiter
                          ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                          : 'linear-gradient(135deg, #0a66c2, #0284c7)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {person.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {person.full_name}
                        </h4>
                        {isRecruiter && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#c084fc',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              fontWeight: 600,
                            }}
                          >
                            Recruiter
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {person.role || 'Analytics Peer'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(person.id, person.full_name)}
                    className="btn btn-secondary"
                    title="Delete contact"
                    style={{ padding: '0.25rem', color: '#ef4444', flexShrink: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Company Tag & Profile Link */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  {person.company ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-main)',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '180px',
                      }}
                      title={person.company}
                    >
                      🏢 {person.company}
                    </span>
                  ) : (
                    <span />
                  )}

                  <a
                    href={person.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.725rem',
                      color: '#0a66c2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>LinkedIn</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                {/* Headline Snippet */}
                {person.headline && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {person.headline}
                  </p>
                )}

                {/* Relationship Pipeline Stages Indicator */}
                <div
                  style={{
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    background: 'rgba(6, 10, 18, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {renderPipeline(stage, person)}
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => handleToggleIntroSent(person)}
                      style={{
                        background: isIntro ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                        border: isIntro ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isIntro ? '#38bdf8' : 'var(--text-muted)',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={isIntro ? 'Click to remove Intro Sent tag' : 'Click to mark as Intro Sent (if messaged on LinkedIn)'}
                    >
                      {isIntro ? '✓ Intro Sent' : '+ Mark Intro'}
                    </button>
                  )}
                </div>

                {/* Contextual Action Buttons */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isConnected ? '1fr 1fr' : '1fr',
                    gap: '0.45rem',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={() => handleGenerateConnectionNote(person)}
                      disabled={isProcessing}
                      className="btn btn-secondary"
                      title="Generate personalized 280-char connection invitation"
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
                      <span>{isProcessing ? 'Generating...' : person.connection_status === 'INVITATION_SENT' ? 'Regenerate Note' : 'Connect Note'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleGenerateConnectionNote(person)}
                        disabled={isProcessing}
                        className="btn btn-secondary"
                        title="Connection Note"
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
                        <span>Note</span>
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
                          border: isIntro ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                          color: isIntro ? '#38bdf8' : '#10b981',
                        }}
                      >
                        <MessageSquare size={12} />
                        <span>{isProcessing ? 'Drafting...' : isIntro ? 'Follow-up' : 'Send Intro'}</span>
                      </button>
                    </>
                  )}
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
            backdropFilter: 'blur(8px)',
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
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.6)',
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.6)',
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
                    placeholder="e.g. UnitedHealth Group"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(6, 10, 18, 0.6)',
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
                    placeholder="e.g. Lead Talent Partner"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(6, 10, 18, 0.6)',
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
                  placeholder="e.g. Hiring Analytics & Automation Talent"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.6)',
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.6)',
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

      {/* AI Network Hygiene Report Modal */}
      {isHygieneModalOpen && hygieneResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              background: '#0d131f',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '0.85rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'linear-gradient(90deg, rgba(147, 51, 234, 0.12), transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    AI Network Hygiene & Normalization
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Automated directory audit, name sanitization, auto-tagging, and deduplication
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHygieneModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Metrics Row */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
                    {hygieneResult.totalProcessed}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Audited Profiles
                  </div>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                    {hygieneResult.namesCleaned}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6ee7b7', marginTop: '0.2rem' }}>
                    Names Cleaned
                  </div>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc' }}>
                    {hygieneResult.contactsTagged}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#d8b4fe', marginTop: '0.2rem' }}>
                    Auto-Tagged
                  </div>
                </div>

                <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                    {hygieneResult.duplicatesMerged}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fde68a', marginTop: '0.2rem' }}>
                    Merged Dups
                  </div>
                </div>
              </div>

              {/* Explanatory rules badge */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                  fontSize: '0.775rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Normalization Rules Applied:</strong> Emojis, pronouns <em>(he/him)</em>, bracketed tags, and credential suffixes <em>(MBA, PMP, Ph.D, Hiring)</em> stripped from names. Standardized role & domain tags <em>(Healthcare, Consulting, Recruiter, BI)</em> auto-assigned.
                </span>
              </div>

              {/* Action Log / Details */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Audit & Normalization Log ({hygieneResult.details.length} actions)
                </h4>
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    borderRadius: '0.5rem',
                    background: 'rgba(6, 10, 18, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {hygieneResult.details.length > 0 ? (
                    hygieneResult.details.map((item, idx) => (
                      <div key={idx} style={{ color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: '#10b981' }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>
                      All contacts already meet pristine hygiene standards. No corrupted names or duplicates detected!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(6, 10, 18, 0.4)',
              }}
            >
              <button
                type="button"
                onClick={() => setIsHygieneModalOpen(false)}
                className="btn btn-primary"
                style={{
                  background: '#0a66c2',
                  borderColor: '#0a66c2',
                  padding: '0.45rem 1.25rem',
                  fontSize: '0.825rem',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
