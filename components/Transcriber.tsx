import React, { useMemo, useState } from 'react';
import { transcribeFile, TranscribeResult } from '@/services/transcribe';

type Props = {
  file?: File | null;
};

function basenameNoExt(name: string) {
  // Remove last extension only (e.g. "a.b.mp4" -> "a.b")
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(0, idx) : name;
}

function safeFilename(name: string) {
  return name.replace(/[^a-z0-9._-]/gi, '_');
}

export default function Transcriber({ file }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [errMsg, setErrMsg] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const activeFile = selectedFile ?? file ?? null;

  const defaultOutBase = useMemo(() => {
    if (!activeFile) return 'output';
    return safeFilename(basenameNoExt(activeFile.name)) || 'output';
  }, [activeFile]);

  async function runTranscribe(f: File) {
    setStatus('running');
    setErrMsg('');
    setResult(null);
    try {
      const data = await transcribeFile(f);
      setResult(data);
      setStatus('done');
    } catch (err: any) {
      setErrMsg(err?.message || 'Unknown error');
      setStatus('error');
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    await runTranscribe(f);
  }

  async function onUseCurrentVideo() {
    if (!file) return;
    // Prefer the currently loaded video, even if user previously selected another file.
    setSelectedFile(null);
    await runTranscribe(file);
  }

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white">音频转写字幕 (faster-whisper)</h2>
        <p className="text-xs text-slate-400 mt-1">
          上传视频/音频文件 → 生成文稿与字幕（SRT/VTT）。
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-col gap-2">
          {file ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                onClick={onUseCurrentVideo}
                disabled={status === 'running'}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  status === 'running'
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-wait'
                    : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                }`}
                title="使用当前已加载的视频文件进行转写"
              >
                使用当前视频生成字幕
              </button>
              <div className="text-xs text-slate-500">
                当前视频：{file.name}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">未检测到当前视频，请先在播放器里加载视频。</div>
          )}

          <div className="text-xs text-slate-500">或手动选择其它文件：</div>
          <input
            type="file"
            accept="video/*,audio/*"
            onChange={onFileChange}
            className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-100 hover:file:bg-slate-700"
          />

          {selectedFile && (
            <div className="text-xs text-slate-500">手动选择：{selectedFile.name}</div>
          )}
        </div>

        {status === 'running' && (
          <div className="text-sm text-slate-300">
            转写中… 可能需要几分钟（首次运行会下载模型）。
          </div>
        )}
        {status === 'error' && (
          <div className="text-sm text-red-400">Error: {errMsg}</div>
        )}

        {status === 'done' && result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => download(result.srt, `${defaultOutBase}.srt`, 'text/plain')}
                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                下载 SRT
              </button>
              <button
                onClick={() => download(result.vtt, `${defaultOutBase}.vtt`, 'text/vtt')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-100 rounded hover:bg-slate-700 border border-slate-700"
              >
                下载 VTT
              </button>
              <div className="text-xs text-slate-500 flex items-center">
                语言：{result.language}（{(result.language_probability * 100).toFixed(1)}%）
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">全文</h3>
              <pre className="whitespace-pre-wrap bg-slate-950/50 text-slate-200 p-3 rounded-lg border border-slate-800 text-xs leading-relaxed">
                {result.full_text}
              </pre>
            </div>

            <details className="text-xs text-slate-300">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200">
                查看分段（含词级时间戳）
              </summary>
              <pre className="whitespace-pre-wrap bg-slate-950/50 text-slate-200 p-3 rounded-lg border border-slate-800 mt-2 overflow-auto">
                {JSON.stringify(result.segments, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
