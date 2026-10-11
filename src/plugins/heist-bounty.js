// ═══════════════════════════════════════════════════
// YORU — PLUGIN: HEIST + BOUNTY
// /heist — group heist with joins + split pot
// /bounty — post a bounty on a user
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getWallet, addWallet, takeWallet, fmt } from '../economy/wallet.js';
import Database from 'better-sqlite3';

const db = new Database('./data/heist.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bounties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    poster_id INTEGER,
    amount REAL,
    claimed_by INTEGER DEFAULT 0,
    created_at INTEGER
  );
`);

const ENTRY = 100;
const JOIN_WINDOW_MS = 60 * 1000;

export async function register(bot) {
  // ── /heist — 60-second join window
  bot.command('heist', async (ctx) => {
    const initiator = ctx.from;
    const row = getWallet(initiator.id);
    if (row.wallet < ENTRY) return ctx.reply(`you need ${fmt(ENTRY)} to start a heist.`);

    const participants = new Map();
    participants.set(initiator.id, initiator.first_name);

    const sent = await ctx.reply(
      `💰 heist started by ${initiator.first_name}.\n` +
        `entry: ${fmt(ENTRY)} per player.\n` +
        `join within 60s → press the button.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💀 Join heist', callback_data: 'heist_join' }],
          ],
        },
      }
    );

    const collector = async (cbCtx) => {
      if (cbCtx.match !== 'heist_join') return;
      const uid = cbCtx.from.id;
      if (participants.has(uid)) return cbCtx.answerCallbackQuery({ text: 'already in.' });

      const w = getWallet(uid);
      if (w.wallet < ENTRY) {
        return cbCtx.answerCallbackQuery({ text: `you need ${fmt(ENTRY)} to join.`, show_alert: true });
      }
      participants.set(uid, cbCtx.from.first_name);
      return cbCtx.answerCallbackQuery({ text: 'in.' });
    };

    bot.on('callback_query:data', collector);

    // Wait 60s
    await new Promise((r) => setTimeout(r, JOIN_WINDOW_MS));
    bot.off('callback_query:data', collector);

    if (participants.size < 2) {
      return ctx.reply('heist cancelled — not enough players.');
    }

    // Take entry from all
    for (const id of participants.keys()) takeWallet(id, ENTRY);
    const pot = participants.size * ENTRY;

    // Success chance scales with player count
    const successChance = Math.min(0.85, 0.35 + participants.size * 0.1);
    const success = Math.random() < successChance;

    if (success) {
      // Split pot evenly
      const share = Math.floor(pot / participants.size);
      for (const id of participants.keys()) addWallet(id, share);
      return ctx.reply(
        `✅ HEIST SUCCESSFUL.\n` +
          `pot: ${fmt(pot)} split between ${participants.size} player(s).\n` +
          `each got ${fmt(share)}.`
      );
    }

    return ctx.reply(
      `🚨 HEIST FAILED.\n` +
        `the ${fmt(pot)} pot is gone. everyone loses their entry.`
    );
  });

  // ── /bounty <amount> (reply to target)
  bot.command('bounty', async (ctx) => {
    const target = ctx.message?.reply_to_message?.from;
    if (!target) return ctx.reply('reply to the person you want to bounty.');
    if (isOwner(target.id)) return ctx.reply("can't put a bounty on Durez.");

    const amount = Number((ctx.match || '').trim().replace(/[$,]/g, ''));
    if (!Number.isFinite(amount) || amount < 50) {
      return ctx.reply('usage: reply to user + /bounty <amount> (min $50)');
    }

    const row = getWallet(ctx.from.id);
    if (row.wallet < amount) return ctx.reply(`you need ${fmt(amount)} in your wallet.`);

    takeWallet(ctx.from.id, amount);
    db.prepare(
      'INSERT INTO bounties (target_id, poster_id, amount, created_at) VALUES (?, ?, ?, ?)'
    ).run(target.id, ctx.from.id, amount, Date.now());

    return ctx.reply(
      `👀 bounty posted on ${target.first_name}.\n` +
        `amount: ${fmt(amount)}\n` +
        `whoever steals from ${target.first_name} next splits it (bot takes 10%).`
    );
  });

  // ── /bounties — list active
  bot.command('bounties', async (ctx) => {
    const rows = db
      .prepare('SELECT * FROM bounties WHERE claimed_by = 0 ORDER BY amount DESC LIMIT 10')
      .all();
    if (rows.length === 0) return ctx.reply('no active bounties.');
    const lines = rows.map(
      (r) => `🎯 target#${r.target_id} — ${fmt(r.amount)}`
    );
    return ctx.reply(`active bounties:\n\n${lines.join('\n')}`);
  });
        }
