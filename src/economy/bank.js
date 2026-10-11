// ═══════════════════════════════════════════════════
// YORU — ECONOMY: BANK
// Deposit, withdraw, interest, shield logic.
// ═══════════════════════════════════════════════════

import { config } from '../config.js';
import {
  getWallet, addWallet, takeWallet,
  addBank, takeBank, setShield, hasShield,
  setInterestPaid, fmt,
} from './wallet.js';

// ── Deposit: wallet → bank
export function deposit(userId, amount) {
  const row = getWallet(userId);
  if (amount <= 0) return { ok: false, msg: 'amount must be positive.' };
  if (row.wallet < amount) return { ok: false, msg: "you don't have that much in your wallet." };

  takeWallet(userId, amount);
  addBank(userId, amount);
  return { ok: true, msg: `deposited ${fmt(amount)}.` };
}

// ── Withdraw: bank → wallet
export function withdraw(userId, amount) {
  const row = getWallet(userId);
  if (amount <= 0) return { ok: false, msg: 'amount must be positive.' };
  if (row.bank < amount) return { ok: false, msg: "you don't have that much in your bank." };

  takeBank(userId, amount);
  addWallet(userId, amount);
  return { ok: true, msg: `withdrew ${fmt(amount)}.` };
}

// ── Buy shield
export function buyShield(userId, hours = config.economy.shieldDurationHours) {
  const cost = config.economy.shieldCost;
  const row = getWallet(userId);

  if (row.wallet < cost) {
    return { ok: false, msg: `you need ${fmt(cost)} in your wallet to buy a shield.` };
  }

  takeWallet(userId, cost);
  const current = row.shield_until || 0;
  const base = current > Date.now() ? current : Date.now();
  const until = base + hours * 60 * 60 * 1000;
  setShield(userId, until);

  const remainingHours = Math.round((until - Date.now()) / (60 * 60 * 1000));
  return {
    ok: true,
    msg: `shield active. ${remainingHours}h total from now.`,
    until,
  };
}

// ── Interest accrual (called per user, opportunistically)
export function accrueInterest(userId) {
  const row = getWallet(userId);
  const last = row.interest_last_paid || 0;
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (now - last < oneDay) return { ok: false, earned: 0 };

  const daysElapsed = Math.floor((now - last) / oneDay);
  const cappedBank = Math.min(row.bank, config.economy.bankInterestCap);
  const rate = config.economy.bankInterestRate;
  const earned = cappedBank * rate * daysElapsed;

  if (earned > 0) addBank(userId, earned);
  setInterestPaid(userId, now);

  return { ok: true, earned, days: daysElapsed };
}

// ── Snapshot for /bank command
export function bankSnapshot(userId) {
  const row = getWallet(userId);
  const shieldLeft = Math.max(0, (row.shield_until || 0) - Date.now());
  const shieldHours = Math.floor(shieldLeft / (60 * 60 * 1000));
  const shieldMins = Math.floor((shieldLeft % (60 * 60 * 1000)) / (60 * 1000));

  return {
    wallet: row.wallet,
    bank: row.bank,
    total: row.wallet + row.bank,
    shieldActive: shieldLeft > 0,
    shieldHours,
    shieldMins,
    streak: row.daily_streak || 0,
  };
}
