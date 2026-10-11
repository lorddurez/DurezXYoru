// ═══════════════════════════════════════════════════
// YORU — ECONOMY: STEAL HOOKS
// Bounty payout on successful steal. Called from steal.js later.
// ═══════════════════════════════════════════════════

import { addWallet, fmt } from './wallet.js';
import Database from 'better-sqlite3';

const db = new Database('./data/heist.db');
db.pragma('journal_mode = WAL');

// Bounties table already created in heist-bounty.js — reuse.

export function payoutBountyIfAny(victimId, stealerId) {
  const bounties = db
    .prepare('SELECT * FROM bounties WHERE target_id = ? AND claimed_by = 0 ORDER BY amount DESC')
    .all(victimId);

  if (bounties.length === 0) return null;

  const bounty = bounties[0];
  const tax = Math.floor(bounty.amount * 0.10);
  const payout = bounty.amount - tax;

  addWallet(stealerId, payout);
  db.prepare('UPDATE bounties SET claimed_by = ? WHERE id = ?').run(stealerId, bounty.id);

  return { payout, tax, total: bounty.amount };
}

export function fmtBountyMsg(result) {
  if (!result) return '';
  return `\n🎯 bounty claimed: +${fmt(result.payout)} (tax ${fmt(result.tax)} of ${fmt(result.total)})`;
}
