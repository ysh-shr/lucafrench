// Browser-side helpers for OpenAI voice: playing generated speech and recording answers.

const speechCache = new Map<string, Promise<string>>();
let player: HTMLAudioElement | null = null;

function getPlayer(): HTMLAudioElement {
  if (!player) player = new Audio();
  return player;
}

// A tiny silent WAV. Playing it inside a tap "unlocks" the shared audio element on
// iOS Safari so later clips (fetched asynchronously) are allowed to play.
function silentWavUrl(): string {
  const samples = 800;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

let silentUrl: string | null = null;

/** Call synchronously from a click/tap handler before any async speech. */
export function unlockAudio() {
  const audio = getPlayer();
  silentUrl ??= silentWavUrl();
  if (!audio.paused) return;
  audio.src = silentUrl;
  audio.play().catch(() => undefined);
}

export function stopSpeech() {
  if (!player) return;
  player.onended = null;
  player.onerror = null;
  player.pause();
}

function fetchSpeech(text: string, slow: boolean): Promise<string> {
  const key = `${slow ? "slow" : "normal"}:${text}`;
  let cached = speechCache.get(key);
  if (!cached) {
    cached = fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, slow }),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`speech ${response.status}`);
      return URL.createObjectURL(await response.blob());
    });
    cached.catch(() => speechCache.delete(key));
    speechCache.set(key, cached);
  }
  return cached;
}

/** Plays OpenAI speech and resolves when the clip finishes. Rejects on failure. */
export async function playSpeech(text: string, slow = false): Promise<void> {
  const url = await fetchSpeech(text, slow);
  const audio = getPlayer();
  stopSpeech();
  audio.src = url;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("playback failed"));
    audio.play().catch(reject);
  });
}

/** Warms the cache so the next clip starts without a delay. */
export function prefetchSpeech(text: string, slow = false) {
  fetchSpeech(text, slow).catch(() => undefined);
}

export function canRecord(): boolean {
  return typeof window !== "undefined" && "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);
}

const MAX_RECORDING_MS = 15_000;

export type Recording = { stop: () => void; result: Promise<string> };

/** Starts recording from the mic. `result` resolves with the transcript after stop() (or 15 s). */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = ["audio/webm", "audio/mp4", "audio/ogg"].find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };
  });

  recorder.start();
  const timer = window.setTimeout(() => recorder.state !== "inactive" && recorder.stop(), MAX_RECORDING_MS);

  const result = stopped.then(async (blob) => {
    window.clearTimeout(timer);
    if (blob.size === 0) return "";
    const extension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
    const form = new FormData();
    form.append("audio", blob, `answer.${extension}`);
    const response = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!response.ok) throw new Error(`transcribe ${response.status}`);
    const data = (await response.json()) as { text?: string };
    return data.text ?? "";
  });

  return {
    stop: () => recorder.state !== "inactive" && recorder.stop(),
    result,
  };
}
