import { verifySession } from '../_auth.js';
import { timingSafeEqual } from 'node:crypto';

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Authenticates incoming requests to /api/agent/* endpoints.
 * Distinguishes between 'human' (via existing MYCES session cookie)
 * and 'agent' (via X-Agent-Secret or Bearer token header).
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ authenticated: boolean, role: 'human' | 'agent' | 'anonymous', user?: string, error?: string }}
 */
export function authenticateAgentRequest(req) {
  // 1. Check human session via existing MYCES cookie
  if (verifySession(req)) {
    return {
      authenticated: true,
      role: 'human',
      user: 'Akshay',
    };
  }

  // 2. Check for Agent secret header for autonomous runners
  const agentSecret =
    process.env.MYCES_AGENT_SECRET ||
    process.env.AGENT_SECRET ||
    '';

  const providedSecret =
    req.headers['x-agent-secret'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (agentSecret && providedSecret && safeCompare(providedSecret, agentSecret)) {
    return {
      authenticated: true,
      role: 'agent',
      user: 'linkedin_agent',
    };
  }

  // 3. Local Development Auth Bypass (mirroring ProtectedRoute.tsx in Vite dev)
  const isDev = process.env.NODE_ENV !== 'production';
  const devBypass = process.env.VITE_DEV_AUTH_BYPASS !== 'false';
  if (isDev && devBypass && !agentSecret) {
    return {
      authenticated: true,
      role: 'human',
      user: 'Akshay',
    };
  }

  return {
    authenticated: false,
    role: 'anonymous',
    error: 'Unauthorized: Invalid or missing authentication credentials.',
  };
}

/**
 * Enforces that only human users can approve actions.
 * The AI agent is strictly barred from approving its own actions.
 *
 * @param {{ authenticated: boolean, role: string }} auth
 * @returns {boolean}
 */
export function canApproveActions(auth) {
  return auth.authenticated && auth.role === 'human';
}
