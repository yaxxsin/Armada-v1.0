import 'express-async-errors';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config.ts';
import { query } from './db.ts';
import { recordSnapshot } from './services/fleetService.ts';
import { csrfProtection } from './middleware/csrf.ts';
import { auditLog } from './middleware/audit.ts';

import authRoutes from './routes/auth.ts';
import vehicleRoutes from './routes/vehicles.ts';
import historyRoutes from './routes/history.ts';
import statsRoutes from './routes/stats.ts';
import reportRoutes from './routes/reports.ts';
import importRoutes from './routes/import.ts';
import auditRoutes from './routes/audit.ts';
import userRoutes from './routes/users.ts';

const app = express();
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  const requestId = typeof req.headers['x-request-id'] === 'string'
    ? req.headers['x-request-id']
    : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.use(
  cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan pendaftaran. Coba lagi nanti.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, db: 'ok' });
  } catch (error) {
    console.error('Health check failed:', error instanceof Error ? error.name : 'database error');
    res.status(503).json({ ok: false, db: 'unavailable' });
  }
});
// Only import mutations use the strict limiter; read-only dashboard endpoints
// must not consume the import request quota.
app.use('/api/import', strictLimiter, csrfProtection);
app.use('/api/odometer/import', strictLimiter, csrfProtection);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/logout', csrfProtection);
app.use('/api/auth', auditLog('auth'), authRoutes);
app.use('/api/vehicles', csrfProtection, auditLog('vehicle'), vehicleRoutes);
app.use('/api/vehicles', csrfProtection, auditLog('service_history'), historyRoutes);
app.use('/api/import', auditLog('import'));
app.use('/api/odometer/import', auditLog('odometer_import'));
app.use('/api/vehicles/export', auditLog('export'));
app.use('/api/reports', csrfProtection, auditLog('report'), reportRoutes);
app.use('/api', importRoutes);
app.use('/api', statsRoutes);
app.use('/api/audit', csrfProtection, auditRoutes);
app.use('/api/users', csrfProtection, userRoutes);

// Central error handler must be last after all routes.
app.use((error, req, res, next) => {
  console.error('Unhandled request error:', error instanceof Error ? error.name : 'unknown error');
  if (res.headersSent) return next(error);
  if (error?.code === '23505') {
    return res.status(409).json({ error: 'Data duplikat sudah ada.' });
  }
  return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

// Record an initial snapshot on boot.
recordSnapshot()
  .then(() => console.log('Initial fleet snapshot recorded.'))
  .catch((e) => console.error('Snapshot on boot failed:', e.message));

// Global Express error handler — prevents crash on unhandled route errors.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Prevent Node.js from crashing on unhandled promise rejections.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

app.listen(config.PORT, () => {
  console.log(`Armada API listening on http://localhost:${config.PORT}`);
});

export default app;