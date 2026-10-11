// ═══════════════════════════════════════════════════
// YORU — PLUGIN: NAME TRIGGER (enhanced)
// Wakes Yoru when her name appears. Uses group mood + reply-to.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { mentionsYoru } from '../core/middleware.js';
import { respond } from '../ai/respond.js';
import { getGroupMood } from './mood.js';
import { recordSuccess, recordFail } from '../core/health.js';

export async function register(bot) {
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();
    if (!mentionsYoru(text)) return next();

    const mood = getGroupMood(ctx.chat.id);

    try {
      const { text: replyText, error } = await respond(ctx, { mood });

      if (error) {
        recordFail('trigger_reply', 'all providers failed');
        return ctx.reply(`...`, {
          reply_to_message_id: ctx.message.message_id,
        });
      }

      recordSuccess('trigger_reply');

      return ctx.reply(replyText, {
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
