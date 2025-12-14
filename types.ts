export interface Note {
  id: string;
  timestamp: number;
  thumbnailUrl: string;
  content: string; // The AI generated or user edited content
  isGenerating: boolean;
}

export interface VideoState {
  file: File | null;
  objectUrl: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isAudioReady: boolean; // Tracks if the audio track is decoded and ready for slicing
  volume: number;
}

export interface SubtitleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface SubtitleState {
  segments: SubtitleSegment[];
  isRecognizing: boolean;
  recognitionProgress: string;
  vttUrl: string | null;
}

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info'
}