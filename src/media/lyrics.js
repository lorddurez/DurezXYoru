// ═══════════════════════════════════════════════════
// YORU — MEDIA: LYRICS
// Prexzy Lyrics endpoint. Clean text output.
// ═══════════════════════════════════════════════════

import fetch from 'node-fetch';
import { config } from '../config.js';
import { recordSuccess, recordFail } from '../core/health.js';

export async function fetchLyrics(song) {
  const url = `${config.ai.prexzyBaseUrl}/search/lyrics?q=${encodeURIComponent(song)}`;

  try {
    const res = await fetch(url, { timeout: 12000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const result = data.result || data.data || data;
    const lyrics = result.lyrics || result.text || (typeof result === 'string' ? result : null);

    if (!lyrics) throw new Error('no lyrics found');

    recordSuccess('lyrics');
    return { ok: true, lyrics: lyrics.trim(), title: result.title || song };
  } catch (err) {
    recordFail('lyrics', err.message);
    return { ok: false, error: err.message };
  }
}
