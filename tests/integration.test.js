const fs = require("fs");
const path = require("path");
const { validateManifest } = require("../src/utils");

const ROOT = path.resolve(__dirname, "..");

describe("Extension Integration", () => {

  // ── Manifest validation ──

  describe("manifest.json", () => {
    let manifest;

    beforeAll(() => {
      const raw = fs.readFileSync(path.join(ROOT, "manifest.json"), "utf-8");
      manifest = JSON.parse(raw);
    });

    test("is valid JSON", () => {
      expect(manifest).toBeDefined();
      expect(typeof manifest).toBe("object");
    });

    test("passes manifest validation", () => {
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("uses Manifest V3", () => {
      expect(manifest.manifest_version).toBe(3);
    });

    test("targets only mail.google.com", () => {
      const matches = manifest.content_scripts[0].matches;
      expect(matches).toContain("https://mail.google.com/*");
      expect(matches).toHaveLength(1);
    });

    test("declares no unnecessary permissions", () => {
      expect(manifest.permissions || []).toEqual([]);
    });

    test("has a description", () => {
      expect(manifest.description).toBeDefined();
      expect(manifest.description.length).toBeGreaterThan(10);
    });
  });

  // ── File existence checks ──

  describe("required files exist", () => {
    const requiredFiles = [
      "manifest.json",
      "content.js",
      "styles.css",
      "icons/icon16.png",
      "icons/icon48.png",
      "icons/icon128.png",
      "LICENSE",
      "README.md",
    ];

    test.each(requiredFiles)("%s exists", (file) => {
      const filePath = path.join(ROOT, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  // ── Icon validation ──

  describe("icons", () => {
    const iconFiles = [
      "icons/icon16.png",
      "icons/icon48.png",
      "icons/icon128.png",
    ];

    test.each(iconFiles)("%s is a valid PNG", (file) => {
      const filePath = path.join(ROOT, file);
      const buffer = fs.readFileSync(filePath);
      // PNG magic bytes: 89 50 4E 47
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4E);
      expect(buffer[3]).toBe(0x47);
    });

    test("all icons referenced in manifest exist", () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf-8"));
      for (const [_size, iconPath] of Object.entries(manifest.icons)) {
        expect(fs.existsSync(path.join(ROOT, iconPath))).toBe(true);
      }
    });
  });

  // ── Content script validation ──

  describe("content.js", () => {
    let source;

    beforeAll(() => {
      source = fs.readFileSync(path.join(ROOT, "content.js"), "utf-8");
    });

    test("is wrapped in an IIFE", () => {
      // Strip leading block comments and whitespace, then check for (
      const stripped = source.replace(/^\s*(\/\*[\s\S]*?\*\/\s*)*/g, "").trim();
      expect(stripped.startsWith("(")).toBe(true);
    });

    test("uses strict mode", () => {
      expect(source).toContain('"use strict"');
    });

    test("references WAV MIME type (not webm)", () => {
      expect(source).toContain("audio/wav");
      expect(source).not.toContain("audio/webm");
    });

    test("includes speech recognition setup", () => {
      expect(source).toContain("SpeechRecognition");
      expect(source).toContain("webkitSpeechRecognition");
    });

    test("observes DOM for compose windows", () => {
      expect(source).toContain("MutationObserver");
    });

    test("uses WeakSet for processed element tracking", () => {
      expect(source).toContain("WeakSet");
    });

    test("does not contain console.log (only console.warn)", () => {
      const lines = source.split("\n");
      const logLines = lines.filter((l) => /console\.log\b/.test(l) && !l.trim().startsWith("//"));
      expect(logLines).toHaveLength(0);
    });

    test("includes XSS-safe HTML escaping", () => {
      expect(source).toContain("escapeHtml");
    });

    test("handles microphone permission denial gracefully", () => {
      expect(source).toContain("Microphone access denied");
    });
  });

  // ── CSS validation ──

  describe("styles.css", () => {
    let css;

    beforeAll(() => {
      css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf-8");
    });

    test("uses gar- prefix for all custom classes", () => {
      const classRegex = /\.([\w-]+)\s*[{,:[]/g;
      let match;
      const nonPrefixed = [];
      while ((match = classRegex.exec(css)) !== null) {
        const cls = match[1];
        if (!cls.startsWith("gar-")) {
          nonPrefixed.push(cls);
        }
      }
      expect(nonPrefixed).toEqual([]);
    });

    test("includes recording animation keyframes", () => {
      expect(css).toContain("@keyframes gar-pulse");
    });

    test("has styles for all three states", () => {
      expect(css).toContain("gar-state-idle");
      expect(css).toContain("gar-state-recording");
      expect(css).toContain("gar-state-done");
    });

    test("panel uses absolute positioning (overlay, no scroll)", () => {
      expect(css).toContain("position: absolute");
      expect(css).toContain("bottom: 100%");
    });

    test("panel has a high z-index", () => {
      expect(css).toContain("z-index: 9999");
    });
  });
});
