// ═══════════════════════════════════════════════════
// YORU — PLUGIN: OWNER GOD-MODE
// /autowin /shadow /economy /forceroll /chance /gamelock
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getWallet, setWallet, addWallet, takeWallet, setBank, fmt } from '../economy/wallet.js';

// In-memory toggles (persist later)
const autowinUsers = new Set();
const shadowUsers = new Set();
const lockedGroups = new Set();

export function isAutoWin(userId) {
  return isOwner(userId) && autowinUsers.has(userId);
}

export function isShadow(userId) {
  return shadowUsers.has(userId);
}

export function isGameLocked(chatId) {
  return lockedGroups.has(chatId);
}

export async function register(bot) {
  // ── /autowin on|off (owner)
  bot.command('autowin', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const arg = (ctx.match || '').trim().toLowerCase();
    if (arg === 'on') {
      autowinUsers.add(ctx.from.id);
      return ctx.reply('autowin ON. every game resolves in your favor.');
    }
    if (arg === 'off') {
      autowinUsers.delete(ctx.from.id);
      return ctx.reply('autowin OFF.');
    }
    return ctx.reply('usage: /autowin on|off');
  });

  // ── /shadow on|off (owner — hide wallet from leaderboards)
  bot.command('shadow', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const arg = (ctx.match || '').trim().toLowerCase();
    if (arg === 'on') {
      shadowUsers.add(ctx.from.id);
      return ctx.reply('shadow ON. your wallet is hidden from leaderboards.');
    }
    if (arg === 'off') {
      shadowUsers.delete(ctx.from.id);
      return ctx.reply('shadow OFF.');
    }
    return ctx.reply('usage: /shadow on|off');
  });

  // ── /setbank, /wipebank
  bot.command('setbank', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const parts = (ctx.match || '').trim().split(/\s+/);
    const target = resolveTarget(ctx, parts);
    const amount = Number(parts[parts.length - 1]);
    if (!target || !Number.isFinite(amount)) return ctx.reply('usage: /setbank @user <amount>');
    setBank(target, amount);
    return ctx.reply(`set user#${target}'s bank to ${fmt(amount)}.`);
  });

  bot.command('wipebank', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = resolveTarget(ctx, (ctx.match || '').trim().split(/\s+/));
    if (!target) return ctx.reply('reply to a user or mention them.');
    setBank(target, 0);
    return ctx.reply(`wiped user#${target}'s bank.`);
  });

  // ── /economy lock|reset (per-group lock, global reset)
  bot.command('economy', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const arg = (ctx.match || '').trim().toLowerCase();

    if (arg === 'lock') {
      lockedGroups.add(ctx.chat.id);
      return ctx.reply('economy locked in this group.');
    }
    if (arg === 'unlock') {
      lockedGroups.delete(ctx.chat.id);
      return ctx.reply('economy unlocked.');
    }
    if (arg === 'reset') {
      return ctx.reply(
        '⚠️ this wipes ALL wallets + banks globally.\n' +
          'reply "CONFIRM RESET" to proceed.'
      );
    }
    if (arg.startsWith('confirm reset')) {
      // Placeholder — actual reset in a later pass
      return ctx.reply('global reset not yet enabled. disabled for safety.');
    }

    return ctx.reply('usage: /economy lock | /economy unlock | /economy reset');
  });

  // ── /gamelock on|off (owner — locks all games in this group)
  bot.command('gamelock', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const arg = (ctx.match || '').trim().toLowerCase();
    if (arg === 'on') {
      lockedGroups.add(ctx.chat.id);
      return ctx.reply('games locked in this group.');
    }
    if (arg === 'off') {
      lockedGroups.delete(ctx.chat.id);
      return ctx.reply('games unlocked.');
    }
    return ctx.reply('usage: /gamelock on|off');
  });

  // ── /forceroll @user win|lose  (force next game result)
  // Simpler version: /forcewin @user / /forcelose @user
  bot.command('forcewin', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = resolveTarget(ctx, (ctx.match || '').trim().split(/\s+/));
    if (!target) return ctx.reply('reply to a user.');
    autowinUsers.add(target); // reuse — user wins next game
    setTimeout(() => autowinUsers.delete(target), 60 * 1000);
    return ctx.reply(`user#${target} will win their next game.`);
  });

  bot.command('forcelose', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    // Placeholder — force-lose hooks into casino later
    return ctx.reply('force-lose not yet enabled.');
  });
}

function resolveTarget(ctx, parts) {
  if (ctx.message?.reply_to_message?.from?.id) return ctx.message.reply_to_message.from.id;
  const numeric = parts.find((p) => /^\d+$/.test(p));
  return numeric ? Number(numeric) : null;
  }
