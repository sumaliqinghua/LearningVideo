import React, { useRef, useEffect } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { SubtitleState } from '../types';
import { transcribeFile } from '../services/transcribe';

interface SubtitlePanelProps {
  currentTime: number;
  subtitleState: SubtitleState;
  setSubtitleState: React.Dispatch<React.SetStateAction<SubtitleState>>;
  onSeek: (time: number) => void;
  videoFile: File | null;
  onLoadSubtitle: (vttUrl: string) => void;
}

export const SubtitlePanel: React.FC<SubtitlePanelProps> = ({
  currentTime,
  subtitleState,
  setSubtitleState,
  onSeek,
  videoFile,
  onLoadSubtitle,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSubRef = useRef<HTMLDivElement>(null);

  // Find current active subtitle
  const activeIndex = subtitleState.segments.findIndex(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (activeSubRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeSubRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Check if element is not fully visible
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex]);

  const handleUploadSubtitle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const segments = parseSRT(text) || parseVTT(text);
      
      if (segments.length > 0) {
        // Convert to VTT for video element
        const vttContent = convertToVTT(segments);
        const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
        const vttUrl = URL.createObjectURL(vttBlob);

        setSubtitleState({
          segments,
          isRecognizing: false,
          recognitionProgress: '',
          vttUrl,
        });
        onLoadSubtitle(vttUrl);
      }
    } catch (error) {
      console.error('Failed to load subtitle:', error);
      alert('Failed to load subtitle file');
    }
  };

  const handleRecognizeSubtitle = async () => {
    if (!videoFile) {
      alert('Please load a video first');
      return;
    }

    setSubtitleState((prev) => ({
      ...prev,
      isRecognizing: true,
      recognitionProgress: 'Starting recognition...',
    }));

    try {
      // Update progress message
      setSubtitleState((prev) => ({
        ...prev,
        recognitionProgress: 'Processing audio... This may take a few minutes.',
      }));

      const result = await transcribeFile(videoFile);

      const segments = result.segments.map((seg) => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: seg.text,
      }));

      // Convert to VTT for video element
      const vttBlob = new Blob([result.vtt], { type: 'text/vtt' });
      const vttUrl = URL.createObjectURL(vttBlob);

      setSubtitleState({
        segments,
        isRecognizing: false,
        recognitionProgress: '',
        vttUrl,
      });
      onLoadSubtitle(vttUrl);
    } catch (error) {
      console.error('Failed to recognize subtitle:', error);
      setSubtitleState((prev) => ({
        ...prev,
        isRecognizing: false,
        recognitionProgress: '',
      }));
      alert('Failed to recognize subtitle. Please try again.');
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (subtitleState.isRecognizing) {
    return (
      <div className="h-full bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <div className="text-center">
          <p className="text-slate-200 font-medium mb-2">Recognizing Subtitles</p>
          <p className="text-sm text-slate-400">{subtitleState.recognitionProgress}</p>
        </div>
      </div>
    );
  }

  if (subtitleState.segments.length === 0) {
    return (
      <div className="h-full bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center gap-4">
        <FileText className="w-12 h-12 text-slate-600" />
        <p className="text-slate-400 text-sm text-center mb-2">No subtitles loaded</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={18} />
            Upload Subtitle
          </button>
          <button
            onClick={handleRecognizeSubtitle}
            disabled={!videoFile}
            className={`w-full px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              videoFile
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Loader2 size={18} />
            Recognize Subtitle
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt"
          onChange={handleUploadSubtitle}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Subtitles</h3>
        <span className="text-xs text-slate-500">{subtitleState.segments.length} segments</span>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {subtitleState.segments.map((segment, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={segment.id}
              ref={isActive ? activeSubRef : null}
              onClick={() => onSeek(segment.start)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isActive
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-200 shadow-lg'
                  : 'bg-slate-800/50 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-slate-500">
                  {formatTime(segment.start)}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{segment.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Utility functions for parsing subtitle formats
function parseSRT(content: string): Array<{ id: number; start: number; end: number; text: string }> {
  const segments = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!timeMatch) continue;

    const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
    const text = lines.slice(2).join(' ');

    segments.push({ id: segments.length, start, end, text });
  }

  return segments;
}

function parseVTT(content: string): Array<{ id: number; start: number; end: number; text: string }> {
  const segments = [];
  const blocks = content.replace(/^WEBVTT\s*\n+/, '').trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    const timeMatch = lines[0].match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
    if (!timeMatch) continue;

    const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
    const text = lines.slice(1).join(' ');

    segments.push({ id: segments.length, start, end, text });
  }

  return segments;
}

function convertToVTT(segments: Array<{ id: number; start: number; end: number; text: string }>): string {
  let vtt = 'WEBVTT\n\n';
  
  for (const seg of segments) {
    const startTime = formatVTTTime(seg.start);
    const endTime = formatVTTTime(seg.end);
    vtt += `${startTime} --> ${endTime}\n${seg.text}\n\n`;
  }
  
  return vtt;
}

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
