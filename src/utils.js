/**
 * Utility functions for Gmail Audio Recorder.
 */

/**
 * Format seconds as MM:SS string.
 * @param {number} sec — total seconds (non-negative integer)
 * @returns {string} — formatted time, e.g. "02:35"
 */
function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  sec = Math.floor(sec);
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Generate a timestamped filename for voice recordings.
 * @param {Date} [date] — optional date (defaults to now)
 * @returns {string} — e.g. "voice_message_20260331_143022.wav"
 */
function generateFilename(date) {
  const d = date || new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `voice_message_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.wav`;
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str — raw string
 * @returns {string} — escaped string safe for innerHTML
 */
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * Validate a Chrome extension manifest object.
 * @param {object} manifest — parsed manifest.json
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateManifest(manifest) {
  const errors = [];

  if (!manifest) {
    return { valid: false, errors: ["Manifest is null or undefined"] };
  }

  if (manifest.manifest_version !== 3) {
    errors.push(`Expected manifest_version 3, got ${manifest.manifest_version}`);
  }

  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("Missing or invalid 'name' field");
  }

  if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push(`Invalid version format: '${manifest.version}' (expected x.y.z)`);
  }

  if (!manifest.content_scripts || !Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
    errors.push("Missing content_scripts");
  } else {
    const cs = manifest.content_scripts[0];
    if (!cs.matches || !cs.matches.includes("https://mail.google.com/*")) {
      errors.push("content_scripts must match https://mail.google.com/*");
    }
  }

  if (!manifest.icons || !manifest.icons["128"]) {
    errors.push("Missing 128px icon");
  }

  return { valid: errors.length === 0, errors };
}

// Export for both Node (tests) and browser (content script)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatTime, generateFilename, escapeHtml, validateManifest };
}
