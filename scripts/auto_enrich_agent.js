/**
 * Autonomous AI Agent: Auto-Enriches Question Bank
 * Run via: node scripts/auto_enrich_agent.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=');
      if (key && val.length) {
        process.env[key.trim()] = val.join('=').trim();
      }
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
const USER_ID = 'Akshay';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error('❌ Missing VITE_OPENROUTER_API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function callOpenRouter(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Career Execution System Agent',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || '';
  const cleanJson = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleanJson);
}

async function enrichQuestion(item) {
  const prompt = `You are a Senior Principal Data & BI Engineer coaching a candidate for a real-world technical interview.
Company: ${item.company || 'Top Tier Consulting / Tech'}
Role: ${item.role || 'Power BI / Data Engineer'}
Topic Context: ${item.topic || 'Technical Assessment'}
Existing Notes / Partial Answer: ${item.rawSource || 'None'}

Question:
"${item.question}"

Generate a **human-like, conversational, practitioner answer** that will impress interviewers. 
DO NOT give dry textbook definitions. Deliver how an experienced professional speaks in an interview:

1. 'pitch': A direct 30-45 second verbal pitch explaining the approach with confidence ("In practice, I handle this by...").
2. 'steps': 2 to 4 crisp execution steps (exact UI paths, functions, DAX/SQL patterns).
3. 'proTip': A senior-level gotcha, performance optimization nuance, or edge case.
4. 'codeSnippet': (Optional) 2-6 lines of clean DAX, SQL, M-Code, or Python if applicable, else empty string.
5. 'suggestedTopic': Canonical topic name (e.g. 'Row-Level Security (RLS)', 'DAX', 'Performance Optimization', 'Semantic Models', 'Power BI Service').
6. 'suggestedTags': 2 to 4 hashtag strings without '#' (e.g. ["RLS", "Security", "DAX"]).
7. 'difficulty': 'Easy' | 'Medium' | 'Hard'.

Return ONLY valid JSON matching this schema:
{
  "pitch": "...",
  "steps": ["Step 1...", "Step 2...", "Step 3..."],
  "proTip": "...",
  "codeSnippet": "",
  "suggestedTopic": "...",
  "suggestedTags": ["..."],
  "difficulty": "Medium"
}
Return raw JSON with no markdown blocks.`;

  return await callOpenRouter(prompt);
}

async function runAgent() {
  console.log('🤖 Starting Autonomous Question Bank Agent...');

  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', USER_ID)
    .single();

  if (error || !data?.data) {
    console.error('❌ Failed to fetch app state from Supabase:', error);
    return;
  }

  const appState = data.data;
  const questionBank = appState.questionBank || [];
  const pending = questionBank.filter((q) => q.enrichmentStatus === 'pending');

  console.log(`📋 Found ${questionBank.length} total questions, ${pending.length} pending enrichment.`);

  if (pending.length === 0) {
    console.log('✨ All questions are already enriched! Nothing to do.');
    return;
  }

  let enrichedCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    console.log(`\n[${i + 1}/${pending.length}] Enriching: "${item.question.slice(0, 55)}..."`);

    try {
      const enriched = await enrichQuestion(item);

      const targetIdx = questionBank.findIndex((q) => q.id === item.id);
      if (targetIdx !== -1) {
        questionBank[targetIdx] = {
          ...questionBank[targetIdx],
          topic: enriched.suggestedTopic || questionBank[targetIdx].topic,
          tags: Array.from(new Set([...questionBank[targetIdx].tags, ...(enriched.suggestedTags || [])])),
          difficulty: enriched.difficulty || questionBank[targetIdx].difficulty,
          humanAnswer: {
            pitch: enriched.pitch,
            steps: enriched.steps,
            proTip: enriched.proTip,
            codeSnippet: enriched.codeSnippet,
          },
          enrichmentStatus: 'completed',
          updatedAt: new Date().toISOString(),
        };

        appState.questionBank = questionBank;

        // Persist back to Supabase
        await supabase
          .from('app_state')
          .upsert({ user_id: USER_ID, data: appState }, { onConflict: 'user_id' });

        console.log(`✅ Saved: ${item.company} | ${enriched.suggestedTopic} | Pitch generated.`);
        enrichedCount++;
      }

      // Polite cooldown between requests
      if (i < pending.length - 1) {
        await new Promise((r) => setTimeout(r, 1800));
      }
    } catch (err) {
      console.error(`⚠️ Failed to enrich item ${item.id}:`, err.message);
    }
  }

  console.log(`\n🎉 Autonomous Agent finished! Enriched ${enrichedCount} of ${pending.length} questions.`);
}

runAgent();
