# Parle avec moi — Web

A lightweight French conversation practice app built with Next.js. Questions, answer evaluation, speech synthesis, and supported-browser speech recognition all run client-side.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Browsers treat localhost as a secure context, so microphone access is available during development.

## Voice: OpenAI or the browser

With an OpenAI API key, questions are read aloud by OpenAI's text-to-speech and spoken answers are transcribed by OpenAI. Without a key, the app uses the browser's built-in speech (Apple voices on Safari/iPhone, Google on Chrome). If an OpenAI request fails, it falls back to the browser voice automatically.

The key is only ever read on the server (`app/api/*`), never sent to the browser.

### Local

```bash
cp .env.example .env.local
```

Then put your key after `OPENAI_API_KEY=` in `.env.local` and restart `npm run dev`. `.env.local` is git-ignored.

### Vercel

Project → Settings → Environment Variables → add `OPENAI_API_KEY` (Production and Preview), then redeploy. Optional overrides: `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_TRANSCRIBE_MODEL` (defaults are in `.env.example`).

## Deploy to Vercel

Import this repository in Vercel. If the app lives in a subfolder of a larger repository, set **Root Directory** to that folder. The only environment variable is the optional OpenAI key above.

The typed answer field is always available as a fallback.
