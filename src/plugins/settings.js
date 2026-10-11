// ═══════════════════════════════════════════════════
// YORU — PLUGIN: GROUP SETTINGS
// /minbet /maxbet /gameban /gameunban
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import Database from 'better-sqlite3';

const db = new Database('./data/settings.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS group_settings (
    chat_id INTEGER PRIMARY KEY,
    min_bet REAL DEFAULT 10,
    max_bet REAL DEFAULT 100000
  );
  CREATE TABLE IF NOT EXISTS game_bans (
    user_id INTEGER,
    game TEXT,
    PRIMARY KEY (user_id, game)
  );
`);

export function getBetLimits(chatId) {
  const row = db.prepare('SELECT * FROM group_settings WHERE chat_id = ?').get(chatId);
  if (row) return { min: row.min_bet, max: row.max_bet };
  return { min: 10, max: 100000 };
}

export function isGameBanned(userId, game) {
  const row = db
    .prepare('SELECT 1 FROM game_bans WHERE user_id = ? AND game = ?')
    .get(userId, game);
  return !!row;
}

export async function register(bot) {
  // ── /minbet <amount>
  bot.command('minbet', async (ctx) => {
    if (!(await isGroupAdmin(ctx))) return ctx.reply('admins only.');
    const amount = Number((ctx.match || '').trim().replace(/[$,]/g, ''));
    if (!Number.isFinite(amount) || amount < 1) return ctx.reply('usage: /minbet <amount>');
    db.prepare(
      `INSERT INTO group_settings (chat_id, min_bet) VALUES (?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET min_bet = excluded.min_bet`
    ).run(ctx.chat.id, amount);
    return ctx.reply(`min bet set to $${amount}.`);
  });

  // ── /maxbet <amount>
  bot.command('maxbet', async (ctx) => {
    if (!(await isGroupAdmin(ctx))) return ctx.reply('admins only.');
    const amount = Number((ctx.match || '').trim().replace(/[$,]/g, ''));
    if (!Number.isFinite(amount) || amount < 1) return ctx.reply('usage: /maxbet <amount>');
    db.prepare(
      `INSERT INTO group_settings (chat_id, max_bet) VALUES (?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET max_bet = excluded.max_bet`
    ).run(ctx.chat.id, amount);
    return ctx.reply(`max bet set to $${amount}.`);
  });

  // ── /gameban @user <game> (owner)
  bot.command('gameban', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const parts = (ctx.match || '').trim().split(/\s+/);
    const target = resolveTarget(ctx, parts);
    const game = parts[parts.length - 1];
    if (!target || !game || game === parts[0]) {
      return ctx.reply('usage: reply + /gameban <game>  or  /gameban @user <game>');
    }
    db.prepare('INSERT OR IGNORE INTO game_bans (user_id, game) VALUES (?, ?)').run(target, game);
    return ctx.reply(`user#${target} banned from ${game}.`);
  });

  // ── /gameunban @user <game>
  bot.command('gameunban', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const parts = (ctx.match || '').trim().split(/\s+/);
    const target = resolveTarget(ctx, parts);
    const game = parts[parts.length - 1];
    if (!target || !game) return ctx.reply('usage: reply + /gameunban <game>');
    db.prepare('DELETE FROM game_bans WHERE user_id = ? AND game = ?').run(target, game);
    return ctx.reply(`user#${target} unbanned from ${game}.`);
  });
}

async function isGroupAdmin(ctx) {
  if (ctx.chat.type === 'private') return false;
  if (isOwner(ctx.from.id)) return true;
  try {
    const m = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return ['administrator', 'creator'].includes(m.status);
  } catch {
    return false;
  }
}

function resolveTarget(ctx, parts) {
  if (ctx.message?.reply_to_message?.from?.id) return ctx.message.reply_to_message.from.id;
  const numeric = parts.find((p) => /^\d+$/.test(p));
  return numeric ? Number(numeric) : null;
        }
