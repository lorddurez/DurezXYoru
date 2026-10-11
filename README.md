# Yoru 🌙

> A human-feeling Telegram bot. Games, economy, AI chat, media, and more.
> Built by **Durez** for **♡ 𝚏𝙻𝙰𝙶𝙰𝙱𝙰𝚂𝚃𝙸𝙽𝙶 𝙲𝚁𝚄𝙸𝚂𝙴 ♡**

---

## What Yoru Is

Yoru is not a command-list bot. She talks, she reacts, she remembers. She plays games, runs a full economy, sends stickers and voice notes, and knows who her owner is.

**Core features:**
- 🧠 Unpredictable human personality (5-layer mood engine)
- 🎮 Casual games, casino, steal, heist, bounty
- 💵 Full economy — wallet + bank + shield + interest
- 🎵 Music playback + lyrics
- 📨 Eyes-only system — forwards love / hate / threat DMs to owner
- 🩹 Auto-erase — dead commands disable themselves
- 🎭 Media — stickers, GIFs, reactions, voice notes
- 🔒 Hardcoded owner loyalty

---

## Stack

- **Runtime:** Node.js 20+
- **Bot library:** grammY
- **Database:** SQLite (better-sqlite3)
- **Hosting:** Render (Background Worker)
- **AI pool:** Prexzy APIs + Groq + Gemini + OpenRouter + Cerebras

---

## Setup (Local)

```bash
git clone <your-repo-url>
cd yoru-bot
npm install
cp .env.example .env
# fill in .env with your BOT_TOKEN and other keys
npm start
