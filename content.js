/**
 * Gmail Audio Recorder — Content Script
 * - Mic button placed to the right of the Send + Schedule Send group
 * - Records audio as WAV (universally playable)
 * - Live transcription via Chrome's Web Speech API
 * - On attach: inserts transcript into email body + attaches WAV file
 */

(() => {
  "use strict";

  /* ── SVG Icons ── */
  const ICONS = {
    mic: `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`,
    stop: `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    attach: `<svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>`,
    discard: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    audio: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`,
  };

  /* ── Helpers ── */
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => ctx.querySelectorAll(sel);

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function generateFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `voice_message_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.wav`;
  }

  /* ── WAV Encoder ── */
  function encodeWAV(samples, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataLength = samples.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /* ── Per-compose-window Recorder ── */
  class ComposeRecorder {
    constructor(composeEl) {
      this.compose = composeEl;
      this.state = "idle";
      this.audioChunks = [];
      this.audioBlob = null;
      this.audioUrl = null;
      this.audioEl = null;
      this.analyser = null;
      this.animFrame = null;
      this.timerInterval = null;
      this.seconds = 0;
      this.stream = null;
      this._audioCtx = null;
      this._scriptNode = null;
      this._sampleRate = 44100;

      // Transcription state
      this._recognition = null;
      this._finalTranscript = "";
      this._interimTranscript = "";
      this._includeTranscript = true;

      this._injectButton();
      this._injectPanel();
    }

    /* ══════════════════════════════════════════════
       BUTTON PLACEMENT — right of Send + Schedule
       ══════════════════════════════════════════════ */
    _injectButton() {
      // Strategy: Find the Send button, then find the Schedule Send dropdown
      // next to it, and insert our button after that entire group.

      const sendBtn =
        qs('.T-I.J-J5-Ji.aoO', this.compose) ||
        qs('[data-tooltip*="Send"]', this.compose) ||
        qs('[aria-label*="Send"]', this.compose);

      if (!sendBtn) return;

      // The Schedule Send dropdown is the arrow button right next to Send.
      // It's typically the next sibling element of the Send button, or they
      // share a common parent wrapper (a <td> or <div>).
      // Gmail structures this as: [Send btn] [Schedule dropdown] inside a cell.

      // Find the containing cell/wrapper for the Send+Schedule group
      let sendGroup = sendBtn.parentElement;

      // Walk up at most 2 levels to find the <td> or wrapper that holds both
      // Send and Schedule together
      for (let i = 0; i < 2; i++) {
        if (sendGroup && sendGroup.tagName === "TD") break;
        if (sendGroup && sendGroup.parentElement) {
          sendGroup = sendGroup.parentElement;
        }
      }

      const btn = document.createElement("button");
      btn.className = "gar-record-btn";
      btn.setAttribute("data-tooltip", "Record audio message");
      btn.setAttribute("aria-label", "Record audio message");
      btn.innerHTML = ICONS.mic;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._togglePanel();
      });

      // Insert after the Send+Schedule group's parent container
      if (sendGroup && sendGroup.nextSibling) {
        sendGroup.parentElement.insertBefore(btn, sendGroup.nextSibling);
      } else if (sendGroup) {
        sendGroup.parentElement.appendChild(btn);
      } else {
        // Absolute fallback: next to Send directly
        sendBtn.parentElement.insertBefore(btn, sendBtn.nextSibling);
      }

      this.btn = btn;
    }

    /* ══════════════════════════════════════════════
       PANEL — floating overlay with transcript area
       ══════════════════════════════════════════════ */
    _injectPanel() {
      const panel = document.createElement("div");
      panel.className = "gar-panel gar-state-idle";
      panel.innerHTML = `
        <div class="gar-panel-header">
          <div class="gar-panel-title">
            ${ICONS.mic}
            <span>Audio Recorder</span>
          </div>
          <button class="gar-panel-close" aria-label="Close">${ICONS.close}</button>
        </div>

        <div class="gar-visualizer-wrap">
          <canvas class="gar-visualizer"></canvas>
          <div class="gar-timer">00:00</div>
        </div>

        <div class="gar-transcript-wrap">
          <div class="gar-transcript-label">Live Transcript</div>
          <div class="gar-transcript" aria-live="polite"></div>
          <div class="gar-transcript-toggle">
            <input type="checkbox" id="gar-include-transcript" checked>
            <label for="gar-include-transcript">Include transcript in email body</label>
          </div>
        </div>

        <div class="gar-controls">
          <div class="gar-pre-controls">
            <button class="gar-ctrl-btn gar-btn-record">
              ${ICONS.mic} Start Recording
            </button>
          </div>
          <div class="gar-rec-controls">
            <button class="gar-ctrl-btn gar-btn-stop">
              ${ICONS.stop} Stop
            </button>
          </div>
          <div class="gar-post-controls">
            <button class="gar-ctrl-btn gar-btn-play">
              ${ICONS.play} Play
            </button>
            <button class="gar-ctrl-btn gar-btn-attach">
              ${ICONS.attach} Attach
            </button>
            <button class="gar-ctrl-btn gar-btn-discard">
              ${ICONS.discard} Discard
            </button>
          </div>
        </div>
      `;

      // Anchor to bottom toolbar
      const toolbar = qs(".btC", this.compose);
      if (toolbar) {
        toolbar.style.position = "relative";
        toolbar.appendChild(panel);
      } else {
        this.compose.style.position = "relative";
        this.compose.appendChild(panel);
      }

      this.panel = panel;
      this.canvas = qs(".gar-visualizer", panel);
      this.timerEl = qs(".gar-timer", panel);
      this.transcriptEl = qs(".gar-transcript", panel);
      this.transcriptCheckbox = qs("#gar-include-transcript", panel);

      // Make checkbox ID unique per compose window
      const uid = "gar-cb-" + Math.random().toString(36).slice(2, 8);
      this.transcriptCheckbox.id = uid;
      qs(".gar-transcript-toggle label", panel).setAttribute("for", uid);

      // Sync checkbox
      this.transcriptCheckbox.addEventListener("change", () => {
        this._includeTranscript = this.transcriptCheckbox.checked;
      });

      // Prevent clicks from bubbling to Gmail
      panel.addEventListener("mousedown", (e) => e.stopPropagation());

      // Wire events
      qs(".gar-panel-close", panel).addEventListener("click", () => this._hidePanel());
      qs(".gar-btn-record", panel).addEventListener("click", () => this._startRecording());
      qs(".gar-btn-stop", panel).addEventListener("click", () => this._stopRecording());
      qs(".gar-btn-play", panel).addEventListener("click", () => this._togglePlayback());
      qs(".gar-btn-attach", panel).addEventListener("click", () => this._attachAudio());
      qs(".gar-btn-discard", panel).addEventListener("click", () => this._discard());
    }

    /* ── Panel visibility ── */
    _togglePanel() {
      this.panel.classList.toggle("gar-visible");
    }

    _hidePanel() {
      this.panel.classList.remove("gar-visible");
      if (this.state === "recording") this._stopRecording();
    }

    /* ── State management ── */
    _setState(s) {
      this.state = s;
      this.panel.classList.remove("gar-state-idle", "gar-state-recording", "gar-state-done");
      this.panel.classList.add(`gar-state-${s}`);
      this.btn.classList.toggle("gar-recording", s === "recording");
    }

    /* ══════════════════════════════════════════════
       RECORDING — captures PCM for WAV + runs speech recognition
       ══════════════════════════════════════════════ */
    async _startRecording() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        alert("Microphone access denied. Please allow microphone permissions and try again.");
        return;
      }

      this.audioChunks = [];
      this.seconds = 0;
      this._finalTranscript = "";
      this._interimTranscript = "";
      this.transcriptEl.innerHTML = "";
      this.timerEl.textContent = "00:00";
      this.timerEl.classList.add("gar-recording-active");

      // ── Audio context + analyser ──
      const audioCtx = new AudioContext();
      this._audioCtx = audioCtx;
      this._sampleRate = audioCtx.sampleRate;
      const source = audioCtx.createMediaStreamSource(this.stream);

      this.analyser = audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // ── ScriptProcessor for raw PCM capture ──
      const bufferSize = 4096;
      this._scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      this._scriptNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        this.audioChunks.push(new Float32Array(input));
      };
      source.connect(this._scriptNode);
      this._scriptNode.connect(audioCtx.destination);

      // ── Start speech recognition ──
      this._startSpeechRecognition();

      // ── Timer ──
      this.timerInterval = setInterval(() => {
        this.seconds++;
        this.timerEl.textContent = formatTime(this.seconds);
      }, 1000);

      this._setState("recording");
      this._drawVisualizer();
    }

    _stopRecording() {
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
        this.stream = null;
      }

      if (this._scriptNode) {
        this._scriptNode.disconnect();
        this._scriptNode = null;
      }

      clearInterval(this.timerInterval);
      cancelAnimationFrame(this.animFrame);
      this.timerEl.classList.remove("gar-recording-active");

      // Stop speech recognition
      this._stopSpeechRecognition();

      // Build WAV
      this._buildWAV();

      if (this._audioCtx) {
        this._audioCtx.close();
        this._audioCtx = null;
      }
    }

    _buildWAV() {
      const totalLength = this.audioChunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      this.audioBlob = encodeWAV(merged, this._sampleRate);
      this.audioUrl = URL.createObjectURL(this.audioBlob);
      this.audioEl = new Audio(this.audioUrl);
      this._setState("done");
      this._drawStaticWaveform();
    }

    /* ══════════════════════════════════════════════
       SPEECH RECOGNITION — Chrome's Web Speech API
       ══════════════════════════════════════════════ */
    _startSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("GAR: Web Speech API not available — transcript disabled.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = "";
        // Process results from the last known final result index onward
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this._finalTranscript += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        this._interimTranscript = interim;
        this._renderTranscript();
      };

      recognition.onerror = (event) => {
        // "no-speech" is harmless, just means silence
        if (event.error !== "no-speech") {
          console.warn("GAR: Speech recognition error:", event.error);
        }
      };

      // Auto-restart if it stops prematurely during recording
      recognition.onend = () => {
        if (this.state === "recording" && this._recognition) {
          try {
            recognition.start();
          } catch (e) {
            // Already started — ignore
          }
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn("GAR: Could not start speech recognition:", e);
      }

      this._recognition = recognition;
    }

    _stopSpeechRecognition() {
      if (this._recognition) {
        const rec = this._recognition;
        this._recognition = null;   // prevent auto-restart in onend
        try { rec.stop(); } catch (e) { /* ignore */ }
      }
      // Clear interim, keep final
      this._interimTranscript = "";
      this._renderTranscript();
    }

    _renderTranscript() {
      const final = this._finalTranscript.trim();
      const interim = this._interimTranscript.trim();

      if (!final && !interim) {
        this.transcriptEl.innerHTML = "";
        return;
      }

      let html = "";
      if (final) html += escapeHtml(final) + " ";
      if (interim) html += `<span class="gar-interim">${escapeHtml(interim)}</span>`;
      this.transcriptEl.innerHTML = html;

      // Auto-scroll to bottom
      this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
    }

    /* ── Playback ── */
    _togglePlayback() {
      if (!this.audioEl) return;
      const playBtn = qs(".gar-btn-play", this.panel);

      if (this.audioEl.paused) {
        this.audioEl.play();
        playBtn.innerHTML = `${ICONS.pause} Pause`;
        this.audioEl.onended = () => {
          playBtn.innerHTML = `${ICONS.play} Play`;
        };
      } else {
        this.audioEl.pause();
        playBtn.innerHTML = `${ICONS.play} Play`;
      }
    }

    /* ══════════════════════════════════════════════
       ATTACH — WAV file + transcript in email body
       ══════════════════════════════════════════════ */
    _attachAudio() {
      if (!this.audioBlob) return;

      const filename = generateFilename();
      const file = new File([this.audioBlob], filename, { type: "audio/wav" });
      const transcript = this._finalTranscript.trim();

      // Insert transcript into the email body if enabled and non-empty
      if (this._includeTranscript && transcript) {
        this._insertTranscriptIntoBody(transcript, filename);
      }

      // Attach the WAV file
      this._attachViaDataTransfer(file, filename);

      this._hidePanel();
      this._reset();
    }

    _insertTranscriptIntoBody(transcript, filename) {
      const editable =
        qs('[role="textbox"][g_editable="true"]', this.compose) ||
        qs(".Am.Al.editable", this.compose) ||
        qs('[contenteditable="true"]', this.compose);

      if (!editable) return;

      // Build a nicely formatted transcript block
      const duration = formatTime(this.seconds);
      const block = document.createElement("div");
      block.innerHTML =
        `<br>` +
        `<div style="border-left:3px solid #1a73e8; padding:8px 12px; margin:8px 0; background:#f8f9fa; border-radius:0 8px 8px 0; font-family:Arial,sans-serif;">` +
          `<div style="font-size:12px; color:#5f6368; margin-bottom:4px;">` +
            `🎤 <strong>Voice Message</strong> — ${duration}` +
          `</div>` +
          `<div style="font-size:14px; color:#202124; line-height:1.5;">${escapeHtml(transcript)}</div>` +
        `</div>` +
        `<br>`;

      // Insert at the beginning of the compose body (before existing content)
      if (editable.firstChild) {
        editable.insertBefore(block, editable.firstChild);
      } else {
        editable.appendChild(block);
      }

      // Trigger Gmail's internal change detection so it knows the body changed
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    }

    _attachViaDataTransfer(file, filename) {
      const dropTarget =
        qs('[role="textbox"][g_editable="true"]', this.compose) ||
        qs(".Am.Al.editable", this.compose) ||
        qs('[contenteditable="true"]', this.compose) ||
        this.compose;

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      for (const evtName of ["dragenter", "dragover", "drop"]) {
        const evt = new DragEvent(evtName, {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        });
        dropTarget.dispatchEvent(evt);
      }

      // Fallback: hidden file input
      this._tryFileInputFallback(file);

      // Visual chip
      this._showAttachmentChip(filename);
    }

    _tryFileInputFallback(file) {
      const fileInputs = qsa('input[type="file"]', this.compose);
      if (fileInputs.length > 0) {
        const input = fileInputs[fileInputs.length - 1];
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    _showAttachmentChip(filename) {
      const chip = document.createElement("div");
      chip.className = "gar-chip";
      chip.innerHTML = `
        ${ICONS.audio}
        <span>${filename} (${formatTime(this.seconds)})</span>
        <button class="gar-chip-remove" aria-label="Remove">×</button>
      `;
      qs(".gar-chip-remove", chip).addEventListener("click", () => chip.remove());

      const btC = qs(".btC", this.compose);
      if (btC) btC.parentElement.insertBefore(chip, btC);
    }

    /* ── Discard & Reset ── */
    _discard() {
      if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
      this._reset();
    }

    _reset() {
      this.audioBlob = null;
      this.audioUrl = null;
      this.audioEl = null;
      this.audioChunks = [];
      this.seconds = 0;
      this._finalTranscript = "";
      this._interimTranscript = "";
      this.transcriptEl.innerHTML = "";
      this.timerEl.textContent = "00:00";

      const playBtn = qs(".gar-btn-play", this.panel);
      if (playBtn) playBtn.innerHTML = `${ICONS.play} Play`;

      this._setState("idle");
      this._clearCanvas();
    }

    /* ── Waveform Visualizer (live) ── */
    _drawVisualizer() {
      const canvas = this.canvas;
      const ctx = canvas.getContext("2d");
      const analyser = this.analyser;
      if (!analyser) return;

      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;

      const draw = () => {
        this.animFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        ctx.clearRect(0, 0, W, H);

        const barCount = 48;
        const gap = 2;
        const barW = (W - gap * (barCount - 1)) / barCount;
        const centerY = H / 2;

        for (let i = 0; i < barCount; i++) {
          const idx = Math.floor((i / barCount) * bufLen);
          const val = data[idx] / 255;
          const barH = Math.max(3, val * (H * 0.8));

          ctx.fillStyle = `rgba(217, 48, 37, ${0.5 + val * 0.5})`;
          ctx.beginPath();
          ctx.roundRect(i * (barW + gap), centerY - barH / 2, barW, barH, barW / 2);
          ctx.fill();
        }
      };

      draw();
    }

    _drawStaticWaveform() {
      const canvas = this.canvas;
      const ctx = canvas.getContext("2d");

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const barCount = 48;
      const gap = 2;
      const barW = (W - gap * (barCount - 1)) / barCount;
      const centerY = H / 2;

      for (let i = 0; i < barCount; i++) {
        const val = 0.15 + 0.3 * Math.sin((i / barCount) * Math.PI);
        const barH = Math.max(3, val * H);
        ctx.fillStyle = "rgba(26, 115, 232, 0.6)";
        ctx.beginPath();
        ctx.roundRect(i * (barW + gap), centerY - barH / 2, barW, barH, barW / 2);
        ctx.fill();
      }
    }

    _clearCanvas() {
      const ctx = this.canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = this.canvas.offsetWidth * dpr;
      this.canvas.height = this.canvas.offsetHeight * dpr;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /* ── HTML escaping ── */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Observer: detect new compose windows ── */
  const PROCESSED = new WeakSet();

  function scanForComposeWindows() {
    const composeEls = qsa(".M9, .AD, .nH .no .nn");

    composeEls.forEach((el) => {
      const hasBody =
        qs('[role="textbox"][g_editable="true"]', el) ||
        qs(".Am.Al.editable", el) ||
        qs('[contenteditable="true"]', el);

      const hasToolbar = qs(".btC", el) || qs('[role="toolbar"]', el);

      if (hasBody && hasToolbar && !PROCESSED.has(el)) {
        PROCESSED.add(el);
        new ComposeRecorder(el);
      }
    });
  }

  const observer = new MutationObserver(() => scanForComposeWindows());
  observer.observe(document.body, { childList: true, subtree: true });

  scanForComposeWindows();
})();
