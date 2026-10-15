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
      message: 'Forbidden: Human authentication required to confirm publication.',
    });
  }

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const { action_id, linkedin_url, concept_id } = body;

    if (!action_id) {
      return res.status(400).json({ ok: false, message: 'action_id is required.' });
    }

    const cleanUrl = linkedin_url ? String(linkedin_url).trim() : '';
    const supabase = getServiceClient();

    // 1. Fetch action to confirm existence
    const { data: action, error: actionErr } = await supabase
      .from('linkedin_actions')
      .select('*')
      .eq('id', action_id)
      .eq('user_id', 'Akshay')
      .single();

    if (actionErr || !action) {
      return res.status(404).json({ ok: false, message: 'Action not found.' });
    }

    if (action.action_type === 'PUBLISH_POST' && !cleanUrl) {
      return res.status(400).json({ ok: false, message: 'A valid LinkedIn post URL is required for post publishing actions.' });
    }

    const now = new Date().toISOString();
    const actionType = action.action_type;

    // 2. Mark action as EXECUTED with manual fallback method
    const updatedPayload = {
      ...(action.payload || {}),
      ...(cleanUrl ? { post_url: cleanUrl } : {}),
    };

    const { error: updateActionErr } = await supabase
      .from('linkedin_actions')
      .update({
        status: 'EXECUTED',
        execution_method: 'MANUAL_FALLBACK',
        executed_at: now,
        payload: updatedPayload,
        updated_at: now,
      })
      .eq('id', action_id);

    if (updateActionErr) throw updateActionErr;

    let conceptUpdated = false;

    // 3. Action-specific side effects
    if (actionType === 'PUBLISH_POST') {
      const targetConceptId = concept_id || action.payload?.concept_id || null;

      // Record published post in linkedin_posts
      const { error: postInsertErr } = await supabase
        .from('linkedin_posts')
        .insert({
          user_id: 'Akshay',
          topic: action.payload?.topic || 'General Technical Insight',
          content: action.payload?.content || '',
          post_url: cleanUrl || null,
          concept_id: targetConceptId,
          status: 'PUBLISHED',
          published_at: now,
          tags: action.payload?.tags || [],
        });

      if (postInsertErr) {
        console.warn('Failed to insert into linkedin_posts:', postInsertErr);
      }

      // Atomically sync linkedinPostLink to app_state concept if concept_id is present
      if (targetConceptId) {
        const { data: rpcResult, error: rpcErr } = await supabase.rpc('update_concept_linkedin_link', {
          p_user_id: 'Akshay',
          p_concept_id: targetConceptId,
          p_linkedin_url: cleanUrl,
        });

        if (rpcErr) {
          console.warn('Concept link sync RPC error:', rpcErr);
        } else {
          conceptUpdated = Boolean(rpcResult);
        }
      }
    } else if (actionType === 'SEND_CONNECTION') {
      const personId = action.target_id || action.payload?.person_id || null;
      if (personId) {
        await supabase
          .from('linkedin_people')
          .update({
            connection_status: 'INVITATION_SENT',
            last_interaction_at: now,
            updated_at: now,
          })
          .eq('id', personId)
          .eq('user_id', 'Akshay');

        await supabase
          .from('linkedin_engagements')
          .insert({
            user_id: 'Akshay',
            person_id: personId,
            engagement_type: 'MESSAGE_EXCHANGE',
            content: action.payload?.content || 'Connection invitation note sent',
            occurred_at: now,
          });
      }
    } else if (actionType === 'COMMENT') {
      const personId = action.payload?.person_id || null;
      await supabase
        .from('linkedin_engagements')
        .insert({
          user_id: 'Akshay',
          person_id: personId,
          engagement_type: 'COMMENT',
          content: action.payload?.content || 'Comment posted',
          occurred_at: now,
        });
    } else if (actionType === 'MESSAGE' || actionType === 'FOLLOW_UP') {
      const personId = action.target_id || action.payload?.person_id || null;
      if (personId) {
        await supabase
          .from('linkedin_people')
          .update({
            last_interaction_at: now,
            updated_at: now,
          })
          .eq('id', personId)
          .eq('user_id', 'Akshay');

        await supabase
          .from('linkedin_engagements')
          .insert({
            user_id: 'Akshay',
            person_id: personId,
            engagement_type: 'MESSAGE_EXCHANGE',
            content: action.payload?.content || 'Direct outreach sent',
            occurred_at: now,
          });
      }
    }

    return res.status(200).json({
      ok: true,
      action_id,
      status: 'EXECUTED',
      action_type: actionType,
      linkedin_url: cleanUrl,
      concept_updated: conceptUpdated,
    });
  } catch (err) {
    console.error('Failed to confirm execution:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
