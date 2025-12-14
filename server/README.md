# Transcription Server

Fast transcription service using faster-whisper.

## Features

- **Dynamic Model Selection**: Choose from multiple Whisper model sizes
- **Model Caching**: Models are cached in memory to avoid reloading
- **Automatic Download**: Models are downloaded automatically on first use

## Installation

```bash
pip install fastapi uvicorn faster-whisper python-multipart
```

## Running the Server

```bash
cd server
uvicorn main:app --reload --port 8001
```

The server will be available at `http://127.0.0.1:8001`

## Available Models

- `tiny` - Fastest, least accurate (~75 MB)
- `base` - Good balance (default, ~150 MB)
- `small` - Better accuracy (~500 MB)
- `medium` - High accuracy (~1.5 GB)
- `large-v2` - Best accuracy (~3 GB)
- `large-v3` - Latest version (~3 GB)

## How It Works

1. **First Request**: When you select a model and transcribe for the first time, the model will be downloaded automatically. This may take a few minutes depending on your internet speed.

2. **Subsequent Requests**: The model is cached in memory, so subsequent transcriptions with the same model will be instant.

3. **Multiple Models**: You can switch between different models. Each model is downloaded and cached independently.

## Model Download Locations

Models are downloaded to:
- **Linux/Mac**: `~/.cache/huggingface/hub/`
- **Windows**: `%USERPROFILE%\.cache\huggingface\hub\`

## Console Output

When starting transcription, you'll see:
```
Loading Whisper model: large-v3...
Model large-v3 loaded successfully.
Transcribing with model: large-v3
```

## API Endpoint

**POST** `/transcribe`

**Parameters:**
- `file` (file): Audio or video file
- `model` (string, optional): Model size (default: "base")
- `beam_size` (int, optional): Beam size for decoding (default: 5)
- `word_timestamps` (bool, optional): Include word-level timestamps (default: true)
- `vad_filter` (bool, optional): Use voice activity detection (default: true)

**Response:**
```json
{
  "language": "en",
  "language_probability": 0.99,
  "full_text": "Full transcript text...",
  "segments": [...],
  "srt": "SRT format subtitle...",
  "vtt": "VTT format subtitle..."
}
```

## Troubleshooting

### Model Download Issues

If models fail to download, check:
1. Internet connection
2. Disk space (large models need 3+ GB)
3. Firewall/proxy settings

### Performance

- **CPU**: int8 quantization is used for better CPU performance
- **GPU**: To use GPU, change `device="cpu"` to `device="cuda"` in `main.py`
- **Memory**: Larger models require more RAM (large-v3 needs ~4GB RAM)

## Notes

- First transcription with a new model will be slower due to download
- Models persist between server restarts
- Switching models during runtime is supported
- Memory usage increases with multiple cached models
