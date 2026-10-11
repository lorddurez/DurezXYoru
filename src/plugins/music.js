// ═══════════════════════════════════════════════════
// YORU — PLUGIN: MUSIC COMMANDS
// /song /play /music /lyrics /songinfo /ytdl
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { searchSong, downloadYouTubeMP3, songInfo } from '../media/music.js';
import { fetchLyrics } from '../media/lyrics.js';

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]+/;

// Locked music channels (owner toggle)
const musicLocks = new Set();

export async function register(bot) {
  // ── /song <name> — full audio
  bot.command(['song', 'play', 'music'], async (ctx) => {
    if (musicLocks.has(ctx.chat.id) && !isOwner(ctx.from.id)) {
      return ctx.reply("music's off in this group.");
    }

    const query = (ctx.match || '').trim();
    if (!query) return ctx.reply('usage: /song <song name>');

    const wait = await ctx.reply(`searching "${query}"...`);

    const result = await searchSong(query);
    if (!result.ok) {
      try { await ctx.api.deleteMessage(ctx.chat.id, wait.message_id); } catch {}
      return ctx.reply(`couldn't find it. try a different search.`);
    }

    try {
      await ctx.replyWithAudio(result.url, {
        title: result.title,
        performer: result.artist || config.botName,
        thumb: result.thumbnail ? { url: result.thumbnail } : undefined,
      });
      try { await ctx.api.deleteMessage(ctx.chat.id, wait.message_id); } catch {}
    } catch (err) {
      try { await ctx.api.deleteMessage(ctx.chat.id, wait.message_id); } catch {}
      return ctx.reply(`couldn't send the track. link: ${result.url}`);
    }
  });

  // ── /lyrics <song>
  bot.command('lyrics', async (ctx) => {
    const query = (ctx.match || '').trim();
    if (!query) return ctx.reply('usage: /lyrics <song name>');

    const res = await fetchLyrics(query);
    if (!res.ok) return ctx.reply(`couldn't find lyrics for "${query}".`);

    // Telegram message length cap = 4096. Trim if too long.
    const text = res.lyrics.length > 3900 ? res.lyrics.slice(0, 3900) + '...' : res.lyrics;
    return ctx.reply(`🎵 ${res.title}\n\n${text}`);
  });

  // ── /songinfo <song>
  bot.command('songinfo', async (ctx) => {
    const query = (ctx.match || '').trim();
    if (!query) return ctx.reply('usage: /songinfo <song name>');

    const info = await songInfo(query);
    if (!info.ok) return ctx.reply(`couldn't find info.`);

    return ctx.reply(
      `🎵 ${info.title}\n` +
        (info.artist ? `artist: ${info.artist}\n` : '') +
        (info.duration ? `duration: ${info.duration}\n` : '') +
        (info.url ? `link: ${info.url}` : '')
    );
  });

  // ── /ytdl <youtube url>
  bot.command('ytdl', async (ctx) => {
    const url = (ctx.match || '').trim();
    if (!YT_REGEX.test(url)) return ctx.reply('give me a valid YouTube url.');

    const wait = await ctx.reply('downloading...');
    const res = await downloadYouTubeMP3(url);

    try { await ctx.api.deleteMessage(ctx.chat.id, wait.message_id); } catch {}

    if (!res.ok) return ctx.reply(`download failed. try again later.`);

    try {
      await ctx.replyWithAudio(res.url, { title: res.title });
    } catch {
      ctx.reply(`link: ${res.url}`);
    }
  });

  // ── Owner: /musiclock on|off
  bot.command('musiclock', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const arg = (ctx.match || '').trim().toLowerCase();
    if (arg === 'on') {
      musicLocks.add(ctx.chat.id);
      return ctx.reply('music locked in this group.');
    }
    if (arg === 'off') {
      musicLocks.delete(ctx.chat.id);
      return ctx.reply('music unlocked.');
    }
    return ctx.reply('usage: /musiclock on|off');
  });

  // ── Help extension
  bot.command('musichelp', async (ctx) => {
    return ctx.reply(
      `🎵 music commands\n\n` +
        `/song <name> — search + send full audio\n` +
        `/play <name> — same as /song\n` +
        `/lyrics <name> — fetch lyrics\n` +
        `/songinfo <name> — title + artist + link\n` +
        `/ytdl <youtube url> — download any YouTube as MP3`
    );
  });
}
