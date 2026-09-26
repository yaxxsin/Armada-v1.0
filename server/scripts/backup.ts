import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

const backupDir = path.join(projectRoot, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `armada-backup-${timestamp}.sql`;
const filepath = path.join(backupDir, filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL tidak ditemukan di environment variables.');
  process.exit(1);
}

const match = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!match) {
  console.error('Format DATABASE_URL tidak valid.');
  process.exit(1);
}

const [, user, password, host, port, db] = match;

try {
  const cmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${db} -F c -f "${filepath}"`;
  const env = { ...process.env, PGPASSWORD: password };
  execSync(cmd, { env, stdio: 'inherit' });
  console.log(`Backup berhasil: ${filepath}`);
} catch (e) {
  console.error('Backup gagal:', e.message);
  process.exit(1);
}