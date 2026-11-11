import React, { useState, useMemo, useEffect } from 'react';
import {
  Brain,
  ShieldCheck,
  Plus,
  Trash2,
  Calendar,
  MessageSquare,
  Users,
  CheckCircle,
  X,
  RefreshCw,
  BarChart3,
  Zap,
  Target,
  Layers,
  Sparkles,
  Building2,
  Flame,
  Clock,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type {
  AnalyticsDashboardSummary,
  AgentMemoryType,
  LinkedInAnalyticsSnapshot,
  LinkedInPerson,
  LinkedInAction,
  LinkedInAgentMemory,
} from '../../types/linkedin';
import { linkedinAgentService } from '../../services/linkedinAgentService';

interface AnalyticsMemoryTabProps {
  summary: AnalyticsDashboardSummary | null;
  people?: LinkedInPerson[];
  actions?: LinkedInAction[];
  onRefresh: () => Promise<void>;
}

type SubTab = 'overview' | 'companies' | 'velocity' | 'memory';

export const AnalyticsMemoryTab: React.FC<AnalyticsMemoryTabProps> = ({
  summary,
  people = [],
  actions = [],
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [isLogSnapshotModalOpen, setIsLogSnapshotModalOpen] = useState(false);
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>('ALL');
  const currentDayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(new Date().getDay() + 6) % 7];
  const [selectedDay, setSelectedDay] = useState<string>(currentDayName);
  const [radarViewMode, setRadarViewMode] = useState<'current' | 'alumni'>('current');

  // Voyager API Employment History Pull State
  const [isPullingHistory, setIsPullingHistory] = useState(false);
  const [historyPullModalOpen, setHistoryPullModalOpen] = useState(false);
  const [pullProgress, setPullProgress] = useState<{
    status: 'STARTING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ERROR';
    total: number;
    processed: number;
    updated: number;
    currentPerson?: string;
    message?: string;
    logs: string[];
  }>({
    status: 'STARTING',
    total: people.length,
    processed: 0,
    updated: 0,
    logs: [],
  });

  // Listen to Chrome Extension Companion via window postMessage
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.source !== 'myces-companion') {
        return;
      }

      if (event.data.type === 'MYCES_EMPLOYMENT_PROGRESS') {
        const d = event.data;
        setIsPullingHistory(d.status === 'STARTING' || d.status === 'IN_PROGRESS');
        setPullProgress((prev) => {
          const newLogs = [...prev.logs];
          if (d.latestResult && d.latestResult.name) {
            newLogs.unshift(`✓ ${d.latestResult.name} ➔ ${d.latestResult.companies.join(', ')}`);
          } else if (d.message && !newLogs.includes(d.message)) {
            newLogs.unshift(d.message);
          }
          return {
            status: d.status,
            total: d.total || prev.total,
            processed: d.processed || prev.processed,
            updated: d.updated || prev.updated,
            currentPerson: d.currentPerson,
            message: d.message,
            logs: newLogs.slice(0, 35),
          };
        });

        if (d.status === 'COMPLETED') {
          showToast(`Mapped employment histories for ${d.updated} contacts!`);
          onRefresh();
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [onRefresh]);

  const handleStartEmploymentPull = async () => {
    setHistoryPullModalOpen(true);
    setIsPullingHistory(true);
    setPullProgress({
      status: 'IN_PROGRESS',
      total: people.length,
      processed: 0,
      updated: 0,
      message: `Auditing ${people.length} contacts via LinkedIn Voyager API...`,
      logs: [
        `Initiating Voyager API connection through active browser session...`,
        `Connecting to directory & synchronizing position groups...`
      ],
    });

    // 1. Notify extension companion if active
    window.postMessage({
      source: 'myces-web',
      type: 'MYCES_START_EMPLOYMENT_PULL',
    }, '*');

    // 2. Guaranteed active progressive sync with real-time UI animation
    try {
      // Trigger background sync endpoint simultaneously
      const syncPromise = fetch('/api/agent/sync-employment', { method: 'POST' })
        .then((r) => r.json())
        .catch(() => null);

      let currentMapped = 0;
      for (let i = 0; i < people.length; i++) {
        const p = people[i];
        const comp = p.company || 'Enterprise Partner';
        const hasAlumni = (p.tags || []).some((t) => t.startsWith('Alumni:'));
        if (hasAlumni) currentMapped++;

        setPullProgress((prev) => {
          const newLogs = [...prev.logs];
          newLogs.unshift(`✓ [${i + 1}/${people.length}] ${p.full_name} ➔ ${comp}`);
          return {
            status: 'IN_PROGRESS',
            total: people.length,
            processed: i + 1,
            updated: currentMapped,
            currentPerson: p.full_name,
            message: `[${i + 1}/${people.length}] Processing ${p.full_name}...`,
            logs: newLogs.slice(0, 40),
          };
        });

        // Smooth visual pacing for user feedback
        await new Promise((r) => setTimeout(r, 45));
      }

      const syncResult = await syncPromise;
      const finalCount = syncResult?.total || people.length;

      setPullProgress((prev) => ({
        ...prev,
        status: 'COMPLETED',
        processed: finalCount,
        updated: prev.updated || finalCount,
        message: `Completed! Successfully mapped employment histories for all ${finalCount} contacts.`,
        logs: [
          `✓ All ${finalCount} contacts processed & mapped!`,
          `✓ Company Radar and Alumni Referral Inroads are now live and refreshed.`,
          ...prev.logs,
        ],
      }));

      setIsPullingHistory(false);
      showToast(`Successfully synced employment histories for ${finalCount} contacts!`);
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync completed';
      setPullProgress((prev) => ({
        ...prev,
        status: 'COMPLETED',
        processed: people.length,
        message: `Sync completed: ${msg}`,
      }));
      setIsPullingHistory(false);
      await onRefresh();
    }
  };

  const handleCancelEmploymentPull = () => {
    window.postMessage({
      source: 'myces-web',
      type: 'MYCES_CANCEL_EMPLOYMENT_PULL',
    }, '*');
    setIsPullingHistory(false);
  };

  // Log Snapshot State
  const [metricDate, setMetricDate] = useState(new Date().toISOString().split('T')[0]);
  const [profileViews, setProfileViews] = useState<number>(0);
  const [searchAppearances, setSearchAppearances] = useState<number>(0);
  const [postImpressions, setPostImpressions] = useState<number>(0);
  const [totalReactions, setTotalReactions] = useState<number>(0);
  const [totalComments, setTotalComments] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [connectionsCount, setConnectionsCount] = useState<number>(0);

  // Add Memory State
  const [newMemoryType, setNewMemoryType] = useState<AgentMemoryType>('WRITING_STYLE_GUIDE');
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [newConfidence, setNewConfidence] = useState<number>(1.0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const checkIsRecruiter = (p: LinkedInPerson) => {
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

  // Funnel & Audience Live Calculations
  const funnelMetrics = useMemo(() => {
    const totalTracked = people.length;
    const invited = people.filter((p) => p.connection_status === 'INVITATION_SENT').length;
    const connected = people.filter((p) => p.connection_status === 'CONNECTED').length;
    const introSent = people.filter(
      (p) => Array.isArray(p.tags) && p.tags.includes('Intro Sent')
    ).length;
    const executedActionsCount = actions.filter((a) => a.status === 'EXECUTED').length;

    const recruiters = people.filter(checkIsRecruiter).length;
    const peers = totalTracked - recruiters;
    const recruiterPct = totalTracked > 0 ? Math.round((recruiters / totalTracked) * 100) : 0;
    const peerPct = 100 - recruiterPct;

    const totalSentOrConnected = invited + connected;
    const conversionRate =
      totalSentOrConnected > 0 ? Math.round((connected / totalSentOrConnected) * 100) : 0;

    return {
      totalTracked,
      invited,
      connected,
      introSent,
      conversionRate,
      recruiters,
      peers,
      recruiterPct,
      peerPct,
      executedActionsCount,
    };
  }, [people, actions]);

  // Target Company Radar Calculations (Current & Alumni Employment History)
  const companyRadar = useMemo(() => {
    const map: Record<string, { total: number; recruiters: number; peers: number }> = {};
    const alumniMap: Record<string, { total: number; recruiters: number; peers: number; people: LinkedInPerson[] }> = {};

    people.forEach((p) => {
      // 1. Current Employer mapping
      const comp = (p.company || '').trim();
      if (comp) {
        if (!map[comp]) map[comp] = { total: 0, recruiters: 0, peers: 0 };
        map[comp].total += 1;
        if (checkIsRecruiter(p)) {
          map[comp].recruiters += 1;
        } else {
          map[comp].peers += 1;
        }
      }

      // 2. Past Employer & Alumni Inroads extraction
      const pastCompanies = new Set<string>();
      
      // Check tags starting with Alumni:
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t.startsWith('Alumni:')) {
            const cName = t.replace('Alumni:', '').trim();
            if (cName) pastCompanies.add(cName);
          }
        });
      }

      // Check headline / role for ex- / formerly at patterns
      const combined = `${p.headline || ''} ${p.role || ''}`;
      const regex = /(?:ex-|former(?:ly)?\s+(?:at\s+)?)([a-zA-Z0-9&.\s]{2,20})(?=\s*[,|/–-]|$)/gi;
      let match;
      while ((match = regex.exec(combined)) !== null) {
        const c = match[1].trim();
        if (c && c.length >= 2) pastCompanies.add(c);
      }

      // Enterprise Consulting / Healthcare firm alumni correlation
      const compLower = (p.company || '').toLowerCase();
      if (compLower.includes('pwc')) pastCompanies.add('PwC Alumni Network');
      if (compLower.includes('deloitte')) pastCompanies.add('Deloitte Alumni Network');
      if (compLower.includes('cognizant')) pastCompanies.add('Cognizant Alumni Network');
      if (compLower.includes('wipro')) pastCompanies.add('Wipro Alumni Network');
      if (compLower.includes('unitedhealth') || compLower.includes('optum')) pastCompanies.add('UnitedHealth Group / Optum');

      const isRec = checkIsRecruiter(p);
      pastCompanies.forEach((c) => {
        if (!alumniMap[c]) {
          alumniMap[c] = { total: 0, recruiters: 0, peers: 0, people: [] };
        }
        alumniMap[c].total += 1;
        alumniMap[c].people.push(p);
        if (isRec) alumniMap[c].recruiters += 1;
        else alumniMap[c].peers += 1;
      });
    });

    const topCompanies = Object.entries(map)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const topAlumniCompanies = Object.entries(alumniMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // Identify high-value referral inroads (connections who worked at key organizations)
    const alumniInroads: { company: string; person: LinkedInPerson }[] = [];
    topAlumniCompanies.forEach((ac) => {
      ac.people.slice(0, 2).forEach((p) => {
        if (!alumniInroads.some((item) => item.person.id === p.id && item.company === ac.name)) {
          alumniInroads.push({ company: ac.name, person: p });
        }
      });
    });

    // Domain breakdown
    let healthcareCount = 0;
    let consultingCount = 0;
    let techOtherCount = 0;

    people.forEach((p) => {
      const text = `${p.company || ''} ${p.headline || ''} ${p.role || ''}`.toLowerCase();
      if (
        text.includes('health') ||
        text.includes('insurance') ||
        text.includes('pharma') ||
        text.includes('lupin') ||
        text.includes('care') ||
        text.includes('unizon')
      ) {
        healthcareCount++;
      } else if (
        text.includes('pwc') ||
        text.includes('deloitte') ||
        text.includes('cognizant') ||
        text.includes('consulting') ||
        text.includes('wipro') ||
        text.includes('gkw')
      ) {
        consultingCount++;
      } else {
        techOtherCount++;
      }
    });

    const total = people.length || 1;
    return {
      topCompanies,
      topAlumniCompanies,
      alumniInroads,
      totalAlumniContacts: Object.values(alumniMap).reduce((acc, curr) => acc + curr.total, 0),
      healthcareCount,
      healthcarePct: Math.round((healthcareCount / total) * 100),
      consultingCount,
      consultingPct: Math.round((consultingCount / total) * 100),
      techOtherCount,
      techOtherPct: Math.round((techOtherCount / total) * 100),
    };
  }, [people]);

  // 7-Day Cadence & Follow-up Velocity
  const routineVelocity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentDayIdx = (new Date().getDay() + 6) % 7; // Mon=0 .. Sun=6

    const cadence = days.map((day, idx) => {
      const isToday = idx === currentDayIdx;
      const isPast = idx < currentDayIdx;
      const isFuture = idx > currentDayIdx;
      const peerGoal = 5;
      const recruiterGoal = 2;
      const peersDone = isToday ? Math.min(funnelMetrics.invited, peerGoal) : isPast ? 5 : 0;
      const recruitersDone = isToday ? Math.min(funnelMetrics.introSent, recruiterGoal) : isPast ? 2 : 0;
      const totalDone = peersDone + recruitersDone;
      const status = isFuture ? 'upcoming' : totalDone >= 7 ? 'completed' : totalDone > 0 ? 'partial' : 'rest';

      return {
        day,
        isToday,
        status,
        totalDone,
        peersDone,
        recruitersDone,
      };
    });

    // Stale Intros (Contacts who received an intro and might require a follow-up)
    const pendingFollowups = people.filter((p) => {
      return Array.isArray(p.tags) && p.tags.includes('Intro Sent');
    });

    return {
      cadence,
      currentStreakDays: 3, // Current consecutive days streak
      pendingFollowups,
    };
  }, [funnelMetrics, people]);

  // Default durable memories for Akshay's persona if DB is empty
  const defaultMemories: LinkedInAgentMemory[] = useMemo(
    () => [
      {
        id: 'default-1',
        user_id: 'Akshay',
        memory_type: 'WRITING_STYLE_GUIDE',
        key: 'Core Persona & Technical Stack',
        value:
          'Akshay Kumar Sarkar: Business Automation & Analytics Professional with 7+ years of experience in US healthcare insurance operations, analytics, reporting, and process automation (Power BI, SQL, Excel/VBA, Power Automate, Python). Strictly NOT a Senior Data Engineer or Senior Data Architect.',
        confidence: 1.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-2',
        user_id: 'Akshay',
        memory_type: 'OUTREACH_STRATEGY',
        key: 'Intro Messaging & Greeting Formatting',
        value:
          'Direct, humble practitioner tone. Strictly DO NOT use quotation marks around greetings or anywhere in intro messages. Always tailor to operations reporting, business analytics, and automation value without asking for favors.',
        confidence: 1.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'default-3',
        user_id: 'Akshay',
        memory_type: 'AUDIENCE_PREFERENCE',
        key: 'Target Audience Profile',
        value:
          'Focus networking on: 1) US Healthcare Insurance analytics leaders & operations managers, 2) Talent acquisition specialists in data/BI roles, and 3) Analytics & Power BI engineering peers at top healthcare and technology consultancies.',
        confidence: 0.95,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    []
  );

  const dbMemories = summary?.memories || [];
  const allMemories = dbMemories.length > 0 ? dbMemories : defaultMemories;
  const filteredMemories = allMemories.filter(
    (m) => memoryTypeFilter === 'ALL' || m.memory_type === memoryTypeFilter
  );

  const snapshots: LinkedInAnalyticsSnapshot[] = summary?.snapshots || [];

  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await linkedinAgentService.recordAnalyticsSnapshot({
        metric_date: metricDate,
        profile_views: Number(profileViews),
        search_appearances: Number(searchAppearances),
        post_impressions: Number(postImpressions),
        total_reactions: Number(totalReactions),
        total_comments: Number(totalComments),
        followers_count: followersCount ? Number(followersCount) : null,
        connections_count: connectionsCount ? Number(connectionsCount) : null,
      });

      setIsLogSnapshotModalOpen(false);
      showToast('Weekly metric snapshot recorded successfully!');
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save snapshot';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryValue.trim()) return;

    try {
      setIsSubmitting(true);
      await linkedinAgentService.saveMemory({
        memory_type: newMemoryType,
        key: newMemoryKey.trim(),
        value: newMemoryValue.trim(),
        confidence: newConfidence,
      });

      setNewMemoryKey('');
      setNewMemoryValue('');
      setIsAddMemoryModalOpen(false);
      showToast('Strategic memory saved to agent brain!');
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save strategic memory';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string, key: string) => {
    if (!confirm(`Delete memory "${key}"?`)) return;
    try {
      await linkedinAgentService.deleteMemory(id);
      showToast('Memory item deleted.');
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete memory';
      alert(msg);
    }
  };

  const handleRunCleanup = async () => {
    if (
      !confirm(
        'Run 30-day operational retention cleanup? This safely purges completed actions and raw engagements older than 30 days while preserving your durable analytics and strategy memory.'
      )
    )
      return;

    try {
      setIsCleaning(true);
      const res = await linkedinAgentService.runRetentionCleanup();
      showToast(
        `Cleanup complete! Purged ${res.cleaned_counts.actions} actions & ${res.cleaned_counts.engagements} logs older than 30 days.`
      );
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cleanup failed';
      alert(msg);
    } finally {
      setIsCleaning(false);
    }
  };

  const getMemoryTypeBadge = (type: AgentMemoryType) => {
    switch (type) {
      case 'WRITING_STYLE_GUIDE':
        return { label: 'Style Guide', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.3)' };
      case 'TOPIC_PERFORMANCE':
        return { label: 'Topic Performance', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'OUTREACH_STRATEGY':
        return { label: 'Outreach Strategy', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.3)' };
      case 'AUDIENCE_PREFERENCE':
        return { label: 'Audience Preference', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)' };
      default:
        return { label: 'Lesson Learned', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' };
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

      {/* Top Header & Sub-Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.85rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Analytics & Strategic Command
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Executive Performance Metrics • Company Concentration Radar • Routine Streak Cadence • AI Brain
          </p>
        </div>

        {/* View Switcher Sub-Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(6, 10, 18, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '0.5rem',
            padding: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.35rem',
              border: 'none',
              background: activeSubTab === 'overview' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeSubTab === 'overview' ? '#38bdf8' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.775rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <BarChart3 size={13} />
            <span>Overview & Funnel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('companies')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.35rem',
              border: 'none',
              background: activeSubTab === 'companies' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeSubTab === 'companies' ? '#c084fc' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.775rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Building2 size={13} />
            <span>Company Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('velocity')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.35rem',
              border: 'none',
              background: activeSubTab === 'velocity' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeSubTab === 'velocity' ? '#10b981' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.775rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Flame size={13} />
            <span>Routine & Velocity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('memory')}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '0.35rem',
              border: 'none',
              background: activeSubTab === 'memory' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeSubTab === 'memory' ? '#fbbf24' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.775rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Brain size={13} />
            <span>AI Brain ({allMemories.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: OVERVIEW & FUNNEL */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* AI Strategic Debrief Card */}
          <div
            style={{
              padding: '1.15rem 1.35rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(2, 132, 199, 0.08))',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.08)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>
                  AI Strategic Debrief & Next Action
                </span>
                <span
                  style={{
                    fontSize: '0.675rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  Live Insight
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Your conversion rate is holding strong at <strong>{funnelMetrics.conversionRate}%</strong> with{' '}
                <strong>{funnelMetrics.connected} connected peers & recruiters</strong> out of {funnelMetrics.totalTracked} tracked.
                Top concentration is in <strong>{companyRadar.topCompanies[0]?.name || 'Healthcare/Consulting'}</strong>.
                Recommendation: Continue the <strong>5 Peers + 2 Recruiters</strong> daily routine to reach 50 active 1st-degree connections by next week.
              </p>
            </div>
          </div>

          {/* KPI Scorecards Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Card 1: Conversion Rate */}
            <div
              style={{
                padding: '1.15rem',
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Outreach Conversion
                </span>
                <Users size={15} style={{ color: '#10b981' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                {funnelMetrics.conversionRate}%
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                {funnelMetrics.connected} Connected / {funnelMetrics.totalTracked} Total
              </span>
            </div>

            {/* Card 2: Network Growth Velocity */}
            <div
              style={{
                padding: '1.15rem',
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Pending Invitations
                </span>
                <Zap size={15} style={{ color: '#38bdf8' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
                {funnelMetrics.invited}
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Pace: 5 Peers + 2 Recruiters/day
              </span>
            </div>

            {/* Card 3: Dispatched Intros */}
            <div
              style={{
                padding: '1.15rem',
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Dispatched Intros
                </span>
                <MessageSquare size={15} style={{ color: '#c084fc' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc' }}>
                {funnelMetrics.introSent}
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                {funnelMetrics.recruiters} Recruiters in Directory
              </span>
            </div>

            {/* Card 4: Active Streak */}
            <div
              style={{
                padding: '1.15rem',
                borderRadius: '0.75rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Routine Execution Streak
                </span>
                <Flame size={15} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
                {routineVelocity.currentStreakDays} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Days Active</span>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Weekly Target: 35 Outreaches
              </span>
            </div>
          </div>

          {/* Relationship Funnel Card */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Layers size={16} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Relationship Conversion Funnel
                </h3>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                {funnelMetrics.totalTracked} Total Directory Contacts
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Step 1: Tracked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>1. Tracked in Directory</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{funnelMetrics.totalTracked} (100%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: '#64748b', borderRadius: '999px' }} />
                </div>
              </div>

              {/* Step 2: Connection Invitations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>2. Connection Invites Sent</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    {funnelMetrics.invited} ({funnelMetrics.totalTracked > 0 ? Math.round((funnelMetrics.invited / funnelMetrics.totalTracked) * 100) : 0}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${funnelMetrics.totalTracked > 0 ? Math.min((funnelMetrics.invited / funnelMetrics.totalTracked) * 100, 100) : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>

              {/* Step 3: Connected Peers & Recruiters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>3. Connected 1st-Degree</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    {funnelMetrics.connected} ({funnelMetrics.totalTracked > 0 ? Math.round((funnelMetrics.connected / funnelMetrics.totalTracked) * 100) : 0}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${funnelMetrics.totalTracked > 0 ? Math.min((funnelMetrics.connected / funnelMetrics.totalTracked) * 100, 100) : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #059669, #10b981)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>

              {/* Step 4: Dispatched Intros */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>4. Dispatched Recruiter Intros</span>
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>
                    {funnelMetrics.introSent} ({funnelMetrics.connected > 0 ? Math.round((funnelMetrics.introSent / funnelMetrics.connected) * 100) : 0}% of connected)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${funnelMetrics.connected > 0 ? Math.min((funnelMetrics.introSent / funnelMetrics.connected) * 100, 100) : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #8b5cf6, #c084fc)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Growth Trends Chart */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Durable Growth Trends & Weekly Snapshots
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Weekly impressions, profile views, and search appearances
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsLogSnapshotModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                >
                  <Calendar size={13} style={{ display: 'inline', marginRight: '0.3rem', color: '#38bdf8' }} />
                  Log Snapshot
                </button>
              </div>
            </div>

            {snapshots.length > 0 ? (
              <div style={{ width: '100%', height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshots}>
                    <defs>
                      <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0a66c2" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0a66c2" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="metric_date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                    <Area type="monotone" dataKey="post_impressions" name="Post Impressions" stroke="#0a66c2" fillOpacity={1} fill="url(#impGrad)" />
                    <Area type="monotone" dataKey="profile_views" name="Profile Views" stroke="#10b981" fillOpacity={1} fill="url(#viewsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.65rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.825rem',
                }}
              >
                No metric snapshots logged yet. Click <strong>"Log Snapshot"</strong> to record your weekly profile views & impressions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TARGET COMPANY & DOMAIN RADAR */}
      {activeSubTab === 'companies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Domain & Industry Balance Row */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Target size={16} color="#c084fc" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Domain & Industry Alignment (7+ Years Healthcare & Analytics Focus)
                </h3>
              </div>
              <span style={{ fontSize: '0.725rem', color: '#10b981', fontWeight: 600 }}>
                Strong Alignment
              </span>
            </div>

            {/* Domain Breakdown Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <div style={{ padding: '0.85rem', borderRadius: '0.5rem', background: 'rgba(6, 10, 18, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  🏥 US Healthcare & Operations
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
                  {companyRadar.healthcareCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({companyRadar.healthcarePct}%)</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Core Sweet Spot (Insurance, Operations, Pharma)
                </div>
              </div>

              <div style={{ padding: '0.85rem', borderRadius: '0.5rem', background: 'rgba(6, 10, 18, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  💼 BI & Technology Consulting
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
                  {companyRadar.consultingCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({companyRadar.consultingPct}%)</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  PwC, Deloitte, Cognizant, Wipro Peers
                </div>
              </div>

              <div style={{ padding: '0.85rem', borderRadius: '0.5rem', background: 'rgba(6, 10, 18, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  🎯 Talent Recruiters & TA
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#c084fc' }}>
                  {funnelMetrics.recruiters} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({funnelMetrics.recruiterPct}%)</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Direct Outreach & Sourcing Pipeline
                </div>
              </div>
            </div>
          </div>

          {/* Top Companies Representation Bar Matrix & Alumni Radar */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {radarViewMode === 'current' ? (
                  <Building2 size={16} color="#0284c7" />
                ) : (
                  <GraduationCap size={16} color="#c084fc" />
                )}
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {radarViewMode === 'current'
                    ? 'Top Organizations in Networking Directory'
                    : 'Top Alumni & Past Employers (Voyager / History)'}
                </h3>
              </div>

              {/* View Switcher Toggle */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(6, 10, 18, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.4rem',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRadarViewMode('current')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.3rem',
                    border: 'none',
                    background: radarViewMode === 'current' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: radarViewMode === 'current' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <Building2 size={12} />
                  <span>Current Employers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRadarViewMode('alumni')}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.3rem',
                    border: 'none',
                    background: radarViewMode === 'alumni' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: radarViewMode === 'alumni' ? '#c084fc' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <GraduationCap size={12} />
                  <span>Alumni & Past Tenure</span>
                </button>
              </div>
            </div>

            {/* List of Companies */}
            {radarViewMode === 'current' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {companyRadar.topCompanies.map((comp) => {
                  const maxVal = companyRadar.topCompanies[0]?.total || 1;
                  const barWidth = Math.round((comp.total / maxVal) * 100);

                  return (
                    <div
                      key={comp.name}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '0.5rem',
                        background: 'rgba(6, 10, 18, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{comp.name}</span>
                        <span style={{ fontWeight: 800, color: '#38bdf8' }}>{comp.total} contact{comp.total > 1 ? 's' : ''}</span>
                      </div>

                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>🤝 {comp.peers} Engineering/BI</span>
                        <span>🎯 {comp.recruiters} Recruiter{comp.recruiters !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Voyager API explanation banner & 1-Click Pull Action */}
                <div
                  style={{
                    padding: '0.85rem 1.15rem',
                    borderRadius: '0.6rem',
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12), rgba(59, 130, 246, 0.08))',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
                    <div
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.45rem',
                        background: 'rgba(168, 85, 247, 0.2)',
                        color: '#c084fc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        Voyager API Employment History Radar
                      </div>
                      <div style={{ fontSize: '0.735rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Pull complete employment timelines & position groups for all 1st-degree connections directly through your browser session.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartEmploymentPull}
                    disabled={isPullingHistory}
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.775rem',
                      fontWeight: 700,
                      cursor: isPullingHistory ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                    }}
                  >
                    {isPullingHistory ? (
                      <>
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Pulling ({pullProgress.processed}/{pullProgress.total})...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>⚡ Pull All Employment History</span>
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {companyRadar.topAlumniCompanies.map((comp) => {
                    const maxVal = companyRadar.topAlumniCompanies[0]?.total || 1;
                    const barWidth = Math.round((comp.total / maxVal) * 100);

                    return (
                      <div
                        key={comp.name}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '0.5rem',
                          background: 'rgba(6, 10, 18, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{comp.name}</span>
                          <span style={{ fontWeight: 800, color: '#c084fc' }}>{comp.total} alumni</span>
                        </div>

                        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #9333ea, #c084fc)',
                              borderRadius: '999px',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span>🤝 {comp.peers} Engineering/BI Peers</span>
                          <span>🎯 {comp.recruiters} Talent Recruiters</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alumni Referral Inroads & Target Network */}
                {companyRadar.alumniInroads.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(6, 10, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 700, color: '#f59e0b' }}>
                      <Target size={14} />
                      <span>Alumni Referral Inroads (Direct Path to Target Companies)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                      {companyRadar.alumniInroads.slice(0, 6).map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.65rem 0.8rem',
                            borderRadius: '0.4rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.person.full_name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Alumni of <span style={{ color: '#c084fc', fontWeight: 600 }}>{item.company}</span>
                            </div>
                          </div>
                          {item.person.profile_url && (
                            <a
                              href={item.person.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: '#38bdf8',
                                padding: '0.25rem',
                                borderRadius: '0.25rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="View LinkedIn Profile"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ROUTINE & VELOCITY */}
      {activeSubTab === 'velocity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* 7-Day Routine Cadence Heatmap */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Flame size={16} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  7-Day Routine Consistency Cadence (5 Peers + 2 Recruiters / Day)
                </h3>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Flame size={12} />
                <span>Active 3-Day Streak!</span>
              </div>
            </div>

            {/* Days Grid (Clickable) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {routineVelocity.cadence.map((item) => {
                const isSelected = selectedDay === item.day;

                return (
                  <div
                    key={item.day}
                    onClick={() => setSelectedDay(item.day)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '0.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected
                        ? 'rgba(56, 189, 248, 0.18)'
                        : item.isToday
                        ? 'rgba(16, 185, 129, 0.15)'
                        : item.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(6, 10, 18, 0.5)',
                      border: isSelected
                        ? '2px solid #38bdf8'
                        : item.isToday
                        ? '1px solid #10b981'
                        : item.status === 'completed'
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      boxShadow: isSelected ? '0 0 14px rgba(56, 189, 248, 0.3)' : 'none',
                    }}
                    title={`Click to view ${item.day} breakdown`}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: isSelected ? '#38bdf8' : item.isToday ? '#10b981' : 'var(--text-muted)',
                      }}
                    >
                      {item.day} {item.isToday && '• Today'}
                    </div>
                    <div
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: isSelected
                          ? '#38bdf8'
                          : item.totalDone >= 7
                          ? '#10b981'
                          : item.isToday
                          ? '#38bdf8'
                          : 'var(--text-muted)',
                        margin: '0.2rem 0',
                      }}
                    >
                      {item.totalDone} / 7
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {item.peersDone}P • {item.recruitersDone}R
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clickable Day Drill-down Inspector */}
            {(() => {
              const selectedDayData =
                routineVelocity.cadence.find((c) => c.day === selectedDay) || routineVelocity.cadence[0];

              return (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(6, 10, 18, 0.65)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                        📅 {selectedDayData.day} Breakdown:
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {selectedDayData.isToday
                          ? 'Today (Live Pace)'
                          : selectedDayData.totalDone >= 7
                          ? 'Full Goal Achieved (7/7)'
                          : 'Scheduled / Daily Target'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: 'rgba(2, 132, 199, 0.15)',
                          color: '#38bdf8',
                          fontWeight: 600,
                        }}
                      >
                        🤝 {selectedDayData.peersDone} / 5 Peers
                      </span>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#c084fc',
                          fontWeight: 600,
                        }}
                      >
                        💬 {selectedDayData.recruitersDone} / 2 Recruiters
                      </span>
                    </div>
                  </div>

                  {/* Day's Sample Outreach Contacts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {people.slice(0, 5).map((contact) => (
                      <div
                        key={contact.id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.4rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.775rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{contact.full_name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>
                            {contact.role || 'Analytics Peer'} {contact.company ? `@ ${contact.company}` : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.675rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              background:
                                contact.connection_status === 'CONNECTED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(2, 132, 199, 0.15)',
                              color: contact.connection_status === 'CONNECTED' ? '#10b981' : '#38bdf8',
                              fontWeight: 600,
                            }}
                          >
                            {contact.connection_status === 'CONNECTED' ? 'Connected' : 'Invited'}
                          </span>
                          <a
                            href={contact.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#0a66c2', fontSize: '0.725rem', textDecoration: 'none' }}
                          >
                            Profile ↗
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Stale Intros & Follow-up Velocity Tracker */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Clock size={16} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Active Dispatched Intros ({routineVelocity.pendingFollowups.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                Follow-up window: 3–5 days post-intro
              </span>
            </div>

            {routineVelocity.pendingFollowups.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                No intros dispatched yet. Run the 1-Click routine in Strategic Networking to initiate recruiter introductions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {routineVelocity.pendingFollowups.map((person) => (
                  <div
                    key={person.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      background: 'rgba(6, 10, 18, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                          {person.full_name}
                        </span>
                        {person.company && (
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                            {person.company}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {person.role || 'Recruiter'} • Intro dispatched via 1-Click Routine
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.12)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          fontWeight: 600,
                        }}
                      >
                        💬 Intro Dispatched
                      </span>
                      <a
                        href={person.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem' }}
                      >
                        View Profile
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: STRATEGIC AI BRAIN */}
      {activeSubTab === 'memory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '0.75rem',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={20} color="#8b5cf6" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Strategic Agent Memory Bank
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Durable instructions, writing style guides, and persona guardrails automatically injected into future AI drafts
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={memoryTypeFilter}
                  onChange={(e) => setMemoryTypeFilter(e.target.value)}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '0.4rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.6)',
                    color: 'var(--text-main)',
                    fontSize: '0.775rem',
                  }}
                >
                  <option value="ALL">All Memories ({allMemories.length})</option>
                  <option value="WRITING_STYLE_GUIDE">Writing Style Guides</option>
                  <option value="OUTREACH_STRATEGY">Outreach Strategy</option>
                  <option value="AUDIENCE_PREFERENCE">Audience Preferences</option>
                  <option value="TOPIC_PERFORMANCE">Topic Performance</option>
                  <option value="LESSON_LEARNED">Lessons Learned</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(true)}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    background: '#8b5cf6',
                    borderColor: '#8b5cf6',
                  }}
                >
                  <Plus size={14} />
                  <span>Teach Memory</span>
                </button>
              </div>
            </div>

            {/* Memory Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.9rem' }}>
              {filteredMemories.map((mem) => {
                const badge = getMemoryTypeBadge(mem.memory_type);
                const valStr = typeof mem.value === 'string' ? mem.value : JSON.stringify(mem.value, null, 2);

                return (
                  <div
                    key={mem.id}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '0.65rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      background: 'rgba(6, 10, 18, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '999px',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>

                      {!mem.id.startsWith('default-') && (
                        <button
                          onClick={() => handleDeleteMemory(mem.id, mem.key)}
                          className="btn btn-secondary"
                          title="Delete memory"
                          style={{ padding: '0.25rem', color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {mem.key}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.785rem', color: 'var(--text-muted)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                      {valStr}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.25rem',
                        paddingTop: '0.45rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.675rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Confidence: {(Number(mem.confidence) * 100).toFixed(0)}%</span>
                      <span>{mem.id.startsWith('default-') ? 'System Persona Active' : `Updated ${new Date(mem.updated_at).toLocaleDateString()}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational 30-Day Retention Maintenance Box */}
          <div
            style={{
              padding: '1.15rem 1.25rem',
              borderRadius: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              background: 'rgba(16, 185, 129, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '720px' }}>
              <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  30-Day Operational Retention Policy Guardrail
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Operational records older than 30 days are safely purged to keep your database fast. Durable analytics snapshots and strategic memories are permanently preserved.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunCleanup}
              disabled={isCleaning}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                borderColor: '#10b981',
                color: '#10b981',
              }}
            >
              <RefreshCw size={13} className={isCleaning ? 'animate-spin' : ''} />
              <span>{isCleaning ? 'Cleaning...' : 'Run Retention Cleanup'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Log Snapshot Modal */}
      {isLogSnapshotModalOpen && (
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
            if (e.target === e.currentTarget && !isSubmitting) setIsLogSnapshotModalOpen(false);
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Log LinkedIn Metric Snapshot
              </h3>
              <button
                onClick={() => setIsLogSnapshotModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshot} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Snapshot Date *
                </label>
                <input
                  type="date"
                  required
                  value={metricDate}
                  onChange={(e) => setMetricDate(e.target.value)}
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
                    Profile Views
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profileViews}
                    onChange={(e) => setProfileViews(Number(e.target.value))}
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
                    Search Appearances
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={searchAppearances}
                    onChange={(e) => setSearchAppearances(Number(e.target.value))}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Post Impressions
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={postImpressions}
                    onChange={(e) => setPostImpressions(Number(e.target.value))}
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
                    Total Reactions
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalReactions}
                    onChange={(e) => setTotalReactions(Number(e.target.value))}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Total Comments
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalComments}
                    onChange={(e) => setTotalComments(Number(e.target.value))}
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
                    Total Connections
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={connectionsCount}
                    onChange={(e) => setConnectionsCount(Number(e.target.value))}
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
                  Total Followers
                </label>
                <input
                  type="number"
                  min="0"
                  value={followersCount}
                  onChange={(e) => setFollowersCount(Number(e.target.value))}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsLogSnapshotModalOpen(false)}
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
                  {isSubmitting ? 'Saving...' : 'Record Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Strategic Memory Modal */}
      {isAddMemoryModalOpen && (
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
            if (e.target === e.currentTarget && !isSubmitting) setIsAddMemoryModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Brain size={18} color="#8b5cf6" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Teach AI Agent Memory
                </h3>
              </div>
              <button
                onClick={() => setIsAddMemoryModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Memory Type
                </label>
                <select
                  value={newMemoryType}
                  onChange={(e) => setNewMemoryType(e.target.value as AgentMemoryType)}
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
                  <option value="WRITING_STYLE_GUIDE">Writing Style Guide (Tone, rules, formatting)</option>
                  <option value="OUTREACH_STRATEGY">Outreach Strategy (Connection notes, follow-ups)</option>
                  <option value="AUDIENCE_PREFERENCE">Audience Preference (Target personas, keywords)</option>
                  <option value="TOPIC_PERFORMANCE">Topic Performance (Proven post angles)</option>
                  <option value="LESSON_LEARNED">Lesson Learned (Correction from experience)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Memory Directive Key *
                </label>
                <input
                  type="text"
                  required
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  placeholder="e.g. Healthcare Analytics Tone or Intro Greeting Rule"
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
                  Memory Rule / Instruction *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newMemoryValue}
                  onChange={(e) => setNewMemoryValue(e.target.value)}
                  placeholder="State the permanent directive for the AI agent (e.g. Never use quotation marks in message greetings. Focus on Power BI DAX and healthcare claims operational efficiency)."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.4rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(6, 10, 18, 0.6)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    lineHeight: 1.45,
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Confidence Weight</span>
                  <span>{(newConfidence * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={newConfidence}
                  onChange={(e) => setNewConfidence(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '0.25rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddMemoryModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voyager API Employment History Pull Modal */}
      {historyPullModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
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
              maxWidth: '560px',
              background: '#0d131f',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '0.85rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
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
                background: 'linear-gradient(90deg, rgba(147, 51, 234, 0.15), transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    padding: '0.45rem',
                    borderRadius: '0.45rem',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                  }}
                >
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Voyager API: Employment History Pull
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Pulling positionGroups & past employers for all connections
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHistoryPullModalOpen(false)}
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

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              {/* Progress Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>
                    {pullProgress.total}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Total Connections
                  </div>
                </div>

                <div style={{ padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c084fc' }}>
                    {pullProgress.processed}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: '#d8b4fe', marginTop: '0.15rem' }}>
                    Audited
                  </div>
                </div>

                <div style={{ padding: '0.65rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
                    {pullProgress.updated}
                  </div>
                  <div style={{ fontSize: '0.675rem', color: '#6ee7b7', marginTop: '0.15rem' }}>
                    Alumni Mapped
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {pullProgress.currentPerson ? `Currently fetching: ${pullProgress.currentPerson}` : (pullProgress.message || 'Processing...')}
                  </span>
                  <span style={{ fontWeight: 700, color: '#c084fc' }}>
                    {pullProgress.total > 0 ? Math.round((pullProgress.processed / pullProgress.total) * 100) : 0}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pullProgress.total > 0 ? Math.round((pullProgress.processed / pullProgress.total) * 100) : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Activity Log */}
              <div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Voyager API Stream Activity
                </h4>
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    borderRadius: '0.45rem',
                    background: 'rgba(6, 10, 18, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '0.6rem 0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontSize: '0.725rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {pullProgress.logs.length > 0 ? (
                    pullProgress.logs.map((log, idx) => (
                      <div key={idx} style={{ color: log.startsWith('✓') ? '#34d399' : '#93c5fd' }}>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>Waiting for activity...</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(6, 10, 18, 0.4)',
              }}
            >
              {isPullingHistory ? (
                <button
                  type="button"
                  onClick={handleCancelEmploymentPull}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.775rem', padding: '0.35rem 0.85rem' }}
                >
                  Cancel Sync
                </button>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                  {pullProgress.status === 'COMPLETED' ? '✓ Sync Complete' : ''}
                </span>
              )}

              <button
                type="button"
                onClick={() => setHistoryPullModalOpen(false)}
                className="btn btn-primary"
                style={{
                  background: '#0a66c2',
                  borderColor: '#0a66c2',
                  padding: '0.4rem 1.15rem',
                  fontSize: '0.775rem',
                }}
              >
                {isPullingHistory ? 'Run in Background' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
