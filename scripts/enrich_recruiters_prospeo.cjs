const fs = require('fs');

const supabaseUrl = 'https://nnicnxwzuvinaqvxuvsh.supabase.co/rest/v1';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWNueHd6dXZpbmFxdnh1dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUzODE1NiwiZXhwIjoyMDk4MTE0MTU2fQ.iillIQhcnWBMriJ1n0MZdasQlk27tog1g7HOv3_DJas';
const prospeoKey = 'pk_a8d93968bb4b28dd7c406969118b2c51d0eadb4dcf7fbc069637accf57db1c8c';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function enrichRecruiters() {
  console.log('Fetching recruiters from Supabase...');
  const res = await fetch(`${supabaseUrl}/linkedin_people?select=id,full_name,company,headline,profile_url,interaction_notes,tags&tags=cs.{RECRUITER}&order=created_at.desc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });

  if (!res.ok) {
    console.error('Failed to fetch from Supabase:', res.status);
    return;
  }

  const recruiters = await res.json();
  console.log(`Found ${recruiters.length} recruiters in database.`);

  let foundEmails = 0;
  let skipped = 0;
  let processed = 0;

  for (let i = 0; i < recruiters.length; i++) {
    const r = recruiters[i];
    processed++;

    // Skip if already has an email in notes or tag
    if ((r.tags && r.tags.includes('Email: Verified')) || (r.interaction_notes && r.interaction_notes.includes('Email:'))) {
      const match = r.interaction_notes ? r.interaction_notes.match(/Email:\s*([^\s\n\r()]+)/i) : null;
      console.log(`[${processed}/${recruiters.length}] ⏩ ${r.full_name}: Already has verified email (${match ? match[1] : 'present'}), skipping.`);
      skipped++;
      continue;
    }

    if (!r.profile_url || !r.profile_url.includes('linkedin.com/in/')) {
      console.log(`[${processed}/${recruiters.length}] ⚠️ ${r.full_name}: Missing valid LinkedIn URL, skipping.`);
      skipped++;
      continue;
    }

    let success = false;
    let attempts = 0;

    while (!success && attempts < 3) {
      attempts++;
      console.log(`[${processed}/${recruiters.length}] 🔍 Querying Prospeo for ${r.full_name}...`);

      try {
        const prospeoRes = await fetch('https://api.prospeo.io/enrich-person', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KEY': prospeoKey
          },
          body: JSON.stringify({
            only_verified_email: false,
            enrich_mobile: false,
            data: {
              linkedin_url: r.profile_url,
              full_name: r.full_name,
              company_name: r.company || undefined
            }
          })
        });

        if (prospeoRes.status === 429) {
          console.warn(`   ⏳ Rate limit hit (429). Cooling down for 60 seconds before retrying ${r.full_name}...`);
          await sleep(62000);
          continue;
        }

        if (prospeoRes.status === 400) {
          const errData = await prospeoRes.json().catch(() => ({}));
          console.log(`   ❌ No match found in Prospeo database for ${r.full_name} (${errData.error_code || '400'})`);
          success = true;
          break;
        }

        if (!prospeoRes.ok) {
          console.warn(`   ⚠️ Prospeo status ${prospeoRes.status} for ${r.full_name}`);
          success = true;
          break;
        }

        const pData = await prospeoRes.json();
        const person = pData.person;
        const emailObj = person && person.email;

        if (emailObj && emailObj.email) {
          foundEmails++;
          const email = emailObj.email;
          const status = emailObj.status || 'VERIFIED';
          console.log(`   ✨ FOUND: ${r.full_name} -> ${email} (${status})`);

          let notes = r.interaction_notes || '';
          const emailLine = `Email: ${email} (${status})`;
          notes = emailLine + (notes ? `\n${notes}` : '');

          const tags = Array.isArray(r.tags) ? [...r.tags] : [];
          if (!tags.includes('Email: Verified')) tags.push('Email: Verified');

          let companyToUpdate = r.company;
          if (!companyToUpdate && pData.company && pData.company.name) {
            companyToUpdate = pData.company.name;
          }

          const updatePayload = {
            interaction_notes: notes,
            tags: tags,
            updated_at: new Date().toISOString()
          };
          if (companyToUpdate) updatePayload.company = companyToUpdate;

          const patchRes = await fetch(`${supabaseUrl}/linkedin_people?id=eq.${r.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`
            },
            body: JSON.stringify(updatePayload)
          });

          if (patchRes.ok) {
            console.log(`   💾 Successfully saved to database.`);
          }
        } else {
          console.log(`   ❌ No email available for ${r.full_name}`);
        }
        success = true;
      } catch (err) {
        console.error(`   Error on ${r.full_name}:`, err.message);
        success = true;
      }
    }

    // Pacing delay: 3.5s spacing ensures <= 17 req/min (well below Prospeo's 20/min ceiling)
    await sleep(3500);
  }

  console.log('\n=========================================');
  console.log(`🎉 Enrichment complete!`);
  console.log(`Total Checked: ${processed}`);
  console.log(`New Verified Emails Found & Saved: ${foundEmails}`);
  console.log(`Already Saved / Skipped: ${skipped}`);
  console.log('=========================================\n');
}

enrichRecruiters();
