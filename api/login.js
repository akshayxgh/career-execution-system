import { createSessionCookie, passwordMatches } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  if (!process.env.APP_PASSWORD) {
    return res.status(500).json({ ok: false, message: 'APP_PASSWORD is not configured.' });
  }

  const body = typeof req.body === 'object' ? req.body : {};

  if (!passwordMatches(body.password)) {
    return res.status(401).json({ ok: false, message: 'Invalid password.' });
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  return res.status(200).json({ ok: true });
}
