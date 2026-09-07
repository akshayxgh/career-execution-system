import { supabase } from '../lib/supabase';

export interface PipelineDailyMetric {
  id?: string;
  metric_date: string;
  category: string;
  source: string;
  source_key: string;
  scraped: number;
  deduplicated: number;
  filtered: number;
  analyzed: number;
  apply_matches: number;
  maybe_review: number;
  skipped: number;
  high_value_60plus: number;
  avg_score: number;
  conversion_pct: number;
  updated_at?: string;
}

export interface DailySummary {
  date: string;
  total_scraped: number;
  total_deduplicated: number;
  total_filtered: number;
  total_analyzed: number;
  total_apply: number;
  total_maybe: number;
  total_skipped: number;
  total_high_matches: number;
  avg_score: number;
  overall_conversion_pct: number;
  sources: PipelineDailyMetric[];
}

export interface ChannelYield {
  source_name: string;
  category: string;
  total_scraped: number;
  total_apply: number;
  total_high_matches: number;
  avg_score: number;
  conversion_pct: number;
}

/**
 * Fetches all daily pipeline metrics from Supabase, falling back to /data/daily_pipeline_metrics.json
 */
export async function getPipelineDailyMetrics(): Promise<PipelineDailyMetric[]> {
  try {
    const { data, error } = await supabase
      .from('pipeline_daily_metrics')
      .select('*')
      .order('metric_date', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as PipelineDailyMetric[];
    }
  } catch (err) {
    console.warn('[pipelineMetricsService] Supabase query failed, attempting local fallback:', err);
  }

  // Fallback to static public JSON
  try {
    const res = await fetch('/data/daily_pipeline_metrics.json');
    if (res.ok) {
      const history = await res.json();
      const records: PipelineDailyMetric[] = [];
      for (const [dateStr, dData] of Object.entries<any>(history)) {
        for (const [srcKey, m] of Object.entries<any>(dData.sources || {})) {
          const [cat, src] = srcKey.includes(':') ? srcKey.split(':') : ['unknown', srcKey];
          records.push({
            metric_date: dateStr,
            category: cat,
            source: src,
            source_key: srcKey,
            scraped: m.scraped || 0,
            deduplicated: m.deduplicated || 0,
            filtered: m.filtered || 0,
            analyzed: m.analyzed || 0,
            apply_matches: m.apply || 0,
            maybe_review: m.maybe || 0,
            skipped: m.skip || 0,
            high_value_60plus: m.high_matches || 0,
            avg_score: m.avg_score || 0,
            conversion_pct: m.conversion_pct || 0,
          });
        }
      }
      return records.sort((a, b) => b.metric_date.localeCompare(a.metric_date));
    }
  } catch (err) {
    console.error('[pipelineMetricsService] Failed to load pipeline metrics:', err);
  }

  return [];
}

/**
 * Groups metrics by date to compute daily summaries
 */
export function aggregateByDate(metrics: PipelineDailyMetric[]): DailySummary[] {
  const map = new Map<string, PipelineDailyMetric[]>();

  for (const m of metrics) {
    const list = map.get(m.metric_date) || [];
    list.push(m);
    map.set(m.metric_date, list);
  }

  const summaries: DailySummary[] = [];

  for (const [date, items] of map.entries()) {
    let scraped = 0;
    let deduplicated = 0;
    let filtered = 0;
    let analyzed = 0;
    let apply = 0;
    let maybe = 0;
    let skipped = 0;
    let highMatches = 0;
    let totalScoreWeight = 0;

    for (const item of items) {
      scraped += item.scraped;
      deduplicated += item.deduplicated;
      filtered += item.filtered;
      analyzed += item.analyzed;
      apply += item.apply_matches;
      maybe += item.maybe_review;
      skipped += item.skipped;
      highMatches += item.high_value_60plus;
      totalScoreWeight += item.avg_score * item.analyzed;
    }

    const avgScore = analyzed > 0 ? Math.round((totalScoreWeight / analyzed) * 10) / 10 : 0;
    const overallConversion = scraped > 0 ? Math.round((apply / scraped) * 1000) / 10 : 0;

    summaries.push({
      date,
      total_scraped: scraped,
      total_deduplicated: deduplicated,
      total_filtered: filtered,
      total_analyzed: analyzed,
      total_apply: apply,
      total_maybe: maybe,
      total_skipped: skipped,
      total_high_matches: highMatches,
      avg_score: avgScore,
      overall_conversion_pct: overallConversion,
      sources: items.sort((a, b) => b.apply_matches - a.apply_matches),
    });
  }

  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Computes channel & company yield leaderboard aggregated across recent history
 */
export function aggregateChannelYield(metrics: PipelineDailyMetric[]): ChannelYield[] {
  const map = new Map<string, { category: string; scraped: number; apply: number; high: number; scoreSum: number; count: number }>();

  for (const m of metrics) {
    const key = m.source;
    const curr = map.get(key) || { category: m.category, scraped: 0, apply: 0, high: 0, scoreSum: 0, count: 0 };
    curr.scraped += m.scraped;
    curr.apply += m.apply_matches;
    curr.high += m.high_value_60plus;
    curr.scoreSum += m.avg_score;
    curr.count += 1;
    map.set(key, curr);
  }

  const yields: ChannelYield[] = [];
  for (const [source, data] of map.entries()) {
    if (data.scraped === 0) continue;
    const conv = Math.round((data.apply / data.scraped) * 1000) / 10;
    const avgScore = Math.round((data.scoreSum / data.count) * 10) / 10;
    yields.push({
      source_name: source,
      category: data.category,
      total_scraped: data.scraped,
      total_apply: data.apply,
      total_high_matches: data.high,
      avg_score: avgScore,
      conversion_pct: conv,
    });
  }

  // Sort by total apply matches descending, then conversion % descending
  return yields.sort((a, b) => b.total_apply - a.total_apply || b.conversion_pct - a.conversion_pct);
}
