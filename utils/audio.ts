
// Decodes a base64 string into a Uint8Array.
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Encodes raw PCM data (Int16Array) into a WAV file format (Blob).
function encodeWAV(samples: Int16Array, sampleRate: number, numChannels: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write the PCM samples
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Creates a WAV Blob from base64 encoded raw PCM audio data.
function createWavBlob(base64Audio: string): Blob {
  const rawData = decode(base64Audio);
  const pcmData = new Int16Array(rawData.buffer);

  // Gemini TTS model for `generateContent` has a sample rate of 24000
  const sampleRate = 24000; 
  const numChannels = 1;

  const wavBlob = encodeWAV(pcmData, sampleRate, numChannels);
  return wavBlob;
}


// Main function to convert base64 raw audio to a WAV Blob URL.
export function createWavUrl(base64Audio: string): string {
  const wavBlob = createWavBlob(base64Audio);
  const url = URL.createObjectURL(wavBlob);
  return url;
}
