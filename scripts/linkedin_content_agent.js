/**
 * Autonomous LinkedIn AI Content Agent
 *
 * Can be run:
 * 1. Locally: node scripts/linkedin_content_agent.js
 * 2. In GitHub Actions cron: daily at 02:30 UTC / 08:00 AM IST
 *
 * Responsibilities:
 * - Cloud-First, PC-off execution
 * - Authenticates as 'agent' role via MYCES_AGENT_SECRET (cannot approve)
 * - Queries GET /api/agent/context?purpose=content for unposted concepts & notes
 * - Generates high-impact technical LinkedIn post via Gemini / Groq
 * - Proposes post via POST /api/agent/actions (status: PENDING_APPROVAL)
 * - Strictly preserves human approval requirement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load local .env if present (for local testing)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=');
      if (key && val.length) {
        const k = key.trim();
        if (!process.env[k]) {
          process.env[k] = val.join('=').trim();
        }
      }
    }
  });
}

// 2. Configuration & Credentials
const API_URL = (
  process.env.MYCES_API_URL ||
  process.env.VITE_APP_URL ||
  'http://localhost:5173'
).replace(/\/$/, '');

const AGENT_SECRET =
  process.env.MYCES_AGENT_SECRET ||
  process.env.AGENT_SECRET ||
  'ces_cloud_agent_default_secret_key_2026';

const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  process.env.VITE_GROQ_API_KEY;

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.VITE_GEMINI_API_KEY;

const MAX_PENDING_QUEUE = 3; // Do not spam drafts if previous ones are unreviewed

console.log('='.repeat(60));
console.log('🤖 MYCES AUTONOMOUS LINKEDIN CONTENT AGENT');
console.log(`🌐 Target API: ${API_URL}`);
console.log(`🕒 Timestamp:  ${new Date().toISOString()}`);
console.log('='.repeat(60));

/**
 * Helper to call AI LLM (Groq first, fallback to Gemini)
 */
