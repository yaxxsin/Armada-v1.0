import crypto from 'node:crypto';
import { Router } from 'express';
import { query } from '../db.ts';
import requireAuth from '../middleware/auth.ts';
import { requireAdmin } from '../middleware/auth.ts';
import { auditLog } from '../middleware/audit.ts';
import { validateIdParam } from '../middleware/validateId.ts';

const router = Router();
router.use(requireAuth);

// GET /api/users
router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC`
  );
  res.json({ users: rows });
});

// POST /api/users/invites
router.post(
  '/invites',
  requireAdmin,
  auditLog('user_invite'),
  async (req, res) => {
    const expiresHours = Math.min(168, Math.max(1, Number(req.body?.expiresHours) || 24));
    const role = req.body?.role === 'admin' ? 'admin' : 'user';
    const code = crypto.randomBytes(24).toString('base64url');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

    const { rows } = await query(
      `INSERT INTO registration_invites (code_hash, role, expires_at, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role, expires_at, created_at`,
      [codeHash, role, expiresAt, req.user.id]
    );

    res.status(201).json({
      invite: {
        ...rows[0],
        code,
        expiresHours,
      },
    });
  }
);

// GET /api/users/invites
router.get('/invites', requireAdmin, async (req, res) => {
  const { rows } = await query(
    `SELECT id, role, expires_at, used_at, created_at
     FROM registration_invites
     ORDER BY created_at DESC
     LIMIT 20`
  );
  res.json({ invites: rows });
});

// DELETE /api/users/invites/:id
router.delete(
  '/invites/:id',
  validateIdParam(),
  requireAdmin,
  auditLog('user_invite'),
  async (req, res) => {
    const { rowCount } = await query(
      `UPDATE registration_invites
       SET expires_at = NOW()
       WHERE id = $1 AND used_at IS NULL`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Token undangan tidak aktif.' });
    res.json({ ok: true });
  }
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  validateIdParam(),
  requireAdmin,
  auditLog('user'),
  async (req, res) => {
    const { role } = req.body;
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role tidak valid.' });
    }
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Admin tidak dapat mengubah role akun sendiri.' });
    }

    const { rows: targetRows } = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [req.params.id]
    );
    if (targetRows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });

    if (targetRows[0].role === 'admin' && role === 'user') {
      const { rows: adminCountRows } = await query(
        `SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`
      );
      if (adminCountRows[0].n <= 1) {
        return res.status(400).json({ error: 'Minimal harus ada satu admin aktif.' });
      }
    }

    const { rowCount } = await query(
      `UPDATE users SET role = $1 WHERE id = $2`,
      [role, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    res.json({ ok: true });
  }
);

// DELETE /api/users/:id
router.delete(
  '/:id',
  validateIdParam(),
  requireAdmin,
  auditLog('user'),
  async (req, res) => {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri.' });
    }
    const { rowCount } = await query(
      `DELETE FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    res.json({ ok: true });
  }
);

export default router;