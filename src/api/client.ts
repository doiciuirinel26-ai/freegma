const BACKEND = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const API_KEY  = import.meta.env.VITE_API_KEY  || "freegma-dev-key-2026";

const qs = () => `?key=${encodeURIComponent(API_KEY)}`;

export async function apiHealth() {
  try {
    const r = await fetch(`${BACKEND}/api/health`);
    return r.ok ? r.json() : null;
  } catch { return null; }
}

export async function apiUpload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BACKEND}/api/upload${qs()}`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.file_id;
}

export async function apiGenerate(body: object): Promise<string> {
  const r = await fetch(`${BACKEND}/api/generate${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    const msg = Array.isArray(err.detail) ? err.detail[0]?.msg : err.detail;
    throw new Error(msg ?? "Eroare server");
  }
  const data = await r.json();
  return data.job_id;
}

export async function apiStatus(jobId: string) {
  const r = await fetch(`${BACKEND}/api/status/${jobId}${qs()}`);
  if (!r.ok) throw new Error("Status error");
  return r.json() as Promise<{ status: string; progress: number; error?: string }>;
}

export function resultUrl(jobId: string) {
  return `${BACKEND}/api/result/${jobId}${qs()}`;
}

export async function apiStudioRender(
  clip_ids: string[],
  transitions: { type: string; duration: number }[],
  clip_durations: number[],
  audio_id?: string,
  audio_offset?: number,
): Promise<string> {
  const r = await fetch(`${BACKEND}/api/studio/render${qs()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clip_ids, transitions, clip_durations, audio_id, audio_offset: audio_offset ?? 0 }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.job_id;
}
