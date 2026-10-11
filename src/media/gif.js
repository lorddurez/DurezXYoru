// ═══════════════════════════════════════════════════
// YORU — MEDIA: GIFs via GIPHY
// Searches GIPHY by mood+emotion, returns best anime-friendly GIF.
// ═══════════════════════════════════════════════════

import fetch from 'node-fetch';
import { config } from '../config.js';

// Search query per mood+emotion
const QUERY_MAP = {
  'savage_facepalm':  'anime facepalm reaction',
  'savage_laugh':     'anime laughing',
  'hype_celebration': 'anime celebration hype',
  'soft_blush':       'anime blush cute',
  'soft_love':        'anime heart love',
  'kawaii_cute':      'kawaii cute anime',
  'cold_deadpan':     'anime deadpan stare',
  'iris_smug':        'anime smug smirk',
  'chill_happy':      'anime relaxed happy',
  'dead_dead':        'blank stare anime',
};

export async function fetchGif(mood, emotion) {
  if (!config.media.giphyApiKey) return null;

  const key = `${mood}_${emotion}`;
  const query = QUERY_MAP[key] || `anime ${emotion}`;

  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${config.media.giphyApiKey}` +
        `&q=${encodeURIComponent(query)}&limit=20&rating=pg-13&lang=en`,
      { timeout: 8000 }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.data || [];
    if (results.length === 0) return null;

    const pick = results[Math.floor(Math.random() * results.length)];
    return pick.images?.original?.url || pick.images?.downsized?.url || null;
  } catch {
    return null;
  }
}

export async function register(bot) {
  // ── Owner preview
  bot.command('gif', async (ctx) => {
    const ownerCheck = (await import('../config.js')).isOwner;
    if (!ownerCheck(ctx.from.id)) return;
    const [mood, emotion] = (ctx.match || '').trim().split(/\s+/);
    if (!mood || !emotion) return ctx.reply('usage: /gif <mood> <emotion>');
    const url = await fetchGif(mood, emotion);
    if (!url) return ctx.reply('no gif found or GIPHY key missing.');
    return ctx.replyWithAnimation(url);
  });
}
