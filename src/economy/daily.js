// ═══════════════════════════════════════════════════
// YORU — ECONOMY: DAILY / STREAKS
// $200 per day. Streak bonuses at 3, 7, 14, 30 days.
// ═══════════════════════════════════════════════════

import { config } from '../config.js';
import { getWallet, addWallet, setStreak, addBank, setShield, fmt } from './wallet.js';

const ONE_DAY = 24 * 60 * 60 * 1000;

// ── Streak bonus table
const STREAK_BONUSES = {
  3: { bonus: 100, extra: 'free_shield' },
  7: { bonus: 300, extra: null },
  14: { bonus: 500, extra: 'free_bounty' },
  30: { bonus: 1500, extra: 'loyal_badge' },
};

export function claimDaily(userId) {
  const row = getWallet(userId);
  const now = Date.now();
  const last = row.daily_last_claim || 0;
  const elapsed = now - last;

  // Already claimed today?
  if (elapsed < ONE_DAY) {
    const left = ONE_DAY - elapsed;
    const h = Math.floor(left / (60 * 60 * 1000));
    const m = Math.floor((left % (60 * 60 * 1000)) / (60 * 1000));
    return { ok: false, msg: `already claimed. come back in ${h}h ${m}m.` };
  }

  // Streak logic
  const missedDay = elapsed > 2 * ONE_DAY;
  const newStreak = missedDay ? 1 : (row.daily_streak || 0) + 1;

  // Base amount
  addWallet(userId, config.economy.dailyAmount);

  // Streak bonus if hit milestone
  let bonusMsg = '';
  const milestone = STREAK_BONUSES[newStreak];
  if (milestone) {
    addWallet(userId, milestone.bonus);
    bonusMsg = `\n+${fmt(milestone.bonus)} streak bonus (${newStreak}-day)!`;

    if (milestone.extra === 'free_shield') {
      const until = Date.now() + config.economy.shieldDurationHours * 60 * 60 * 1000;
      setShield(userId, until);
      bonusMsg += `\n🛡 free 24h shield added.`;
    }
    if (milestone.extra === 'loyal_badge') {
      bonusMsg += `\n👑 "Loyal" badge unlocked.`;
    }
    if (milestone.extra === 'free_bounty') {
      addWallet(userId, 200);
      bonusMsg += `\n+$200 bounty credit.`;
    }
  }

  setStreak(userId, newStreak, now);

  const next = getNextMilestone(newStreak);
  const nextMsg = next ? `\nnext bonus in ${next - newStreak} day(s).` : '';

  return {
    ok: true,
    amount: config.economy.dailyAmount,
    streak: newStreak,
    msg:
      `+${fmt(config.economy.dailyAmount)} daily claimed.\n` +
      `streak: ${newStreak} day(s).` +
      bonusMsg +
      nextMsg,
  };
}

function getNextMilestone(streak) {
  const keys = Object.keys(STREAK_BONUSES).map(Number).sort((a, b) => a - b);
  return keys.find((k) => k > streak) || null;
      }
