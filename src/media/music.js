// ═══════════════════════════════════════════════════
// YORU — MEDIA: MUSIC
// Search, download, send audio via Prexzy endpoints.
// ═══════════════════════════════════════════════════

import fetch from 'node-fetch';
import { config } from '../config.js';
import { recordSuccess, recordFail } from '../core/health.js';

// ── Search a song by name → returns { title, url, artist, thumbnail }
export async function searchSong(query) {
  const url = `${config.ai.prexzyBaseUrl}/downloader/aio?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Prexzy AIo downloader response shapes vary — try common paths
    const result = data.result || data.data || data;
    const audioUrl = result.audio || result.mp3 || result.url || result.download_url;
    const title = result.title || query;
    const artist = result.artist || result.author || '';
    const thumbnail = result.thumbnail || result.cover || result.image || null;

    if (!audioUrl) throw new Error('no audio url in response');

    recordSuccess('music_download');
    return { ok: true, title, artist, url: audioUrl, thumbnail };
  } catch (err) {
    recordFail('music_download', err.message);
    return { ok: false, error: err.message };
  }
}

// ── YouTube MP3 direct via Prexzy
export async function downloadYouTubeMP3(youtubeUrl) {
  const url = `${config.ai.prexzyBaseUrl}/downloader/youtube-mp3?url=${encodeURIComponent(youtubeUrl)}`;

  try {
    const res = await fetch(url, { timeout: 30000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const result = data.result || data.data || data;
    const audioUrl = result.url || result.download || result.mp3;
    const title = result.title || 'audio';

    if (!audioUrl) throw new Error('no audio url');

    recordSuccess('music_ytdl');
    return { ok: true, title, url: audioUrl };
  } catch (err) {
    recordFail('music_ytdl', err.message);
    return { ok: false, error: err.message };
  }
}

// ── Search song info only (no download)
export async function songInfo(query) {
  const url = `${config.ai.prexzyBaseUrl}/search/soundcloud?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const results = data.result || data.data || [];
    const first = Array.isArray(results) ? results[0] : results;
    if (!first) throw new Error('no results');

    recordSuccess('music_info');
    return {
      ok: true,
      title: first.title || query,
      artist: first.artist || first.author || '',
      duration: first.duration || '',
      url: first.url || first.permalink || '',
    };
  } catch (err) {
    recordFail('music_info', err.message);
    return { ok: false, error: err.message };
  }
    }
