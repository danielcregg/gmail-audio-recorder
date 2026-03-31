/**
 * WAV Encoder — Encodes raw PCM Float32 audio samples into a WAV file blob.
 *
 * WAV format spec: http://soundfile.sapp.org/doc/WaveFormat/
 * Produces 16-bit mono PCM at the given sample rate.
 */

/**
 * Write an ASCII string into a DataView at the given byte offset.
 * @param {DataView} view
 * @param {number} offset
 * @param {string} str
 */
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Clamp a float sample to the [-1, 1] range and convert to Int16.
 * @param {number} sample — floating point sample in [-1, 1]
 * @returns {number} — integer in [-32768, 32767]
 */
function floatToInt16(sample) {
  const clamped = Math.max(-1, Math.min(1, sample));
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
}

/**
 * Encode PCM Float32 samples into a WAV Blob.
 * @param {Float32Array} samples — mono audio samples in [-1, 1]
 * @param {number} sampleRate — e.g. 44100 or 48000
 * @returns {Blob} — audio/wav Blob
 */
function encodeWAV(samples, sampleRate) {
  if (!(samples instanceof Float32Array)) {
    throw new TypeError("samples must be a Float32Array");
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError("sampleRate must be a positive number");
  }

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataLength = samples.length * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataLength);
  const view = new DataView(buffer);

  // ── RIFF header ──
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);  // file size - 8
  writeString(view, 8, "WAVE");

  // ── fmt sub-chunk ──
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);              // sub-chunk size (16 for PCM)
  view.setUint16(20, 1, true);               // audio format (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // ── data sub-chunk ──
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // ── PCM samples (float32 → int16) ──
  let offset = headerSize;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, floatToInt16(samples[i]), true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Export for both Node (tests) and browser (content script)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { encodeWAV, floatToInt16, writeString };
}
