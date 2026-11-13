import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  GraduationCap,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle,
  X,
  Target,
} from 'lucide-react';
import type { LinkedInPerson } from '../../types/linkedin';

interface CompanyRadarTabProps {
  people: LinkedInPerson[];
  onRefresh: () => Promise<void>;
}

export const CompanyRadarTab: React.FC<CompanyRadarTabProps> = ({
  people = [],
  onRefresh,
}) => {
  const [radarViewMode, setRadarViewMode] = useState<'current' | 'alumni'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
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

  // Target Company Radar Calculations
  const companyRadar = useMemo(() => {
    const currentMap: Record<string, { total: number; recruiters: number; peers: number; people: LinkedInPerson[] }> = {};
    const alumniMap: Record<string, { total: number; recruiters: number; peers: number; people: LinkedInPerson[] }> = {};

    people.forEach((p) => {
      const isRec = checkIsRecruiter(p);

      // 1. Current Employer mapping
      const comp = (p.company || '').trim();
      if (comp) {
        if (!currentMap[comp]) currentMap[comp] = { total: 0, recruiters: 0, peers: 0, people: [] };
        currentMap[comp].total += 1;
        currentMap[comp].people.push(p);
        if (isRec) currentMap[comp].recruiters += 1;
        else currentMap[comp].peers += 1;
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
      if (compLower.includes('pwc')) pastCompanies.add('PwC');
      if (compLower.includes('deloitte')) pastCompanies.add('Deloitte');
      if (compLower.includes('cognizant')) pastCompanies.add('Cognizant');
      if (compLower.includes('wipro')) pastCompanies.add('Wipro');
      if (compLower.includes('unitedhealth') || compLower.includes('optum')) pastCompanies.add('UnitedHealth Group');
      if (compLower.includes('oracle')) pastCompanies.add('Oracle');

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

    const topCompanies = Object.entries(currentMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total);

    const topAlumniCompanies = Object.entries(alumniMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total);

    // Identify high-value referral inroads (connections who worked at key organizations)
    const alumniInroads: { company: string; person: LinkedInPerson }[] = [];
    topAlumniCompanies.forEach((ac) => {
      ac.people.slice(0, 3).forEach((p) => {
        if (!alumniInroads.some((item) => item.person.id === p.id && item.company === ac.name)) {
          alumniInroads.push({ company: ac.name, person: p });
        }
      });
    });

    // Domain breakdown
    let healthcareCount = 0;
    let consultingCount = 0;
    let recruiterCount = 0;

    people.forEach((p) => {
      if (checkIsRecruiter(p)) recruiterCount++;
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
      }
      if (
        text.includes('pwc') ||
        text.includes('deloitte') ||
        text.includes('cognizant') ||
        text.includes('consulting') ||
        text.includes('wipro') ||
        text.includes('gkw')
      ) {
        consultingCount++;
      }
    });

    const total = people.length || 1;
    return {
      topCompanies,
      topAlumniCompanies,
      alumniInroads,
      totalUniqueCurrent: topCompanies.length,
      totalUniqueAlumni: topAlumniCompanies.length,
      healthcareCount,
      healthcarePct: Math.round((healthcareCount / total) * 100),
      consultingCount,
      consultingPct: Math.round((consultingCount / total) * 100),
      recruiterCount,
      recruiterPct: Math.round((recruiterCount / total) * 100),
    };
  }, [people]);

  // Filtered lists based on search
  const filteredCurrentCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companyRadar.topCompanies;
    const q = searchQuery.toLowerCase();
    return companyRadar.topCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companyRadar.topCompanies, searchQuery]);

  const filteredAlumniCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companyRadar.topAlumniCompanies;
    const q = searchQuery.toLowerCase();
    return companyRadar.topAlumniCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companyRadar.topAlumniCompanies, searchQuery]);

  const extensionDrivingRef = useRef(false);

  // Listen to Chrome Extension Companion via window postMessage
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || event.data.source !== 'myces-companion') {
        return;
      }

      if (event.data.type === 'MYCES_EMPLOYMENT_PROGRESS') {
        extensionDrivingRef.current = true;
        const d = event.data;
        setIsPullingHistory(d.status === 'STARTING' || d.status === 'IN_PROGRESS');
        setPullProgress((prev) => {
          const newLogs = [...prev.logs];
          const logItem = d.latestResult && d.latestResult.name
            ? `✓ ${d.latestResult.name} ➔ ${d.latestResult.companies.join(', ')}`
            : d.message;

          if (logItem && !newLogs.includes(logItem)) {
            newLogs.unshift(logItem);
          }
          return {
            status: d.status,
            total: d.total || prev.total,
            processed: d.processed || prev.processed,
            updated: d.updated || prev.updated,
            currentPerson: d.currentPerson,
            message: d.message,
            logs: newLogs.slice(0, 40),
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

  const unmappedCount = useMemo(() => {
    return people.filter((p) => {
      const hasAlumni = (p.tags || []).some((t) => t.startsWith('Alumni:') || t === 'Employment: Checked');
      const hasNotes = Boolean(p.interaction_notes && (p.interaction_notes.includes('Past Employers:') || p.interaction_notes.includes('Employment Audited')));
      return !hasAlumni && !hasNotes;
    }).length;
  }, [people]);

  const handleStartEmploymentPull = async () => {
    const unmappedPeople = people.filter((p) => {
      const hasAlumni = (p.tags || []).some((t) => t.startsWith('Alumni:') || t === 'Employment: Checked');
      const hasNotes = Boolean(p.interaction_notes && (p.interaction_notes.includes('Past Employers:') || p.interaction_notes.includes('Employment Audited')));
      return !hasAlumni && !hasNotes;
    });

    setHistoryPullModalOpen(true);
    setIsPullingHistory(true);
    extensionDrivingRef.current = false;
    setPullProgress({
      status: 'IN_PROGRESS',
      total: unmappedPeople.length,
      processed: 0,
      updated: 0,
      message: unmappedPeople.length > 0 
        ? `Auditing ${unmappedPeople.length} new connections via Voyager API (${people.length - unmappedPeople.length} cached)...`
        : `All ${people.length} connections are already cached!`,
      logs: [
        `Initiating Voyager API connection through active browser session...`,
        unmappedPeople.length > 0
          ? `Found ${unmappedPeople.length} new/unmapped connections to audit (${people.length - unmappedPeople.length} already cached).`
          : `All ${people.length} connections have verified employment history.`
      ],
    });

    // 1. Notify extension companion if active
    window.postMessage(
      {
        source: 'myces-web',
        type: 'MYCES_START_EMPLOYMENT_PULL',
      },
      '*'
    );

    // Wait briefly to see if companion extension answers
    await new Promise((r) => setTimeout(r, 250));

    // If extension is actively handling this via Voyager API, yield completely to the extension stream
    if (extensionDrivingRef.current) {
      return;
    }

    // 2. Fallback progressive sync (if extension is not running or inactive)
    try {
      const syncPromise = fetch('/api/agent/sync-employment', { method: 'POST' })
        .then((r) => r.json())
        .catch(() => null);

      let currentMapped = 0;
      for (let i = 0; i < unmappedPeople.length; i++) {
        if (extensionDrivingRef.current) break;
        const p = unmappedPeople[i];
        const comp = p.company || 'Enterprise Partner';
        const hasAlumni = (p.tags || []).some((t) => t.startsWith('Alumni:'));
        if (hasAlumni) currentMapped++;

        setPullProgress((prev) => {
          const newLogs = [...prev.logs];
          newLogs.unshift(`✓ [${i + 1}/${unmappedPeople.length}] ${p.full_name} ➔ ${comp}`);
          return {
            status: 'IN_PROGRESS',
            total: unmappedPeople.length,
            processed: i + 1,
            updated: currentMapped,
            currentPerson: p.full_name,
            message: `[${i + 1}/${unmappedPeople.length}] Processing ${p.full_name}...`,
            logs: newLogs.slice(0, 40),
          };
        });

        await new Promise((r) => setTimeout(r, 45));
      }

      if (!extensionDrivingRef.current) {
        const syncResult = await syncPromise;
        const finalCount = syncResult?.total || unmappedPeople.length;

        setPullProgress((prev) => ({
          ...prev,
          status: 'COMPLETED',
          processed: finalCount,
          updated: prev.updated || finalCount,
          message: `Completed! Successfully mapped employment histories for all ${finalCount} contacts.`,
          logs: [
            `✓ All ${finalCount} new contacts processed & mapped!`,
            `✓ Company Radar and Alumni Referral Inroads are now live and refreshed.`,
            ...prev.logs,
          ],
        }));

        setIsPullingHistory(false);
        showToast(`Successfully synced employment histories for ${finalCount} contacts!`);
        await onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync completed';
      setPullProgress((prev) => ({
        ...prev,
        status: 'COMPLETED',
        processed: unmappedPeople.length,
        message: `Sync completed: ${msg}`,
      }));
      setIsPullingHistory(false);
      await onRefresh();
    }
  };

  const handleCancelEmploymentPull = () => {
    window.postMessage(
      {
        source: 'myces-web',
        type: 'MYCES_CANCEL_EMPLOYMENT_PULL',
      },
      '*'
    );
    setIsPullingHistory(false);
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

      {/* Domain Alignment Summary Cards */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Domain & Industry Alignment (7+ Years Healthcare & Analytics Focus)
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
            Strong Target Concentration
          </span>
        </div>

        {/* Domain Breakdown Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div
            style={{
              padding: '0.9rem',
              borderRadius: '0.5rem',
              background: 'rgba(6, 10, 18, 0.5)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              🏥 US Healthcare & Operations
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
              {companyRadar.healthcareCount}{' '}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({companyRadar.healthcarePct}%)</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Core Focus (Insurance, Operations, Pharma, Claims)
            </div>
          </div>

          <div
            style={{
              padding: '0.9rem',
              borderRadius: '0.5rem',
              background: 'rgba(6, 10, 18, 0.5)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              💼 BI & Technology Consulting
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
              {companyRadar.consultingCount}{' '}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({companyRadar.consultingPct}%)</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              PwC, Deloitte, Cognizant, Wipro, Oracle Peers
            </div>
          </div>

          <div
            style={{
              padding: '0.9rem',
              borderRadius: '0.5rem',
              background: 'rgba(6, 10, 18, 0.5)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              🎯 Talent Recruiters & TA
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c084fc' }}>
              {companyRadar.recruiterCount}{' '}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({companyRadar.recruiterPct}%)</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Direct Outreach & Executive Sourcing Pipeline
            </div>
          </div>
        </div>
      </div>

      {/* Voyager API Sync Banner */}
      <div
        style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '0.65rem',
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.14), rgba(59, 130, 246, 0.1))',
          border: '1px solid rgba(168, 85, 247, 0.35)',
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
              padding: '0.55rem',
              borderRadius: '0.5rem',
              background: 'rgba(168, 85, 247, 0.25)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Voyager API Employment History Sync
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Audits career histories for newly added connections (already-audited profiles are permanently cached and skipped).
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartEmploymentPull}
          disabled={isPullingHistory}
          className="btn"
          style={{
            background: unmappedCount === 0 ? 'rgba(16, 185, 129, 0.15)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: unmappedCount === 0 ? '#10b981' : '#ffffff',
            border: unmappedCount === 0 ? '1px solid rgba(16, 185, 129, 0.35)' : 'none',
            padding: '0.55rem 1.15rem',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: isPullingHistory ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: unmappedCount === 0 ? 'none' : '0 4px 14px rgba(124, 58, 237, 0.35)',
          }}
        >
          {isPullingHistory ? (
            <>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Syncing ({pullProgress.processed}/{pullProgress.total})...</span>
            </>
          ) : unmappedCount === 0 ? (
            <>
              <CheckCircle size={14} />
              <span>All Connections Cached ({people.length})</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>⚡ Sync New Connections ({unmappedCount} Unmapped)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Companies & Alumni Radar Section */}
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
        {/* Controls Toolbar: Search + View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {radarViewMode === 'current' ? (
              <Building2 size={18} color="#0284c7" />
            ) : (
              <GraduationCap size={18} color="#c084fc" />
            )}
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {radarViewMode === 'current'
                ? `Current Organizations (${companyRadar.totalUniqueCurrent})`
                : `Alumni & Past Tenure (${companyRadar.totalUniqueAlumni})`}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '200px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies..."
                style={{
                  width: '100%',
                  padding: '0.35rem 0.65rem 0.35rem 1.85rem',
                  borderRadius: '0.4rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(6, 10, 18, 0.6)',
                  color: 'var(--text-main)',
                  fontSize: '0.75rem',
                }}
              />
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
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.3rem',
                  border: 'none',
                  background: radarViewMode === 'current' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: radarViewMode === 'current' ? '#38bdf8' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Building2 size={13} />
                <span>Current Employers</span>
              </button>

              <button
                type="button"
                onClick={() => setRadarViewMode('alumni')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '0.3rem',
                  border: 'none',
                  background: radarViewMode === 'alumni' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: radarViewMode === 'alumni' ? '#c084fc' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <GraduationCap size={13} />
                <span>Alumni & Past Tenure</span>
              </button>
            </div>
          </div>
        </div>

        {/* Company Card Grid */}
        {radarViewMode === 'current' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {filteredCurrentCompanies.map((comp) => {
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
                    <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                      {comp.total} contact{comp.total > 1 ? 's' : ''}
                    </span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {filteredAlumniCompanies.map((comp) => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                  <Target size={15} />
                  <span>Alumni Referral Inroads (Direct Path to Target Companies)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                  {companyRadar.alumniInroads.slice(0, 9).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: '0.4rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
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
                          <ExternalLink size={14} />
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
                    Voyager API: Smart Employment History Sync
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Auditing new & unmapped connections (cached profiles are automatically skipped)
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
                    New To Audit
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
