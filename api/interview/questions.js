import { timingSafeEqual } from 'node:crypto';
import { getServiceClient } from '../_db.js';

/**
 * Constant-time comparison to prevent timing attacks.
 * Verifies both inputs are non-empty strings and lengths match before checking buffer equality.
 */
function safeCompare(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);
  if (bufProvided.length === 0 || bufProvided.length !== bufExpected.length) {
    return false;
  }
  return timingSafeEqual(bufProvided, bufExpected);
}

/**
 * Priority sort ordering for interview preparation:
 * Questions the candidate struggled with or was hesitant on are prioritized first,
 * followed by unseen questions, and lastly mastered questions.
 */
const CONFIDENCE_PRIORITY = {
  struggled: 1,
  hesitant: 2,
  unseen: 3,
  mastered: 4,
};

export default async function handler(req, res) {
  // 1. Method guard: Accept only GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      message: 'Method Not Allowed. This endpoint only supports GET.',
    });
  }

  // 2. Fail closed if server authentication configuration is missing
  const expectedApiKey = process.env.CHATGPT_API_KEY;
  if (!expectedApiKey || typeof expectedApiKey !== 'string' || expectedApiKey.trim().length === 0) {
    return res.status(500).json({
      ok: false,
      message: 'Server authentication configuration error.',
    });
  }

  // 3. Validate Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized: Missing or invalid Authorization header.',
    });
  }

  const providedToken = authHeader.slice(7).trim();
  if (!safeCompare(providedToken, expectedApiKey.trim())) {
    return res.status(401).json({
      ok: false,
      message: 'Unauthorized: Invalid API key.',
    });
  }

  // 4. Parse query parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const toolParam = url.searchParams.get('tool')?.trim();
  const companyParam = url.searchParams.get('company')?.trim();
  const roleParam = url.searchParams.get('role')?.trim();
  const topicParam = url.searchParams.get('topic')?.trim();
  const difficultyParam = url.searchParams.get('difficulty')?.trim();
  const confidenceParam = url.searchParams.get('confidence')?.trim();
  const limitParam = url.searchParams.get('limit');

  const parsedLimit = parseInt(limitParam || '10', 10);
  const limit = Math.max(1, Math.min(20, isNaN(parsedLimit) ? 10 : parsedLimit));

  try {
    // 5. Query Supabase for user_id = 'Akshay'
    const supabase = getServiceClient();
    const { data: stateRow, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', 'Akshay')
      .single();

    if (error || !stateRow?.data) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to retrieve question data.',
      });
    }

    // 6. Extract only questionBank
    const rawBank = Array.isArray(stateRow.data.questionBank)
      ? stateRow.data.questionBank
      : [];

    // 7. Filter questions safely
    let filtered = rawBank.filter((item) => {
      if (!item || !item.question || typeof item.question !== 'string') {
        return false;
      }

      // Filter: tool
      if (toolParam && toolParam.toUpperCase() !== 'ALL') {
        const targetTool = toolParam.toLowerCase();
        const primaryMatch = item.tool && item.tool.toLowerCase().includes(targetTool);
        const tagsMatch = Array.isArray(item.tags) && item.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(targetTool));
        if (!primaryMatch && !tagsMatch) return false;
      }

      // Filter: company
      if (companyParam && companyParam.toUpperCase() !== 'ALL') {
        const targetComp = companyParam.toLowerCase();
        const primaryMatch = item.company && item.company.toLowerCase().includes(targetComp);
        const askedMatch = Array.isArray(item.companiesAsked) && item.companiesAsked.some((c) => typeof c === 'string' && c.toLowerCase().includes(targetComp));
        if (!primaryMatch && !askedMatch) return false;
      }

      // Filter: role
      if (roleParam && roleParam.toUpperCase() !== 'ALL') {
        const targetRole = roleParam.toLowerCase();
        if (!item.role || !item.role.toLowerCase().includes(targetRole)) return false;
      }

      // Filter: topic
      if (topicParam && topicParam.toUpperCase() !== 'ALL') {
        const targetTopic = topicParam.toLowerCase();
        if (!item.topic || !item.topic.toLowerCase().includes(targetTopic)) return false;
      }

      // Filter: difficulty
      if (difficultyParam && difficultyParam.toUpperCase() !== 'ALL') {
        const targetDiff = difficultyParam.toLowerCase();
        if (!item.difficulty || item.difficulty.toLowerCase() !== targetDiff) return false;
      }

      // Filter: confidence
      if (confidenceParam && confidenceParam.toUpperCase() !== 'ALL') {
        const targetConf = confidenceParam.toLowerCase();
        if (!item.confidence || item.confidence.toLowerCase() !== targetConf) return false;
      }

      return true;
    });

    // 8. Prioritize by confidence (struggled -> hesitant -> unseen -> mastered)
    filtered.sort((a, b) => {
      const orderA = CONFIDENCE_PRIORITY[String(a.confidence || '').toLowerCase()] || 3;
      const orderB = CONFIDENCE_PRIORITY[String(b.confidence || '').toLowerCase()] || 3;
      return orderA - orderB;
    });

    // 9. Slice to limit (max 20)
    const paginated = filtered.slice(0, limit);

    // 10. Map only necessary interviewing fields (excluding humanAnswer, rawSource, personal state, etc.)
    const questions = paginated.map((q) => ({
      id: q.id || '',
      question: q.question || '',
      company: q.company || 'General',
      companiesAsked: Array.isArray(q.companiesAsked) && q.companiesAsked.length > 0
        ? q.companiesAsked
        : [q.company || 'General'],
      tool: q.tool || 'General',
      role: q.role || '',
      topic: q.topic || '',
      tags: Array.isArray(q.tags) ? q.tags : [],
      difficulty: q.difficulty || 'Medium',
      aliases: Array.isArray(q.aliases) ? q.aliases : [],
      confidence: q.confidence || 'unseen',
      frequencyCount: typeof q.frequencyCount === 'number' ? q.frequencyCount : 1,
    }));

    return res.status(200).json({
      ok: true,
      metadata: {
        totalAvailable: filtered.length,
        returnedCount: questions.length,
        limit,
        filtersApplied: {
          ...(toolParam ? { tool: toolParam } : {}),
          ...(companyParam ? { company: companyParam } : {}),
          ...(roleParam ? { role: roleParam } : {}),
          ...(topicParam ? { topic: topicParam } : {}),
          ...(difficultyParam ? { difficulty: difficultyParam } : {}),
          ...(confidenceParam ? { confidence: confidenceParam } : {}),
        },
      },
      questions,
    });
  } catch (err) {
    // Log internal error server-side without exposing credentials or internal details to client
    console.error('Error in /api/interview/questions handler:', err?.message || 'Unknown error');
    return res.status(500).json({
      ok: false,
      message: 'Internal server error processing question request.',
    });
  }
}
