// ═══════════════════════════════════════════════════
// YORU — ECONOMY: WALLET
// Core balance storage. One wallet per user, global (all groups).
// ═══════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { config } from '../config.js';

const db = new Database('./data/economy.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    user_id INTEGER PRIMARY KEY,
    wallet REAL DEFAULT 0,
    bank REAL DEFAULT 0,
    shield_until INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    daily_last_claim INTEGER DEFAULT 0,
    interest_last_paid INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );
`);

// ── Row helpers
const getRowStmt = db.prepare('SELECT * FROM wallets WHERE user_id = ?');
const insertStmt = db.prepare(`
  INSERT INTO wallets (user_id, wallet, bank, created_at)
  VALUES (?, ?, 0, ?)
`);

export function getWallet(userId) {
  let row = getRowStmt.get(userId);
  if (!row) {
    insertStmt.run(userId, config.economy.startingBalance, Date.now());
    row = getRowStmt.get(userId);
  }
  return row;
}

export function setWallet(userId, amount) {
  getWallet(userId); // ensure row exists
  db.prepare('UPDATE wallets SET wallet = ? WHERE user_id = ?').run(amount, userId);
}

export function addWallet(userId, amount) {
  getWallet(userId);
  db.prepare('UPDATE wallets SET wallet = wallet + ? WHERE user_id = ?').run(amount, userId);
}

export function takeWallet(userId, amount) {
  getWallet(userId);
  const row = getRowStmt.get(userId);
  const actual = Math.min(row.wallet, amount);
  db.prepare('UPDATE wallets SET wallet = wallet - ? WHERE user_id = ?').run(actual, userId);
  return actual;
}

export function setBank(userId, amount) {
  getWallet(userId);
  db.prepare('UPDATE wallets SET bank = ? WHERE user_id = ?').run(amount, userId);
}

export function addBank(userId, amount) {
  getWallet(userId);
  db.prepare('UPDATE wallets SET bank = bank + ? WHERE user_id = ?').run(amount, userId);
}

export function takeBank(userId, amount) {
  getWallet(userId);
  const row = getRowStmt.get(userId);
  const actual = Math.min(row.bank, amount);
  db.prepare('UPDATE wallets SET bank = bank - ? WHERE user_id = ?').run(actual, userId);
  return actual;
}

// ── Shield
export function setShield(userId, untilTimestamp) {
  getWallet(userId);
  db.prepare('UPDATE wallets SET shield_until = ? WHERE user_id = ?').run(untilTimestamp, userId);
}

export function getShield(userId) {
  const row = getWallet(userId);
  return row.shield_until || 0;
}

export function hasShield(userId) {
  return getShield(userId) > Date.now();
}

// ── Daily streak
export function setStreak(userId, streak, lastClaim) {
  getWallet(userId);
  db.prepare(
    'UPDATE wallets SET daily_streak = ?, daily_last_claim = ? WHERE user_id = ?'
  ).run(streak, lastClaim, userId);
}

// ── Interest tracking
export function setInterestPaid(userId, ts) {
  getWallet(userId);
  db.prepare('UPDATE wallets SET interest_last_paid = ? WHERE user_id = ?').run(ts, userId);
}

// ── Leaderboard
export function getTopWallets(limit = 10) {
  return db
    .prepare('SELECT * FROM wallets ORDER BY (wallet + bank) DESC LIMIT ?')
    .all(limit);
}

export function getAllWallets() {
  return db.prepare('SELECT * FROM wallets').all();
}

// ── Format helper
export function fmt(n) {
  return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
