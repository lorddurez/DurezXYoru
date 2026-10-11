// ═══════════════════════════════════════════════════
// YORU — MEDIA: REACTIONS + EMOJI
// Decides when to react with emoji, when to send a sticker.
// ═══════════════════════════════════════════════════

// Mood → emoji palette (she picks 0-2 per reply based on context)
const MOOD_EMOJI = {
  chill:   ['👍', '🙂', '😌', '✌️'],
  savage:  ['💀', '🤡', '😭', '🔥'],
  cold:    [],                    // no emojis — cold means cold
  hype:    ['🔥', '💀', '😭', '✨', '🚀'],
  soft:    ['❤️', '🥺', '💕', '✨'],
  kawaii:  ['✨', '💖', '🌸', '🥺'],
  dead:    [],                    // deliberately empty
  iris:    ['😒', '🙄', '💅', '😌'],
  attached:['🥺', '💕', '❤️'],
};

// Mood → default emotion (used for sticker selection)
const MOOD_EMOTION = {
  chill:   'happy',
  savage:  'facepalm',
  cold:    'deadpan',
  hype:    'celebration',
  soft:    'blush',
  kawaii:  'cute',
  dead:    'dead',
  iris:    'smug',
  attached:'love',
};

export function emojiForMood(mood, chance = 0.6) {
  const list = MOOD_EMOJI[mood] || [];
  if (list.length === 0) return '';
  if (Math.random() > chance) return '';
  return list[Math.floor(Math.random() * list.length)];
}

export function emotionForMood(mood) {
  return MOOD_EMOTION[mood] || 'happy';
}

// Decide reply format: text-only, text+emoji, sticker, or reaction
export function decideFormat(mood, opts = {}) {
  const isGroup = opts.isGroup !== false;
  const roll = Math.random();

  // Cold/dead never send stickers — fits character
  if (mood === 'cold' || mood === 'dead') {
    return roll < 0.7 ? 'text' : 'reaction';
  }

  // In groups: occasionally send sticker instead of text
  if (isGroup && roll < 0.12) return 'sticker';
  if (roll < 0.18) return 'reaction';
  if (roll < 0.25) return 'text_no_emoji';
  return 'text_emoji';
}

// Reaction emoji she taps onto a message
export function reactionForMood(mood) {
  const pool = {
    chill:   ['👍', '❤️'],
    savage:  ['💀', '🤡'],
    cold:    ['👀'],
    hype:    ['🔥', '🤯'],
    soft:    ['❤️', '🥰'],
    kawaii:  ['💖', '😍'],
    dead:    ['🤔'],
    iris:    ['🤨', '😏'],
    attached:['❤️', '😍'],
  };
  const list = pool[mood] || ['👀'];
  return list[Math.floor(Math.random() * list.length)];
}
