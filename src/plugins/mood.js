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

    if (!arg) {
      const current = getGroupMood(ctx.chat.id);
      const list = Object.keys(MOODS).join(', ');
      return ctx.reply(`current mood: ${current}\navailable: ${list}`);
    }

    if (!MOODS[arg]) {
      return ctx.reply(`no such mood: "${arg}"`);
    }

    setGroupMood(ctx.chat.id, arg);
    return ctx.reply(`mood set to ${arg}.`);
  });

  // ── /moods — list all
  bot.command('moods', async (ctx) => {
    const list = Object.entries(MOODS)
      .map(([name]) => `• ${name}`)
      .join('\n');
    return ctx.reply(`available moods:\n${list}`);
  });

  // ── /moodall <name> — owner only
  bot.command('moodall', async (ctx) => {
    if (!isOwner(ctx.from.id)) return;
    const arg = ctx.match?.trim().toLowerCase();
    if (!MOODS[arg]) return ctx.reply(`no such mood: "${arg}"`);
    for (const id of groupMoods.keys()) setGroupMood(id, arg);
    return ctx.reply(`mood forced to ${arg} in ${groupMoods.size} group(s).`);
  });
}

async function isGroupAdmin(ctx) {
  try {
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return ['administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}
