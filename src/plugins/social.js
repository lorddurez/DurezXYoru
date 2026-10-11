// ═══════════════════════════════════════════════════
// YORU — PLUGIN: SOCIAL / CASUAL GAMES
// /8ball /truth /dare /wyr /rps /ship
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { addWallet, fmt } from '../economy/wallet.js';

const EIGHT_BALL = [
  'yes.', 'no.', 'maybe.', 'ask again later.', 'not in the mood.',
  'obviously.', 'nah lol.', 'depends on who\'s asking.',
  'the vibes say yes.', 'the vibes say no.', 'stop asking.',
];

const TRUTHS = [
  'what\'s the most embarrassing thing you\'ve done online?',
  'who in this group would you trust with your phone unlocked?',
  'worst message you\'ve ever sent someone?',
  'tell us a secret you\'ve never told anyone here.',
  'what\'s your most recent search history entry?',
  'who was your first crush?',
  'what\'s your biggest regret this year?',
];

const DARES = [
  'send the last photo in your gallery.',
  'type your honest opinion about the person above you.',
  'send a voice note singing the first song in your head.',
  'react to the last 5 messages with random emojis.',
  'send a screenshot of your home screen.',
  'tell us a lie about yourself and see if anyone catches it.',
];

export async function register(bot) {
  // ── /8ball
  bot.command('8ball', async (ctx) => {
    const q = (ctx.match || '').trim();
    if (!q) return ctx.reply('ask me a question. usage: /8ball will i win today?');
    const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
    return ctx.reply(`🎱 ${answer}`);
  });

  // ── /truth
  bot.command('truth', async (ctx) => {
    const t = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
    return ctx.reply(`🔍 truth: ${t}`);
  });

  // ── /dare
  bot.command('dare', async (ctx) => {
    const d = DARES[Math.floor(Math.random() * DARES.length)];
    return ctx.reply(`😈 dare: ${d}`);
  });

  // ── /wyr
  bot.command('wyr', async (ctx) => {
    // Static pairs (AI-generated version comes later)
    const pairs = [
      ['be able to fly', 'be able to be invisible'],
      ['never eat your favorite food again', 'never listen to your favorite song again'],
      ['be the smartest person alive', 'be the richest person alive'],
      ['know when you die', 'know how you die'],
      ['live in the past', 'live in the future'],
      ['always tell the truth', 'always be able to lie'],
    ];
    const p = pairs[Math.floor(Math.random() * pairs.length)];
    return ctx.reply(`🤔 would you rather...\n\nA) ${p[0]}\nB) ${p[1]}`);
  });

  // ── /rps @user — quick PvP
  bot.command('rps', async (ctx) => {
    const target = ctx.message?.reply_to_message?.from;
    if (!target || target.id === ctx.from.id) {
      return ctx.reply('reply to the person you want to challenge.');
    }

    const moves = ['rock', 'paper', 'scissors'];
    const you = moves[Math.floor(Math.random() * moves.length)];
    const them = moves[Math.floor(Math.random() * moves.length)];

    const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    let result;
    if (you === them) result = "it's a tie.";
    else if (beats[you] === them) {
      result = `${ctx.from.first_name} wins.`;
      addWallet(ctx.from.id, 25);
    } else {
      result = `${target.first_name} wins.`;
      addWallet(target.id, 25);
    }

    return ctx.reply(
      `✊✋✌️\n${ctx.from.first_name}: ${you}\n${target.first_name}: ${them}\n\n${result} (+$25 to winner)`
    );
  });

  // ── /ship @user1 @user2 (or /ship with reply)
  bot.command('ship', async (ctx) => {
    const mentioned = ctx.message?.entities
      ?.filter((e) => e.type === 'text_mention')
      .map((e) => e.user) || [];

    let a, b;
    if (mentioned.length >= 2) {
      a = mentioned[0];
      b = mentioned[1];
    } else if (ctx.message?.reply_to_message && mentioned.length >= 1) {
      a = mentioned[0];
      b = ctx.message.reply_to_message.from;
    } else {
      return ctx.reply('usage: /ship @user1 @user2  (or reply to someone with /ship @user)');
    }

    const score = 1 + Math.floor(Math.random() * 99);
    let verdict;
    if (score >= 90) verdict = 'soulmates. locked in.';
    else if (score >= 70) verdict = 'this could actually work.';
    else if (score >= 50) verdict = 'there\'s something there.';
    else if (score >= 30) verdict = 'mid. not sure.';
    else verdict = 'nah.';

    return ctx.reply(
      `💘 ${a.first_name} × ${b.first_name}\ncompatibility: ${score}%\nverdict: ${verdict}`
    );
  });
}