async function generateLinkedInPostWithAI(concept, context) {
  const prompt = `You are an elite Senior Data Engineer, Cloud Architect, and technical thought leader writing a high-impact LinkedIn post.

YOUR TASK:
Write a captivating, highly insightful LinkedIn post based on this technical concept from the user's career learning repository:

Concept Name: ${concept.name}
Status: ${concept.status || 'Active'}
User's Study Notes: ${concept.notes || 'Core architectural and implementation patterns.'}
${concept.notebookLmAudioLink ? `Audio/Podcast Deep Dive: ${concept.notebookLmAudioLink}` : ''}
${context.projectLessons?.length ? `User's Project Lessons: ${context.projectLessons.slice(0, 2).map((l) => l.lesson).join('; ')}` : ''}
${Array.isArray(context.memories) && context.memories.length > 0
  ? `\nSTRATEGIC AGENT MEMORY DIRECTIVES (Learned & Confirmed Strategy):\n` +
    context.memories
      .map((m) => {
        const val = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
        return `• [${m.memory_type}] ${m.key}: ${val}`;
      })
      .join('\n')
  : ''}

CRITICAL LINKEDIN POST RULES:
1. Hook: Start with a 1-2 sentence compelling technical hook. Avoid cliché openers like "Excited to share..." or "In today's fast-paced world...".
2. Problem / Context: Briefly frame the common engineering pain point, misconception, or architectural challenge.
3. Solution / Technical Breakdown: Provide 3-4 crisp, high-value bullet points or a concise breakdown. Use real-world technical context (e.g. performance implications, DAX filter context, SQL query optimization, distributed data pipelines).
4. Practical Takeaway: What is the golden rule or best practice that engineers should apply tomorrow?
5. Engagement Trigger: End with an open, thought-provoking question to prompt senior engineers and tech leaders in the comments.
6. Hashtags: End with 3-5 relevant, focused hashtags (e.g., #DataEngineering #SystemDesign #PowerBI #CloudArchitecture).
7. Length: 150 - 280 words. Clean whitespace for mobile reading.
8. Output ONLY the raw post content. Do not include markdown code blocks or meta explanations.`;

  // Strategy A: Groq (Ultra-fast reasoning)
  if (GROQ_API_KEY) {
    const groqModels = [
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
    ];

    for (const model of groqModels) {
      try {
        console.log(`⚡ Calling Groq (${model})...`);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You write engaging, authentic, authoritative LinkedIn posts for senior engineers and tech leaders.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 800,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) return text;
        } else {
          console.warn(`⚠️ Groq (${model}) returned status ${res.status}`);
        }
      } catch (err) {
        console.warn(`⚠️ Groq (${model}) call failed:`, err.message);
      }
    }
  }

  // Strategy B: Gemini REST API (gemini-2.0-flash)
  if (GEMINI_API_KEY) {
    try {
      console.log('⚡ Calling Google Gemini (gemini-2.0-flash)...');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } else {
        console.warn(`⚠️ Gemini request failed with status ${res.status}`);
      }
    } catch (err) {
      console.warn('⚠️ Gemini call failed:', err.message);
    }
  }

  throw new Error('No AI provider succeeded (check GROQ_API_KEY / GEMINI_API_KEY).');
}

/**
 * Main Autonomous Execution Loop
 */
async function runAutonomousContentAgent() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Agent-Secret': AGENT_SECRET,
  };

  // Step 1: Check existing pending actions
  console.log('\n📥 Step 1: Checking current actions queue...');
  let existingActions = [];
  try {
    const actRes = await fetch(`${API_URL}/api/agent/actions`, {
      method: 'GET',
      headers,
    });
    if (actRes.ok) {
      const data = await actRes.json();
      existingActions = data.actions || [];
    } else {
      console.warn(`Could not fetch actions (${actRes.status}), proceeding with caution.`);
    }
  } catch (err) {
    console.warn(`Failed to connect to ${API_URL}/api/agent/actions:`, err.message);
  }

  const pendingCount = existingActions.filter((a) => a.status === 'PENDING_APPROVAL').length;
  console.log(`📊 Currently pending approval: ${pendingCount} drafts`);

  if (pendingCount >= MAX_PENDING_QUEUE) {
    console.log(
      `⏸️ Approval queue is full (${pendingCount}/${MAX_PENDING_QUEUE} pending review). Halting agent run to avoid queue bloat.`
    );
    return;
  }

  // Step 2: Fetch unposted concept context
  console.log('\n🧠 Step 2: Fetching content context from MYCES...');
  const ctxRes = await fetch(`${API_URL}/api/agent/context?purpose=content`, {
    method: 'GET',
    headers,
  });

  if (!ctxRes.ok) {
    const errorText = await ctxRes.text();
    throw new Error(`Failed to fetch context (${ctxRes.status}): ${errorText}`);
  }

  const payload = await ctxRes.json();
  const contextData = payload.context || payload;
  const allConcepts = contextData.concepts || [];
  const concepts = allConcepts.filter((c) => !c.hasPost);
  console.log(
    `📚 Discovered ${allConcepts.length} total concepts in MYCES (${concepts.length} unposted).`
  );

  if (concepts.length === 0) {
    console.log('✅ All concepts already have associated LinkedIn posts! Nothing to draft.');
    return;
  }

  // Step 3: Select best candidate
  // Priority: Concepts with notes > Concepts marked 'Mastered' or 'In Progress'
  const candidate =
    concepts.find((c) => c.notes && c.notes.length > 50) ||
    concepts.find((c) => c.status === 'Mastered') ||
    concepts[0];

  console.log(`🎯 Selected Target Concept: "${candidate.name}" (ID: ${candidate.id})`);

  // Step 4: Generate Post with AI
  console.log('\n✍️ Step 4: Generating draft with AI...');
  const postContent = await generateLinkedInPostWithAI(candidate, contextData);

  console.log('\n📝 Generated Draft Preview:');
  console.log('-'.repeat(50));
  console.log(postContent.slice(0, 300) + '...\n[full length: ' + postContent.length + ' chars]');
  console.log('-'.repeat(50));

  // Extract hashtags for tags payload
  const tags = (postContent.match(/#[A-Za-z0-9_]+/g) || []).map((t) => t.replace('#', ''));

  // Step 5: Propose action to MYCES boundary
  console.log('\n🚀 Step 5: Submitting proposed action to MYCES...');
  const proposeRes = await fetch(`${API_URL}/api/agent/actions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action_type: 'PUBLISH_POST',
      payload: {
        topic: candidate.name,
        content: postContent,
        concept_id: candidate.id,
        tags,
      },
      reasoning: `Autonomous Cloud Agent selected unposted concept "${candidate.name}" from active curriculum notes.`,
      target_id: candidate.id,
    }),
  });

  if (!proposeRes.ok) {
    const errBody = await proposeRes.text();
    throw new Error(`Failed to create action (${proposeRes.status}): ${errBody}`);
  }

  const actionJson = await proposeRes.json();
  console.log('\n✅ Action successfully created!');
  console.log(`🆔 Action ID:    ${actionJson.action?.id}`);
  console.log(`📌 Action Status: ${actionJson.action?.status} (Strictly requires human approval)`);
  console.log(`👤 Proposed By:   ${actionJson.action?.proposed_by}`);
  console.log('\n🎉 Autonomous run completed successfully. Human notification queued.');
}

// Execute
runAutonomousContentAgent().catch((err) => {
  console.error('\n❌ Autonomous Agent Error:', err);
  process.exit(1);
});
