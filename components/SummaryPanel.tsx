import React, { useState } from 'react';
import { Sparkles, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { SubtitleSegment, SummarySegment } from '../types';
import { analyzeText } from '../services/geminiService';

interface SummaryPanelProps {
  subtitleSegments: SubtitleSegment[];
  onSeek: (time: number) => void;
  onGenerateSummary: (segments: SummarySegment[]) => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  subtitleSegments,
  onSeek,
  onGenerateSummary,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summarySegments, setSummarySegments] = useState<SummarySegment[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleGenerateSummary = async () => {
    if (subtitleSegments.length === 0) {
      alert('Please load or generate subtitles first.');
      return;
    }

    setIsGenerating(true);

    try {
      // Combine all subtitles
      const fullText = subtitleSegments.map(seg => seg.text).join(' ');

      // Create prompt for segmented summary
      const prompt = `You are analyzing a video tutorial. Below is the full transcript.

Please divide this content into logical segments (typically 3-8 segments based on content length) and provide:
1. A brief title for each segment (5-8 words max)
2. A concise summary of what's covered in that segment (2-3 sentences)
3. Approximate timestamp ranges (based on the natural flow of content)

Format your response EXACTLY as follows (do not add any extra text):

SEGMENT 1: [start_time]-[end_time]
Title: [segment title]
Summary: [2-3 sentence summary]

SEGMENT 2: [start_time]-[end_time]
Title: [segment title]
Summary: [2-3 sentence summary]

(continue for all segments)

Transcript:
${fullText}

IMPORTANT: 
- Use timestamps in format MM:SS or HH:MM:SS
- Estimate timestamps based on content flow and total video length
- Keep titles concise and descriptive
- Make summaries informative but brief`;

      const result = await analyzeText(fullText, prompt);

      // Parse the result
      const segments = parseSegments(result);
      
      if (segments.length === 0) {
        throw new Error('Failed to parse summary segments');
      }

      setSummarySegments(segments);
      onGenerateSummary(segments);
      setIsExpanded(true);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseSegments = (text: string): SummarySegment[] => {
    const segments: SummarySegment[] = [];
    const segmentBlocks = text.split(/SEGMENT \d+:/i).filter(s => s.trim());

    segmentBlocks.forEach((block, index) => {
      try {
        // Extract timestamp range
        const timeMatch = block.match(/(\d+):(\d+)(?::(\d+))?\s*-\s*(\d+):(\d+)(?::(\d+))?/);
        if (!timeMatch) return;

        const startH = timeMatch[3] ? parseInt(timeMatch[1]) : 0;
        const startM = timeMatch[3] ? parseInt(timeMatch[2]) : parseInt(timeMatch[1]);
        const startS = timeMatch[3] ? parseInt(timeMatch[3]) : parseInt(timeMatch[2]);

        const endH = timeMatch[6] ? parseInt(timeMatch[4]) : 0;
        const endM = timeMatch[6] ? parseInt(timeMatch[5]) : parseInt(timeMatch[4]);
        const endS = timeMatch[6] ? parseInt(timeMatch[6]) : parseInt(timeMatch[5]);

        const startTime = startH * 3600 + startM * 60 + startS;
        const endTime = endH * 3600 + endM * 60 + endS;

        // Extract title
        const titleMatch = block.match(/Title:\s*(.+?)(?:\n|Summary:)/i);
        const title = titleMatch ? titleMatch[1].trim() : `Segment ${index + 1}`;

        // Extract summary
        const summaryMatch = block.match(/Summary:\s*(.+?)(?=\n\n|$)/is);
        const content = summaryMatch ? summaryMatch[1].trim() : '';

        if (content) {
          segments.push({
            id: `seg-${Date.now()}-${index}`,
            startTime,
            endTime,
            title,
            content,
          });
        }
      } catch (error) {
        console.error('Failed to parse segment:', error);
      }
    });

    return segments;
  };

  if (summarySegments.length === 0) {
    return (
      <div className="w-full mb-8">
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl border border-blue-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                <Sparkles className="text-blue-400" size={20} />
                Quick Summary
              </h3>
              <p className="text-sm text-slate-400">
                Generate an AI-powered segmented summary of your video using subtitles. 
                Get chapter-like breakdowns with timestamps.
              </p>
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating || subtitleSegments.length === 0}
              className="ml-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Summary
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-white">
              Video Summary
            </h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {summarySegments.length} segments
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Regenerate
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded transition-all"
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Segments */}
        {isExpanded && (
          <div className="divide-y divide-slate-800">
            {summarySegments.map((segment, index) => (
              <div
                key={segment.id}
                className="p-4 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  {/* Segment number */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-sm font-semibold border border-blue-500/30">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {segment.title}
                      </h4>
                      <button
                        onClick={() => onSeek(segment.startTime)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-all font-mono"
                        title="Jump to this segment"
                      >
                        <Clock size={12} />
                        {formatTime(segment.startTime)}
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {segment.content}
                    </p>
                    <div className="mt-2 text-xs text-slate-600">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
