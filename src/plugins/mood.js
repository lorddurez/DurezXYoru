// ═══════════════════════════════════════════════════
// YORU — PLUGIN: MOOD
// Change, view, and lock the bot's mood.
// ═══════════════════════════════════════════════════

import { MOODS } from '../ai/moods.js';
import { config, isOwner } from '../config.js';

// In-memory per-group mood (upgrade to DB in a later phase)
const groupMoods = new Map();

export function getGroupMood(chatId) {
  return groupMoods.get(chatId) || config.defaultMood;
}

export function setGroupMood(chatId, mood) {
  groupMoods.set(chatId, mood);
}

export async function register(bot) {
  // ── /mood <name>
  bot.command('mood', async (ctx) => {
    const isGroup = ctx.chat.type !== 'private';
    const isAdmin = isOwner(ctx.from.id) || (isGroup ? await isGroupAdmin(ctx) : false);

    if (!isAdmin) {
      return ctx.reply("you're not allowed to change my mood.");
    }

    const arg = ctx.match?.trim().toLowerCase();

    if (!
