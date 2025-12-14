import React, { useState } from 'react';
import { Note } from '../types';
import { Clock, Loader2, PlayCircle, Trash2, Edit2, Check, X } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onSeek: (timestamp: number) => void;
  onUpdateContent: (id: string, newContent: string) => void;
  onDelete: (id: string) => void;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const NoteCard: React.FC<NoteCardProps> = ({ note, onSeek, onUpdateContent, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all shadow-md group">
      <div className="flex flex-col">
        {/* Top: Thumbnail */}
        {/* Added bg-black and object-contain to ensure no cropping and correct aspect ratio */}
        <div className="relative w-full aspect-video bg-black cursor-pointer group/image" onClick={() => onSeek(note.timestamp)}>
          <img 
            src={note.thumbnailUrl} 
            alt={`Note at ${formatTime(note.timestamp)}`}
            className="w-full h-full object-contain opacity-90 group-hover/image:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/image:opacity-100 transition-opacity">
            <PlayCircle className="text-white w-12 h-12 drop-shadow-lg scale-90 group-hover/image:scale-100 transition-transform" />
          </div>
          <div className="absolute bottom-3 left-3 bg-black/80 text-blue-200 text-xs font-mono px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1 shadow-lg border border-white/10">
            <Clock size={12} />
            {formatTime(note.timestamp)}
          </div>
        </div>

        {/* Bottom: Content */}
        <div className="flex-1 p-5 flex flex-col border-t border-slate-700/50">
          <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-700/30">
            <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                <SparklesIcon /> AI Analysis
            </h4>
            <div className="flex items-center gap-2">
                 {/* Edit Toggle */}
                 {!note.isGenerating && (
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`transition-colors p-1.5 rounded-md ${isEditing ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700'}`}
                        title={isEditing ? "Finish Editing" : "Edit Note"}
                    >
                        {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                    </button>
                 )}
                 
                <button 
                    onClick={() => onDelete(note.id)}
                    className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded-md transition-all"
                    title="Delete note"
                >
                    <Trash2 size={16} />
                </button>
            </div>
          </div>

          {note.isGenerating ? (
            <div className="flex flex-col items-center justify-center py-8 text-blue-400 text-sm gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span className="animate-pulse">Listening & Analyzing...</span>
            </div>
          ) : (
            isEditing ? (
                <textarea
                  value={note.content}
                  onChange={(e) => onUpdateContent(note.id, e.target.value)}
                  className="w-full h-48 bg-slate-900 text-slate-200 text-sm p-4 rounded-md border border-slate-600 focus:border-blue-500 outline-none font-mono leading-relaxed resize-y"
                  placeholder="Add your notes here..."
                  autoFocus
                />
            ) : (
                <div 
                    className="text-slate-300 text-sm leading-7 whitespace-pre-wrap font-sans markdown-body"
                >
                    {note.content || <span className="text-slate-500 italic">No content generated.</span>}
                </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component for icon
const SparklesIcon = () => (
  <svg className="w-3 h-3 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);