import { getServiceClient } from '../_db.js';
import { authenticateAgentRequest } from './_agentAuth.js';

export default async function handler(req, res) {
  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ ok: false, message: auth.error || 'Unauthorized' });
  }

  const supabase = getServiceClient();
  const userId = auth.user || 'Akshay';

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const days = parseInt(url.searchParams.get('days') || '90', 10);

      // 1. Fetch durable metric snapshots
      const { data: snapshots, error: snapErr } = await supabase
        .from('linkedin_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: true })
        .limit(days);

      if (snapErr) throw snapErr;

      // 2. Aggregate operational metrics
      const [
        { count: publishedPostsCount },
        { data: peopleData },
        { count: engagementsCount },
        { data: opportunitiesData },
        { data: memoryData },
      ] = await Promise.all([
        supabase
          .from('linkedin_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'PUBLISHED'),
        supabase
          .from('linkedin_people')
          .select('connection_status')
          .eq('user_id', userId),
        supabase
          .from('linkedin_engagements')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('linkedin_opportunities')
          .select('status')
          .eq('user_id', userId),
        supabase
          .from('linkedin_agent_memory')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
      ]);

      const allPeople = peopleData || [];
      const sentCount = allPeople.filter((p) =>
        ['INVITATION_SENT', 'CONNECTED'].includes(p.connection_status)
      ).length;
      const connectedCount = allPeople.filter((p) => p.connection_status === 'CONNECTED').length;
      const conversionRate =
        sentCount > 0 ? Math.round((connectedCount / sentCount) * 100) : 0;

      const allOpps = opportunitiesData || [];
      const activeOppsCount = allOpps.filter((o) =>
        ['NEW', 'EVALUATING', 'ACTION_PROPOSED', 'PURSUING'].includes(o.status)
      ).length;

      const summary = {
        totalPostsPublished: publishedPostsCount || 0,
        totalConnectionRequestsSent: sentCount,
        totalConnectionsMade: connectedCount,
        outreachConversionRate: conversionRate,
        totalEngagements: engagementsCount || 0,
        totalOpportunitiesTracked: allOpps.length,
        activeOpportunities: activeOppsCount,
        snapshots: snapshots || [],
        memories: memoryData || [],
      };

      return res.status(200).json({ ok: true, summary });
    }

    if (req.method === 'POST') {
      const {
        metric_date,
        profile_views = 0,
        search_appearances = 0,
        post_impressions = 0,
        total_reactions = 0,
        total_comments = 0,
        followers_count,
        connections_count,
        summary_metrics = {},
      } = req.body || {};

      const dateStr = metric_date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('linkedin_analytics')
        .upsert(
          {
            user_id: userId,
            metric_date: dateStr,
            profile_views: Number(profile_views) || 0,
            search_appearances: Number(search_appearances) || 0,
            post_impressions: Number(post_impressions) || 0,
            total_reactions: Number(total_reactions) || 0,
            total_comments: Number(total_comments) || 0,
            followers_count: followers_count !== undefined ? Number(followers_count) : null,
            connections_count: connections_count !== undefined ? Number(connections_count) : null,
            summary_metrics,
          },
          { onConflict: 'user_id,metric_date' }
        )
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ ok: true, snapshot: data });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/agent/analytics:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
