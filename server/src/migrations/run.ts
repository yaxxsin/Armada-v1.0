import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const files = fs
    .readdirSync(__dirname)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    // Run the whole file in a single multi-statement query so that `$$`
    // dollar-quoted function bodies (which contain semicolons) stay intact.
    await query(sql);
    console.log(`Migration ${file} applied.`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
