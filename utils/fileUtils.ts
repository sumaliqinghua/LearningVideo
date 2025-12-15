/**
 * Get file extension (lowercase, without dot)
 */
export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get filename without extension
 */
export function getBasename(filename: string | undefined): string {
  if (!filename) return 'untitled';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

/**
 * Check if extension is a video format
 */
export function isVideoExt(ext: string): boolean {
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];
  return videoExts.includes(ext.toLowerCase());
}

/**
 * Check if extension is a subtitle format
 */
export function isSubtitleExt(ext: string): boolean {
  const subtitleExts = ['srt', 'vtt'];
  return subtitleExts.includes(ext.toLowerCase());
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

/**
 * Convert data URL to Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
