// ═══════════════════════════════════════════════════
// YORU — PLUGIN: OWNER COMMANDS
// Health dashboard, command enable/disable, retest.
// ═══════════════════════════════════════════════════

import { config, isOwner } from '../config.js';
import { getAllHealth, enableCommand, getHealth } from '../core/health.js';
import { aiQuery } from '../ai/pool.js';

export async function register(bot) {
  // ── Owner guard: silently ignore non-owners on all owner commands
  const ownerOnly = (ctx) => isOwner(ctx.from.id);

  // ── /commandhealth
  bot.command('commandhealth', async (ctx) => {
    if (!ownerOnly(ctx)) return;
    const rows = getAllHealth();
    if (rows.length === 0) {
      return ctx.reply('no commands have been tracked yet.');
    }

    const lines = rows.map((r) => {
      const status = r.disabled ? '💀 DEAD' : '✅';
      return `${status} ${r.command} — fails:${r.fails} ok:${r.successes}`;
    });

    return ctx.reply(`health:\n\n${lines.join('\n')}`);
  });

  // ── /disable <command>
  bot.command('disable', async (ctx) => {
    if (!ownerOnly(ctx)) return;
    const cmd = ctx.match?.trim();
    if (!cmd) return ctx.reply('usage: /disable <command>');
    // force disable by writing enough fails
    for (let i = 0; i < 6; i++) {
      const { recordFail } = await import('../core/health.js');
      recordFail(cmd, 'manual disable by owner');
    }
    return ctx.reply(`${cmd} disabled.`);
  });

  // ── /enable <command>
  bot.command('enable', async (ctx) => {
    if (!ownerOnly(ctx)) return;
    const cmd = ctx.match?.trim();
    if (!cmd) return ctx.reply('usage: /enable <command>');
    enableCommand(cmd);
    return ctx.reply(`${cmd} re-enabled.`);
  });

  // ── /retest <command>
  bot.command('retest', async (ctx) => {
    if (!ownerOnly(ctx)) return;
    const arg = ctx.match?.trim();

    if (arg === 'all') {
      const rows = getAllHealth().filter((r) => r.disabled);
      if (rows.length === 0) return ctx.reply('nothing disabled.');
      const results = [];
      for (const row of rows) {
        const ok = await testCommand(row.command);
        if (ok) {
          enableCommand(row.command);
          results.push(`✅ ${row.command} revived`);
        } else {
          results.push(`❌ ${row.command} still dead`);
        }
      }
      return ctx.reply(results.join('\n'));
    }

    if (!arg) return ctx.reply('usage: /retest <command> or /retest all');

    const ok = await testCommand(arg);
    if (ok) {
      enableCommand(arg);
      return ctx.reply(`✅ ${arg} works — re-enabled.`);
    }
    return ctx.reply(`❌ ${arg} still dead.`);
  });

  // ── /erasedlog
  bot.command('erasedlog', async (ctx) => {
    if (!ownerOnly(ctx)) return;
    const rows = getAllHealth().filter((r) => r.disabled);
    if (rows.length === 0) return ctx.reply('no auto-erased commands.');
    const lines = rows.map(
      (r) => `💀 ${r.command} — ${r.reason || 'unknown'} @ ${new Date(r.disabled_at).toISOString()}`
    );
    return ctx.reply(lines.join('\n'));
  });
}

async function testCommand(command) {
  // Only AI-pool commands can be tested with a quick ping
  if (command.startsWith('prexzy_')) {
    try {
      await aiQuery('ping', { timeoutMs: 8000 });
      return true;
    } catch {
      return false;
    }
  }
  // Other commands: check health record
  const row = getHealth(command);
  return row ? row.fails < config.health.disableThreshold : false;
  }
