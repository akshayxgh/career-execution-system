import { getServiceClient } from '../_db.js';
import { authenticateAgentRequest, canApproveActions } from './_agentAuth.js';

export default async function handler(req, res) {
  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ ok: false, message: auth.error || 'Unauthorized' });
  }

  const supabase = getServiceClient();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const actionParam = url.searchParams.get('action');

  // =========================================================================
  // SUB-HANDLER: 30-Day Operational Retention Maintenance
  // =========================================================================
  if (actionParam === 'maintenance') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }

    if (!canApproveActions(auth)) {
      return res.status(403).json({
        ok: false,
        message: 'Forbidden: Human authentication required for retention maintenance.',
      });
    }

    const userId = auth.user || 'Akshay';
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: cleanedActions, error: actErr } = await supabase
        .from('linkedin_actions')
        .delete()
        .eq('user_id', userId)
        .in('status', ['EXECUTED', 'REJECTED', 'EXPIRED'])
        .lt('created_at', cutoffDate)
        .select('id');

      if (actErr) throw actErr;

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

  // =========================================================================
  // SUB-HANDLER: Publish Status Confirmation (from Companion Extension)
  // =========================================================================
  if (actionParam === 'publish-status') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }

    if (!canApproveActions(auth)) {
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

      if (actionType === 'PUBLISH_POST') {
        const targetConceptId = concept_id || action.payload?.concept_id || null;

        await supabase
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

        if (targetConceptId) {
          const { data: rpcResult } = await supabase.rpc('update_concept_linkedin_link', {
            p_user_id: 'Akshay',
            p_concept_id: targetConceptId,
            p_linkedin_url: cleanUrl,
          });
          conceptUpdated = Boolean(rpcResult);
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

  // =========================================================================
  // GET: Retrieve LinkedIn Actions
  // =========================================================================
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);

      let query = supabase
        .from('linkedin_actions')
        .select('*')
        .eq('user_id', 'Akshay')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({
        ok: true,
        actions: data || [],
      });
    } catch (err) {
      console.error('Failed to fetch actions:', err);
      return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
    }
  }

  // =========================================================================
  // POST: Propose New Action (AI or Human)
  // =========================================================================
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
      const {
        action_type = 'PUBLISH_POST',
        payload = {},
        content,
        topic,
        reasoning = 'Generated from MYCES concept context',
        target_id,
        concept_id,
      } = body;

      // Normalize payload
      const finalPayload = {
        ...payload,
        topic: topic || payload.topic || 'General Career / Technical Insight',
        content: content || payload.content || '',
        concept_id: concept_id || payload.concept_id || null,
        tags: payload.tags || [],
      };

      if (!finalPayload.content.trim()) {
        return res.status(400).json({ ok: false, message: 'Content is required for LinkedIn post action.' });
      }

      const newAction = {
        user_id: 'Akshay',
        action_type,
        status: 'PENDING_APPROVAL',
        payload: finalPayload,
        reasoning,
        target_id: target_id || null,
        proposed_by: auth.role === 'agent' ? 'linkedin_agent' : 'human_user',
      };

      const { data, error } = await supabase
        .from('linkedin_actions')
        .insert(newAction)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        action: data,
      });
    } catch (err) {
      console.error('Failed to create action:', err);
      return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
    }
  }

  // =========================================================================
  // PATCH: Human Approval / Rejection / Edit
  // =========================================================================
  if (req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
      const { id, status, payload, content } = body;

      if (!id) {
        return res.status(400).json({ ok: false, message: 'Action ID is required.' });
      }

      // Fetch existing action to verify lifecycle
      const { data: existing, error: fetchErr } = await supabase
        .from('linkedin_actions')
        .select('*')
        .eq('id', id)
        .eq('user_id', 'Akshay')
        .single();

      if (fetchErr || !existing) {
        return res.status(404).json({ ok: false, message: 'Action not found.' });
      }

      const updates = {
        updated_at: new Date().toISOString(),
      };

      // Handle payload/content updates (editing)
      if (content !== undefined || payload !== undefined) {
        updates.payload = {
          ...existing.payload,
          ...(payload || {}),
        };
        if (content !== undefined) {
          updates.payload.content = content;
        }
      }

      // Handle status transition
      if (status && status !== existing.status) {
        // Enforce: AI agent can NEVER approve actions
        if (status === 'APPROVED') {
          if (!canApproveActions(auth)) {
            return res.status(403).json({
              ok: false,
              message: 'Forbidden: The AI agent cannot approve its own actions. Human approval required.',
            });
          }
        }

        const validTransitions = {
          PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'PENDING_APPROVAL'],
          APPROVED: ['REJECTED', 'READY_FOR_MANUAL'],
          READY_FOR_MANUAL: ['EXECUTED', 'CANCELLED', 'APPROVED', 'REJECTED'],
          REJECTED: ['PENDING_APPROVAL'],
        };

        const allowed = validTransitions[existing.status] || [];
        if (!allowed.includes(status)) {
          return res.status(400).json({
            ok: false,
            message: `Invalid state transition from '${existing.status}' to '${status}'.`,
          });
        }

        updates.status = status;
        updates.reviewed_at = new Date().toISOString();
      }

      const { data: updated, error: updateErr } = await supabase
        .from('linkedin_actions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return res.status(200).json({
        ok: true,
        action: updated,
      });
    } catch (err) {
      console.error('Failed to update action:', err);
      return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
}
