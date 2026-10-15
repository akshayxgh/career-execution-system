import React, { useState } from 'react';
import {
  TrendingUp,
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
} from '../../types/linkedin';
import { linkedinAgentService } from '../../services/linkedinAgentService';

interface AnalyticsMemoryTabProps {
  summary: AnalyticsDashboardSummary | null;
  onRefresh: () => Promise<void>;
}

export const AnalyticsMemoryTab: React.FC<AnalyticsMemoryTabProps> = ({
  summary,
  onRefresh,
}) => {
  const [isLogSnapshotModalOpen, setIsLogSnapshotModalOpen] = useState(false);
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<string>('ALL');

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

  const memories = summary?.memories || [];
  const filteredMemories = memories.filter(
    (m) => memoryTypeFilter === 'ALL' || m.memory_type === memoryTypeFilter
  );

  const snapshots: LinkedInAnalyticsSnapshot[] = summary?.snapshots || [];

  const getMemoryTypeBadge = (type: AgentMemoryType) => {
    switch (type) {
      case 'WRITING_STYLE_GUIDE':
        return { label: 'Style Guide', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)' };
      case 'TOPIC_PERFORMANCE':
        return { label: 'Topic Performance', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'OUTREACH_STRATEGY':
        return { label: 'Outreach Strategy', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'AUDIENCE_PREFERENCE':
        return { label: 'Audience Preference', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
      default:
        return { label: 'Lesson Learned', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

      {/* KPI Scorecards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          className="card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid #0a66c2',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0a66c2' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Published Posts</span>
            <BarChart3 size={18} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {summary?.totalPostsPublished ?? '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Total live articles & concept breakdowns
          </span>
        </div>

        <div
          className="card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid #10b981',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Outreach Conversion</span>
            <Users size={18} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {summary?.outreachConversionRate ?? 0}%
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {summary?.totalConnectionsMade ?? 0} connected / {summary?.totalConnectionRequestsSent ?? 0} sent
          </span>
        </div>

        <div
          className="card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid #8b5cf6',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Engagements Logged</span>
            <MessageSquare size={18} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {summary?.totalEngagements ?? '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Comments, message exchanges & outreaches
          </span>
        </div>

        <div
          className="card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Active Opportunities</span>
            <TrendingUp size={18} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {summary?.activeOpportunities ?? '—'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {summary?.totalOpportunitiesTracked ?? 0} total tracked opportunities
          </span>
        </div>
      </div>

      {/* Snapshot Logging & Charts Section */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
              Durable Growth Trends & Metrics Snapshots
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Weekly snapshots of your impressions, profile views, and search appearances
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsLogSnapshotModalOpen(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              background: '#0a66c2',
              borderColor: '#0a66c2',
            }}
          >
            <Calendar size={14} />
            <span>Log Metric Snapshot</span>
          </button>
        </div>

        {snapshots.length > 0 ? (
          <div style={{ width: '100%', height: '260px' }}>
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
                <XAxis
                  dataKey="metric_date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  stroke="var(--border-color)"
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} stroke="var(--border-color)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card, #1e293b)',
                    borderColor: 'var(--border-color)',
                    fontSize: '12px',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="post_impressions"
                  name="Post Impressions"
                  stroke="#0a66c2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#impGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profile_views"
                  name="Profile Views"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#viewsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              border: '1px dashed var(--border-color)',
              borderRadius: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            No metric snapshots logged yet. Click <strong>"Log Metric Snapshot"</strong> above to enter your weekly LinkedIn stats and build your durable analytics trendline.
          </div>
        )}
      </div>

      {/* Strategic Agent Memory Bank Section */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={20} color="#8b5cf6" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Strategic Agent Memory Bank
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Durable instructions, writing style guides, and learned audience preferences automatically injected into future AI drafts
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
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                fontSize: '0.775rem',
              }}
            >
              <option value="ALL">All Memories ({memories.length})</option>
              <option value="WRITING_STYLE_GUIDE">Writing Style Guides</option>
              <option value="TOPIC_PERFORMANCE">Topic Performance</option>
              <option value="OUTREACH_STRATEGY">Outreach Strategy</option>
              <option value="AUDIENCE_PREFERENCE">Audience Preferences</option>
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
              <span>Teach / Add Memory</span>
            </button>
          </div>
        </div>

        {filteredMemories.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              border: '1px dashed var(--border-color)',
              borderRadius: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            No strategic memories configured yet. Click <strong>"Teach / Add Memory"</strong> to inject tone preferences, top-performing hooks, or outreach rules that the AI should always follow.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {filteredMemories.map((mem) => {
              const badge = getMemoryTypeBadge(mem.memory_type);
              const valStr = typeof mem.value === 'string' ? mem.value : JSON.stringify(mem.value, null, 2);

              return (
                <div
                  key={mem.id}
                  className="card"
                  style={{
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary, rgba(255,255,255,0.02))',
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
                      }}
                    >
                      {badge.label}
                    </span>

                    <button
                      onClick={() => handleDeleteMemory(mem.id, mem.key)}
                      className="btn btn-secondary"
                      title="Delete memory"
                      style={{ padding: '0.25rem', color: '#ef4444' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {mem.key}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {valStr}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '0.25rem',
                      paddingTop: '0.45rem',
                      borderTop: '1px solid var(--border-color)',
                      fontSize: '0.675rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Confidence: {(Number(mem.confidence) * 100).toFixed(0)}%</span>
                    <span>Updated {new Date(mem.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operational 30-Day Retention Maintenance Box */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          background: 'rgba(16, 185, 129, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: '720px' }}>
          <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              30-Day Operational Retention Policy Guardrail
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Operational records (completed/rejected actions, temporary engagement logs) older than 30 days are purged to preserve database cleanliness. Durable analytics snapshots and strategic memories are permanently preserved.
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

      {/* Log Snapshot Modal */}
      {isLogSnapshotModalOpen && (
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
            if (e.target === e.currentTarget && !isSubmitting) setIsLogSnapshotModalOpen(false);
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
                    Post Impressions
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={postImpressions}
                    onChange={(e) => setPostImpressions(Number(e.target.value))}
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
                    Profile Views
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={profileViews}
                    onChange={(e) => setProfileViews(Number(e.target.value))}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Search Appearances
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={searchAppearances}
                    onChange={(e) => setSearchAppearances(Number(e.target.value))}
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
                    Reactions
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={totalReactions}
                    onChange={(e) => setTotalReactions(Number(e.target.value))}
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
                    Comments
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={totalComments}
                    onChange={(e) => setTotalComments(Number(e.target.value))}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Followers Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={followersCount}
                    onChange={(e) => setFollowersCount(Number(e.target.value))}
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
                    Connections Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={connectionsCount}
                    onChange={(e) => setConnectionsCount(Number(e.target.value))}
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
                  {isSubmitting ? 'Saving...' : 'Save Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Memory Modal */}
      {isAddMemoryModalOpen && (
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
            if (e.target === e.currentTarget && !isSubmitting) setIsAddMemoryModalOpen(false);
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
                Teach / Add Strategic Memory
              </h3>
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
                  Memory Type *
                </label>
                <select
                  value={newMemoryType}
                  onChange={(e) => setNewMemoryType(e.target.value as AgentMemoryType)}
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
                  <option value="WRITING_STYLE_GUIDE">Writing Style Guide (Tone, Hook Pattern, Structure)</option>
                  <option value="TOPIC_PERFORMANCE">Topic Performance (What converts best)</option>
                  <option value="OUTREACH_STRATEGY">Outreach Strategy (Connection notes, pitch angles)</option>
                  <option value="AUDIENCE_PREFERENCE">Audience Preference (Target personas, time, topics)</option>
                  <option value="LESSON_LEARNED">Lesson Learned (Post gotcha, feedback)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Memory Key / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  placeholder="e.g. Preferred DAX Hook Format"
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
                  Strategic Directive / Value *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newMemoryValue}
                  onChange={(e) => setNewMemoryValue(e.target.value)}
                  placeholder="e.g. Always begin DAX posts with a real production error or calculation trap. Keep length strictly between 160-200 words."
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

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Confidence Weight: {Math.round(newConfidence * 100)}%
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={newConfidence}
                  onChange={(e) => setNewConfidence(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8b5cf6' }}
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
                  {isSubmitting ? 'Saving...' : 'Save Strategic Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
