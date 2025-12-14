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

export async function transcribeFile(file: File): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("beam_size", "5");
  form.append("word_timestamps", "true");
  form.append("vad_filter", "true");

  const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Transcribe failed: ${res.status} ${text}`);
  }
  return res.json();
}