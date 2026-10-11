// ═══════════════════════════════════════════════════
// YORU — CONFIG LOADER
// Loads .env, validates required keys, exports clean config object.
// ═══════════════════════════════════════════════════

import 'dotenv/config';

function required(key) {
  const val = process.env[key];
  if (!val || val.trim() === '') {
    throw new Error(`[CONFIG] Missing required env var: ${key}`);
  }
  return val.trim();
}

function optional(key, fallback = '') {
  return (process.env[key] ?? fallback).toString().trim();
}

function num(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function bool(key, fallback = false) {
  const v = (process.env[key] ?? '').toString().toLowerCase();
  if (v === '') return fallback;
  return v === 'true' || v === '1' || v === 'yes';
}

export const config = {
  // ── Telegram
  botToken: required('BOT_TOKEN'),

  // ── Owner (hardcoded loyalty)
  ownerId: Number(required('OWNER_ID')),
  ownerName: optional('OWNER_NAME', 'Durez'),
  ownerUsername: optional('OWNER_USERNAME', '@DU7EZ'),

  // ── Home base
  homeGroupLink: optional('HOME_GROUP_LINK', 'https://t.me/diffrent_being_realm'),

  // ── Personality
  botName: optional('BOT_NAME', 'Yoru'),
  defaultMood: optional('DEFAULT_MOOD', 'chill'),
  triggerWords: optional('TRIGGER_WORDS', 'Yoru,yoru,YORU')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // ── Economy
  economy: {
    startingBalance: num('STARTING_BALANCE', 1000),
    dailyAmount: num('DAILY_AMOUNT', 200),
    bankInterestRate: num('BANK_INTEREST_RATE', 0.01),
    bankInterestCap: num('BANK_INTEREST_CAP', 10000),
    shieldCost: num('SHIELD_COST', 50),
    shieldDurationHours: num('SHIELD_DURATION_HOURS', 24),
    stealMinVictim: num('STEAL_MIN_VICTIM', 1000),
    stealMinAttacker: num('STEAL_MIN_ATTACKER', 200),
    stealPercent: num('STEAL_PERCENT', 0.30),
    stealSuccessRate: num('STEAL_SUCCESS_RATE', 0.40),
    stealFailPenalty: num('STEAL_FAIL_PENALTY', 0.15),
    stealFailMin: num('STEAL_FAIL_MIN', 200),
    stealAttemptsPerDay: num('STEAL_ATTEMPTS_PER_DAY', 3),
    casinoTax: num('CASINO_TAX', 0.05),
    warnLimit: num('WARN_LIMIT', 3),
  },

  // ── AI pool
  ai: {
    prexzyBaseUrl: optional('PREXZY_BASE_URL', 'https://prexzyapis.com'),
    groqApiKey: optional('GROQ_API_KEY'),
    geminiApiKey: optional('GEMINI_API_KEY'),
    openrouterApiKey: optional('OPENROUTER_API_KEY'),
    cerebrasApiKey: optional('CEREBRAS_API_KEY'),
  },

  // ── Media
  media: {
    giphyApiKey: optional('GIPHY_API_KEY'),
  },

  // ── Health / auto-erase
  health: {
    warnThreshold: num('HEALTH_WARN_THRESHOLD', 3),
    disableThreshold: num('HEALTH_DISABLE_THRESHOLD', 5),
    disableWindowMinutes: num('HEALTH_DISABLE_WINDOW_MINUTES', 30),
    reviveCooldownHours: num('HEALTH_REVIVE_COOLDOWN_HOURS', 1),
  },

  // ── Eyes-only (DM forwarding)
  eyes: {
    love: bool('EYES_LOVE', true),
    hate: bool('EYES_HATE', true),
    threat: bool('EYES_THREAT', true),
    severityMin: num('EYES_SEVERITY_MIN', 2),
  },
};

// Hardcoded owner-name filter — replaces titles with "Durez"
export const OWNER_TITLE_BLACKLIST = ['owner', 'master', 'boss', 'lord', 'sir'];
export const OWNER_TITLE_REPLACEMENT = config.ownerName;

export function isOwner(userId) {
  return Number(userId) === config.ownerId;
                         }
