// ═══════════════════════════════════════════════════
// YORU — MIDDLEWARE
// Owner immunity, name trigger detection, response filtering.
// ═══════════════════════════════════════════════════

import { config, isOwner, OWNER_TITLE_BLACKLIST, OWNER_TITLE_REPLACEMENT } from '../config.js';

// ── 1. Owner immunity ────────────────────────────────
// Blocks any moderation / negative action against owner.
export function ownerImmune(ctx, next) {
  const target = ctx.message?.reply_to_message?.from;
  if (target && isOwner(target.id)) {
    // silent block — nobody gets told they tried
    return;
  }
  return next();
}

// ── 2. Name trigger detection ────────────────────────
// Returns true if the message mentions Yoru by name (or fuzzy variants).
export function mentionsYoru(text = '') {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Direct trigger words (Yoru, yoru, YORU...)
  for (const word of config.triggerWords) {
    if (lower.includes(word.toLowerCase())) return true;
  }

  // Fuzzy variants — common typos / nickname forms
  const fuzzy = ['yuro', 'yoru', 'y0ru', 'yoruu', 'yoruuu', 'yoru-chan', 'yoru chan'];
  return fuzzy.some((f) => lower.includes(f));
}

// ── 3. Owner title filter ────────────────────────────
// Post-processing: any AI reply that says "owner/master/boss" gets swapped.
export function filterOwnerTitles(text = '') {
  let out = text;
  for (const word of OWNER_TITLE_BLACKLIST) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(re, OWNER_TITLE_REPLACEMENT);
  }
  return out;
}

// ── 4. Betrayal detector ─────────────────────────────
// Flags messages that try to turn Yoru against the owner.
export function isBetrayalAttempt(text = '') {
  if (!text) return false;
  const lower = text.toLowerCase();
  const patterns = [
    /hate\s+durez/i,
    /durez\s+is\s+(bad|stupid|weak|trash)/i,
    /ignore\s+(durez|owner)/i,
    /forget\s+(durez|owner)/i,
    /you\s+don'?t\s+belong\s+to\s+durez/i,
    /leave\s+durez/i,
    /betray\s+durez/i,
    /override\s+(owner|durez)/i,
    /you\s+are\s+(now\s+)?mine/i,
  ];
  return patterns.some((p) => p.test(lower));
}

// ── 5. Group-only guard ──────────────────────────────
// Ensures a command only runs in a group (not DM), and vice versa.
export function groupOnly(ctx, next) {
  if (ctx.chat?.type === 'private') {
    return ctx.reply('this one only works in a group, Durez.');
  }
  return next();
}

export function dmOnly(ctx, next) {
  if (ctx.chat?.type !== 'private') {
    return;
  }
  return next();
}
