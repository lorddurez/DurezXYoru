// ═══════════════════════════════════════════════════
// YORU — PLUGIN: HELP / ABOUT (full refresh)
// Complete command list with categories.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getGroupMood } from './mood.js';

const SECTIONS = {
  chat: [
    'say my name — i answer',
    '/mood <name> — switch my personality',
    '/moods — see all moods',
    '/about — about me',
  ],
  economy: [
    '/balance — your wallet + bank',
    '/bank — full account view + shield + streak',
    '/daily — claim $200 every 24h',
    '/deposit <amount|all> — wallet → bank',
    '/withdraw <amount|all> — bank → wallet',
    '/shield — check shield status',
    '/shield buy — buy 24h shield ($50)',
    '/leaderboard — top 10 richest',
    '/pay @user <amount> — send money (coming soon)',
  ],
  games: [
    '── casino ──',
    '/dice <bet>',
    '/coinflip h|t <bet>',
    '/slots <bet>',
    '/roulette red|black|green <bet>',
    '── social ──',
    '/8ball <question>',
    '/truth — random truth',
    '/dare — random dare',
    '/wyr — would you rather',
    '/rps @user — rock paper scissors',
    '/ship @u1 @u2 — compatibility',
    '── steal ──',
    '/steal — reply to a target (3/day)',
    '/stealhistory — your last attempts',
    '/stealboard — top stealers',
    '── group ──',
    '/heist — start a group heist',
    '/bounty — reply + /bounty <amount>',
    '/bounties — active bounties',
  ],
  music: [
    '/song <name> — search + send audio',
    '/play <name> — same as /song',
    '/lyrics <name> — fetch lyrics',
    '/songinfo <name> — title + artist',
    '/ytdl <youtube url> — download YT as MP3',
    '/say <text> — voice note (DM only)',
  ],
  media: [
    'i use stickers, gifs, reactions, and voice notes automatically.',
  ],
};

const OWNER_SECTION = [
  '/commandhealth — full health dashboard',
  '/disable <cmd> — force-disable a command',
  '/enable <cmd> — re-enable',
  '/retest <cmd> | /retest all',
  '/erasedlog — see auto-erased commands',
  '/moodall <name> — force mood everywhere',
  '/setmoney /addmoney /takemoney /wipewallet',
  '/setbank /wipebank',
  '/economy lock|unlock|reset',
  '/gamelock on|off',
  '/autowin on|off',
  '/shadow on|off',
  '/forcewin @user',
  '/minbet <amount> | /maxbet <amount>',
  '/gameban @user <game> | /gameunban',
  '/eyes — eyes-only settings',
  '/musiclock on|off',
  '/stickerstats | /sticker <mood> <emotion>',
  '/tagsticker — reply to sticker + tags',
  '/gif <mood> <emotion>',
  '/broadcast <msg>',
  '/backup — force a backup',
];

export async function register(bot) {
  bot.command('help', async (ctx) => {
    const isOwnerCtx = isOwner(ctx.from.id);
    const mood = getGroupMood(ctx.chat.id);

    const parts = [];
    parts.push(`♡ ${config.botName} — commands`);
    parts.push(`current mood: ${mood}`);
    parts.push('');

    for (const [name, cmds] of Object.entries(SECTIONS)) {
      parts.push(`▸ ${name}`);
      for (const c of cmds) parts.push(`  ${c}`);
      parts.push('');
    }

    if (isOwnerCtx) {
      parts.push(`▸ owner only`);
      for (const c of OWNER_SECTION) parts.push(`  ${c}`);
      parts.push('');
    }

    parts.push('home base:');

    const text = parts.join('\n');

    return ctx.reply(text, {
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

  // ── Owner: /backup
  bot.command('backup', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const { runBackup } = await import('../core/backup.js');
    const res = runBackup();
    return ctx.reply(`backup done. ${res.copied} files → ${res.folder}`);
  });

  // ── Owner: /broadcast <msg>
  bot.command('broadcast', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const msg = (ctx.match || '').trim();
    if (!msg) return ctx.reply('usage: /broadcast <message>');

    // Broadcast to all chats Yoru is in — simplified: only known group chats from DB
    // For now, just send back to owner as confirmation.
    return ctx.reply(`broadcast queued: "${msg}"\n\n(note: group-targeted broadcast ships next drop)`);
  });
}
