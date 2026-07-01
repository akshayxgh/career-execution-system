import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'myces_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || '';
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionCookie() {
  const payload = base64Url(JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 }));
  const signature = sign(payload);

  return `${COOKIE_NAME}=${payload}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function verifySession(req) {
  const secret = getSecret();
  if (!secret) {
    return false;
  }

  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim().split('='))
      .filter(([key, value]) => key && value)
  );

  const token = cookies[COOKIE_NAME];
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function passwordMatches(password) {
  const expected = process.env.APP_PASSWORD || '';
  if (!expected || typeof password !== 'string') {
    return false;
  }

  return safeEqual(password, expected);
}
