// ═══════════════════════════════════════════════════
// YORU — AI POOL
// Tries providers in order. Falls to next on failure.
// Tracks health per provider. Auto-skips dead ones.
// ═══════════════════════════════════════════════════

import fetch from 'node-fetch';
import { config } from '../config.js';
import { recordSuccess, recordFail, isDisabled } from '../core/health.js';

// ── Provider list (Prexzy AI endpoints + fallbacks)
// Order matters — first alive one wins.
const PROVIDERS = [
  {
    name: 'prexzy_ai4chat',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/ai4chat?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_chatbot',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/chatbot?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_aiw3',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/aiw3?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_chat',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/chat?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_qwen',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/qwen?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_flipped',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/flipped?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_mistral',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/mistral?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_olabiba',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/olabiba?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_motif',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/motif?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_aiapp',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/aiapp?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_aiserv',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/aiserv?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_askgpt5',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/askgpt5?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_chatart',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/chatart?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_gemini',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/gemini?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
  {
    name: 'prexzy_aiwriter',
    url: (q) => `${config.ai.prexzyBaseUrl}/ai/aiwriter?prompt=${encodeURIComponent(q)}`,
    parse: (r) => r.result || r.message || r.response,
  },
];

// ── Core call — tries providers in order
export async function aiQuery(prompt, options = {}) {
  const timeoutMs = options.timeoutMs || 12000;
  let lastError = null;

  for (const p of PROVIDERS) {
    if (isDisabled(p.name)) continue;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(p.url(prompt), {
        method: 'GET',
        signal: controller.signal,
        headers: { 'accept': 'application/json' },
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const text = p.parse(data);
      if (!text || typeof text !== 'string') throw new Error('empty response');

      recordSuccess(p.name);
      return { provider: p.name, text: text.trim() };
    } catch (err) {
      lastError = err;
      const result = recordFail(p.name, err.message);
      if (result?.autoDisabled) {
        console.warn(`[AI POOL] auto-disabled: ${p.name} — ${err.message}`);
      }
      continue;
    }
  }

  throw new Error(`[AI POOL] all providers failed. last: ${lastError?.message}`);
    }
