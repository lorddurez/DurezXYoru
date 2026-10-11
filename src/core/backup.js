// ═══════════════════════════════════════════════════
// YORU — BACKUP
// Auto-exports all DBs to /data/backups every 6 hours.
// ═══════════════════════════════════════════════════

import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

const DATA_DIR = './data';
const BACKUP_DIR = './data/backups';
const MAX_BACKUPS = 8; // keep last 8 (2 days of 6h backups)

const DB_FILES = [
  'economy.db',
  'steal.db',
  'heist.db',
  'settings.db',
  'media.db',
  'health.db',
  'antispam.db',
];

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
}

function rotateBackups() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('backup-'))
      .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);

    for (let i = MAX_BACKUPS; i < files.length; i++) {
      unlinkSync(join(BACKUP_DIR, files[i].f));
    }
  } catch (_) {}
}

export function runBackup() {
  ensureBackupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folder = join(BACKUP_DIR, `backup-${stamp}`);

  mkdirSync(folder, { recursive: true });

  let copied = 0;
  for (const dbFile of DB_FILES) {
    const src = join(DATA_DIR, dbFile);
    if (!existsSync(src)) continue;
    try {
      copyFileSync(src, join(folder, dbFile));
      copied++;
    } catch (_) {}
  }

  rotateBackups();
  return { folder, copied };
}

export function startBackupLoop() {
  // First backup after 5 min, then every 6 hours
  setTimeout(() => {
    const res = runBackup();
    console.log(`[BACKUP] initial: ${res.copied} files → ${res.folder}`);
  }, 5 * 60_000);

  setInterval(() => {
    const res = runBackup();
    console.log(`[BACKUP] scheduled: ${res.copied} files`);
  }, 6 * 60 * 60_000);
}
