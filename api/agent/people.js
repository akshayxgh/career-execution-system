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
      const q = url.searchParams.get('q');
      const status = url.searchParams.get('status');

      let query = supabase
        .from('linkedin_people')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (status && status !== 'ALL') {
        query = query.eq('connection_status', status);
      }

      if (q && q.trim()) {
        const searchTerm = `%${q.trim()}%`;
        query = query.or(
          `full_name.ilike.${searchTerm},company.ilike.${searchTerm},role.ilike.${searchTerm},headline.ilike.${searchTerm}`
        );
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({ ok: true, people: data || [] });
    }

    if (req.method === 'POST') {
      const {
        full_name,
        profile_url,
        headline,
        company,
        role,
        location,
        connection_status = 'NOT_CONNECTED',
        interaction_notes,
        tags = [],
      } = req.body || {};

      if (!full_name || !profile_url) {
        return res.status(400).json({
          ok: false,
          message: 'Both full_name and profile_url are required.',
        });
      }

      const { data, error } = await supabase
        .from('linkedin_people')
        .insert({
          user_id: userId,
          full_name: full_name.trim(),
          profile_url: profile_url.trim(),
          headline: headline?.trim() || null,
          company: company?.trim() || null,
          role: role?.trim() || null,
          location: location?.trim() || null,
          connection_status,
          interaction_notes: interaction_notes?.trim() || null,
          tags: Array.isArray(tags) ? tags : [],
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(201).json({ ok: true, person: data });
    }

    if (req.method === 'PATCH') {
      const {
        id,
        connection_status,
        interaction_notes,
        tags,
        headline,
        company,
        role,
        location,
        last_interaction_at,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, message: 'Person ID is required for PATCH.' });
      }

      const updates = { updated_at: new Date().toISOString() };
      if (connection_status !== undefined) updates.connection_status = connection_status;
      if (interaction_notes !== undefined) updates.interaction_notes = interaction_notes;
      if (tags !== undefined) updates.tags = tags;
      if (headline !== undefined) updates.headline = headline;
      if (company !== undefined) updates.company = company;
      if (role !== undefined) updates.role = role;
      if (location !== undefined) updates.location = location;
      if (last_interaction_at !== undefined) updates.last_interaction_at = last_interaction_at;

      const { data, error } = await supabase
        .from('linkedin_people')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({ ok: true, person: data });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = url.searchParams.get('id') || req.body?.id;

      if (!id) {
        return res.status(400).json({ ok: false, message: 'Person ID is required for DELETE.' });
      }

      const { error } = await supabase
        .from('linkedin_people')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({ ok: true, message: 'Person deleted successfully.' });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error handling /api/agent/people:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
