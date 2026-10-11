// ═══════════════════════════════════════════════════
// YORU — MEDIA: TTS VOICE NOTES
// Uses Prexzy TTS. DM only. Voice varies per mood.
// ═══════════════════════════════════════════════════

import fetch from 'node-fetch';
import { config, isOwner } from '../config.js';
import { recordSuccess, recordFail } from '../core/health.js';

// Prexzy TTS voice endpoints per mood
const VOICE_MAP = {
  chill:    'tts/english',
  savage:   'tts/english',
  cold:     'voice/sam',
  hype:     'tts/english',
  soft:     'voice/mary',
  kawaii:   'voice/amy',
  dead:     'voice/robosoftone',
  iris:     'voice/jenny',
  attached: 'voice/olivia',
};

export async function synthesize(text, mood = 'chill') {
  const voice = VOICE_MAP[mood] || 'tts/english';
  const url = `${config.ai.prexzyBaseUrl}/${voice}?text=${encodeURIComponent(text)}`;

  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const audioUrl = data.url || data.audio || data.result;
    if (!audioUrl) throw new Error('no audio url');

    recordSuccess('tts_voice');
    return { ok: true, url: audioUrl };
  } catch (err) {
    recordFail('tts_voice', err.message);
    return { ok: false };
  }
}

export async function register(bot) {
  // ── /say <text> — DM only
  bot.command('say', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      return ctx.reply('voice notes only work in DMs.');
    }
    const text = (ctx.match || '').trim();
    if (!text) return ctx.reply('usage: /say <text>');

    const { ok, url } = await synthesize(text, 'soft');
    if (!ok) return ctx.reply("couldn't make a voice note right now.");

    try {
      return await ctx.replyWithVoice(url);
    } catch {
      return ctx.reply(`voice url: ${url}`);
    }
  });
}
