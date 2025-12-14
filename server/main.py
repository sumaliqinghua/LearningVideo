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

# Model cache to avoid reloading the same model
model_cache: Dict[str, WhisperModel] = {}

def get_model(model_size: str = "base") -> WhisperModel:
    """Get or load a Whisper model. Models are cached to avoid reloading."""
    if model_size not in model_cache:
        print(f"\n{'='*60}")
        print(f"📥 Downloading/Loading Whisper model: {model_size}")
        print(f"{'='*60}")
        print(f"This may take a few minutes on first download...")
        print(f"Model will be cached at: ~/.cache/huggingface/hub/\n")
        
        model_cache[model_size] = WhisperModel(model_size, device="cpu", compute_type="int8")
        
        print(f"\n{'='*60}")
        print(f"✅ Model {model_size} loaded successfully!")
        print(f"{'='*60}\n")
    else:
        print(f"✨ Using cached model: {model_size}")
    return model_cache[model_size]


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
    model: str = Form("base"),
    beam_size: int = Form(5),
    word_timestamps: bool = Form(True),
    vad_filter: bool = Form(True),
):
    """Accept an uploaded audio/video file and return transcript JSON + SRT/VTT text."""
    raw = await file.read()
    audio_buf = io.BytesIO(raw)

    # Get the appropriate model (will load if not cached)
    whisper_model = get_model(model)
    
    print(f"\n🎬 Starting transcription...")
    print(f"   Model: {model}")
    print(f"   Beam size: {beam_size}")
    print(f"   VAD filter: {vad_filter}")
    print(f"   Word timestamps: {word_timestamps}\n")

    seg_iter, info = whisper_model.transcribe(
        audio_buf,
        beam_size=beam_size,
        word_timestamps=word_timestamps,
        vad_filter=vad_filter,
    )

    segments: List[Dict[str, Any]] = []
    full_text_parts: List[str] = []
    segment_count = 0

    for s in seg_iter:
        segment_count += 1
        print(f"📝 Processing segment {segment_count}: {s.start:.2f}s - {s.end:.2f}s")
        
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
    
    print(f"\n✅ Transcription completed!")
    print(f"   Language: {info.language} ({info.language_probability:.2%} confidence)")
    print(f"   Total segments: {segment_count}")
    print(f"   Total text length: {len(''.join(full_text_parts))} characters\n")

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


@app.get("/models/cached")
async def get_cached_models():
    """Return list of currently cached models in memory."""
    return JSONResponse({"cached_models": list(model_cache.keys())})


@app.post("/srt")
async def srt_from_segments(payload: Dict[str, Any]):
    return PlainTextResponse(_build_srt(payload["segments"]), media_type="text/plain")


@app.post("/vtt")
async def vtt_from_segments(payload: Dict[str, Any]):
    return PlainTextResponse(_build_vtt(payload["segments"]), media_type="text/vtt")
