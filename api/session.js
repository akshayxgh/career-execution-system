import { verifySession } from './_auth.js';

export default function handler(req, res) {
  return res.status(200).json({ authenticated: verifySession(req) });
}
