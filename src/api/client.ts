const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
const API_KEY  = import.meta.env.VITE_API_KEY  ?? "freegma-dev-key-2026";

const headers = () => ({ "X-API-Key": API_KEY, "Content-Type": "application/json" });

export async function apiHealth() {
  const r = await fetch(`${BACKEND}/api/health`, { headers: headers() });
  return r.ok ? r.json() : null;
}

export async function apiUpload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BACKEND}/api/upload`, {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return data.file_id;
}

export async function apiGenerate(body: object): Promise<string> {
  const r = await fetch(`${BACKEND}/api/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail ?? "Eroare server");
  }
  const data = await r.json();
  return data.job_id;
}

export async function apiStatus(jobId: string) {
  const r = await fetch(`${BACKEND}/api/status/${jobId}`, { headers: headers() });
  if (!r.ok) throw new Error("Status error");
  return r.json() as Promise<{ status: string; progress: number; error?: string }>;
}

export function resultUrl(jobId: string) {
  return `${BACKEND}/api/result/${jobId}?key=${API_KEY}`;
}
