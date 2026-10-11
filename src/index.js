// ═══════════════════════════════════════════════════
// YORU — MAIN ENTRY
// Boots the bot, registers middleware, loads plugins, starts polling.
// ═══════════════════════════════════════════════════

import { Bot } from 'grammy';
import { config, isOwner } from './config.js';
import {
  ownerImmune,
  mentionsYoru,
  isBetrayalAttempt,
} from './core/middleware.js';
import { loadPlugins } from './core/loader.js';
import { respond } from './ai/respond.js';

const bot = new Bot(config.botToken);

// ── Global middleware ────────────────────────────────
bot.use(ownerImmune);

// ── Owner /start override ────────────────────────────
bot.command('start', async (ctx) => {
  if (isOwner(ctx.from.id)) {
    return ctx.reply(
      `♡ welcome back, ${config.ownerName}.\n\n` +
        `everything's running. type /help for the full command list.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '♡ Join the Home Base ♡', url: config.homeGroupLink }],
          ],
        },
      }
    );
  }

  return ctx.reply(
    `♡ hey, i'm ${config.botName}. ♡\n\n` +
      `i don't just sit here waiting for commands — i talk, i play, i remember.\n\n` +
      `• /help — see everything i can do\n` +
      `• /daily — claim $${config.economy.dailyAmount} every day\n` +
      `• /games — play, gamble, steal\n\n` +
      `home base: join us below.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '♡ Join the Home Base ♡', url: config.homeGroupLink }],
        ],
      },
    }
  );
});

// ── Name trigger listener ────────────────────────────
// If a message mentions Yoru by name (not a command), she wakes up.
bot.on('message:text', async (ctx, next) => {
  const text = ctx.message.text;

  // skip commands — they're handled by their own handlers
  if (text.startsWith('/')) return next();

  // ── Betrayal detection — DM owner, cold reply
  if (isBetrayalAttempt(text)) {
    try {
      await bot.api.sendMessage(
        config.ownerId,
        `⚠️ possible betrayal attempt\n` +
          `from: ${ctx.from.first_name} (@${ctx.from.username ?? 'no-username'})\n` +
          `chat: ${ctx.chat.type}\n` +
          `message: "${text}"`
      );
    } catch (_) {}

    if (mentionsYoru(text)) {
      return ctx.reply(`don't say that about ${config.ownerName}.`);
    }
    return next();
  }

  // ── Name trigger — real AI reply
  if (mentionsYoru(text)) {
    try {
      const { text: replyText } = await respond(ctx, {
        mood: config.defaultMood,
      });
      return ctx.reply(replyText, {
        reply_to_message_id: ctx.message.message_id,
      });
    } catch (err) {
      console.error('[TRIGGER] respond failed:', err.message);
      return ctx.reply(`...`);
    }
  }

  return next();
});

// ── Fallback error handler ───────────────────────────
bot.catch((err) => {
  console.error('[YORU ERROR]', err);
});

// ── Load plugins ─────────────────────────────────────
await loadPlugins(bot);

// ── Boot ─────────────────────────────────────────────
console.log(`♡ ${config.botName} is waking up...`);
console.log(`   owner: ${config.ownerName} (${config.ownerId})`);
console.log(`   mood:  ${config.defaultMood}`);
console.log(`   home:  ${config.homeGroupLink}`);

await bot.start({
  onStart: (info) =>
    console.log(`♡ ${config.botName} is live as @${info.username}`),
});
