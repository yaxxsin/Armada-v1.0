import crypto from 'node:crypto';

export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?._csrf;

  if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
    return res.status(403).json({ error: 'CSRF token tidak valid.' });
  }

  next();
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res, token) {
  res.cookie('_csrf', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });
}