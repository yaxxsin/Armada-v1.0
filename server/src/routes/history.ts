import { Router } from 'express';
import { query } from '../db.ts';
import requireAuth, { requireAdmin } from '../middleware/auth.ts';
import { validate, historySchema } from '../middleware/validate.ts';
import { recordSnapshot } from '../services/fleetService.ts';
import { validateIdParam } from '../middleware/validateId.ts';

const router = Router();
router.use(requireAuth);

// POST /api/vehicles/:id/history
router.post('/:id/history', validateIdParam(), requireAdmin, validate(historySchema), async (req, res) => {
  const d = req.validated;
  const { rows: veh } = await query('SELECT id FROM vehicles WHERE id = $1', [
    req.params.id,
  ]);
  if (veh.length === 0)
    return res.status(404).json({ error: 'Kendaraan tidak ditemukan.' });

  const { rows } = await query(
    `INSERT INTO service_history (vehicle_id, tanggal, km, jenis, biaya, bengkel, struk)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, d.tanggal, d.km ?? null, d.jenis || null, d.biaya ?? null, d.bengkel || null, d.struk || null]
  );
  recordSnapshot().catch((e) => console.error('snapshot failed', e.message));
  res.status(201).json({ history: rows[0] });
});

// DELETE /api/vehicles/:id/history/:hid
router.delete('/:id/history/:hid', validateIdParam(), validateIdParam('hid'), requireAdmin, async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM service_history WHERE id = $1 AND vehicle_id = $2',
    [req.params.hid, req.params.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Tidak ditemukan.' });
  recordSnapshot().catch((e) => console.error('snapshot failed', e.message));
  res.json({ ok: true });
});

export default router;
