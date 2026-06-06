import { useState, useRef } from "react";
import { apiUpload, apiGenerate, apiStatus, resultUrl } from "../api/client";

export type JobStatus = "idle" | "uploading" | "queued" | "running" | "done" | "error";

export interface GenerationState {
  status: JobStatus;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  queuePosition: number | null;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: "idle", progress: 0, resultUrl: null, error: null, queuePosition: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function submit(params: {
    mode: string; prompt: string; negPrompt: string;
    model: string; steps: number; cfg: number;
    resolution: string; seed: number; file?: File | null;
  }) {
    stopPolling();
    setState({ status: "uploading", progress: 0, resultUrl: null, error: null, queuePosition: null });

    try {
      let file_id: string | undefined;
      if (params.file) {
        file_id = await apiUpload(params.file);
      }

      setState(s => ({ ...s, status: "queued", progress: 0.02 }));

      const jobId = await apiGenerate({
        mode: params.mode,
        prompt: params.prompt,
        neg_prompt: params.negPrompt,
        model: params.model,
        steps: params.steps,
        cfg: params.cfg,
        resolution: params.resolution,
        seed: params.seed,
        file_id,
      });

      // Polling la fiecare 2 secunde
      pollRef.current = setInterval(async () => {
        try {
          const data = await apiStatus(jobId);
          setState(s => ({
            ...s,
            status: data.status as JobStatus,
            progress: data.progress,
            error: data.error ?? null,
          }));

          if (data.status === "done") {
            stopPolling();
            setState(s => ({ ...s, resultUrl: resultUrl(jobId), progress: 1 }));
          }
          if (data.status === "error") {
            stopPolling();
          }
        } catch {
          // ignora erori temporare de retea
        }
      }, 2000);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Eroare necunoscuta";
      setState({ status: "error", progress: 0, resultUrl: null, error: msg, queuePosition: null });
    }
  }

  function reset() {
    stopPolling();
    setState({ status: "idle", progress: 0, resultUrl: null, error: null, queuePosition: null });
  }

  return { ...state, submit, reset };
}
