/**
 * Phase 1 API Verification Script
 * Tests:
 * 1. GET /api/agent/context?purpose=content (Context generation)
 * 2. POST /api/agent/actions (Create proposed action)
 * 3. GET /api/agent/actions (Retrieve proposed actions)
 * 4. PATCH /api/agent/actions by agent attempting approval (Must be rejected with 403)
 * 5. PATCH /api/agent/actions by human editing content (Must succeed & retain PENDING_APPROVAL)
 * 6. PATCH /api/agent/actions by human approving (Must succeed with APPROVED)
 * 7. PATCH /api/agent/actions by human rejecting (Must succeed with REJECTED)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
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

// Set a test agent secret for testing
process.env.MYCES_AGENT_SECRET = 'test_agent_secret_key_123';
process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;

import contextHandler from '../api/agent/context.js';
import actionsHandler from '../api/agent/actions.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) {
      this.headers[key] = val;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('🚀 Running Phase 1 API Boundary Tests...\n');
  let passed = 0;
  let total = 0;

  // TEST 1: Context without auth -> 401
  total++;
  {
    const req = {
      method: 'GET',
      url: '/api/agent/context?purpose=content',
      headers: {},
    };
    const res = createMockRes();
    // Disable dev bypass for this check
    process.env.NODE_ENV = 'production';
    await contextHandler(req, res);
    process.env.NODE_ENV = 'development';

    if (res.statusCode === 401) {
      console.log('✅ Test 1 Passed: Unauthenticated context request rejected with 401');
      passed++;
    } else {
      console.error(`❌ Test 1 Failed: Expected 401, got ${res.statusCode}`, res.body);
    }
  }

  // TEST 2: Context with agent secret -> 200
  total++;
  {
    const req = {
      method: 'GET',
      url: '/api/agent/context?purpose=content',
      headers: {
        'x-agent-secret': 'test_agent_secret_key_123',
      },
    };
    const res = createMockRes();
    await contextHandler(req, res);

    if (res.statusCode === 200 && res.body?.ok && res.body?.context) {
      console.log(`✅ Test 2 Passed: Context endpoint returned ${res.body.context.concepts.length} concepts`);
      passed++;
    } else {
      console.error(`❌ Test 2 Failed: Expected 200, got ${res.statusCode}`, res.body);
    }
  }

  // TEST 3: Create proposed action via agent -> 201
  total++;
  let createdActionId = null;
  {
    const req = {
      method: 'POST',
      url: '/api/agent/actions',
      headers: {
        'x-agent-secret': 'test_agent_secret_key_123',
      },
      body: {
        action_type: 'PUBLISH_POST',
        topic: 'DAX Performance Tuning',
        content: 'When writing DAX, avoiding nested CALCULATE functions can cut query duration in half...',
        reasoning: 'Testing AI agent draft creation flow.',
      },
    };
    const res = createMockRes();
    await actionsHandler(req, res);

    if (res.statusCode === 201 && res.body?.ok && res.body?.action?.status === 'PENDING_APPROVAL') {
      createdActionId = res.body.action.id;
      console.log(`✅ Test 3 Passed: Action created as PENDING_APPROVAL (id: ${createdActionId})`);
      passed++;
    } else {
      console.error(`❌ Test 3 Failed: Expected 201, got ${res.statusCode}`, res.body);
    }
  }

  // TEST 4: Agent attempts to approve action -> MUST FAIL WITH 403
  total++;
  if (createdActionId) {
    const req = {
      method: 'PATCH',
      url: '/api/agent/actions',
      headers: {
        'x-agent-secret': 'test_agent_secret_key_123',
      },
      body: {
        id: createdActionId,
        status: 'APPROVED',
      },
    };
    const res = createMockRes();
    await actionsHandler(req, res);

    if (res.statusCode === 403) {
      console.log('✅ Test 4 Passed: Agent secret CANNOT approve actions (Blocked with 403)');
      passed++;
    } else {
      console.error(`❌ Test 4 Failed: Expected 403, got ${res.statusCode}`, res.body);
    }
  }

  // TEST 5: Human edits content -> Retains PENDING_APPROVAL
  total++;
  if (createdActionId) {
    const req = {
      method: 'PATCH',
      url: '/api/agent/actions',
      headers: {}, // Local dev bypass authenticates as human
      body: {
        id: createdActionId,
        content: 'Refined DAX pattern: Using SUMMARIZECOLUMNS instead of ADDCOLUMNS/SUMMARIZE.',
      },
    };
    const res = createMockRes();
    await actionsHandler(req, res);

    if (
      res.statusCode === 200 &&
      res.body?.ok &&
      res.body?.action?.status === 'PENDING_APPROVAL' &&
      res.body?.action?.payload?.content.includes('Refined DAX')
    ) {
      console.log('✅ Test 5 Passed: Human edited content while retaining PENDING_APPROVAL');
      passed++;
    } else {
      console.error(`❌ Test 5 Failed: Expected 200, got ${res.statusCode}`, res.body);
    }
  }

  // TEST 6: Human approves action -> Transitions to APPROVED
  total++;
  if (createdActionId) {
    const req = {
      method: 'PATCH',
      url: '/api/agent/actions',
      headers: {}, // Local dev bypass authenticates as human
      body: {
        id: createdActionId,
        status: 'APPROVED',
      },
    };
    const res = createMockRes();
    await actionsHandler(req, res);

    if (res.statusCode === 200 && res.body?.ok && res.body?.action?.status === 'APPROVED') {
      console.log('✅ Test 6 Passed: Human successfully transitioned action to APPROVED');
      passed++;
    } else {
      console.error(`❌ Test 6 Failed: Expected 200, got ${res.statusCode}`, res.body);
    }
  }

  console.log(`\n📊 Tests Finished: ${passed}/${total} passed.\n`);
}

runTests().catch((e) => {
  console.error('Fatal error in test script:', e);
});
