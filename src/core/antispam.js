// ═══════════════════════════════════════════════════
// YORU — ANTISPAM
// Per-user message rate tracking. Auto-mute flooders.
// ═══════════════════════════════════════════════════

import Database from 'better-sqlite3';
import { config, isOwner } from '../config.js';

const db = new Database('./data/antispam.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS mutes (
    user_id INTEGER,
    chat_id INTEGER,
    until_ts INTEGER,
    reason TEXT,
    PRIMARY KEY (user_id, chat_id)
  );
`);

// In-memory sliding window: userId → [timestamps]
const recentMsgs = new Map();

const WINDOW_MS = 10_000;        // 10 seconds
const MAX_MSGS = 8;              // 8 messages in 10s = flood
const AUTO_MUTE_MS = 10 * 60_000; // 10 minutes

export function trackMessage(userId) {
  if (isOwner(userId)) return { flood: false };

  const now = Date.now();
  const arr = recentMsgs.get(userId) || [];
  const filtered = arr.filter((t) => now - t < WINDOW_MS);
  filtered.push(now);
  recentMsgs.set(userId, filtered);

  if (filtered.length >= MAX_MSGS) {
    recentMsgs.set(userId, []);
    return { flood: true };
  }
  return { flood: false };
}

export function muteUser(userId, chatId, durationMs = AUTO_MUTE_MS, reason = 'auto') {
  const until = Date.now() + durationMs;
  db.prepare(
    `INSERT OR REPLACE INTO mutes (user_id, chat_id, until_ts, reason) VALUES (?, ?, ?, ?)`
  ).run(userId, chatId, until, reason);
  return until;
}

export function isMuted(userId, chatId) {
  const row = db
    .prepare('SELECT until_ts FROM mutes WHERE user_id = ? AND chat_id = ?')
    .get(userId, chatId);
  if (!row) return false;
  if (row.until_ts < Date.now()) {
    db.prepare('DELETE FROM mutes WHERE user_id = ? AND chat_id = ?').run(userId, chatId);
    return false;
  }
  return true;
}

export async function register(bot) {
  bot.command('unmute', async (ctx) => {
    if (ctx.chat.type === 'private') return;
    const isAdmin =
      isOwner(ctx.from.id) || (await isGroupAdmin(ctx, ctx.from.id));
    if (!isAdmin) return ctx.reply('admins only.');

    const target = ctx.message?.reply_to_message?.from;
    if (!target) return ctx.reply('reply to the user to unmute.');

    db.prepare('DELETE FROM mutes WHERE user_id = ? AND chat_id = ?').run(target.id, ctx.chat.id);
    return ctx.reply(`${target.first_name} unmuted.`);
  });
}

async function isGroupAdmin(ctx, userId) {
  try {
    const m = await ctx.api.getChatMember(ctx.chat.id, userId);
    return ['administrator', 'creator'].includes(m.status);
  } catch {
    return false;
  }
}
