from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from typing import List, Dict, Any
import io
import math

app = FastAPI(title="LearningVideo Transcription Service")

# Dev CORS (allow Vite dev server and local files)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for local dev; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once per process. You can switch to small/medium to speed up first run.
MODEL_SIZE = "small"  # alternatives: "base", "medium", "large-v3"
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


def _ts_srt(t: float | None) -> str:
    if t is None:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - math.floor(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _ts_vtt(t: float | None) -> str:
    if t is None:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - math.floor(t)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def _build_srt(segments: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for i, seg in enumerate(segments, start=1):
        lines.append(str(i))
        lines.append(f"{_ts_srt(seg['start'])} --> { _ts_srt(seg['end'])}")
        lines.append(seg["text"].strip())
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def _build_vtt(segments: List[Dict[str, Any]]) -> str:
    lines: List[str] = ["WEBVTT", ""]
    for seg in segments:
        lines.append(f"{_ts_vtt(seg['start'])} --> { _ts_vtt(seg['end'])}")
        lines.append(seg["text"].strip())
        lines.append("")
    return "\n".join(lines).strip() + "\n"


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    beam_size: int = Form(5),
    word_timestamps: bool = Form(True),
    vad_filter: bool = Form(True),
):
    """Accept an uploaded audio/video file and return transcript JSON + SRT/VTT text."""
    raw = await file.read()
    audio_buf = io.BytesIO(raw)

    seg_iter, info = model.transcribe(
        audio_buf,
        beam_size=beam_size,
        word_timestamps=word_timestamps,
        vad_filter=vad_filter,
    )

    segments: List[Dict[str, Any]] = []
    full_text_parts: List[str] = []

    for s in seg_iter:
        seg: Dict[str, Any] = {
            "id": s.id,
            "start": s.start,
            "end": s.end,
            "text": s.text,
        }
        if word_timestamps and getattr(s, "words", None):
            seg["words"] = [
                {"start": w.start, "end": w.end, "word": w.word} for w in s.words
            ]
        segments.append(seg)
        full_text_parts.append(s.text)

    srt_text = _build_srt(segments)
    vtt_text = _build_vtt(segments)

    return JSONResponse(
        {
            "language": info.language,
            "language_probability": info.language_probability,
            "full_text": "".join(full_text_parts).strip(),
            "segments": segments,
            "srt": srt_text,
            "vtt": vtt_text,
        }
    )


@app.post("/srt")
async def srt_from_segments(payload: Dict[str, Any]):
    return PlainTextResponse(_build_srt(payload["segments"]), media_type="text/plain")


@app.post("/vtt")
async def vtt_from_segments(payload: Dict[str, Any]):
    return PlainTextResponse(_build_vtt(payload["segments"]), media_type="text/vtt")