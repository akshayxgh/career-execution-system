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
      const status = url.searchParams.get('status');

      let query = supabase
        .from('linkedin_opportunities')
        .select('*, contact_person:linkedin_people(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      if (type && type !== 'ALL') {
        query = query.eq('opportunity_type', type);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({ ok: true, opportunities: data || [] });
    }

    if (req.method === 'POST') {
      const {
        title,
        company,
        opportunity_type = 'JOB_POSTING',
        source_url,
        contact_person_id,
        description,
        score,
        status = 'NEW',
      } = req.body || {};

      if (!title || !company || !source_url) {
        return res.status(400).json({
          ok: false,
          message: 'Title, company, and source_url are required.',
        });
      }

      const { data, error } = await supabase
        .from('linkedin_opportunities')
        .insert({
          user_id: userId,
          title: title.trim(),
          company: company.trim(),
          opportunity_type,
          source_url: source_url.trim(),
          contact_person_id: contact_person_id || null,
          description: description?.trim() || null,
          score: typeof score === 'number' ? score : null,
          status,
        })
        .select('*, contact_person:linkedin_people(*)')
        .single();

      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(201).json({ ok: true, opportunity: data });
    }

    if (req.method === 'PATCH') {
      const {
        id,
        status,
        score,
        description,
        title,
        company,
        contact_person_id,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ ok: false, message: 'Opportunity ID is required for PATCH.' });
      }

      const updates = { updated_at: new Date().toISOString() };
      if (status !== undefined) updates.status = status;
      if (score !== undefined) updates.score = score;
      if (description !== undefined) updates.description = description;
      if (title !== undefined) updates.title = title;
      if (company !== undefined) updates.company = company;
      if (contact_person_id !== undefined) updates.contact_person_id = contact_person_id;

      const { data, error } = await supabase
        .from('linkedin_opportunities')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*, contact_person:linkedin_people(*)')
        .single();

      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({ ok: true, opportunity: data });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = url.searchParams.get('id') || req.body?.id;

      if (!id) {
        return res.status(400).json({ ok: false, message: 'Opportunity ID is required for DELETE.' });
      }

      const { error } = await supabase
        .from('linkedin_opportunities')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({ ok: true, message: 'Opportunity deleted successfully.' });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error handling /api/agent/opportunities:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
