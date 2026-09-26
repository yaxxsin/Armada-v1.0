import { Router } from 'express';
import { query } from '../db.ts';
import requireAuth from '../middleware/auth.ts';
import { loadAllVehicles } from '../services/fleetService.ts';
import { overallStatus, buildReminders } from '../utils/fleet.ts';

const router = Router();
router.use(requireAuth);

function withHistory(v) {
  return { ...v, history: v.serviceHistory };
}

// GET /api/stats
router.get('/stats', async (req, res) => {
  const vehicles = await loadAllVehicles();
  let overdue = 0;
  let dueSoon = 0;
  for (const v of vehicles) {
    const overall = overallStatus(withHistory(v));
    if (overall === 'red') overdue++;
    else if (overall === 'amber') dueSoon++;
  }
  res.json({
    total: vehicles.length,
    overdue,
    dueSoon,
    safe: vehicles.length - overdue - dueSoon,
  });
});

// GET /api/reminders
router.get('/reminders', async (req, res) => {
  const vehicles = await loadAllVehicles();
  res.json({ reminders: buildReminders(vehicles.map(withHistory)) });
});

// GET /api/snapshots
router.get('/snapshots', async (req, res) => {
  const { rows } = await query(
    'SELECT date, ok, amber, red FROM snapshots ORDER BY date ASC'
  );
  res.json({ snapshots: rows });
});

export default router;
