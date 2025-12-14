# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**SmartVideo Notes** is an AI-powered video tutorial assistant that allows users to capture timestamped notes from video files. The app extracts 2-minute audio segments, analyzes them using Google Gemini AI, and generates structured study notes with thumbnails.

**Key Technologies:**
- React 19 + TypeScript
- Vite (build tool)
- Google Gemini AI (@google/genai) for audio analysis
- Web Audio API for audio extraction and processing
- jsPDF for PDF export, JSZip for Markdown/image bundles

## Development Commands

### Setup
```bash
npm install
```

Before running the app, create a `.env.local` file in the root directory with:
```
GEMINI_API_KEY=your_api_key_here
```

### Development
```bash
npm run dev
```
Starts the development server on `http://localhost:3000`

### Build
```bash
npm run build
```
Compiles TypeScript and builds production assets to `dist/`

### Preview Production Build
```bash
npm run preview
```

## Architecture

### Core Data Flow

1. **Video Upload & Audio Decoding** (`App.tsx` + `utils/audioUtils.ts`)
   - User selects a video file
   - Audio track is decoded into an `AudioBuffer` using Web Audio API
   - Stored in `fullAudioBufferRef` for quick slicing

2. **Capture Workflow** (triggered by pressing 'M' key)
   - Current video timestamp captured
   - Thumbnail snapshot created from `<video>` element via canvas
   - Audio segment (2 minutes before timestamp) sliced from `fullAudioBufferRef`
   - Audio converted to WAV blob → base64
   - Sent to Gemini API with user-customizable prompt

3. **Note Generation** (`services/geminiService.ts`)
   - Gemini 2.5 Flash model processes audio + text prompt
   - Returns markdown-formatted analysis
   - Note state updated with generated content

4. **Export Options**
   - **Markdown ZIP**: Bundles `notes.md` with embedded thumbnail images
   - **PDF**: Generates multi-page PDF with Chinese font support (NotoSansSC)

### State Management

All state is managed via React `useState` in `App.tsx`:
- `videoState`: Current video file, playback state, audio readiness
- `notes`: Array of captured notes (timestamp, thumbnail, AI content, loading state)
- `currentPrompt`: Active prompt template for AI analysis
- `showPromptSettings`: Toggle between Guide/Settings tabs

### Key Files

**App.tsx** (Main component, ~550 lines)
- Orchestrates video player, note capture, AI analysis, and export
- Contains preset prompt templates for different learning modes
- Handles all user interactions and note CRUD operations

**types.ts**
- `Note`: id, timestamp, thumbnailUrl, content, isGenerating
- `VideoState`: file, objectUrl, duration, currentTime, isPlaying, isAudioReady, volume

**services/geminiService.ts**
- `analyzeAudio(base64Audio, userPrompt)`: Sends audio + prompt to Gemini API
- API key injected via Vite's env vars (`process.env.API_KEY`)

**utils/audioUtils.ts**
- `decodeAudioFromFile(file)`: Extracts AudioBuffer from video file
- `sliceAudioBuffer(buffer, endTime, duration)`: Creates segment from buffer
- `audioBufferToWav(buffer)`: Encodes AudioBuffer to 16-bit PCM WAV
- `blobToBase64(blob)`: Converts Blob to base64 string

**components/VideoPlayer.tsx**
- Custom video player with play/pause, seek, volume, fullscreen
- Keyboard shortcuts: `M` to capture, `Space` to play/pause
- Generates thumbnail via canvas when capturing

**components/NoteCard.tsx**
- Displays individual note with thumbnail, timestamp, AI content
- Supports in-place editing of generated content
- Click thumbnail to seek video to that timestamp

### Environment Variables

The app expects `GEMINI_API_KEY` in `.env.local`. Vite injects this as:
- `process.env.API_KEY`
- `process.env.GEMINI_API_KEY`

Both are defined in `vite.config.ts` for compatibility.

### Audio Processing Details

- **Slicing Strategy**: Always captures the last 2 minutes (120 seconds) of audio before the current timestamp
- **Format**: Audio is encoded as 16-bit PCM WAV before being sent to Gemini
- **Browser API**: Uses `AudioContext.decodeAudioData()` for extraction (supports most video codecs)

### AI Prompt System

Four preset prompt modes available:
1. **Standard Study Mode**: Transcript + Key Points + Summary
2. **Code Extraction**: Extracts code snippets and explains logic
3. **Q&A Generator**: Creates quiz questions with hidden answers
4. **Language Learning**: Transcription + Chinese translation + vocabulary

Users can also write fully custom prompts in the AI Settings tab.

## Development Notes

### Path Aliases
- `@/` maps to the project root (configured in `vite.config.ts` and `tsconfig.json`)
- Example: `import { analyzeAudio } from '@/services/geminiService'`

### No Testing Framework
This project does not currently have a test suite configured. When adding tests, consider:
- Vitest (natural fit with Vite)
- Testing Library for React components

### No Linter/Formatter
No ESLint or Prettier configuration exists. Code style should match existing conventions:
- 2-space indentation
- Single quotes for strings (except JSX attributes)
- Semicolons required

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx (React 17+ automatic runtime)
- Path aliases enabled via `paths` in tsconfig.json

## Common Tasks

### Adding New Preset Prompts
Edit the `PRESET_PROMPTS` array in `App.tsx` (lines 11-42). Each preset needs:
- `label`: Display name in UI
- `value`: The actual prompt text sent to Gemini

### Modifying Audio Capture Duration
Change the `duration` constant in `App.tsx:119` (currently 120 seconds = 2 minutes)

### Changing Gemini Model
Update `model: 'gemini-2.5-flash'` in `services/geminiService.ts:34`

### Customizing Export Formats
- **Markdown**: Modify template structure in `App.tsx:handleExportMarkdown()`
- **PDF**: Adjust layout/fonts in `App.tsx:handleExportPDF()`
  - Chinese font loading happens via CDN fetch (line 243)

### Handling API Errors
All Gemini API errors are caught and displayed as inline error messages in the note card. Check browser console for detailed error logs.
