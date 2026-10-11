// ═══════════════════════════════════════════════════
// YORU — PLUGIN LOADER
// Auto-discovers plugins in src/plugins/ and registers their commands.
// ═══════════════════════════════════════════════════

import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = join(__dirname, '..', 'plugins');

export async function loadPlugins(bot) {
  let files = [];
  try {
    files = await readdir(PLUGINS_DIR);
  } catch {
    console.log('[LOADER] no plugins folder yet — skipping.');
    return;
  }

  const jsFiles = files.filter((f) => f.endsWith('.js'));
  if (jsFiles.length === 0) {
    console.log('[LOADER] no plugins found.');
    return;
  }

  for (const file of jsFiles) {
    try {
      const url = pathToFileURL(join(PLUGINS_DIR, file)).href;
      const plugin = await import(url);

      if (typeof plugin.register === 'function') {
        await plugin.register(bot);
        console.log(`[LOADER] ✓ ${file}`);
      } else {
        console.warn(`[LOADER] ✗ ${file} — no register() export.`);
      }
    } catch (err) {
      console.error(`[LOADER] failed to load ${file}:`, err.message);
    }
  }

  console.log(`[LOADER] loaded ${jsFiles.length} plugin file(s).`);
}
