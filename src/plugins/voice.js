// ═══════════════════════════════════════════════════
// YORU — PLUGIN: VOICE
// /say <text> — DM only voice note via Prexzy TTS.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { synthesize } from '../media/tts.js';

export async function register(bot) {
  bot.command('say', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      return ctx.reply('voice notes only work in DMs.');
    }
    const text = (ctx.match || '').trim();
    if (!text) return ctx.reply('usage: /say <text>');
    if (text.length > 500) return ctx.reply('too long. keep it under 500 chars.');

    const { ok, url } = await synthesize(text, 'soft');
    if (!ok) return ctx.reply("couldn't generate a voice note right now.");

    try {
      return await ctx.replyWithVoice(url);
    } catch {
      return ctx.reply(`voice url: ${url}`);
    }
  });
}
