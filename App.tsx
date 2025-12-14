import React, { useState, useRef, useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { NoteCard } from './components/NoteCard';
import { SubtitlePanel } from './components/SubtitlePanel';
import { Note, VideoState, SubtitleState } from './types';
import { analyzeAudio, analyzeText } from './services/geminiService';
import { getCachedModels } from './services/transcribe';
import { decodeAudioFromFile, sliceAudioBuffer, audioBufferToWav, blobToBase64 } from './utils/audioUtils';
import { Sparkles, FileVideo, BookOpen, Trash2, Mic, Settings, XCircle, Download, FileText, FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

const PRESET_PROMPTS = [
  {
    label: "Standard Study Mode",
    value: `You are an expert technical tutor. I have just watched the last 2 minutes of a tutorial video.
The attached audio is from that segment.

Please perform the following tasks:
1. **Transcript**: Provide a clean, accurate transcription of the speech.
2. **Key Knowledge Points**: Summarize the technical concepts, commands, or logic discussed.
3. **Summary**: A one-sentence takeaway.

Format the output in clear Markdown.`
  },
  {
    label: "Code Extraction",
    value: `Analyze the audio for any code syntax, terminal commands, or programming logic mentioned.
1. Extract any specific code snippets or commands mentioned (enclose in markdown code blocks).
2. Explain what the code does step-by-step.
3. If no code is mentioned, summarize the architectural concept.`
  },
  {
    label: "Q&A Generator",
    value: `Based on the last 2 minutes of audio, generate 3 quiz questions to test my understanding of this specific segment.
Provide the questions first, then a "Hidden Answer" section at the bottom.`
  },
  {
    label: "Language Learning (EN to CN)",
    value: `Transcribe the audio exactly in English.
Then, translate the core meaning into Chinese.
List 3 key vocabulary words from this segment with their Chinese definitions.`
  }
];

const App: React.FC = () => {
  const [videoState, setVideoState] = useState<VideoState>({
    file: null,
    objectUrl: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isAudioReady: false,
    volume: 1,
    showSubtitles: true,
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState(PRESET_PROMPTS[0].value);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [subtitleState, setSubtitleState] = useState<SubtitleState>({
    segments: [],
    isRecognizing: false,
    recognitionProgress: '',
    vttUrl: null,
    recognitionModel: 'base',
  });
  const [cachedModels, setCachedModels] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Decode audio when file changes
  useEffect(() => {
    if (videoState.file) {
      setVideoState(prev => ({ ...prev, isAudioReady: false }));
      fullAudioBufferRef.current = null;
      
      decodeAudioFromFile(videoState.file)
        .then(buffer => {
          fullAudioBufferRef.current = buffer;
          setVideoState(prev => ({ ...prev, isAudioReady: true }));
          console.log("Audio decoded successfully, length:", buffer.duration);
        })
        .catch(err => {
          console.error("Failed to decode audio track:", err);
        });
    }
  }, [videoState.file]);

  // Poll for cached models
  useEffect(() => {
    const fetchCachedModels = async () => {
      const models = await getCachedModels();
      setCachedModels(models);
    };

    // Fetch immediately
    fetchCachedModels();

    // Poll every 5 seconds
    const interval = setInterval(fetchCachedModels, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRemoveVideo = () => {
    if (window.confirm("Are you sure you want to remove the current video?")) {
        setVideoState({
            file: null,
            objectUrl: null,
            duration: 0,
            currentTime: 0,
            isPlaying: false,
            isAudioReady: false,
            volume: 1,
            showSubtitles: true,
        });
        fullAudioBufferRef.current = null;
        setNotes([]);
        setSubtitleState({
          segments: [],
          isRecognizing: false,
          recognitionProgress: '',
          vttUrl: null,
          recognitionModel: 'base',
        });
    }
  };

  const handleCapture = async (timestamp: number, thumbnailDataUrl: string) => {
    const newNoteId = Date.now().toString();
    
    // 1. Create a placeholder note immediately
    const newNote: Note = {
      id: newNoteId,
      timestamp,
      thumbnailUrl: thumbnailDataUrl,
      content: '',
      isGenerating: true,
    };

    setNotes((prev) => [newNote, ...prev]);

    // 2. Use subtitle text if available, otherwise fall back to audio
    try {
      let analysis: string;
      
      if (subtitleState.segments.length > 0) {
        // Use subtitles: 1.5 minutes before + 30 seconds after current time
        const startTime = Math.max(0, timestamp - 90); // 1.5 minutes = 90 seconds
        const endTime = timestamp + 30; // 30 seconds after
        
        // Filter subtitle segments within the time range
        const relevantSegments = subtitleState.segments.filter(
          seg => seg.start >= startTime && seg.start <= endTime
        );
        
        if (relevantSegments.length === 0) {
          throw new Error("No subtitles found in the specified time range.");
        }
        
        // Combine subtitle text
        const subtitleText = relevantSegments.map(seg => seg.text).join(' ');
        
        // Analyze using subtitle text
        analysis = await analyzeText(subtitleText, currentPrompt);
      } else {
        // Fall back to audio analysis if no subtitles
        if (!fullAudioBufferRef.current) {
          throw new Error("Neither subtitles nor audio are available.");
        }
        
        // Slice audio: Recent 2 minutes (120 seconds) up to current timestamp
        const duration = 120; 
        const audioSlice = sliceAudioBuffer(fullAudioBufferRef.current, timestamp, duration);
        const wavBlob = audioBufferToWav(audioSlice);
        const base64Audio = await blobToBase64(wavBlob);
        
        // Pass the CURRENT prompt state
        analysis = await analyzeAudio(base64Audio, currentPrompt);
      }

      // 3. Update note with result
      setNotes((prev) => 
        prev.map((n) => 
          n.id === newNoteId 
            ? { ...n, content: analysis, isGenerating: false } 
            : n
        )
      );
    } catch (error) {
      console.error("Failed to generate note:", error);
      const errorMsg = error instanceof Error ? error.message : "Error processing. Please try again.";
      setNotes((prev) => 
        prev.map((n) => 
          n.id === newNoteId 
            ? { ...n, content: errorMsg, isGenerating: false } 
            : n
        )
      );
    }
  };

  const handleSeek = (timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadSubtitle = (vttUrl: string) => {
    // The subtitle is already loaded into state via SubtitlePanel
    // This handler is called to inform parent that subtitle is ready
    console.log('Subtitle loaded:', vttUrl);
    console.log('Current subtitle segments count:', subtitleState.segments.length);
    console.trace('handleLoadSubtitle called from:');
  };

  const handleUpdateContent = (id: string, newContent: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content: newContent } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAllNotes = () => {
    if (notes.length === 0) return;
    if (window.confirm("Clear all notes?")) {
      setNotes([]);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Create filename safe string
  const safeFilename = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  const handleExportMarkdown = async () => {
    if (notes.length === 0) return;
    setIsExporting(true);

    try {
        const zip = new JSZip();
        const imgFolder = zip.folder("images");
        
        let markdownContent = `# Study Notes: ${videoState.file?.name || 'Video Tutorial'}\n\n`;
        markdownContent += `Date: ${new Date().toLocaleDateString()}\n`;
        markdownContent += `Total Notes: ${notes.length}\n\n`;
        markdownContent += `*Exported from SmartVideo Notes*\n\n`;
        markdownContent += `---\n\n`;

        notes.forEach((note, index) => {
            const timeStr = formatTime(note.timestamp).replace(':', '-');
            const imgFilename = `note_${index + 1}_${timeStr}.jpg`;

            // Process image data
            if (note.thumbnailUrl) {
                // remove "data:image/jpeg;base64," prefix
                const base64Data = note.thumbnailUrl.split(',')[1];
                if (base64Data && imgFolder) {
                    imgFolder.file(imgFilename, base64Data, {base64: true});
                }
            }

            markdownContent += `### Note ${index + 1} - ${formatTime(note.timestamp)}\n\n`;
            // Reference image in markdown relative to the file location
            markdownContent += `![Thumbnail @ ${formatTime(note.timestamp)}](images/${imgFilename})\n\n`;
            markdownContent += `> ${note.content.replace(/\n/g, '\n> ')}\n\n`;
            markdownContent += `---\n\n`;
        });

        zip.file("notes.md", markdownContent);

        const content = await zip.generateAsync({type:"blob"});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart-notes-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to generate zip", e);
        alert("Failed to generate ZIP export.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (notes.length === 0) return;
    
    setIsExporting(true);

    try {
        const doc = new jsPDF();
        
        // --- Font Loading Logic for Chinese Support ---
        // Using jsDelivr CDN which mirrors GitHub for better reliability and CORS headers
        const fontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC-Regular.ttf';
        
        try {
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            
            // Convert ArrayBuffer to Base64
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            const chunkSize = 8192;
            for (let i = 0; i < len; i += chunkSize) {
                 binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
            }
            const base64Font = window.btoa(binary);

            doc.addFileToVFS('NotoSansSC-Regular.ttf', base64Font);
            doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
            doc.setFont('NotoSansSC');
        } catch (e) {
            console.error("Failed to load Chinese font:", e);
            alert("Warning: Could not load Chinese font (Network Error). Non-English characters may be displayed as '?' or random symbols.");
        }
        // ----------------------------------------------

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const contentWidth = pageWidth - (margin * 2);
        
        let yPos = 20;

        // Header
        doc.setFontSize(18);
        doc.text(`Study Notes: ${videoState.file?.name || 'Video Tutorial'}`, margin, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
        yPos += 15;

        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            
            // Check for page break space (rough estimate)
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            // Title/Timestamp
            doc.setFontSize(12);
            doc.text(`Note ${i + 1} - ${formatTime(note.timestamp)}`, margin, yPos);
            yPos += 7;

            // Image
            try {
                const imgProps = doc.getImageProperties(note.thumbnailUrl);
                const imgHeight = (contentWidth * imgProps.height) / imgProps.width;
                
                // If image is too tall for remaining page, new page
                if (yPos + imgHeight > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.addImage(note.thumbnailUrl, 'JPEG', margin, yPos, contentWidth, imgHeight);
                yPos += imgHeight + 7;
            } catch (e) {
                console.error("Error adding image to PDF", e);
            }

            // Content
            doc.setFontSize(10);
            
            // Clean content for PDF
            const cleanContent = note.content.replace(/\*\*/g, ''); // Remove markdown bold asterisks
            const splitText = doc.splitTextToSize(cleanContent, contentWidth);
            
            // Check if text fits
            if (yPos + (splitText.length * 5) > 280) {
                doc.addPage();
                yPos = 20;
            }

            doc.text(splitText, margin, yPos);
            yPos += (splitText.length * 5) + 15;
        }

        doc.save(`smart-notes-${Date.now()}.pdf`);
    } catch (err) {
        console.error("Export PDF failed:", err);
        alert("Failed to export PDF.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">SmartVideo Notes</h1>
              <p className="text-xs text-slate-400">AI-Powered Tutorial Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
             {videoState.file && (
                <div className="flex items-center gap-4">
                     <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                        <FileVideo size={14} className="text-blue-400" />
                        <span className="truncate max-w-[150px] md:max-w-[250px]">{videoState.file.name}</span>
                     </div>
                     <button 
                        onClick={handleRemoveVideo}
                        className="flex items-center gap-1 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded transition-all border border-transparent hover:border-slate-700"
                        title="Remove current video"
                     >
                        <XCircle size={16} />
                        <span className="hidden sm:inline">Close</span>
                     </button>
                </div>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col gap-8">
        
        {/* Top Section: Video Player & Subtitle Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-xl overflow-hidden shadow-2xl bg-black ring-1 ring-slate-800">
                <VideoPlayer 
                    onCapture={handleCapture}
                    videoState={videoState}
                    setVideoState={setVideoState}
                    videoRef={videoRef}
                    subtitleUrl={subtitleState.vttUrl}
                />
            </div>
          </div>

          {/* Right Sidebar: Subtitle Panel */}
          <div className="lg:col-span-1 flex flex-col min-h-[400px] h-[600px]">
            <SubtitlePanel
              currentTime={videoState.currentTime}
              subtitleState={subtitleState}
              setSubtitleState={setSubtitleState}
              onSeek={handleSeek}
              videoFile={videoState.file}
              onLoadSubtitle={handleLoadSubtitle}
            />
          </div>
        </div>

        {/* Guide & AI Settings Section */}
        <div className="w-full">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
             {/* Tab/Header */}
             <div className="flex items-center border-b border-slate-800 bg-slate-900/50">
                <button 
                    onClick={() => setShowPromptSettings(false)}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${!showPromptSettings ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <BookOpen size={16} /> Guide
                </button>
                <button 
                    onClick={() => setShowPromptSettings(true)}
                    className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${showPromptSettings ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Settings size={16} /> AI Settings
                </button>
             </div>

             <div className="p-5">
                {showPromptSettings ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    Preset Prompts
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {PRESET_PROMPTS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentPrompt(preset.value)}
                                            className={`text-left text-xs p-3 rounded-lg border transition-all duration-200 ${currentPrompt === preset.value ? 'bg-blue-600/10 border-blue-500/50 text-blue-200 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-900'}`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    Recognition Model
                                </label>
                                <select
                                    value={subtitleState.recognitionModel}
                                    onChange={(e) => setSubtitleState(prev => ({ ...prev, recognitionModel: e.target.value }))}
                                    className="w-full bg-slate-950 text-slate-300 text-xs p-3 rounded-lg border border-slate-800 focus:border-blue-500 outline-none"
                                >
                                    <option value="tiny">{cachedModels.includes('tiny') ? '✓ ' : ''}Tiny (Fastest, less accurate)</option>
                                    <option value="base">{cachedModels.includes('base') ? '✓ ' : ''}Base (Balanced)</option>
                                    <option value="small">{cachedModels.includes('small') ? '✓ ' : ''}Small (Better accuracy)</option>
                                    <option value="medium">{cachedModels.includes('medium') ? '✓ ' : ''}Medium (High accuracy)</option>
                                    <option value="large-v2">{cachedModels.includes('large-v2') ? '✓ ' : ''}Large v2 (Best accuracy)</option>
                                    <option value="large-v3">{cachedModels.includes('large-v3') ? '✓ ' : ''}Large v3 (Latest)</option>
                                </select>
                                <p className="text-[10px] text-slate-600 mt-2">
                                    Used for speech recognition. Larger models are more accurate but slower.
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-end">
                                <span>Active Prompt</span>
                                <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Auto-saved</span>
                            </label>
                            <textarea 
                                value={currentPrompt}
                                onChange={(e) => setCurrentPrompt(e.target.value)}
                                className="w-full h-64 bg-slate-950 text-slate-300 text-xs p-4 rounded-lg border border-slate-800 focus:border-blue-500 outline-none font-mono resize-y leading-relaxed shadow-inner"
                                placeholder="Enter instructions for the AI..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400 animate-fade-in">
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                           <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">1</span>
                              Load Video
                           </h3>
                           <p className="text-slate-400 text-xs leading-relaxed ml-8">Select a video file from your computer. We support MP4, WebM, and other common formats.</p>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                           <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">2</span>
                              Capture
                           </h3>
                           <p className="text-slate-400 text-xs leading-relaxed ml-8">
                              Press <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white font-mono text-[10px] border border-slate-600">M</kbd> at any key moment. 
                              The AI will listen to the last <strong>2 minutes</strong> of audio and generate notes below.
                           </p>
                        </div>
                        
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-800">
                           <h3 className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">3</span>
                              Review & Export
                           </h3>
                           <p className="text-slate-400 text-xs leading-relaxed ml-8">
                              Notes appear at the bottom. You can export them as PDF or Markdown using the buttons above the notes list.
                           </p>
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Bottom Section: Notes Feed */}
        <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-2 border-b border-slate-800 gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <BookOpen className="text-blue-500" size={24} />
                    Generated Notes
                    <span className="text-sm font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                        {notes.length}
                    </span>
                </h2>
                
                {notes.length > 0 && (
                    <div className="flex items-center gap-2">
                        {/* Export Buttons */}
                        <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 mr-2">
                            <button
                                onClick={handleExportMarkdown}
                                disabled={isExporting}
                                className={`px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-2 transition-all ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
                                title="Download Markdown and Images (ZIP)"
                            >
                                {isExporting ? <Loader2 size={14} className="animate-spin"/> : <FileDown size={14} />} Markdown
                            </button>
                            <div className="w-px h-4 bg-slate-800 mx-1"></div>
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className={`px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-2 transition-all ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
                                title="Export as PDF"
                            >
                                {isExporting ? <Loader2 size={14} className="animate-spin"/> : <FileText size={14} />} PDF
                            </button>
                        </div>

                        <button 
                            onClick={handleClearAllNotes}
                            className="text-sm text-slate-400 hover:text-red-400 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-800"
                        >
                            <Trash2 size={16} /> Clear All
                        </button>
                    </div>
                )}
            </div>
          
            <div className="grid grid-cols-1 gap-8">
                {notes.length === 0 ? (
                <div className="w-full py-16 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    <div className="bg-slate-800 p-4 rounded-full mb-4">
                         <Mic size={32} className="text-slate-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-400">Your notebook is empty</p>
                    <p className="text-sm mt-2 max-w-md text-center">Watch the video and press "M" to capture key insights automatically.</p>
                </div>
                ) : (
                notes.map((note) => (
                    <NoteCard
                    key={note.id}
                    note={note}
                    onSeek={handleSeek}
                    onUpdateContent={handleUpdateContent}
                    onDelete={handleDeleteNote}
                    />
                ))
                )}
            </div>
        </div>

      </main>
    </div>
  );
};

export default App;
