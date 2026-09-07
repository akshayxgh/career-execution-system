import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPipelineDailyMetrics,
  aggregateByDate,
  aggregateChannelYield,
  type DailySummary,
  type ChannelYield,
} from '../../services/pipelineMetricsService';
import {
  Sparkles,
  Bot,
  Filter,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  Building2,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

export const PipelineSurveillanceWidget: React.FC = () => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [channelYields, setChannelYields] = useState<ChannelYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const raw = await getPipelineDailyMetrics();
      const daily = aggregateByDate(raw);
      const yields = aggregateChannelYield(raw);
      setSummaries(daily);
      setChannelYields(yields);
      if (daily.length > 0) {
        setSelectedDate(daily[0].date);
      }
    } catch (err) {
      console.error('Failed to load pipeline surveillance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [yieldMode, setYieldMode] = useState<'datewise' | 'alltime'>('datewise');

  const activeDay = useMemo(() => {
    if (!summaries.length) return null;
    return summaries.find((s) => s.date === selectedDate) || summaries[0];
  }, [summaries, selectedDate]);

  // Compute date-wise or all-time channel yield
  const displayYields = useMemo(() => {
    if (yieldMode === 'datewise') {
      if (!activeDay || !activeDay.sources) return [];
      return [...activeDay.sources]
        .filter((s) => s.scraped > 0)
        .sort((a, b) => b.apply_matches - a.apply_matches || b.conversion_pct - a.conversion_pct || b.scraped - a.scraped)
        .map((s) => ({
          name: s.source,
          category: s.category,
          scraped: s.scraped,
          matches: s.apply_matches,
          conversion_pct: s.conversion_pct,
        }));
    } else {
      return channelYields.map((c) => ({
        name: c.source_name,
        category: c.category,
        scraped: c.total_scraped,
        matches: c.total_apply,
        conversion_pct: c.conversion_pct,
      }));
    }
  }, [yieldMode, activeDay, channelYields]);

  // Chart data: reverse to display chronological (oldest to newest)
  const chartData = useMemo(() => {
    return [...summaries]
      .reverse()
      .slice(-7)
      .map((s) => ({
        date: s.date.slice(5), // MM-DD
        'Total Scraped': s.total_scraped,
        'AI Analyzed': s.total_analyzed,
        'High Matches (60+)': s.total_high_matches,
        'Apply Matches': s.total_apply,
      }));
  }, [summaries]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
        <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          Loading automated pipeline surveillance metrics...
        </p>
      </div>
    );
  }

  if (!activeDay) {
    return null;
  }

  const noiseReductionPct =
    activeDay.total_scraped > 0
      ? Math.round(((activeDay.total_scraped - activeDay.total_apply) / activeDay.total_scraped) * 100)
      : 0;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.25rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '20px',
                background: 'rgba(5, 150, 105, 0.12)',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              <Cpu size={13} />
              SCRAPER RECON & AI SURVEILLANCE
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              • Synced via Supabase
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            Automated Ingestion & Yield Funnel
          </h2>
          <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
            Multi-portal web scraper discovery, noise filtering, and algorithmic match conversion
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {summaries.length > 1 && (
            <select
              className="input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.8rem',
                width: 'auto',
                fontWeight: 600,
              }}
            >
              {summaries.map((s) => (
                <option key={s.date} value={s.date}>
                  {s.date} ({s.total_scraped} scraped)
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/decision-intelligence')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>Decision Board</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>

      {/* 5-Step Ingestion Funnel Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {/* Step 1 */}
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              1. RAW SCRAPED
            </span>
            <Building2 size={15} color="var(--text-muted)" />
          </div>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1 }}>
            {activeDay.total_scraped}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Jobs crawled across {activeDay.sources.length} sources
          </span>
        </div>

        {/* Step 2 */}
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              2. FILTERED / DEDUP
            </span>
            <Filter size={15} color="var(--warning)" />
          </div>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1, color: 'var(--warning)' }}>
            {activeDay.total_filtered + activeDay.total_deduplicated}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Title gate & duplicates weeded out
          </span>
        </div>

        {/* Step 3 */}
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              3. AI ANALYZED
            </span>
            <Bot size={15} color="#6366f1" />
          </div>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1, color: '#6366f1' }}>
            {activeDay.total_analyzed}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Evaluated by LLM match engine
          </span>
        </div>

        {/* Step 4 */}
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              4. HIGH VALUE (60+)
            </span>
            <Sparkles size={15} color="#0284c7" />
          </div>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1, color: '#0284c7' }}>
            {activeDay.total_high_matches}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Avg Score: {activeDay.avg_score} pts
          </span>
        </div>

        {/* Step 5 */}
        <div
          style={{
            padding: '0.85rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            border: '1px solid var(--accent-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              5. READY TO APPLY
            </span>
            <CheckCircle2 size={15} color="var(--accent-primary)" />
          </div>
          <span style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1, color: 'var(--accent-primary)' }}>
            {activeDay.total_apply}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
            {noiseReductionPct}% noise eliminated!
          </span>
        </div>
      </div>

      {/* 2-Column Split: Channel Leaderboard & 7-Day Velocity Chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Left Column: Top Channel & Company Yield Leaderboard */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={16} color="var(--accent-primary)" />
                Channel & Company Yield
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {yieldMode === 'datewise' ? `Breakdown for ${activeDay.date}` : 'Aggregated across all runs'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setYieldMode('datewise')}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: yieldMode === 'datewise' ? 'var(--accent-primary)' : 'transparent',
                  color: yieldMode === 'datewise' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                Date-wise
              </button>
              <button
                type="button"
                onClick={() => setYieldMode('alltime')}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: yieldMode === 'alltime' ? 'var(--accent-primary)' : 'transparent',
                  color: yieldMode === 'alltime' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                All-Time
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  <th style={{ padding: '0.4rem 0.2rem', textAlign: 'left' }}>SOURCE / PORTAL</th>
                  <th style={{ padding: '0.4rem 0.2rem', textAlign: 'center' }}>SCRAPED</th>
                  <th style={{ padding: '0.4rem 0.2rem', textAlign: 'center' }}>MATCHES</th>
                  <th style={{ padding: '0.4rem 0.2rem', textAlign: 'right' }}>YIELD %</th>
                </tr>
              </thead>
              <tbody>
                {displayYields.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No source metrics recorded for this date.
                    </td>
                  </tr>
                ) : (
                  displayYields.slice(0, 10).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.55rem 0.2rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background:
                              item.category === 'career'
                                ? 'rgba(99, 102, 241, 0.15)'
                                : item.category.includes('recommend')
                                ? 'rgba(5, 150, 105, 0.15)'
                                : 'rgba(2, 132, 199, 0.15)',
                            color:
                              item.category === 'career'
                                ? '#818cf8'
                                : item.category.includes('recommend')
                                ? 'var(--accent-primary)'
                                : '#38bdf8',
                          }}
                        >
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.55rem 0.2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {item.scraped}
                      </td>
                      <td style={{ padding: '0.55rem 0.2rem', textAlign: 'center', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {item.matches}
                      </td>
                      <td style={{ padding: '0.55rem 0.2rem', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            background:
                              item.conversion_pct >= 20
                                ? 'rgba(5, 150, 105, 0.2)'
                                : item.conversion_pct >= 10
                                ? 'rgba(2, 132, 199, 0.2)'
                                : 'rgba(255, 255, 255, 0.08)',
                            color:
                              item.conversion_pct >= 20
                                ? 'var(--accent-primary)'
                                : item.conversion_pct >= 10
                                ? '#38bdf8'
                                : 'var(--text-muted)',
                          }}
                        >
                          {item.conversion_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: 7-Day Discovery & Match Velocity Chart */}
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              7-Day Ingestion Velocity
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Scraped vs. High Match
            </span>
          </div>

          <div style={{ height: '220px', width: '100%', marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '6px' }} />
                <Bar dataKey="Total Scraped" fill="rgba(255, 255, 255, 0.2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="High Matches (60+)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Apply Matches" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
