import { ProjectItem, Note, SubtitleSegment } from '../types';
import { getBasename, getExtension, isVideoExt, isSubtitleExt } from '../utils/fileUtils';

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
 * Scan a folder and identify all video projects
 */
export async function scanWorkspaceFolder(dirHandle: any): Promise<ProjectItem[]> {
  const projectsMap = new Map<string, {
    videoFile?: File;
    subtitleFile?: File;
    notesFile?: File;
    thumbnailsDir?: any;
  }>();

  // First pass: scan all files and directories
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const file: File = await entry.getFile();
      const ext = getExtension(file.name);
      
      if (isVideoExt(ext)) {
        const baseName = getBasename(file.name);
        if (!projectsMap.has(baseName)) {
          projectsMap.set(baseName, {});
        }
        projectsMap.get(baseName)!.videoFile = file;
      } else if (isSubtitleExt(ext)) {
        const baseName = getBasename(file.name);
        if (!projectsMap.has(baseName)) {
          projectsMap.set(baseName, {});
        }
        projectsMap.get(baseName)!.subtitleFile = file;
      } else if (file.name.endsWith('.notes.json')) {
        const baseName = file.name.replace('.notes.json', '');
        if (!projectsMap.has(baseName)) {
          projectsMap.set(baseName, {});
        }
        projectsMap.get(baseName)!.notesFile = file;
      }
    } else if (entry.kind === 'directory' && entry.name.endsWith('.thumbnails')) {
      const baseName = entry.name.replace('.thumbnails', '');
      if (!projectsMap.has(baseName)) {
        projectsMap.set(baseName, {});
      }
      projectsMap.get(baseName)!.thumbnailsDir = entry;
    }
  }

  // Second pass: create project items (only for entries with video files)
  const projects: ProjectItem[] = [];

  for (const [baseName, files] of projectsMap.entries()) {
    if (!files.videoFile) continue; // Skip if no video file

    // Load notes if available
    let notes: Note[] = [];
    let subtitles: SubtitleSegment[] = [];
    let duration = 0;

    if (files.notesFile) {
      try {
        const notesText = await files.notesFile.text();
        const projectData: ProjectData = JSON.parse(notesText);
        duration = projectData.videoDuration || 0;

        // Load thumbnails
        if (files.thumbnailsDir) {
          notes = await Promise.all(
            projectData.notes.map(async (note) => {
              if (!note.thumbnailPath) {
                return {
                  ...note,
                  thumbnailUrl: '',
                  isGenerating: false,
                };
              }

              try {
                const thumbHandle = await files.thumbnailsDir.getFileHandle(note.thumbnailPath);
                const thumbFile: File = await thumbHandle.getFile();
                const thumbnailUrl = URL.createObjectURL(thumbFile);

                return {
                  ...note,
                  thumbnailUrl,
                  isGenerating: false,
                };
              } catch (error) {
                return {
                  ...note,
                  thumbnailUrl: '',
                  isGenerating: false,
                };
              }
            })
          );
        } else {
          notes = projectData.notes.map(note => ({
            ...note,
            thumbnailUrl: '',
            isGenerating: false,
          }));
        }

        // Load subtitles from JSON if available
        if (projectData.subtitles) {
          subtitles = projectData.subtitles;
        }
      } catch (error) {
        console.error('Failed to load notes for', baseName, error);
      }
    }

    // Load subtitles from file if available and not already loaded
    if (files.subtitleFile && subtitles.length === 0) {
      try {
        const subtitleText = await files.subtitleFile.text();
        const ext = getExtension(files.subtitleFile.name);
        subtitles = ext === 'srt' ? parseSRT(subtitleText) : parseVTT(subtitleText);
      } catch (error) {
        console.error('Failed to load subtitles for', baseName, error);
      }
    }

    projects.push({
      id: baseName,
      name: files.videoFile.name,
      videoFile: files.videoFile,
      subtitleFile: files.subtitleFile,
      notesFile: files.notesFile,
      thumbnailsDir: files.thumbnailsDir,
      notes,
      subtitles,
      duration,
      lastModified: new Date(files.videoFile.lastModified),
    });
  }

  // Sort by last modified date (newest first)
  projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  console.log(`Found ${projects.length} video projects in workspace`);
  return projects;
}

/**
 * Open a workspace folder and scan for projects
 */
export async function openWorkspace(): Promise<{
  rootDir: any;
  projects: ProjectItem[];
} | null> {
  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    });

    const projects = await scanWorkspaceFolder(dirHandle);

    return {
      rootDir: dirHandle,
      projects,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // User cancelled
      return null;
    }
    throw error;
  }
}
