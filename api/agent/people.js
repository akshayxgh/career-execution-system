import { getServiceClient } from '../_db.js';
import { authenticateAgentRequest } from './_agentAuth.js';

function parseCompanies(headline, currentCompany) {
  const text = `${headline || ''} ${currentCompany || ''}`;
  const tLower = text.toLowerCase();
  let detectedCurrent = currentCompany;
  const past = new Set();

  if (tLower.includes('pwc') || tLower.includes('pricewaterhousecoopers')) {
    if (!detectedCurrent) detectedCurrent = 'PwC';
    past.add('PwC');
  }
  if (tLower.includes('deloitte')) {
    if (!detectedCurrent) detectedCurrent = 'Deloitte';
    past.add('Deloitte');
  }
  if (tLower.includes('cognizant')) {
    if (!detectedCurrent) detectedCurrent = 'Cognizant';
    past.add('Cognizant');
  }
  if (tLower.includes('wipro')) {
    if (!detectedCurrent) detectedCurrent = 'Wipro';
    past.add('Wipro');
  }
  if (tLower.includes('jpmorgan') || tLower.includes('jp morgan') || tLower.includes('chase')) {
    if (!detectedCurrent) detectedCurrent = 'JPMorgan Chase';
    past.add('JPMorgan Chase');
  }
  if (tLower.includes('hcltech') || tLower.includes('hcl tech')) {
    if (!detectedCurrent) detectedCurrent = 'HCLTech';
    past.add('HCLTech');
  }
  if (tLower.includes('oracle')) {
    if (!detectedCurrent) detectedCurrent = 'Oracle';
    past.add('Oracle');
  }
  if (tLower.includes('capgemini')) {
    if (!detectedCurrent) detectedCurrent = 'Capgemini';
    past.add('Capgemini');
  }
  if (tLower.includes('unizon')) {
    if (!detectedCurrent) detectedCurrent = 'UNIZON Health Choice';
    past.add('UNIZON Health Choice');
  }
  if (tLower.includes('lupin')) {
    if (!detectedCurrent) detectedCurrent = 'Lupin';
    past.add('Lupin');
  }
  if (tLower.includes('arrowroot')) {
    if (!detectedCurrent) detectedCurrent = 'Arrowroot Management';
    past.add('Arrowroot Management');
  }
  if (tLower.includes('unitedhealth') || tLower.includes('optum')) {
    if (!detectedCurrent) detectedCurrent = 'UnitedHealth Group';
    past.add('UnitedHealth Group');
  }
  if (tLower.includes('xerox') || tLower.includes('lexmark')) {
    if (!detectedCurrent) detectedCurrent = 'Xerox-Lexmark';
    past.add('Xerox-Lexmark');
  }
  if (tLower.includes('rubixe')) {
    if (!detectedCurrent) detectedCurrent = 'Rubixe';
    past.add('Rubixe');
  }
  if (tLower.includes('universal data solutions') || tLower.includes('uds')) {
    if (!detectedCurrent) detectedCurrent = 'Universal Data Solutions';
    past.add('Universal Data Solutions');
  }
  if (tLower.includes('whole9yards')) {
    if (!detectedCurrent) detectedCurrent = 'Whole9yards USA';
    past.add('Whole9yards USA');
  }
  if (tLower.includes('gkw consult')) {
    if (!detectedCurrent) detectedCurrent = 'GKW Consult';
    past.add('GKW Consult');
  }

  const regex = /(?:ex-|former(?:ly)?\s+(?:at\s+)?)([a-zA-Z0-9&.\s]{2,20})(?=\s*[,|/–-]|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const comp = match[1].trim();
    if (comp && comp.length >= 2) past.add(comp);
  }

  return { current: detectedCurrent, past: Array.from(past) };
}

async function handleSyncEmployment(supabase, userId, res) {
  try {
    const { data: people, error } = await supabase
      .from('linkedin_people')
      .select('id, full_name, headline, company, tags, interaction_notes')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }

    let updatedCount = 0;
    const results = [];

    for (const p of people || []) {
      const { current, past } = parseCompanies(p.headline, p.company);
      const existingTags = Array.isArray(p.tags) ? [...p.tags] : [];
      const tagSet = new Set(existingTags);

      past.forEach((c) => tagSet.add(`Alumni: ${c}`));

      const hLower = (p.headline || '').toLowerCase();
      if (hLower.includes('health') || hLower.includes('claims') || hLower.includes('pharma') || hLower.includes('lupin') || hLower.includes('unizon')) {
        tagSet.add('Healthcare');
      }
      if (hLower.includes('pwc') || hLower.includes('deloitte') || hLower.includes('cognizant') || hLower.includes('wipro') || hLower.includes('consult')) {
        tagSet.add('Consulting');
      }

      const updates = {};
      if (current && p.company !== current) updates.company = current;
      if (tagSet.size > existingTags.length) updates.tags = Array.from(tagSet);

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase
          .from('linkedin_people')
          .update(updates)
          .eq('id', p.id);

        updatedCount++;
        results.push({
          name: p.full_name,
          company: current || p.company,
          pastEmployers: past,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      total: (people || []).length,
      updated: updatedCount,
      results,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}

export default async function handler(req, res) {
  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ ok: false, message: auth.error || 'Unauthorized' });
  }

  const supabase = getServiceClient();
  const userId = auth.user || 'Akshay';

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action') || (req.body && req.body.action);
    const scope = url.searchParams.get('scope');

    // =========================================================================
    // SUB-HANDLER: Opportunities CRUD (linkedin_opportunities)
    // Consolidated here to minimize serverless function count
    // =========================================================================
    if (scope === 'opportunities') {
      if (req.method === 'GET') {
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
        if (error) return res.status(500).json({ ok: false, message: error.message });
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
            title,
            company,
            opportunity_type,
            source_url,
            contact_person_id,
            description,
            score,
            status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*, contact_person:linkedin_people(*)')
          .single();

        if (error) return res.status(500).json({ ok: false, message: error.message });
        return res.status(201).json({ ok: true, opportunity: data });
      }

      if (req.method === 'PATCH') {
        const id = url.searchParams.get('id');
        if (!id) return res.status(400).json({ ok: false, message: 'Missing opportunity ID' });

        const updates = { ...(req.body || {}), updated_at: new Date().toISOString() };
        const { data, error } = await supabase
          .from('linkedin_opportunities')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select('*, contact_person:linkedin_people(*)')
          .single();

        if (error) return res.status(500).json({ ok: false, message: error.message });
        return res.status(200).json({ ok: true, opportunity: data });
      }

      if (req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) return res.status(400).json({ ok: false, message: 'Missing opportunity ID' });

        const { error } = await supabase
          .from('linkedin_opportunities')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) return res.status(500).json({ ok: false, message: error.message });
        return res.status(200).json({ ok: true, message: 'Opportunity deleted.' });
      }

      res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }

    if (action === 'sync-employment' || url.pathname.includes('sync-employment')) {
      return handleSyncEmployment(supabase, userId, res);
    }
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
        full_name,
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
      if (full_name !== undefined) updates.full_name = full_name.trim();
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
