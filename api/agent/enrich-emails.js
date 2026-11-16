import { getServiceClient } from '../_db.js';

const PROSPEO_KEY = process.env.PROSPEO_API_KEY || 'pk_a8d93968bb4b28dd7c406969118b2c51d0eadb4dcf7fbc069637accf57db1c8c';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const batchSize = Math.min(parseInt(req.query.limit || req.body?.limit || '15', 10), 20);
  const supabase = getServiceClient();

  try {
    // 1. Fetch recruiters who do not yet have a verified email
    const { data: people, error } = await supabase
      .from('linkedin_people')
      .select('id, full_name, company, headline, role, profile_url, interaction_notes, tags')
      .contains('tags', ['RECRUITER'])
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Filter candidate list in memory
    const candidates = (people || []).filter((p) => {
      const hasEmailTag = Array.isArray(p.tags) && p.tags.includes('Email: Verified');
      const hasEmailNotes = Boolean(p.interaction_notes && p.interaction_notes.includes('Email:'));
      const hasValidUrl = Boolean(p.profile_url && p.profile_url.includes('linkedin.com/in/'));
      return !hasEmailTag && !hasEmailNotes && hasValidUrl;
    });

    const totalNeedingEnrichment = candidates.length;
    const batch = candidates.slice(0, batchSize);

    if (batch.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'All recruiters already have verified emails or have been audited.',
        totalRemaining: 0,
        enriched: [],
      });
    }

    const enriched = [];
    let rateLimited = false;

    for (let i = 0; i < batch.length; i++) {
      const r = batch[i];

      try {
        const prospeoRes = await fetch('https://api.prospeo.io/enrich-person', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KEY': PROSPEO_KEY,
          },
          body: JSON.stringify({
            only_verified_email: false,
            enrich_mobile: false,
            data: {
              linkedin_url: r.profile_url,
              full_name: r.full_name,
              company_name: r.company || undefined,
            },
          }),
        });

        if (prospeoRes.status === 429) {
          rateLimited = true;
          break;
        }

        if (prospeoRes.ok) {
          const pData = await prospeoRes.json();
          const emailObj = pData?.person?.email;

          if (emailObj && emailObj.email) {
            const email = emailObj.email;
            const status = emailObj.status || 'VERIFIED';
            const emailLine = `Email: ${email} (${status})`;

            let updatedNotes = r.interaction_notes || '';
            updatedNotes = emailLine + (updatedNotes ? `\n${updatedNotes}` : '');

            const updatedTags = Array.isArray(r.tags) ? [...r.tags] : [];
            if (!updatedTags.includes('Email: Verified')) {
              updatedTags.push('Email: Verified');
            }

            const patchData = {
              interaction_notes: updatedNotes,
              tags: updatedTags,
              updated_at: new Date().toISOString(),
            };

            if (!r.company && pData.company?.name) {
              patchData.company = pData.company.name;
            }

            await supabase
              .from('linkedin_people')
              .update(patchData)
              .eq('id', r.id);

            enriched.push({
              id: r.id,
              name: r.full_name,
              company: patchData.company || r.company,
              email,
              status,
            });
          }
        }
      } catch (err) {
        console.warn(`[Enrich Agent] Error checking ${r.full_name}:`, err.message);
      }

      // 3.5s delay to stay comfortably under Prospeo's 20/min ceiling
      if (i < batch.length - 1) {
        await sleep(3500);
      }
    }

    return res.status(200).json({
      ok: true,
      processed: batch.length,
      enrichedCount: enriched.length,
      totalRemaining: Math.max(0, totalNeedingEnrichment - batch.length),
      rateLimited,
      enriched,
    });
  } catch (err) {
    console.error('[Enrich Agent] Top-level error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
