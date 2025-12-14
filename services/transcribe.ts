export type Word = { start: number; end: number; word: string };
export type Segment = { id: number; start: number; end: number; text: string; words?: Word[] };
export type TranscribeResult = {
  language: string;
  language_probability: number;
  full_text: string;
  segments: Segment[];
  srt: string;
  vtt: string;
};

const API_BASE =
  (import.meta as any).env?.VITE_TRANSCRIBE_API_BASE ?? "http://127.0.0.1:8001";

export async function getCachedModels(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/models/cached`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.cached_models || [];
  } catch (error) {
    console.error('Failed to fetch cached models:', error);
    return [];
  }
}

export async function transcribeFile(file: File, model?: string): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("beam_size", "5");
  form.append("word_timestamps", "true");
  form.append("vad_filter", "true");
  if (model) {
    console.log('[transcribe] Using model:', model);
    form.append("model", model);
  } else {
    console.log('[transcribe] No model specified, using default');
  }

  console.log('[transcribe] Sending request to:', `${API_BASE}/transcribe`);
  const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Transcribe failed: ${res.status} ${text}`);
  }
  return res.json();
}
