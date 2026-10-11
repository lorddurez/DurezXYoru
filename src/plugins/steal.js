// ═══════════════════════════════════════════════════
// YORU — PLUGIN: STEAL + SHIELD
// 3 attempts/attacker/24h. Max 1 successful steal per victim/24h.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import {
  getWallet, addWallet, takeWallet, hasShield, fmt,
} from '../economy/wallet.js';
import Database from 'better-sqlite3';

const db = new Database('./data/steal.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS steal_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attacker_id INTEGER,
    victim_id INTEGER,
    success INTEGER,
    amount REAL,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS steal_guard (
    user_id INTEGER PRIMARY KEY,
    last_success_at INTEGER DEFAULT 0
  );
`);

const ONE_DAY = 24 * 60 * 60 * 1000;

function attemptsInLast24h(attackerId) {
  const since = Date.now() - ONE_DAY;
  const row = db
    .prepare('SELECT COUNT(*) as c FROM steal_attempts WHERE attacker_id = ? AND created_at > ?')
    .get(attackerId, since);
  return row.c;
}

function wasRecentlyStolen(victimId) {
  const row = db
    .prepare('SELECT last_success_at FROM steal_guard WHERE user_id = ?')
    .get(victimId);
  if (!row) return false;
  return Date.now() - row.last_success_at < ONE_DAY;
}

function markStolen(victimId) {
  db.prepare(
    `INSERT INTO steal_guard (user_id, last_success_at) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_success_at = excluded.last_success_at`
  ).run(victimId, Date.now());
}

function recordAttempt(attacker, victim, success, amount) {
  db.prepare(
    'INSERT INTO steal_attempts (attacker_id, victim_id, success, amount, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(attacker, victim, success ? 1 : 0, amount, Date.now());
}

export async function register(bot) {
  bot.command('steal', async (ctx) => {
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return ctx.reply('reply to who you want to steal from.');
    if (target.id === ctx.from.id) return ctx.reply("you can't steal from yourself.");
    if (isOwner(target.id)) return ctx.reply(`don't even think about it.`);
    if (isOwner(ctx.from.id)) {
      // Owner can steal, bypasses all checks except shield
    }

    const attacker = getWallet(ctx.from.id);
    const victim = getWallet(target.id);

    // Attacker minimum
    if (attacker.wallet < config.economy.stealMinAttacker) {
      return ctx.reply(`you need at least ${fmt(config.economy.stealMinAttacker)} in your wallet.`);
    }
    // Victim minimum
    if (victim.wallet < config.economy.stealMinVictim) {
      return ctx.reply(`${target.first_name} is too broke to be worth it.`);
    }
    // Attacker attempts
    if (!isOwner(ctx.from.id) && attemptsInLast24h(ctx.from.id) >= config.economy.stealAttemptsPerDay) {
      return ctx.reply(`you've used all ${config.economy.stealAttemptsPerDay} steal attempts today.`);
    }
    // Victim recently stolen from
    if (wasRecentlyStolen(target.id)) {
      return ctx.reply(`${target.first_name} was already hit today. pick someone else.`);
    }
    // Shield
    if (hasShield(target.id)) {
      recordAttempt(ctx.from.id, target.id, false, 0);
      return ctx.reply(`🛡 ${target.first_name}'s shield blocked you. attempt consumed.`);
    }

    const success = Math.random() < config.economy.stealSuccessRate;

    if (success) {
      const amount = Math.floor(victim.wallet * config.economy.stealPercent);
      takeWallet(target.id, amount);
      addWallet(ctx.from.id, amount);
      markStolen(target.id);
      recordAttempt(ctx.from.id, target.id, true, amount);

      return ctx.reply(
        `🔪 successful steal.\n` +
          `you took ${fmt(amount)} from ${target.first_name}.\n` +
          `${target.first_name} is now immune to steals for 24h.`
      );
    }

    // Fail — attacker pays 15% of own wallet to victim
    const penalty = Math.max(
      config.economy.stealFailMin,
      Math.floor(attacker.wallet * config.economy.stealFailPenalty)
    );
    const actual = takeWallet(ctx.from.id, penalty);
    addWallet(target.id, actual);
    recordAttempt(ctx.from.id, target.id, false, actual);

    return ctx.reply(
      `💀 failed steal.\n` +
        `you paid ${fmt(actual)} to ${target.first_name} as penalty.`
    );
  });

  // ── /stealhistory
  bot.command('stealhistory', async (ctx) => {
    const rows = db
      .prepare(
        'SELECT * FROM steal_attempts WHERE attacker_id = ? ORDER BY created_at DESC LIMIT 10'
      )
      .all(ctx.from.id);
    if (rows.length === 0) return ctx.reply('no steal attempts yet.');
    const lines = rows.map(
      (r) => `${r.success ? '🔪' : '💀'} victim#${r.victim_id} — ${fmt(r.amount)}`
    );
    return ctx.reply(`last 10 attempts:\n\n${lines.join('\n')}`);
  });

  // ── /stealboard
  bot.command('stealboard', async (ctx) => {
    const rows = db
      .prepare(
        `SELECT attacker_id, SUM(amount) AS total, COUNT(*) AS hits
         FROM steal_attempts WHERE success = 1
         GROUP BY attacker_id ORDER BY total DESC LIMIT 10`
      )
      .all();
    if (rows.length === 0) return ctx.reply('no successful steals yet.');
    const lines = rows.map(
      (r, i) => `${i + 1}. user#${r.attacker_id} — ${fmt(r.total)} (${r.hits} hits)`
    );
    return ctx.reply(`🔪 top stealers\n\n${lines.join('\n')}`);
  });
        }
