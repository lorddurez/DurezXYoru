// ═══════════════════════════════════════════════════
// YORU — PLUGIN: EYES-ONLY
// Forwards LOVE / HATE / THREAT DMs to owner.
// Everything else stays private.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';

// ── Pattern banks (first pass — fast regex)
const PATTERNS = {
  love: [
    /\bi\s+love\s+you\b/i,
    /\bi'?m\s+in\s+love\s+with\s+you\b/i,
    /\bmarry\s+me\b/i,
    /\bbe\s+my\s+(girlfriend|waifu|wife)\b/i,
    /\byou'?re\s+(mine|my\s+girl)\b/i,
    /\bi\s+want\s+you\b/i,
    /\bi\s+need\s+you\b/i,
    /\bdate\s+me\b/i,
    /\bkiss\s+me\b/i,
  ],
  hate: [
    /\bi\s+hate\s+you\b/i,
    /\byou'?re\s+(stupid|dumb|ugly|trash|garbage|useless)\b/i,
    /\bshut\s+up\b/i,
    /\bf+u+c+k+\s+you\b/i,
    /\byou\s+suck\b/i,
    /\bkill\s+yourself\b/i,  // also crosses into threat, tagged higher
    /\bbitch\b/i,
    /\bhorrible\s+bot\b/i,
  ],
  threat: [
    /\bi'?ll\s+(find|kill|hurt|destroy|dox|hack|report)\s+you\b/i,
    /\bi\s+know\s+where\s+you\s+live\b/i,
    /\bi'?ll\s+come\s+for\s+you\b/i,
    /\bsomeone\s+should\s+(kill|hurt)\s+you\b/i,
    /\bi'?ll\s+make\s+you\s+regret\b/i,
    /\bshut\s+the\s+bot\s+down\s+or\b/i,
    /\bi'?ll\s+leak\s+your\b/i,
  ],
};

function classify(text) {
  const lower = (text || '').toLowerCase();
  const flags = [];

  for (const [category, patterns] of Object.entries(PATTERNS)) {
    if (patterns.some((p) => p.test(lower))) flags.push(category);
  }

  // Severity heuristic
  let severity = 2;
  if (flags.includes('threat')) severity = 4;
  if (/\bi'?ll\s+kill\b/i.test(lower) || /\bkill\s+yourself\b/i.test(lower)) severity = 5;

  return { flags, severity };
}

// ── Per-category severity threshold
function shouldForward(category, severity) {
  if (category === 'love' && !config.eyes.love) return false;
  if (category === 'hate' && !config.eyes.hate) return false;
  if (category === 'threat' && !config.eyes.threat) return false;
  return severity >= config.eyes.severityMin;
}

export async function register(bot) {
  bot.on('message:text', async (ctx, next) => {
    // Only private DMs
    if (ctx.chat.type !== 'private') return next();

    // Skip owner's own DMs (no self-flag)
    if (isOwner(ctx.from.id)) return next();

    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const { flags, severity } = classify(text);
    if (flags.length === 0) return next();

    // Filter by enabled categories + severity
    const relevant = flags.filter((f) => shouldForward(f, severity));
    if (relevant.length === 0) return next();

    const iconMap = { love: '💗', hate: '😡', threat: '⚠️' };
    const label = relevant.map((f) => `${iconMap[f]} ${f.toUpperCase()}`).join(' · ');

    const ownerMsg =
      `${iconMap[relevant[0]]} FLAGGED — ${label} (severity ${severity}/5)\n\n` +
      `from: ${ctx.from.first_name} (@${ctx.from.username ?? 'no-username'})\n` +
      `id: ${ctx.from.id}\n` +
      `message: "${text}"`;

    try {
      await bot.api.sendMessage(config.ownerId, ownerMsg, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚫 Ban globally', callback_data: `eyes_ban_${ctx.from.id}` },
              { text: '✓ Ignore', callback_data: 'eyes_ignore' },
            ],
          ],
        },
      });
    } catch (_) {}

    return next();
  });

  // ── Eyes callback handlers
  bot.on('callback_query:data', async (ctx, next) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith('eyes_')) return next();

    // Owner-only
    if (!isOwner(ctx.from.id)) return ctx.answerCallbackQuery({ text: 'not you.' });

    if (data === 'eyes_ignore') {
      await ctx.answerCallbackQuery({ text: 'ignored.' });
      return ctx.editMessageReplyMarkup({ reply_markup: undefined });
    }

    if (data.startsWith('eyes_ban_')) {
      const userId = Number(data.split('_').pop());
      // Blacklist (stored in bot's memory — permanent block from using commands)
      try {
        await ctx.api.sendMessage(userId, `you've been banned. don't come back.`);
      } catch (_) {}
      await ctx.answerCallbackQuery({ text: `user ${userId} notified.` });
      return ctx.editMessageReplyMarkup({ reply_markup: undefined });
    }

    return next();
  });

  // ── /eyes toggle commands (owner)
  bot.command('eyes', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;

    const arg = (ctx.match || '').trim().toLowerCase();
    const usage =
      `eyes settings:\n\n` +
      `love: ${config.eyes.love}\n` +
      `hate: ${config.eyes.hate}\n` +
      `threat: ${config.eyes.threat}\n` +
      `severity min: ${config.eyes.severityMin}\n\n` +
      `usage: /eyes love on|off  |  /eyes severity <n>`;

    if (!arg) return ctx.reply(usage);

    const [key, val] = arg.split(/\s+/);

    if (key === 'severity') {
      const n = Number(val);
      if (!Number.isFinite(n) || n < 1 || n > 5) return ctx.reply('severity 1-5');
      config.eyes.severityMin = n;
      return ctx.reply(`severity min set to ${n}.`);
    }

    if (['love', 'hate', 'threat'].includes(key) && ['on', 'off'].includes(val)) {
      config.eyes[key] = val === 'on';
      return ctx.reply(`${key} forwarding: ${val}`);
    }

    return ctx.reply(usage);
  });
      }
