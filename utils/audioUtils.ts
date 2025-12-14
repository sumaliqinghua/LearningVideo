/**
 * Decodes the audio track from a video file.
 */
export const decodeAudioFromFile = async (file: File): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  // Create a temporary offline context just for decoding to avoid limits/running contexts
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  // We can close this context immediately after decoding
  if (ctx.state !== 'closed') {
    void ctx.close();
  }
  return audioBuffer;
};

/**
 * Slices an AudioBuffer from start time for a specific duration.
 */
export const sliceAudioBuffer = (
  originalBuffer: AudioBuffer, 
  endTime: number, 
  duration: number
): AudioBuffer => {
  const sampleRate = originalBuffer.sampleRate;
  const channels = originalBuffer.numberOfChannels;
  
  // Calculate start time (ensure it's not negative)
  const startTime = Math.max(0, endTime - duration);
  const realDuration = endTime - startTime;
  
  const startFrame = Math.floor(startTime * sampleRate);
  const endFrame = Math.floor(endTime * sampleRate);
  const frameCount = endFrame - startFrame;

  if (frameCount <= 0) {
     // Return an empty buffer if invalid
     const ctx = new AudioContext(); 
     return ctx.createBuffer(1, 1, sampleRate);
  }

  // Create a new buffer for the slice
  // We need a dummy context to create a buffer, or just use the constructor if available (safest to use context)
  // To avoid creating contexts repeatedly, we construct manually if possible, but createBuffer is bound to context.
  // Optimization: Just return the raw data arrays? No, we need an AudioBuffer structure for the next step usually,
  // but for WAV encoding we just need the ChannelData. 
  // Let's keep it simple and create a context.
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const newBuffer = ctx.createBuffer(channels, frameCount, sampleRate);

  for (let i = 0; i < channels; i++) {
    const channelData = originalBuffer.getChannelData(i);
    // Copy the segment
    const slice = channelData.slice(startFrame, endFrame);
    newBuffer.copyToChannel(slice, i);
  }
  
  if (ctx.state !== 'closed') void ctx.close();
  return newBuffer;
};

/**
 * Encodes an AudioBuffer to a WAV Blob (16-bit PCM).
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result: Float32Array;
  
  // Interleave channels if stereo
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }
  
  return encodeWAV(result, numChannels, sampleRate, bitDepth);
};

function encodeWAV(samples: Float32Array, numChannels: number, sampleRate: number, bitDepth: number) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);
  
  floatTo16BitPCM(view, 44, samples);
  
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts a Blob to a Base64 string (without data prefix).
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; // Remove "data:audio/wav;base64,"
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};