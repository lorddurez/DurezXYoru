// ═══════════════════════════════════════════════════
// YORU — AI RESPONDER
// Takes a message, builds prompt, calls AI pool, filters output.
// ═══════════════════════════════════════════════════

import { aiQuery } from './pool.js';
import { buildSystemPrompt } from './moods.js';
import { filterOwnerTitles } from '../core/middleware.js';
import { config, isOwner } from '../config.js';

export async function respond(ctx, options = {}) {
  const userMessage = ctx.message?.text || options.text || '';
  const userId = ctx.from?.id;

  const systemPrompt = buildSystemPrompt(options.mood || config.defaultMood, {
    isOwner: isOwner(userId),
    groupName: ctx.chat?.title || null,
    recentMessages: options.recentMessages || [],
  });

  const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\nYoru:`;

  try {
    const { text, provider } = await aiQuery(fullPrompt);

    // Post-process: swap "owner/master/boss" → "Durez"
    const clean = filterOwnerTitles(text);

    // Safety: if reply somehow insults the owner, kill it
    if (isOwner(userId) === false && containsOwnerInsult(clean)) {
      return { text: `don't talk about ${config.ownerName} like that.`, provider };
    }

    return { text: clean, provider };
  } catch (err) {
    console.error('[RESPOND] all providers failed:', err.message);
    return { text: `...`, provider: null, error: true };
  }
}

function containsOwnerInsult(text) {
  const lower = text.toLowerCase();
  const name = config.ownerName.toLowerCase();
  const bad = ['stupid', 'weak', 'bad', 'trash', 'dumb', 'idiot'];
  return bad.some((w) => lower.includes(`${name} is ${w}`));
}
