const { encodeWAV, floatToInt16, writeString } = require("../src/wav-encoder");

/**
 * Helper: read a Blob as an ArrayBuffer in jsdom
 * (jsdom Blob doesn't support .arrayBuffer())
 */
function blobToArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe("WAV Encoder", () => {

  // ── floatToInt16 ──

  describe("floatToInt16", () => {
    test("converts silence (0.0) to 0", () => {
      expect(floatToInt16(0)).toBe(0);
    });

    test("converts max positive (1.0) to 32767", () => {
      expect(floatToInt16(1.0)).toBe(0x7FFF);
    });

    test("converts max negative (-1.0) to -32768", () => {
      expect(floatToInt16(-1.0)).toBe(-0x8000);
    });

    test("clamps values above 1.0", () => {
      expect(floatToInt16(1.5)).toBe(0x7FFF);
      expect(floatToInt16(999)).toBe(0x7FFF);
    });

    test("clamps values below -1.0", () => {
      expect(floatToInt16(-1.5)).toBe(-0x8000);
      expect(floatToInt16(-999)).toBe(-0x8000);
    });

    test("converts mid-range positive value", () => {
      const result = floatToInt16(0.5);
      expect(result).toBeCloseTo(0x7FFF * 0.5, -1);
    });

    test("converts mid-range negative value", () => {
      const result = floatToInt16(-0.5);
      expect(result).toBeCloseTo(-0x8000 * 0.5, -1);
    });
  });

  // ── writeString ──

  describe("writeString", () => {
    test("writes ASCII string at offset 0", () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      writeString(view, 0, "RIFF");
      expect(view.getUint8(0)).toBe(82);  // R
      expect(view.getUint8(1)).toBe(73);  // I
      expect(view.getUint8(2)).toBe(70);  // F
      expect(view.getUint8(3)).toBe(70);  // F
    });

    test("writes ASCII string at non-zero offset", () => {
      const buffer = new ArrayBuffer(12);
      const view = new DataView(buffer);
      writeString(view, 8, "WAVE");
      expect(view.getUint8(8)).toBe(87);   // W
      expect(view.getUint8(9)).toBe(65);   // A
      expect(view.getUint8(10)).toBe(86);  // V
      expect(view.getUint8(11)).toBe(69);  // E
    });

    test("does not modify bytes outside the string", () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setUint8(0, 0xFF);
      view.setUint8(3, 0xFF);
      writeString(view, 1, "AB");
      expect(view.getUint8(0)).toBe(0xFF);
      expect(view.getUint8(1)).toBe(65);
      expect(view.getUint8(2)).toBe(66);
      expect(view.getUint8(3)).toBe(0xFF);
    });
  });

  // ── encodeWAV ──

  describe("encodeWAV", () => {
    const sampleRate = 44100;

    test("returns a Blob with audio/wav MIME type", () => {
      const samples = new Float32Array([0, 0.5, -0.5]);
      const blob = encodeWAV(samples, sampleRate);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/wav");
    });

    test("output size = 44 header + (samples × 2) bytes", () => {
      const numSamples = 100;
      const samples = new Float32Array(numSamples);
      const blob = encodeWAV(samples, sampleRate);
      expect(blob.size).toBe(44 + numSamples * 2);
    });

    test("handles empty Float32Array (header only)", () => {
      const samples = new Float32Array(0);
      const blob = encodeWAV(samples, sampleRate);
      expect(blob.size).toBe(44);
    });

    test("WAV header has correct RIFF chunk descriptor", async () => {
      const samples = new Float32Array([0.1, 0.2, 0.3]);
      const blob = encodeWAV(samples, sampleRate);
      const buffer = await blobToArrayBuffer(blob);
      const view = new DataView(buffer);

      // "RIFF"
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe("RIFF");
      // File size - 8
      expect(view.getUint32(4, true)).toBe(blob.size - 8);
      // "WAVE"
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe("WAVE");
    });

    test("WAV header has correct fmt sub-chunk", async () => {
      const samples = new Float32Array(10);
      const blob = encodeWAV(samples, sampleRate);
      const buffer = await blobToArrayBuffer(blob);
      const view = new DataView(buffer);

      // "fmt "
      expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe("fmt ");
      // Sub-chunk size = 16 (PCM)
      expect(view.getUint32(16, true)).toBe(16);
      // Audio format = 1 (PCM)
      expect(view.getUint16(20, true)).toBe(1);
      // Channels = 1 (mono)
      expect(view.getUint16(22, true)).toBe(1);
      // Sample rate
      expect(view.getUint32(24, true)).toBe(sampleRate);
      // Byte rate = sampleRate × 1 × 2
      expect(view.getUint32(28, true)).toBe(sampleRate * 2);
      // Block align = 2
      expect(view.getUint16(32, true)).toBe(2);
      // Bits per sample = 16
      expect(view.getUint16(34, true)).toBe(16);
    });

    test("WAV header has correct data sub-chunk", async () => {
      const samples = new Float32Array(5);
      const blob = encodeWAV(samples, sampleRate);
      const buffer = await blobToArrayBuffer(blob);
      const view = new DataView(buffer);

      // "data"
      expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe("data");
      // Data size = samples × 2
      expect(view.getUint32(40, true)).toBe(10);
    });

    test("encodes a known sample correctly in the data section", async () => {
      const samples = new Float32Array([1.0]);
      const blob = encodeWAV(samples, 44100);
      const buffer = await blobToArrayBuffer(blob);
      const view = new DataView(buffer);
      expect(view.getInt16(44, true)).toBe(32767);
    });

    test("encodes silence as zeros in data section", async () => {
      const samples = new Float32Array([0, 0, 0]);
      const blob = encodeWAV(samples, 44100);
      const buffer = await blobToArrayBuffer(blob);
      const view = new DataView(buffer);
      expect(view.getInt16(44, true)).toBe(0);
      expect(view.getInt16(46, true)).toBe(0);
      expect(view.getInt16(48, true)).toBe(0);
    });

    test("works with 48000 Hz sample rate", async () => {
      const samples = new Float32Array(10);
      const blob = encodeWAV(samples, 48000);
      const buffer = await blobToArrayBuffer(blob);
      const view = new DataView(buffer);
      expect(view.getUint32(24, true)).toBe(48000);
      expect(view.getUint32(28, true)).toBe(96000);
    });

    test("throws TypeError for non-Float32Array input", () => {
      expect(() => encodeWAV([0.1, 0.2], 44100)).toThrow(TypeError);
      expect(() => encodeWAV("audio", 44100)).toThrow(TypeError);
      expect(() => encodeWAV(null, 44100)).toThrow(TypeError);
    });

    test("throws RangeError for invalid sample rate", () => {
      const samples = new Float32Array(1);
      expect(() => encodeWAV(samples, 0)).toThrow(RangeError);
      expect(() => encodeWAV(samples, -44100)).toThrow(RangeError);
      expect(() => encodeWAV(samples, NaN)).toThrow(RangeError);
      expect(() => encodeWAV(samples, Infinity)).toThrow(RangeError);
    });
  });
});
