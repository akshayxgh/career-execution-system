import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nnicnxwzuvinaqvxuvsh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWNueHd6dXZpbmFxdnh1dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUzODE1NiwiZXhwIjoyMDk4MTE0MTU2fQ.iillIQhcnWBMriJ1n0MZdasQlk27tog1g7HOv3_DJas';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  // Regex for ex- or former
  const regex = /(?:ex-|former(?:ly)?\s+(?:at\s+)?)([a-zA-Z0-9&.\s]{2,20})(?=\s*[,|/–-]|$)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const comp = match[1].trim();
    if (comp && comp.length >= 2) past.add(comp);
  }

  return { current: detectedCurrent, past: Array.from(past) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const userId = req.headers['x-user-id'] || 'Akshay';
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

      // Domain auto-tagging
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
