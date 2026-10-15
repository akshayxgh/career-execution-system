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
      const type = url.searchParams.get('type');

      let query = supabase
        .from('linkedin_agent_memory')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (type && type !== 'ALL') {
        query = query.eq('memory_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ ok: true, memories: data || [] });
    }

    if (req.method === 'POST') {
      const {
        memory_type,
        key,
        value,
        confidence = 1.0,
      } = req.body || {};

      if (!memory_type || !key || value === undefined) {
        return res.status(400).json({
          ok: false,
          message: 'memory_type, key, and value are required.',
        });
      }

      const allowedTypes = [
        'AUDIENCE_PREFERENCE',
        'TOPIC_PERFORMANCE',
        'WRITING_STYLE_GUIDE',
        'OUTREACH_STRATEGY',
        'LESSON_LEARNED',
      ];

      if (!allowedTypes.includes(memory_type)) {
        return res.status(400).json({
          ok: false,
          message: `Invalid memory_type. Must be one of: ${allowedTypes.join(', ')}`,
        });
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('linkedin_agent_memory')
        .upsert(
          {
            user_id: userId,
            memory_type,
            key: key.trim(),
            value,
            confidence: Number(confidence) || 1.0,
            updated_at: now,
          },
          { onConflict: 'user_id,memory_type,key' }
        )
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ ok: true, memory: data });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = url.searchParams.get('id') || req.body?.id;

      if (!id) {
        return res.status(400).json({ ok: false, message: 'Memory ID is required for DELETE.' });
      }

      const { error } = await supabase
        .from('linkedin_agent_memory')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      return res.status(200).json({ ok: true, message: 'Strategic memory removed successfully.' });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/agent/memory:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
