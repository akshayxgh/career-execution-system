import { getServiceClient } from '../_db.js';
import { authenticateAgentRequest, canApproveActions } from './_agentAuth.js';

export default async function handler(req, res) {
  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ ok: false, message: auth.error || 'Unauthorized' });
  }

  const supabase = getServiceClient();

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
