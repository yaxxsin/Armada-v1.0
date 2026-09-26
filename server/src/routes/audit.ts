import { Router } from 'express';
import { query } from '../db.ts';
import requireAuth from '../middleware/auth.ts';
import { requireAdmin } from '../middleware/auth.ts';
import { validateIdParam } from '../middleware/validateId.ts';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
  const offset = (page - 1) * limit;

  const { rows: total } = await query(
    'SELECT COUNT(*)::int AS n FROM audit_log'
  );

  const { rows } = await query(
    `SELECT a.id, a.user_id, u.email AS user_email, a.action, a.entity_type,
            a.entity_id, a.details, a.ip_address, a.created_at
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    logs: rows,
    total: total[0].n,
    page,
    limit,
  });
});

router.get('/:id', validateIdParam(), async (req, res) => {
  const { rows } = await query(
    `SELECT a.id, a.user_id, u.email AS user_email, a.action, a.entity_type,
            a.entity_id, a.details, a.ip_address, a.created_at
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Tidak ditemukan.' });
  }
  res.json({ log: rows[0] });
});

router.delete('/', async (req, res) => {
  if (req.query.days) {
    const { rowCount } = await query(
      `DELETE FROM audit_log WHERE created_at < NOW() - ($1 || ' days')::interval`,
      [req.query.days]
    );
    return res.json({ ok: true, deleted: rowCount });
  }
  const { rowCount } = await query('DELETE FROM audit_log');
  res.json({ ok: true, deleted: rowCount });
});

export default router;