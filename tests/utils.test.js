const { formatTime, generateFilename, escapeHtml, validateManifest } = require("../src/utils");

describe("Utility Functions", () => {

  // ── formatTime ──

  describe("formatTime", () => {
    test("formats 0 seconds as 00:00", () => {
      expect(formatTime(0)).toBe("00:00");
    });

    test("formats seconds under a minute", () => {
      expect(formatTime(5)).toBe("00:05");
      expect(formatTime(30)).toBe("00:30");
      expect(formatTime(59)).toBe("00:59");
    });

    test("formats exact minutes", () => {
      expect(formatTime(60)).toBe("01:00");
      expect(formatTime(120)).toBe("02:00");
      expect(formatTime(600)).toBe("10:00");
    });

    test("formats minutes and seconds", () => {
      expect(formatTime(65)).toBe("01:05");
      expect(formatTime(90)).toBe("01:30");
      expect(formatTime(754)).toBe("12:34");
    });

    test("handles large values", () => {
      expect(formatTime(3599)).toBe("59:59");
      expect(formatTime(3600)).toBe("60:00");
    });

    test("floors floating point seconds", () => {
      expect(formatTime(5.7)).toBe("00:05");
      expect(formatTime(59.999)).toBe("00:59");
    });

    test("returns 00:00 for negative values", () => {
      expect(formatTime(-1)).toBe("00:00");
      expect(formatTime(-100)).toBe("00:00");
    });

    test("returns 00:00 for NaN", () => {
      expect(formatTime(NaN)).toBe("00:00");
    });

    test("returns 00:00 for Infinity", () => {
      expect(formatTime(Infinity)).toBe("00:00");
    });
  });

  // ── generateFilename ──

  describe("generateFilename", () => {
    test("returns string ending with .wav", () => {
      const name = generateFilename();
      expect(name).toMatch(/\.wav$/);
    });

    test("starts with voice_message_ prefix", () => {
      const name = generateFilename();
      expect(name).toMatch(/^voice_message_/);
    });

    test("contains date and time components", () => {
      const date = new Date(2026, 2, 31, 14, 30, 22); // March 31, 2026 14:30:22
      const name = generateFilename(date);
      expect(name).toBe("voice_message_20260331_143022.wav");
    });

    test("zero-pads single-digit months and days", () => {
      const date = new Date(2026, 0, 5, 9, 3, 7); // Jan 5, 2026 09:03:07
      const name = generateFilename(date);
      expect(name).toBe("voice_message_20260105_090307.wav");
    });

    test("handles midnight correctly", () => {
      const date = new Date(2026, 11, 25, 0, 0, 0); // Dec 25, 2026 00:00:00
      const name = generateFilename(date);
      expect(name).toBe("voice_message_20261225_000000.wav");
    });

    test("uses current date when no argument provided", () => {
      const name = generateFilename();
      const year = new Date().getFullYear().toString();
      expect(name).toContain(year);
    });

    test("filename has no spaces or special characters", () => {
      const name = generateFilename();
      expect(name).toMatch(/^[a-z0-9_.]+$/);
    });
  });

  // ── escapeHtml ──

  describe("escapeHtml", () => {
    test("escapes ampersand", () => {
      expect(escapeHtml("a&b")).toBe("a&amp;b");
    });

    test("escapes less-than", () => {
      expect(escapeHtml("<div>")).toBe("&lt;div&gt;");
    });

    test("escapes greater-than", () => {
      expect(escapeHtml("a > b")).toBe("a &gt; b");
    });

    test("escapes double quotes", () => {
      expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
    });

    test("escapes single quotes", () => {
      expect(escapeHtml("it's")).toBe("it&#039;s");
    });

    test("escapes multiple special characters", () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
      );
    });

    test("returns empty string for null/undefined", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });

    test("returns empty string for non-string input", () => {
      expect(escapeHtml(42)).toBe("");
      expect(escapeHtml({})).toBe("");
    });

    test("passes through safe strings unchanged", () => {
      expect(escapeHtml("Hello world 123")).toBe("Hello world 123");
    });

    test("handles empty string", () => {
      expect(escapeHtml("")).toBe("");
    });
  });

  // ── validateManifest ──

  describe("validateManifest", () => {
    const validManifest = {
      manifest_version: 3,
      name: "Gmail Audio Recorder",
      version: "1.0.0",
      content_scripts: [
        {
          matches: ["https://mail.google.com/*"],
          js: ["content.js"],
        },
      ],
      icons: { "128": "icons/icon128.png" },
    };

    test("validates a correct manifest", () => {
      const result = validateManifest(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects null manifest", () => {
      const result = validateManifest(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects wrong manifest_version", () => {
      const result = validateManifest({ ...validManifest, manifest_version: 2 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("manifest_version"))).toBe(true);
    });

    test("rejects missing name", () => {
      const { name, ...noName } = validManifest;
      const result = validateManifest(noName);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });

    test("rejects invalid version format", () => {
      const result = validateManifest({ ...validManifest, version: "1.0" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    test("rejects missing content_scripts", () => {
      const { content_scripts, ...noCScripts } = validManifest;
      const result = validateManifest(noCScripts);
      expect(result.valid).toBe(false);
    });

    test("rejects content_scripts without Gmail match", () => {
      const manifest = {
        ...validManifest,
        content_scripts: [{ matches: ["https://example.com/*"], js: ["content.js"] }],
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("mail.google.com"))).toBe(true);
    });

    test("rejects missing 128px icon", () => {
      const result = validateManifest({ ...validManifest, icons: { "16": "icon16.png" } });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("128px"))).toBe(true);
    });

    test("accumulates multiple errors", () => {
      const result = validateManifest({ manifest_version: 2 });
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });
});
