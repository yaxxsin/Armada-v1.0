import crypto from 'node:crypto';
import { Router } from 'express';
import { query, getClient } from '../db.ts';
import { config } from '../config.ts';
import { validate, registerSchema, loginSchema } from '../middleware/validate.ts';
import requireAuth from '../middleware/auth.ts';
import {
  hashPassword,
  verifyPassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
} from '../utils/auth.ts';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf.ts';

const router = Router();

function secretsMatch(provided: string | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

// Registrasi hanya menerima owner bootstrap token untuk akun pertama atau kode undangan admin.
router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password, name, inviteCode, bootstrapToken } = req.validated;
  const lower = email.toLowerCase();
  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [847321]);
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [lower]);
    if (existing.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email sudah terdaftar.' });
    }

    const { rows: count } = await client.query('SELECT COUNT(*)::int AS n FROM users');
    const isFirst = count[0].n === 0;
    let assignedRole = 'user';
    let inviteId: number | null = null;

    if (isFirst && !secretsMatch(bootstrapToken, config.BOOTSTRAP_TOKEN)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Kode bootstrap owner tidak valid.' });
    }

    if (!isFirst) {
      if (secretsMatch(inviteCode, config.REGISTRATION_INVITE_CODE)) {
        // Environment invite remains a controlled fallback for bootstrap/deployment use.
      } else if (inviteCode) {
        const inviteHash = crypto.createHash('sha256').update(inviteCode).digest('hex');
        const { rows: inviteRows } = await client.query(
          `SELECT id, role
           FROM registration_invites
           WHERE code_hash = $1 AND used_at IS NULL AND expires_at > NOW()
           FOR UPDATE`,
          [inviteHash]
        );
        if (inviteRows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Kode undangan tidak valid atau sudah dipakai.' });
        }
        inviteId = inviteRows[0].id;
        assignedRole = inviteRows[0].role;
      } else {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Kode undangan wajib diisi.' });
      }
    }

    const hash = await hashPassword(password);
    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at`,
      [lower, hash, name || null, isFirst ? 'admin' : assignedRole]
    );
    if (inviteId !== null) {
      await client.query(
        `UPDATE registration_invites SET used_at = NOW(), used_by = $1 WHERE id = $2`,
        [rows[0].id, inviteId]
      );
    }
    await client.query('COMMIT');
    const csrf = generateCsrfToken();
    setCsrfCookie(res, csrf);
    return res.status(201).json({ user: rows[0], csrfToken: csrf });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Registration failed:', error);
    return res.status(500).json({ error: 'Pendaftaran gagal. Coba lagi.' });
  } finally {
    client.release();
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated;
  const { rows } = await query(
    'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }
  const user = rows[0];
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }
  const token = signToken({ sub: user.id });
  setAuthCookie(res, token);
  const csrf = generateCsrfToken();
  setCsrfCookie(res, csrf);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    csrfToken: csrf,
  });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.clearCookie('_csrf');
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT id, email, name, role FROM users WHERE id = $1',
    [req.user.id]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
  }
  res.json({ user: rows[0] });
});

export default router;
