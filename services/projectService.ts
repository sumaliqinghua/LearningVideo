import { Note, SubtitleSegment } from '../types';
import { getBasename, getExtension, isVideoExt, isSubtitleExt, dataUrlToBlob, downloadBlob, isFileSystemAccessSupported } from '../utils/fileUtils';
import JSZip from 'jszip';

interface ProjectData {
  version: string;
  videoName: string;
  videoDuration: number;
  createdAt: string;
  thumbnailsFolder: string;
  notes: Array<{
    id: string;
    timestamp: number;
    thumbnailPath: string;
    content: string;
  }>;
  subtitles?: SubtitleSegment[];
}

/**
 * Parse SRT subtitle format
 */
function parseSRT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
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

/**
 * Parse VTT subtitle format
 */
function parseVTT(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
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

/**
 * Convert segments to SRT format
 */
function convertToSRT(segments: SubtitleSegment[]): string {
  let srt = '';
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const startTime = formatSRTTime(seg.start);
    const endTime = formatSRTTime(seg.end);
    srt += `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n\n`;
  }
  
  return srt;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Save project to folder using File System Access API
 */
export async function saveProjectToFolder(
  videoFile: File,
  videoDuration: number,
  notes: Note[],
  subtitles: SubtitleSegment[]
): Promise<void> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }

  // 1. Let user select save location
  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
  });

  const baseName = getBasename(videoFile.name);

  // 2. Create thumbnails folder
  const thumbDirHandle = await dirHandle.getDirectoryHandle(
    `${baseName}.thumbnails`,
    { create: true }
  );

  // 3. Save all thumbnails
  const notesWithPaths = await Promise.all(
    notes.map(async (note) => {
      if (!note.thumbnailUrl) return { ...note, thumbnailPath: '' };

      try {
        const blob = await dataUrlToBlob(note.thumbnailUrl);
        const filename = `note_${note.id}.jpg`;
        const fileHandle = await thumbDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return {
          id: note.id,
          timestamp: note.timestamp,
          thumbnailPath: filename,
          content: note.content,
        };
      } catch (error) {
        console.error('Failed to save thumbnail:', error);
        return { ...note, thumbnailPath: '' };
      }
    })
  );

  // 4. Save notes JSON
  const projectData: ProjectData = {
    version: '1.0',
    videoName: videoFile.name,
    videoDuration,
    createdAt: new Date().toISOString(),
    thumbnailsFolder: `${baseName}.thumbnails`,
    notes: notesWithPaths,
    subtitles: subtitles.length > 0 ? subtitles : undefined,
  };

  const jsonHandle = await dirHandle.getFileHandle(`${baseName}.notes.json`, { create: true });
  const jsonWritable = await jsonHandle.createWritable();
  await jsonWritable.write(JSON.stringify(projectData, null, 2));
  await jsonWritable.close();

  // 5. Save subtitles (if any)
  if (subtitles.length > 0) {
    const srtContent = convertToSRT(subtitles);
    const srtHandle = await dirHandle.getFileHandle(`${baseName}.srt`, { create: true });
    const srtWritable = await srtHandle.createWritable();
    await srtWritable.write(srtContent);
    await srtWritable.close();
  }

  console.log('Project saved successfully to folder:', dirHandle.name);
}

/**
 * Save project as ZIP (fallback for browsers without File System Access API)
 */
export async function saveProjectAsZip(
  videoFile: File,
  videoDuration: number,
  notes: Note[],
  subtitles: SubtitleSegment[]
): Promise<void> {
  const zip = new JSZip();
  const baseName = getBasename(videoFile.name);

  // Create thumbnails folder
  const thumbFolder = zip.folder('thumbnails');

  // Add all thumbnails
  const notesWithPaths = await Promise.all(
    notes.map(async (note) => {
      if (!note.thumbnailUrl || !thumbFolder) {
        return { ...note, thumbnailPath: '' };
      }

      try {
        const base64Data = note.thumbnailUrl.split(',')[1];
        const filename = `note_${note.id}.jpg`;
        thumbFolder.file(filename, base64Data, { base64: true });

        return {
          id: note.id,
          timestamp: note.timestamp,
          thumbnailPath: filename,
          content: note.content,
        };
      } catch (error) {
        console.error('Failed to add thumbnail to zip:', error);
        return { ...note, thumbnailPath: '' };
      }
    })
  );

  // Add notes JSON
  const projectData: ProjectData = {
    version: '1.0',
    videoName: videoFile.name,
    videoDuration,
    createdAt: new Date().toISOString(),
    thumbnailsFolder: 'thumbnails',
    notes: notesWithPaths,
    subtitles: subtitles.length > 0 ? subtitles : undefined,
  };

  zip.file('notes.json', JSON.stringify(projectData, null, 2));

  // Add subtitles (if any)
  if (subtitles.length > 0) {
    zip.file('subtitle.srt', convertToSRT(subtitles));
  }

  // Generate and download ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `${baseName}-project.zip`);

  console.log('Project saved as ZIP');
}

/**
 * Load project from folder using File System Access API
 */
export async function loadProjectFromFolder(): Promise<{
  videoFile: File;
  notes: Note[];
  subtitles: SubtitleSegment[];
} | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }

  // 1. Let user select project folder
  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'read',
  });

  // 2. Scan folder for video, subtitle, and notes
  let videoFile: File | null = null;
  let subtitleFile: File | null = null;
  let notesFile: File | null = null;
  let thumbnailsDir: any = null;

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const file: File = await entry.getFile();
      const ext = getExtension(file.name);

      if (isVideoExt(ext)) {
        videoFile = file;
      } else if (isSubtitleExt(ext)) {
        subtitleFile = file;
      } else if (file.name.endsWith('.notes.json')) {
        notesFile = file;
      }
    } else if (entry.kind === 'directory' && entry.name.endsWith('.thumbnails')) {
      thumbnailsDir = entry;
    }
  }

  if (!videoFile || !notesFile) {
    throw new Error('Invalid project folder. Missing video or notes file.');
  }

  // 3. Load notes JSON
  const notesText = await notesFile.text();
  const projectData: ProjectData = JSON.parse(notesText);

  // 4. Load thumbnails
  const notesWithImages = await Promise.all(
    projectData.notes.map(async (note) => {
      if (!thumbnailsDir || !note.thumbnailPath) {
        return {
          ...note,
          thumbnailUrl: '',
          isGenerating: false,
        };
      }

      try {
        const thumbHandle = await thumbnailsDir.getFileHandle(note.thumbnailPath);
        const thumbFile: File = await thumbHandle.getFile();
        const thumbnailUrl = URL.createObjectURL(thumbFile);

        return {
          ...note,
          thumbnailUrl,
          isGenerating: false,
        };
      } catch (error) {
        console.error('Failed to load thumbnail:', note.thumbnailPath, error);
        return {
          ...note,
          thumbnailUrl: '',
          isGenerating: false,
        };
      }
    })
  );

  // 5. Load subtitles
  let subtitles: SubtitleSegment[] = [];
  if (subtitleFile) {
    const subtitleText = await subtitleFile.text();
    const ext = getExtension(subtitleFile.name);
    subtitles = ext === 'srt' ? parseSRT(subtitleText) : parseVTT(subtitleText);
  } else if (projectData.subtitles) {
    subtitles = projectData.subtitles;
  }

  console.log('Project loaded successfully:', projectData.videoName);

  return {
    videoFile,
    notes: notesWithImages,
    subtitles,
  };
}
