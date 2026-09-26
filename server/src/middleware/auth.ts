import jwt from 'jsonwebtoken';
import { query } from '../db.ts';
import { COOKIE_NAME } from '../utils/auth.ts';

export default async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Belum login.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid.' });
  }

  if (!payload?.sub) {
    return res.status(401).json({ error: 'Sesi tidak valid.' });
  }

  try {
    const { rows } = await query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [payload.sub]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    }
    req.user = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang diizinkan.' });
  }
  return next();
}
