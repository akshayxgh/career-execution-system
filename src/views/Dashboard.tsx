import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { calculateExecutionScore, getStreak } from '../utils/scoreCalculator';
import {
  Flame,
  Briefcase,
  CheckCircle,
  Activity,
  Brain,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { isSameWeek, format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import {
  getDecisionJobs,
  getAppliedJobs,
  type DecisionJob,
  type AppliedJobFromDB,
} from '../services/decisionIntelligenceService';
import { formatToISTDate } from '../utils/dateUtils';
import { DailyRoutineTracker } from '../components/DailyRoutineTracker';

export const Dashboard = () => {
  const { state } = useStore();
  const navigate = useNavigate();

  const [decisionJobs, setDecisionJobs] = useState<DecisionJob[]>([]);
  const [appliedDbJobs, setAppliedDbJobs] = useState<AppliedJobFromDB[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    Promise.all([
      getDecisionJobs().catch(() => []),
      getAppliedJobs().catch(() => []),
    ])
      .then(([dJobs, aJobs]) => {
        setDecisionJobs(dJobs);
        setAppliedDbJobs(aJobs);
      })
      .finally(() => setLoadingJobs(false));
  }, []);

  const score = calculateExecutionScore(state);
  const streak = getStreak(state);

  // Aggregated Applied Jobs Tracking across Supabase my_jobs, local applications, and decision jobs
  const appliedJobIds = new Set<string>();
  const dailyAppliedMap: Record<string, number> = {};

  // 1. Applications from Supabase DB (getAppliedJobs)
  appliedDbJobs.forEach((dbApp) => {
    appliedJobIds.add(dbApp.job_id);
    const dateKey = formatToISTDate(dbApp.updated_at);
    if (dateKey !== '—') {
      dailyAppliedMap[dateKey] = (dailyAppliedMap[dateKey] || 0) + 1;
    }
  });

  // 2. Applications from Local Store (state.applications)
  state.applications.forEach((a) => {
    if (a.appliedDate && ['Applied', 'Interviewing', 'Offer', 'Joined'].includes(a.status)) {
      if (!appliedJobIds.has(a.id)) {
        appliedJobIds.add(a.id);
        const dateKey = formatToISTDate(a.appliedDate);
        if (dateKey !== '—') {
          dailyAppliedMap[dateKey] = (dailyAppliedMap[dateKey] || 0) + 1;
        }
      }
    }
  });

  // 3. Applications from Decision Jobs (if my_status === 'APPLIED')
  decisionJobs.forEach((j) => {
    if (j.my_status === 'APPLIED') {
      if (!appliedJobIds.has(j.id)) {
        appliedJobIds.add(j.id);
        const dateKey = formatToISTDate(j.status_updated_at || j.analyzed_at);
        if (dateKey !== '—') {
          dailyAppliedMap[dateKey] = (dailyAppliedMap[dateKey] || 0) + 1;
        }
      }
    }
  });

  const totalApplied = appliedJobIds.size;
  const todayStr = formatToISTDate(new Date().toISOString());
  const totalAppliedToday = dailyAppliedMap[todayStr] || 0;

  const hoursThisWeek = state.studyLogs
    .filter((l) => isSameWeek(new Date(l.date), new Date()))
    .reduce((sum, log) => sum + log.actualHours, 0);

  const openWeaknesses = state.weaknesses.filter(
    (w) => w.status === 'Open' || w.status === 'Learning'
  ).length;

  // Top AI Match Job (Should be today's scraped jobs only if available)
  const isDateToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    try {
      return formatToISTDate(dateStr) === todayStr;
    } catch {
      return false;
    }
  };

  const todayScrapedJobs = decisionJobs.filter(
    (j) => isDateToday(j.analyzed_at) || isDateToday(j.created_at) || isDateToday(j.posted_date)
  );

  const sortedTodayJobs = [...todayScrapedJobs].sort((a, b) => b.score - a.score);
  const sortedAllJobs = [...decisionJobs].sort((a, b) => b.score - a.score);

  const topJob = sortedTodayJobs.length > 0 ? sortedTodayJobs[0] : sortedAllJobs[0] || null;
  const isTopJobFromToday = sortedTodayJobs.length > 0;

  // Top 5 Jobs with MAXIMUM Score for Live Decision Feed
  const maxScoreTop5Jobs = sortedAllJobs.slice(0, 5);

  // Monthly Calendar Helper Data
  const currentDate = new Date();
  const currentMonthYearStr = format(currentDate, 'yyyy-MM');
  const daysInCurrentMonth = getDaysInMonth(currentDate);
  const monthStartDayOfWeek = getDay(startOfMonth(currentDate)); // 0 = Sun, 1 = Mon...
  const currentDayNumber = currentDate.getDate();

  // Circle Color Logic specified by user:
  // Red: 0 is darker red, 1-9 lighter red/pink
  // Green: 10 is light green, 20+ is greenest
  const getCircleColor = (count: number) => {
    if (count === 0) return { bg: '#dc2626', color: '#ffffff' };  // Darker Red for 0
    if (count < 5) return { bg: '#ef4444', color: '#ffffff' };   // Red for 1-4
    if (count < 10) return { bg: '#fca5a5', color: '#7f1d1d' };  // Light Red/Pink for 5-9
    if (count < 20) return { bg: '#86efac', color: '#065f46' };  // Light Green for 10-19
    return { bg: '#15803d', color: '#ffffff' };                 // Greenest for 20+
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <header>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
          Welcome Back 👋
        </h1>
        <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Mission Control • Real-Time Career Execution Engine
        </p>
      </header>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            borderLeft: '4px solid var(--accent-primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Execution Score</span>
            <Activity size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>{score}</span>
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
              <TrendingUp size={12} color="var(--success)" style={{ display: 'inline' }} /> Target: 85+
            </span>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            borderLeft: '4px solid var(--accent-primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">AI Match Recommendations</span>
            <Brain size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
              {loadingJobs ? '...' : decisionJobs.length}
            </span>
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Active Leads</span>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            borderLeft: '4px solid var(--warning)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Active Pipeline</span>
            <Briefcase size={20} color="var(--warning)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>{totalApplied}</span>
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Jobs Applied</span>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            borderLeft: '4px solid var(--info)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-sm font-semibold">Streak & Learning</span>
            <Flame size={20} color="var(--warning)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>{streak}</span>
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
              Days ({hoursThisWeek} hrs/wk)
            </span>
          </div>
        </div>
      </div>

      {/* Daily 4-Pillar Focus Routine Tracker */}
      <DailyRoutineTracker />

      {/* 2nd Row: 3 Squeezed Cards (Spotlight, Action Checklist, Circle Heatmap Calendar) */}
      <div className="grid grid-cols-3 gap-6">
        {/* Card 1: Today's Scraped Job Spotlight */}
        {topJob && (
          <div
            className="card"
            style={{
              gridColumn: 'span 1',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.3)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                  }}
                >
                  <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {isTopJobFromToday ? "TODAY'S TOP MATCH" : 'TOP SCORING MATCH'}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>{topJob.score} pts</span>
              </div>

              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#ffffff', fontWeight: 800 }}>
                {topJob.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#a7f3d0', fontWeight: 600 }}>
                {topJob.company_name} {topJob.location ? `• ${topJob.location}` : ''}
              </p>
              {topJob.salary && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#ecfdf5', fontWeight: 700 }}>
                  💰 {topJob.salary}
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => navigate('/decision-intelligence')}
              style={{
                background: '#ffffff',
                color: '#047857',
                fontWeight: 700,
                borderRadius: '20px',
                border: 'none',
                width: '100%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <span>Explore Opportunity</span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        )}

        {/* Card 2: Action Required & Priorities */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent-primary)" /> Action & Priorities
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {openWeaknesses > 0 ? (
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  borderLeft: '4px solid var(--danger)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>
                  {openWeaknesses} Unresolved Weaknesses
                </span>
                <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0' }}>
                  Review interview weaknesses.
                </p>
              </div>
            ) : (
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  borderLeft: '4px solid var(--success)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
                  <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Interview Ready
                </span>
                <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0' }}>
                  No open weaknesses logged.
                </p>
              </div>
            )}

            {decisionJobs.length > 0 && (
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: 'rgba(5, 150, 105, 0.08)',
                  borderLeft: '4px solid var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                  {decisionJobs.length} AI Job Leads
                </span>
                <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0' }}>
                  Review leads & contact recruiters.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Monthly Application Execution Circle Heatmap Calendar Chart */}
        <div className="card" style={{ gridColumn: 'span 1', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CalendarIcon size={16} color="var(--accent-primary)" /> {format(currentDate, 'MMM yyyy')}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              Today: {totalAppliedToday}
            </span>
          </div>

          {/* S M T W T F S Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', textAlign: 'center', marginBottom: '0.35rem' }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div
                key={`day-header-${idx}`}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Circle Heatmap Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem', justifyItems: 'center' }}>
            {/* Empty offset bubbles */}
            {Array.from({ length: monthStartDayOfWeek }).map((_, i) => (
              <div key={`offset-${i}`} style={{ width: '1.75rem', height: '1.75rem' }} />
            ))}

            {/* Monthly Day Circles */}
            {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
              const dateKey = `${currentMonthYearStr}-${formattedDay}`;
              const count = dailyAppliedMap[dateKey] || 0;
              const styleObj = getCircleColor(count);
              const isToday = dayNum === currentDayNumber;

              return (
                <div
                  key={`circle-${dayNum}`}
                  title={`${dateKey}: ${count} jobs applied`}
                  style={{
                    width: '1.85rem',
                    height: '1.85rem',
                    borderRadius: '50%',
                    background: styleObj.bg,
                    color: styleObj.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    border: isToday ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.1)',
                    boxShadow: isToday ? '0 0 0 2px var(--accent-primary)' : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {count > 0 ? count : dayNum}
                </div>
              );
            })}
          </div>

          {/* Heatmap Legend */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} /> 0
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#86efac', display: 'inline-block' }} /> 10+
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d', display: 'inline-block' }} /> 20+
            </div>
          </div>
        </div>
      </div>

      {/* Live Decision Intelligence Feed (Showing Top 5 Maximum Score Jobs) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              Live Decision Intelligence Feed
            </h3>
            <p className="text-xs text-muted" style={{ margin: '0.2rem 0 0' }}>
              Top 5 opportunities prioritized strictly by MAXIMUM match score
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/decision-intelligence')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            Open Decision Board
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <th style={{ padding: '0.6rem 0.5rem' }}>SCORE</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>JOB & COMPANY</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>LOCATION</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>SALARY</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {maxScoreTop5Jobs.map((job) => (
                <tr
                  key={job.id}
                  style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        background: job.score >= 75 ? 'var(--accent-primary)' : 'var(--warning)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {job.score}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{job.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.company_name}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                    {job.location || 'Remote'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {job.salary || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(5, 150, 105, 0.1)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {job.my_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
