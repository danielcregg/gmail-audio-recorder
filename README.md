# Gmail Audio Recorder

A Chrome extension that adds audio recording with live transcription directly into Gmail's compose window.

## Features

- **🎤 Record Button** — Appears next to Gmail's Send/Schedule button in every compose window
- **📊 Live Waveform Visualizer** — Real-time audio visualization while recording
- **📝 Live Transcription** — Speech-to-text via Chrome's Web Speech API as you speak
- **📎 WAV Attachment** — Records in WAV format for universal playback (no codec issues for recipients)
- **💬 Transcript in Email Body** — Optionally inserts a styled transcript block into the email so recipients can read without opening the attachment
- **⏱️ Timer** — Shows recording duration
- **▶️ Playback** — Preview your recording before attaching

## Installation

1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the project folder
5. Open Gmail and compose a new email — the mic button will appear next to Send

## How It Works

1. Click the **🎤 mic button** next to the Send/Schedule button
2. Click **Start Recording** — the waveform visualizer and live transcript will activate
3. Speak your message — the transcript appears in real-time
4. Click **Stop** when done
5. **Play** to preview, then **Attach** to add to the email or **Discard** to start over

When you attach:
- The **WAV audio file** is attached to the email
- A **formatted transcript** is inserted into the email body (toggle this off via the checkbox if you prefer audio-only)

## Why WAV?

WAV is the most universally supported audio format. Unlike WebM or OGG, every email client, operating system, and device can play WAV files natively — no downloads, no codecs, no friction for the recipient.

## File Structure

```
├── manifest.json    # Chrome Extension Manifest V3
├── content.js       # Main content script (recording, transcription, Gmail injection)
├── styles.css       # UI styles for the recorder panel and button
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Permissions

- **Host permission**: `https://mail.google.com/*` — to inject the recorder into Gmail
- **Microphone access** — requested at recording time via the browser's standard permission prompt

No data is sent to any external server. Audio recording, transcription (via Chrome's built-in Web Speech API), and attachment all happen locally in the browser.

## Limitations

- **Gmail DOM selectors**: Gmail's internal class names can change with updates. If the button stops appearing, the selectors in `content.js` may need updating.
- **Transcription accuracy**: Depends on Chrome's Web Speech API — works well for clear speech in supported languages, but isn't perfect.
- **File size**: WAV files are uncompressed. A 1-minute recording is roughly 5 MB. For very long recordings, consider keeping messages concise.

## License

MIT
