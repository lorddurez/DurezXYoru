// ═══════════════════════════════════════════════════
// YORU — HEALTH ENGINE
// Tracks every command's success/fail. Auto-disables dead ones.
// ═══════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { config } from '../config.js';

const db = new Database('./data/health.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS command_health (
    command TEXT PRIMARY KEY,
    fails INTEGER DEFAULT 0,
    successes INTEGER DEFAULT 0,
    last_fail_at INTEGER,
    disabled INTEGER DEFAULT 0,
    disabled_at INTEGER,
    reason TEXT
  );
`);

const getRow = db.prepare('SELECT * FROM command_health WHERE command = ?');
const upsertRow = db.prepare(`
  INSERT INTO command_health (command, fails, successes, last_fail_at)
  VALUES (?, 1, 0, ?)
  ON CONFLICT(command) DO UPDATE SET
    fails = fails + 1,
    last_fail_at = excluded.last_fail_at
`);
const successRow = db.prepare(`
  INSERT INTO command_health (command, fails, successes)
  VALUES (?, 0, 1)
  ON CONFLICT(command) DO UPDATE SET successes = successes + 1
`);
const disableRow = db.prepare(`
  UPDATE command_health SET disabled = 1, disabled_at = ?, reason = ? WHERE command = ?
`);
const enableRow = db.prepare(`
  UPDATE command_health SET disabled = 0, disabled_at = NULL, reason = NULL, fails = 0 WHERE command = ?
`);

export function isDisabled(command) {
  const row = getRow.get(command);
  return row ? row.disabled === 1 : false;
}

export function recordSuccess(command) {
  successRow.run(command);
}

export function recordFail(command, reason = 'unknown') {
  upsertRow.run(command, Date.now());

  const row = getRow.get(command);
  if (!row) return;

  const windowMs = config.health.disableWindowMinutes * 60 * 1000;
  const recentFails =
    row.last_fail_at && Date.now() - row.last_fail_at < windowMs
      ? row.fails
      : 1;

  if (recentFails >= config.health.disableThreshold && row.disabled === 0) {
    disableRow.run(Date.now(), reason, command);
    return { autoDisabled: true, command, fails: recentFails, reason };
  }

  if (recentFails >= config.health.warnThreshold) {
    return { warn: true, command, fails: recentFails };
  }

  return null;
}

export function enableCommand(command) {
  enableRow.run(command);
}

export function getHealth(command) {
  return getRow.get(command) || null;
}

export function getAllHealth() {
  return db.prepare('SELECT * FROM command_health ORDER BY disabled DESC, fails DESC').all();
  }
