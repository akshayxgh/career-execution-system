import { getServiceClient } from '../_db.js';
import { authenticateAgentRequest, canApproveActions } from './_agentAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated || !canApproveActions(auth)) {
    return res.status(403).json({
      ok: false,
      message: 'Forbidden: Human authentication required for retention maintenance.',
    });
  }

  const supabase = getServiceClient();
  const userId = auth.user || 'Akshay';

  try {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Delete completed/rejected/expired actions older than 30 days
    const { data: cleanedActions, error: actErr } = await supabase
      .from('linkedin_actions')
      .delete()
      .eq('user_id', userId)
      .in('status', ['EXECUTED', 'REJECTED', 'EXPIRED'])
      .lt('created_at', cutoffDate)
      .select('id');

    if (actErr) throw actErr;

    // 2. Delete raw engagements older than 30 days
    const { data: cleanedEngagements, error: engErr } = await supabase
      .from('linkedin_engagements')
      .delete()
      .eq('user_id', userId)
      .lt('occurred_at', cutoffDate)
      .select('id');

    if (engErr) throw engErr;

    return res.status(200).json({
      ok: true,
      message: '30-day retention cleanup executed successfully.',
      cutoff_date: cutoffDate,
      cleaned_counts: {
        actions: cleanedActions?.length || 0,
        engagements: cleanedEngagements?.length || 0,
      },
    });
  } catch (err) {
    console.error('Error during maintenance cleanup:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
