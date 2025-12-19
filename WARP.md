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

1. **Workspace Management** (`services/workspaceService.ts`)
   - User opens a workspace folder via File System Access API
   - Recursively scans all subfolders for video projects
   - Groups videos by folder structure in sidebar
   - Preserves subtitles when switching between videos

2. **Video Upload & Audio Decoding** (`App.tsx` + `utils/audioUtils.ts`)
   - User selects a video file or loads from workspace
   - Audio track is decoded into an `AudioBuffer` using Web Audio API
   - Stored in `fullAudioBufferRef` for quick slicing

3. **Capture Workflow** (triggered by pressing 'M' key)
   - Current video timestamp captured
   - Thumbnail snapshot created from `<video>` element via canvas
   - If subtitles available: extracts 1.5 min before + 30s after current time
   - Otherwise: slices audio (2 minutes before timestamp) from `fullAudioBufferRef`
   - Audio/text sent to Gemini API with user-customizable prompt

4. **Note Generation** (`services/geminiService.ts`)
   - Gemini 2.5 Flash model processes audio/text + prompt
   - Returns markdown-formatted analysis
   - Note state updated with generated content
   - Auto-save triggered (in workspace mode)

5. **Export Options**
   - **Markdown ZIP**: Bundles `notes.md` with embedded thumbnail images
   - **PDF**: Generates multi-page PDF with Chinese font support (NotoSansSC)
   - **Save Project**: Saves notes, thumbnails, and subtitles to workspace folder

### State Management

All state is managed via React `useState` in `App.tsx`:
- `videoState`: Current video file, playback state, audio readiness
- `notes`: Array of captured notes (timestamp, thumbnail, AI content, loading state)
- `subtitleState`: Subtitle segments, recognition status, VTT URL
- `workspace`: Workspace root directory, projects list, current project ID
- `currentPrompt`: Active prompt template for AI analysis
- `showPromptSettings`: Toggle between Guide/Settings tabs
- `autoSaveStatus`: Auto-save state indicator ('idle', 'saving', 'saved')

### Key Files

**App.tsx** (Main component, ~900 lines)
- Orchestrates video player, note capture, AI analysis, and export
- Contains preset prompt templates for different learning modes
- Handles all user interactions and note CRUD operations
- Implements auto-save with 2-second debounce
- Manages workspace state and project switching

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

**components/ProjectSidebar.tsx**
- Displays workspace projects grouped by folder
- Shows folder hierarchy with recursive scanning support
- Indicates projects with notes and subtitles
- Highlights currently active project

**components/SubtitlePanel.tsx**
- Subtitle upload (.srt/.vtt) and speech recognition
- Auto-scroll to current subtitle segment
- Export subtitles in SRT or VTT format
- Integration with local transcription service (Whisper)

**components/SummaryPanel.tsx**
- AI-powered segmented video summary generation
- Divides video content into logical segments (3-8 segments)
- Each segment includes: title, timestamp range, summary
- Click timestamp to jump to that segment in the video
- Collapsible/expandable interface
- Regenerate summary button for different perspectives

**services/workspaceService.ts**
- `scanWorkspaceFolder()`: Recursively scans directories for video projects
- `scanFolderRecursive()`: Helper for recursive folder traversal
- `openWorkspace()`: Opens workspace picker and loads projects
- Parses SRT/VTT subtitle formats

**services/projectService.ts**
- `saveProjectToFolder()`: Saves project with File System Access API
- `saveProjectAsZip()`: Fallback for browsers without FS access
- `loadProjectFromFolder()`: Loads existing project from folder
- Manages thumbnails directory and notes JSON file

### Environment Variables

The app expects `GEMINI_API_KEY` in `.env.local`. Vite injects this as:
- `process.env.API_KEY`
- `process.env.GEMINI_API_KEY`

Both are defined in `vite.config.ts` for compatibility.

### Audio Processing Details

- **Slicing Strategy**: 
  - With subtitles: Uses 1.5 minutes before + 30 seconds after current timestamp
  - Without subtitles: Captures last 2 minutes (120 seconds) of audio before timestamp
- **Format**: Audio is encoded as 16-bit PCM WAV before being sent to Gemini
- **Browser API**: Uses `AudioContext.decodeAudioData()` for extraction (supports most video codecs)
- **Subtitle Support**: Prefers subtitle text over audio when available (faster and more accurate)

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

### Auto-Save System

**Workspace Mode Only**: Auto-save is enabled when a workspace folder is opened.

**Trigger Events** (with 2-second debounce):
- Note created (after AI generation completes)
- Note content edited
- Note deleted
- All notes cleared
- Subtitles loaded or generated
- Project switched (saves current project first)

**Implementation Details**:
- Uses `autoSaveTimeoutRef` to debounce save operations
- Shows status indicator in header: "Auto-save on" / "Saving..." / "Saved"
- Silently saves in background without user prompts
- Only saves to the workspace root directory

**Manual Save**: The "Save Project" button is still available for manual saves and works in both workspace and standalone modes.

### Workspace Features

**Recursive Folder Scanning**:
- Opens a folder and scans all subdirectories
- Groups projects by folder in sidebar
- Preserves folder structure in project IDs
- Example: `tutorials/react/intro` for video in nested folder

**Project Switching**:
- Auto-saves current project before switching
- Preserves generated subtitles in memory
- Loads notes, subtitles, and video from selected project
- Updates workspace state to track current project

**Subtitle Persistence**:
- Generated subtitles are saved to workspace memory immediately
- Subtitles persist when switching between videos
- Saved to disk as part of project auto-save
- Stored in `.notes.json` file alongside video

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
