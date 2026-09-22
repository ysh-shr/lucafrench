# Parle avec moi — Web

A lightweight French conversation practice app built with Next.js. Questions, answer evaluation, speech synthesis, and supported-browser speech recognition all run client-side.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Browsers treat localhost as a secure context, so microphone access is available during development.

## Deploy to Vercel

Import this repository in Vercel and set **Root Directory** to `web`. No environment variables or external services are required.

Speech recognition availability varies by browser. The typed answer field is always available as a fallback.
