// ═══════════════════════════════════════════════════
// YORU — PLUGIN: ANTISPAM HOOK
// Tracks messages, auto-mutes flooders in groups.
// ═══════════════════════════════════════════════════

import { isOwner } from '../config.js';
import { trackMessage, muteUser, isMuted } from '../core/antispam.js';

export async function register(bot) {
  bot.on('message', async (ctx, next) => {
    // Only in groups
    if (ctx.chat.type === 'private') return next();
    if (!ctx.from) return next();
    if (isOwner(ctx.from.id)) return next();

    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    // Already muted? Delete + stop.
    if (isMuted(userId, chatId)) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
      } catch (_) {}
      return;
    }

    const { flood } = trackMessage(userId);
    if (flood) {
      muteUser(userId, chatId);
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
      } catch (_) {}
      return ctx.reply(`${ctx.from.first_name} muted for 10 min — slow down.`);
    }

    return next();
  });
}
