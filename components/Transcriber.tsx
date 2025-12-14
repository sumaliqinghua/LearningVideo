import React, { useState } from 'react';
import { transcribeFile, TranscribeResult } from '@/services/transcribe';

export default function Transcriber() {
  const [status, setStatus] = useState<'idle'|'running'|'done'|'error'>("idle");
  const [result, setResult] = useState<TranscribeResult | null>(null);
  const [errMsg, setErrMsg] = useState<string>("");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
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

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{padding:16}}>
      <h2 style={{fontWeight:700, marginBottom:12}}>Transcriber (faster-whisper)</h2>
      <input type="file" accept="video/*,audio/*" onChange={onFileChange} />
      {status === 'running' && <p>转写中… 这可能需要几分钟（首次会自动下载模型）。</p>}
      {status === 'error' && <p style={{color:'tomato'}}>Error: {errMsg}</p>}
      {status === 'done' && result && (
        <div style={{marginTop:16}}>
          <h3>详细文稿</h3>
          <pre style={{whiteSpace:'pre-wrap', background:'#0b1220', color:'#cbd5e1', padding:12, borderRadius:8}}>
            {result.full_text}
          </pre>
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <button onClick={()=>download(result.srt, 'output.srt', 'text/plain')}>下载 SRT</button>
            <button onClick={()=>download(result.vtt, 'output.vtt', 'text/vtt')}>下载 VTT</button>
          </div>
          <details style={{marginTop:12}}>
            <summary>查看分段（含词级时间戳）</summary>
            <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result.segments, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}