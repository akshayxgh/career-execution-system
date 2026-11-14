import { createSessionCookie, clearSessionCookie, verifySession, passwordMatches } from './_auth.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action') || (url.pathname.endsWith('/login') ? 'login' : url.pathname.endsWith('/logout') ? 'logout' : 'session');

  // 1. Session Check (GET /api/session or action=session)
  if (action === 'session' || (req.method === 'GET' && action !== 'login' && action !== 'logout')) {
    return res.status(200).json({ authenticated: verifySession(req) });
  }

  // 2. Login (POST /api/login or action=login)
  if (action === 'login') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }

    if (!process.env.APP_PASSWORD) {
      return res.status(500).json({ ok: false, message: 'APP_PASSWORD is not configured.' });
    }

    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    if (!passwordMatches(body.password)) {
      return res.status(401).json({ ok: false, message: 'Invalid password.' });
    }

    res.setHeader('Set-Cookie', createSessionCookie());
    return res.status(200).json({ ok: true });
  }

  // 3. Logout (POST /api/logout or action=logout)
  if (action === 'logout') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
    }
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ ok: false, message: `Unknown auth action: ${action}` });
}
