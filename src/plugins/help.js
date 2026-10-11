// ═══════════════════════════════════════════════════
// YORU — PLUGIN: HELP / ABOUT
// Command list + bot info, mood-aware tone.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getGroupMood } from './mood.js';

export async function register(bot) {
  bot.command('help', async (ctx) => {
    const mood = getGroupMood(ctx.chat.id);
    const isOwnerCtx = isOwner(ctx.from.id);

    const lines = [
      `♡ ${config.botName} — commands`,
      ``,
      `▸ chat`,
      `  just say my name — i'll answer`,
      `  /mood <name> — switch personality`,
      `  /about — about me`,
      ``,
      `▸ coming soon`,
      `  /daily /bank /games /steal /bounty`,
      `  /song /lyrics — music`,
      ``,
    ];

    if (isOwnerCtx) {
      lines.push(
        `▸ owner only`,
        `  /commandhealth — full health dashboard`,
        `  /disable <cmd> / /enable <cmd>`,
        `  /retest <cmd> — revive a dead command`,
        `  /retest all`,
        `  /moodall <name>`,
        `  /erasedlog`,
        ``
      );
    }

    lines.push(
      `home base:`,
      `[ ♡ Join the Home Base ♡ ]`
    );

    return ctx.reply(lines.join('\n'), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '♡ Join the Home Base ♡', url: config.homeGroupLink }],
        ],
      },
    });
  });

  bot.command('about', async (ctx) => {
    return ctx.reply(
      `♡ ${config.botName}\n\n` +
        `a bot that talks, plays, remembers.\n` +
        `built by ${config.ownerName}.\n\n` +
        `home base:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '♡ Join the Home Base ♡', url: config.homeGroupLink }],
          ],
        },
      }
    );
  });
}
