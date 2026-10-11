// ═══════════════════════════════════════════════════
// YORU — MEDIA: STICKERS
// Auto-tags sticker packs via vision AI + manual fix.
// Picks best sticker per mood+emotion at reply time.
// ═══════════════════════════════════════════════════

import Database from 'better-sqlite3';

const db = new Database('./data/media.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS stickers (
    file_unique_id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    set_name TEXT,
    tags TEXT,
    moods TEXT,
    added_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS sticker_sends (
    file_unique_id TEXT,
    chat_id INTEGER,
    sent_at INTEGER
  );
`);

const ANTI_REPEAT_MS = 30 * 60 * 1000; // 30 min

// ── Register a sticker (from ingest)
export function registerSticker({ fileId, fileUniqueId, setName, tags, moods }) {
  db.prepare(
    `INSERT OR REPLACE INTO stickers (file_unique_id, file_id, set_name, tags, moods, added_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    fileUniqueId,
    fileId,
    setName || '',
    (tags || []).join(','),
    (moods || []).join(','),
    Date.now()
  );
}

// ── Was this sticker sent recently in this chat?
function wasRecentlySent(fileUniqueId, chatId) {
  const row = db
    .prepare(
      'SELECT sent_at FROM sticker_sends WHERE file_unique_id = ? AND chat_id = ? ORDER BY sent_at DESC LIMIT 1'
    )
    .get(fileUniqueId, chatId);
  if (!row) return false;
  return Date.now() - row.sent_at < ANTI_REPEAT_MS;
}

function markSent(fileUniqueId, chatId) {
  db.prepare(
    'INSERT INTO sticker_sends (file_unique_id, chat_id, sent_at) VALUES (?, ?, ?)'
  ).run(fileUniqueId, chatId, Date.now());
}

// ── Pick a sticker matching mood + emotion
export function pickSticker(mood, emotion, chatId) {
  const rows = db
    .prepare(
      `SELECT * FROM stickers
       WHERE (tags LIKE ? OR tags LIKE ?)
         AND (moods LIKE ? OR moods LIKE ?)
       ORDER BY RANDOM() LIMIT 20`
    )
    .all(`%${emotion}%`, `%${mood}%`, `%${mood}%`, `%any%`);

  for (const row of rows) {
    if (!wasRecentlySent(row.file_unique_id, chatId)) {
      markSent(row.file_unique_id, chatId);
      return row.file_id;
    }
  }
  return null;
}

// ── Count stickers in DB
export function stickerCount() {
  const row = db.prepare('SELECT COUNT(*) AS c FROM stickers').get();
  return row.c;
}

export async function register(bot) {
  // ── Owner: tag the current sticker (reply to a sticker with #tags)
  bot.command('tagsticker', async (ctx) => {
    // only owner
    const ownerCheck = (await import('../config.js')).isOwner;
    if (!ownerCheck(ctx.from.id)) return;

    const target = ctx.message?.reply_to_message?.sticker;
    if (!target) return ctx.reply('reply to a sticker to tag it.');

    const tags = (ctx.match || '').trim().split(/\s+/).filter((t) => t.startsWith('#'));
    if (tags.length === 0) {
      return ctx.reply('give at least one #tag. example: /tagsticker #savage #facepalm');
    }

    const parsedTags = tags.map((t) => t.replace('#', '').toLowerCase());
    registerSticker({
      fileId: target.file_id,
      fileUniqueId: target.file_unique_id,
      setName: target.set_name || 'manual',
      tags: parsedTags,
      moods: parsedTags, // tags and moods overlap for now
    });

    return ctx.reply(`sticker tagged: ${parsedTags.join(', ')}`);
  });

  // ── Owner: preview a sticker matching mood+emotion
  bot.command('sticker', async (ctx) => {
    const ownerCheck = (await import('../config.js')).isOwner;
    if (!ownerCheck(ctx.from.id)) return;

    const [mood, emotion] = (ctx.match || '').trim().split(/\s+/);
    if (!mood || !emotion) return ctx.reply('usage: /sticker <mood> <emotion>');

    const fileId = pickSticker(mood, emotion, ctx.chat.id);
    if (!fileId) return ctx.reply(`no sticker found for ${mood}+${emotion}.`);

    return ctx.replyWithSticker(fileId);
  });

  // ── Owner: stats
  bot.command('stickerstats', async (ctx) => {
    const ownerCheck = (await import('../config.js')).isOwner;
    if (!ownerCheck(ctx.from.id)) return;
    return ctx.reply(`stickers in DB: ${stickerCount()}`);
  });
}
