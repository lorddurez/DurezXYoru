// ═══════════════════════════════════════════════════
// YORU — PLUGIN: CASINO
// /dice /coinflip /slots /roulette — bet dollars, win or lose.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getWallet, addWallet, takeWallet, fmt } from '../economy/wallet.js';

const TAX = config.economy.casinoTax;

function parseBet(ctx) {
  const arg = (ctx.match || '').trim();
  const n = Number(arg.replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

async function resolveBet(ctx, bet) {
  if (!bet) {
    await ctx.reply('you need to bet something. usage: /dice 100');
    return null;
  }
  const row = getWallet(ctx.from.id);
  if (row.wallet < bet) {
    await ctx.reply(`you only have ${fmt(row.wallet)} in your wallet.`);
    return null;
  }
  return bet;
}

function winPayout(bet) {
  const tax = Math.floor(bet * TAX);
  return bet * 2 - tax;
}

function fmtPayout(bet) {
  const gross = bet * 2;
  const tax = Math.floor(bet * TAX);
  const net = gross - tax;
  return `${fmt(net)} (tax ${fmt(tax)})`;
}

export async function register(bot) {
  // ── /dice <bet>
  bot.command('dice', async (ctx) => {
    const bet = await resolveBet(ctx, parseBet(ctx));
    if (!bet) return;

    const yours = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const yorus = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const yourTotal = yours[0] + yours[1];
    const yoruTotal = yorus[0] + yorus[1];

    if (yourTotal > yoruTotal) {
      const payout = winPayout(bet);
      addWallet(ctx.from.id, payout - bet);
      return ctx.reply(
        `you rolled ${yourTotal} 🎲 | i rolled ${yoruTotal} 🎲\n` +
          `you win +${fmtPayout(bet)}`
      );
    } else if (yourTotal < yoruTotal) {
      takeWallet(ctx.from.id, bet);
      return ctx.reply(
        `you rolled ${yourTotal} 🎲 | i rolled ${yoruTotal} 🎲\n` +
          `you lose -${fmt(bet)}`
      );
    }
    return ctx.reply(`tie. ${yourTotal} vs ${yoruTotal}. nothing lost.`);
  });

  // ── /coinflip <h|t> <bet>
  bot.command('coinflip', async (ctx) => {
    const parts = (ctx.match || '').trim().split(/\s+/);
    const pick = (parts[0] || '').toLowerCase();
    const bet = Number((parts[1] || '').replace(/[$,]/g, ''));

    if (!['h', 't', 'heads', 'tails'].includes(pick) || !bet || bet <= 0) {
      return ctx.reply('usage: /coinflip h|t <bet>  e.g. /coinflip h 100');
    }
    if (!(await resolveBet(ctx, bet))) return;

    const flip = Math.random() < 0.5 ? 'h' : 't';
    const won = (pick.startsWith('h') && flip === 'h') || (pick.startsWith('t') && flip === 't');

    if (won) {
      const payout = winPayout(bet);
      addWallet(ctx.from.id, payout - bet);
      return ctx.reply(`🪙 ${flip === 'h' ? 'heads' : 'tails'}\nyou win +${fmtPayout(bet)}`);
    }
    takeWallet(ctx.from.id, bet);
    return ctx.reply(`🪙 ${flip === 'h' ? 'heads' : 'tails'}\nyou lose -${fmt(bet)}`);
  });

  // ── /slots <bet>
  bot.command('slots', async (ctx) => {
    const bet = await resolveBet(ctx, parseBet(ctx));
    if (!bet) return;

    const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
    const roll = () => symbols[Math.floor(Math.random() * symbols.length)];
    const r = [roll(), roll(), roll()];

    // Paytable
    let multiplier = 0;
    if (r[0] === r[1] && r[1] === r[2]) {
      if (r[0] === '7️⃣') multiplier = 20;
      else if (r[0] === '💎') multiplier = 10;
      else if (r[0] === '🔔') multiplier = 6;
      else multiplier = 4;
    } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
      multiplier = 1.5;
    }

    const line = r.join(' | ');

    if (multiplier === 0) {
      takeWallet(ctx.from.id, bet);
      return ctx.reply(`${line}\nnothing. -${fmt(bet)}`);
    }

    if (multiplier === 1.5) {
      const win = Math.floor(bet * 1.5) - bet;
      addWallet(ctx.from.id, win);
      return ctx.reply(`${line}\npair! +${fmt(win)}`);
    }

    const gross = Math.floor(bet * multiplier);
    const tax = Math.floor(gross * TAX);
    const payout = gross - tax;
    addWallet(ctx.from.id, payout - bet);
    return ctx.reply(`${line}\nJACKPOT x${multiplier}! +${fmt(payout)} (tax ${fmt(tax)})`);
  });

  // ── /roulette <red|black|green> <bet>
  bot.command('roulette', async (ctx) => {
    const parts = (ctx.match || '').trim().split(/\s+/);
    const pick = (parts[0] || '').toLowerCase();
    const bet = Number((parts[1] || '').replace(/[$,]/g, ''));

    if (!['red', 'black', 'green'].includes(pick) || !bet || bet <= 0) {
      return ctx.reply('usage: /roulette red|black|green <bet>');
    }
    if (!(await resolveBet(ctx, bet))) return;

    // Standard European: 18 red, 18 black, 1 green
    const roll = Math.floor(Math.random() * 37); // 0-36
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    let landed;
    if (roll === 0) landed = 'green';
    else landed = reds.includes(roll) ? 'red' : 'black';

    const won = landed === pick;
    if (!won) {
      takeWallet(ctx.from.id, bet);
      return ctx.reply(`🎡 landed on ${landed} (${roll})\nyou lose -${fmt(bet)}`);
    }

    let multiplier = pick === 'green' ? 14 : 2;
    const gross = bet * multiplier;
    const tax = Math.floor(gross * TAX);
    const payout = gross - tax;
    addWallet(ctx.from.id, payout - bet);
    return ctx.reply(`🎡 landed on ${landed} (${roll})\nyou win +${fmt(payout)} (tax ${fmt(tax)})`);
  });
      }
