import { query } from '../db.ts';

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'access_token',
  'csrf',
  'foto',
  'struk',
  'photos',
  'bootstrapToken',
  'inviteCode',
]);

// Media payloads must never be written to the audit log, not even a preview of
// them. We keep a count so the log still tells the reviewer media changed.
const MEDIA_KEYS = new Set(['foto', 'struk', 'photos']);

const MAX_STRING_CHARS = 180;
const MAX_DETAILS_CHARS = 2000;

function summarizeMedia(value) {
  if (Array.isArray(value)) {
    return value.length === 0 ? '[]' : `[${value.length} file media, tidak disimpan]`;
  }
  return value ? '[1 file media, tidak disimpan]' : value;
}

function truncateString(value) {
  if (typeof value !== 'string' || value.length <= MAX_STRING_CHARS) return value;
  return `${value.slice(0, MAX_STRING_CHARS)}… (+${value.length - MAX_STRING_CHARS} karakter)`;
}

function redact(value, key = '') {
  if (MEDIA_KEYS.has(key)) return summarizeMedia(value);
  if (SENSITIVE_KEYS.has(key)) return '***';
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)])
    );
  }
  return truncateString(value);
}

function actionFromMethod(method) {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

export function auditLog(entityType) {
  return (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end.bind(res);

    res.end = function (...args) {
      const duration = Date.now() - startTime;
      const userId = req.user?.id ?? null;
      const entityId = req.params?.id ? Number.parseInt(req.params.id, 10) || null : null;
      const ip = req.ip || req.socket?.remoteAddress || null;
      const requestId = req.requestId || res.getHeader('X-Request-Id') || null;
      const action = actionFromMethod(req.method);

      let details = `request_id=${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
      if (req.validated) {
        let payload = JSON.stringify(redact(req.validated)) || '';
        if (payload.length > MAX_DETAILS_CHARS) {
          payload = `${payload.slice(0, MAX_DETAILS_CHARS)}… (dipotong, total ${payload.length} karakter)`;
        }
        details += ` payload=${payload}`;
      }

      query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entityType, entityId, details, ip]
      ).catch(() => {
        // Audit failure must not break the business request.
      });

      return originalEnd(...args);
    };

    next();
  };
}
