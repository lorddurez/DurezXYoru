// ═══════════════════════════════════════════════════
// YORU — PLUGIN: ECONOMY COMMANDS
// /balance /bank /deposit /withdraw /daily /shield /leaderboard
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getWallet, fmt, getTopWallets } from '../economy/wallet.js';
import { deposit, withdraw, buyShield, bankSnapshot, accrueInterest } from '../economy/bank.js';
import { claimDaily } from '../economy/daily.js';

function parseAmount(str) {
  if (!str) return null;
  const s = str.trim().toLowerCase().replace(/[$,]/g, '');
  if (s === 'all') return 'all';
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export async function register(bot) {
  // ── /balance or /bal
  bot.command(['balance', 'bal'], async (ctx) => {
    accrueInterest(ctx.from.id);
    const row = getWallet(ctx.from.id);
    return ctx.reply(
      `💰 wallet: ${fmt(row.wallet)}\n` +
        `🏦 bank: ${fmt(row.bank)}\n` +
        `total: ${fmt(row.wallet + row.bank)}`
    );
  });

  // ── /bank
  bot.command('bank', async (ctx) => {
    accrueInterest(ctx.from.id);
    const s = bankSnapshot(ctx.from.id);
    const shield = s.shieldActive
      ? `🛡 ACTIVE (${s.shieldHours}h ${s.shieldMins}m left)`
      : `⚠️ EXPIRED`;
    return ctx.reply(
      `🏦 bank account\n\n` +
        `wallet: ${fmt(s.wallet)}\n` +
        `bank: ${fmt(s.bank)}\n` +
        `total: ${fmt(s.total)}\n\n` +
        `shield: ${shield}\n` +
        `streak: ${s.streak} day(s)`
    );
  });

  // ── /deposit <amount|all>
  bot.command('deposit', async (ctx) => {
    const amount = parseAmount(ctx.match);
    if (amount === null) return ctx.reply('usage: /deposit <amount> or /deposit all');

    const row = getWallet(ctx.from.id);
    const real = amount === 'all' ? row.wallet : amount;
    if (real <= 0) return ctx.reply("you don't have anything to deposit.");

    const res = deposit(ctx.from.id, real);
    return ctx.reply(res.msg);
  });

  // ── /withdraw <amount|all>
  bot.command('withdraw', async (ctx) => {
    const amount = parseAmount(ctx.match);
    if (amount === null) return ctx.reply('usage: /withdraw <amount> or /withdraw all');

    const row = getWallet(ctx.from.id);
    const real = amount === 'all' ? row.bank : amount;
    if (real <= 0) return ctx.reply("you don't have anything in the bank.");

    const res = withdraw(ctx.from.id, real);
    return ctx.reply(res.msg);
  });

  // ── /daily
  bot.command('daily', async (ctx) => {
    const res = claimDaily(ctx.from.id);
    return ctx.reply(res.msg);
  });

  // ── /shield
  bot.command('shield', async (ctx) => {
    const sub = (ctx.match || '').trim().toLowerCase();

    if (!sub || sub === 'info') {
      const s = bankSnapshot(ctx.from.id);
      const msg = s.shieldActive
        ? `🛡 shield ACTIVE (${s.shieldHours}h ${s.shieldMins}m left)`
        : `⚠️ no shield. buy one with /shield buy`;
      return ctx.reply(msg);
    }

    if (sub === 'buy' || sub === 'renew') {
      const res = buyShield(ctx.from.id);
      return ctx.reply(res.msg);
    }

    return ctx.reply('usage: /shield | /shield buy | /shield info');
  });

  // ── /leaderboard or /lb
  bot.command(['leaderboard', 'lb'], async (ctx) => {
    const top = getTopWallets(10);
    if (top.length === 0) return ctx.reply('no wallets yet.');

    const lines = top.map((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const isOwnerRow = r.user_id === config.ownerId;
      const name = isOwnerRow ? config.ownerName : `user#${r.user_id}`;
      return `${medal} ${name} — ${fmt(r.wallet + r.bank)}`;
    });

    return ctx.reply(`💵 top 10\n\n${lines.join('\n')}`);
  });

  // ── Owner god-mode economy commands
  bot.command('setmoney', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const parts = (ctx.match || '').trim().split(/\s+/);
    const target = resolveTarget(ctx, parts);
    const amount = Number(parts[parts.length - 1]);
    if (!target || !Number.isFinite(amount)) {
      return ctx.reply('usage: /setmoney @user <amount>  (reply to a user or @username)');
    }
    const { setWallet } = await import('../economy/wallet.js');
    setWallet(target, amount);
    return ctx.reply(`set user#${target}'s wallet to ${fmt(amount)}.`);
  });

  bot.command('addmoney', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const parts = (ctx.match || '').trim().split(/\s+/);
    const target = resolveTarget(ctx, parts);
    const amount = Number(parts[parts.length - 1]);
    if (!target || !Number.isFinite(amount)) {
      return ctx.reply('usage: /addmoney @user <amount>');
    }
    const { addWallet } = await import('../economy/wallet.js');
    addWallet(target, amount);
    return ctx.reply(`added ${fmt(amount)} to user#${target}.`);
  });

  bot.command('takemoney', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const parts = (ctx.match || '').trim().split(/\s+/);
    const target = resolveTarget(ctx, parts);
    const amount = Number(parts[parts.length - 1]);
    if (!target || !Number.isFinite(amount)) {
      return ctx.reply('usage: /takemoney @user <amount>');
    }
    const { takeWallet } = await import('../economy/wallet.js');
    const took = takeWallet(target, amount);
    return ctx.reply(`took ${fmt(took)} from user#${target}.`);
  });

  bot.command('wipewallet', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const target = resolveTarget(ctx, (ctx.match || '').trim().split(/\s+/));
    if (!target) return ctx.reply('reply to a user or mention @username.');
    const { setWallet } = await import('../economy/wallet.js');
    setWallet(target, 0);
    return ctx.reply(`wiped user#${target}'s wallet.`);
  });
}

// ── Target resolver: reply-to > @mention > first arg
function resolveTarget(ctx, parts) {
  if (ctx.message?.reply_to_message?.from?.id) {
    return ctx.message.reply_to_message.from.id;
  }
  const mention = parts.find((p) => p.startsWith('@'));
  if (mention && ctx.message?.entities) {
    const ent = ctx.message.entities.find((e) => e.type === 'text_mention');
    if (ent?.user?.id) return ent.user.id;
  }
  const numeric = parts.find((p) => /^\d+$/.test(p));
  return numeric ? Number(numeric) : null;
}
