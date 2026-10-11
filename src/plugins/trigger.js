// ═══════════════════════════════════════════════════
// YORU — PLUGIN: NAME TRIGGER (media-integrated)
// Wakes Yoru when her name appears. Mood + media aware.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { mentionsYoru } from '../core/middleware.js';
import { respond } from '../ai/respond.js';
import { getGroupMood } from './mood.js';
import { recordSuccess, recordFail } from '../core/health.js';
import { decideFormat, emojiForMood, emotionForMood, reactionForMood } from '../media/reactions.js';
import { pickSticker } from '../media/stickers.js';
import { fetchGif } from '../media/gifs.js';

export async function register(bot) {
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();
    if (!mentionsYoru(text)) return next();

    const mood = getGroupMood(ctx.chat.id);
    const isGroup = ctx.chat.type !== 'private';
    const emotion = emotionForMood(mood);
    const format = decideFormat(mood, { isGroup });

    try {
      // ── Reaction-only mode (short-circuit)
      if (format === 'reaction') {
        try {
          await ctx.react(reactionForMood(mood));
          return;
        } catch {
          // Telegram reactions not available — fall through to text
        }
      }

      // ── Sticker-only mode
      if (format === 'sticker') {
        const fileId = pickSticker(mood, emotion, ctx.chat.id);
        if (fileId) {
          await ctx.replyWithSticker(fileId, {
            reply_to_message_id: ctx.message.message_id,
          });
          return;
        }
      }

      // ── Get AI text reply
      const { text: replyText, error } = await respond(ctx, { mood });

      if (error) {
        recordFail('trigger_reply', 'all providers failed');
        return ctx.reply(`...`, {
          reply_to_message_id: ctx.message.message_id,
        });
      }
      recordSuccess('trigger_reply');

      // ── Append emoji (unless text_no_emoji)
      const withEmoji =
        format === 'text_no_emoji'
          ? replyText
          : `${replyText}${emojiForMood(mood) ? ' ' + emojiForMood(mood) : ''}`;

      // ── Random GIF chance (5%)
      if (isGroup && Math.random() < 0.05) {
        const gifUrl = await fetchGif(mood, emotion);
        if (gifUrl) {
          try {
            await ctx.replyWithAnimation(gifUrl, {
              caption: withEmoji,
              reply_to_message_id: ctx.message.message_id,
            });
            return;
          } catch {
            // fall through to text
          }
        }
      }

      return ctx.reply(withEmoji, {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `👑 ${config.ownerName}`,
                url: `https://t.me/${config.ownerUsername.replace('@', '')}`,
              },
              { text: '♡ Home Base ♡', url: config.homeGroupLink },
            ],
          ],
        },
      });
    } catch (err) {
      console.error('[TRIGGER]', err.message);
      recordFail('trigger_reply', err.message);
      return ctx.reply(`...`);
    }
  });
}
