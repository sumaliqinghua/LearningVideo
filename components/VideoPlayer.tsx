import React, { useRef, useEffect, useState } from 'react';
import { Upload, Play, Pause, Camera, MonitorPlay, Maximize, Volume2, VolumeX } from 'lucide-react';
import { VideoState } from '../types';

interface VideoPlayerProps {
  onCapture: (time: number, dataUrl: string) => void;
  videoState: VideoState;
  setVideoState: React.Dispatch<React.SetStateAction<VideoState>>;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  onCapture, 
  videoState, 
  setVideoState,
  videoRef 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setVideoState({
        file,
        objectUrl,
        duration: 0,
        currentTime: 0,
        isPlaying: false,
        isAudioReady: false,
        volume: 1,
      });
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoState(prev => ({ 
        ...prev, 
        duration: videoRef.current!.duration 
      }));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setVideoState(prev => ({ ...prev, currentTime: videoRef.current!.currentTime }));
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoState.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setVideoState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setVideoState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVideoState(prev => ({ ...prev, volume: vol }));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  // Capture logic (Snapshot only, audio captured in App parent)
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for thumbnail
      onCapture(video.currentTime, dataUrl);
      
      // Visual feedback
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // Keyboard listener for 'M'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 'm' && videoState.objectUrl) {
        e.preventDefault();
        captureFrame();
      }
      if (e.code === 'Space' && videoState.objectUrl) {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState.objectUrl, videoState.isPlaying]);

  // Format seconds to MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!videoState.objectUrl) {
    return (
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="aspect-video w-full bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-750 hover:border-blue-500 transition-all group"
      >
        <Upload className="w-16 h-16 text-slate-500 group-hover:text-blue-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-300 group-hover:text-white">Select Video Tutorial</h3>
        <p className="text-slate-500 mt-2 text-sm">Click to upload local .mp4, .webm, .mov</p>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*"
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div 
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-slate-700/50 group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={videoState.objectUrl}
        className="w-full h-full aspect-video object-contain bg-black"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        controls={false}
      />
      
      {/* Hidden Canvas for Thumbnails */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture Toast Overlay */}
      {showToast && (
        <div className="absolute top-4 right-4 bg-emerald-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium animate-fade-in-down shadow-lg backdrop-blur-sm z-20">
          <Camera size={16} />
          <span>Note Captured!</span>
        </div>
      )}

      {/* Custom Control Bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pb-4 px-4 flex flex-col gap-2 transition-opacity duration-300 ${isHovering || !videoState.isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Progress Bar */}
        <input 
            type="range"
            min="0"
            max={videoState.duration || 100}
            value={videoState.currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-600 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
        />

        <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-4">
                <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                    {videoState.isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                
                {/* Volume Control */}
                <div className="flex items-center gap-2 group/vol">
                    <button onClick={() => {
                        const newVol = videoState.volume === 0 ? 1 : 0;
                        if(videoRef.current) videoRef.current.volume = newVol;
                        setVideoState(s => ({...s, volume: newVol}));
                    }} className="text-slate-300 hover:text-white">
                        {videoState.volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={videoState.volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-slate-600 rounded-full appearance-none cursor-pointer accent-white"
                    />
                </div>

                <span className="text-slate-300 text-sm font-mono">
                    {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
                </span>
            </div>
            
            <div className="flex items-center gap-4">
                {!videoState.isAudioReady && (
                   <span className="text-xs text-amber-500 animate-pulse">Processing Audio...</span>
                )}
                <span className="text-slate-300 text-xs font-mono hidden md:inline-block">
                    Press <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white font-bold border border-slate-600 mx-1">M</kbd> to capture
                </span>
                <button 
                    onClick={captureFrame}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    disabled={!videoState.isAudioReady}
                >
                    <MonitorPlay size={16} />
                    <span className="hidden sm:inline">Note</span>
                </button>
                <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white transition-colors">
                    <Maximize size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};