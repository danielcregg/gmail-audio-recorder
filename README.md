<div align="center">

# 🎤 Gmail Audio Recorder

**Voice messages with live transcription for Gmail**

[![CI](https://github.com/danielcregg/gmail-audio-recorder/actions/workflows/ci.yml/badge.svg)](https://github.com/danielcregg/gmail-audio-recorder/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-88%20passed-brightgreen?logo=jest)](https://github.com/danielcregg/gmail-audio-recorder/actions)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen?logo=jest)](https://github.com/danielcregg/gmail-audio-recorder/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/danielcregg/gmail-audio-recorder/blob/main/LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-4285f4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/danielcregg/gmail-audio-recorder/pulls)
[![GitHub stars](https://img.shields.io/github/stars/danielcregg/gmail-audio-recorder?style=social)](https://github.com/danielcregg/gmail-audio-recorder)

Record audio, get a live transcript, and attach it all to your email — without ever leaving the compose window.

[**Install from Chrome Web Store**](#install) · [**Landing Page**](https://danielcregg.is-a.dev/gmail-audio-recorder/) · [**Report Bug**](https://github.com/danielcregg/gmail-audio-recorder/issues)

---

</div>

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎙️ **One-click recording** | Mic button sits right next to Send/Schedule in every compose window |
| 📝 **Live transcription** | Words appear in real-time via Chrome's Web Speech API — no external services |
| 🎧 **Universal playback** | WAV format plays natively on every device, email client, and OS |
| 💬 **Inline transcript** | Optionally inserts a styled transcript block into the email body |
| 📊 **Waveform visualizer** | Live animated audio visualization while recording |
| 🔒 **Fully private** | All recording and transcription happens on-device — no servers, no accounts |
| ▶️ **Preview** | Play back your recording before attaching |

## 🆓 Why This Extension?

**Gmail Audio Recorder is 100% free, 100% private, with zero limits — forever.**

Every other voice message extension for Gmail either charges a subscription, caps your recordings, or routes your audio through their cloud servers. We don't. Here's how we compare:

| Feature | **Gmail Audio Recorder** | Vocal | Mote | Beep | telbee |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Price** | ✅ Free forever | $9–$20/mo | $49/yr | Free (limited) | $9/mo |
| **Recording limit** | ✅ Unlimited | 1 min (free) | 30–60 sec (free) | Unknown | 60 min/mo (free) |
| **Audio stored on** | ✅ Your device only | Their servers | Their servers | Their servers | Their servers |
| **Live transcription** | ✅ Built-in | Paid tier | Paid tier | ❌ | ❌ |
| **Attaches real audio file** | ✅ WAV file | MP3 (via cloud) | Link to web player | Link to web player | Link to web player |
| **Works offline** | ✅ Yes | ❌ | ❌ | ❌ | ❌ |
| **Open source** | ✅ MIT License | ❌ | ❌ | ❌ | ❌ |
| **Account required** | ✅ None | Yes | Yes (Google) | Yes | Yes |
| **Data sent to servers** | ✅ Nothing. Zero. | Audio uploaded | Audio uploaded | Audio uploaded | Audio uploaded |

> **The bottom line:** Other tools record your voice, upload it to their servers, and give the recipient a link to a web player — often behind a subscription. We attach a real audio file directly to the email. Your audio never leaves your browser. No accounts, no limits, no cloud, no catch.

## 🚀 Install

### Chrome Web Store (recommended)

> **Coming soon** — the extension is currently under review.

### Manual install

1. Download the [latest release](https://github.com/danielcregg/gmail-audio-recorder/archive/refs/heads/main.zip) and unzip it
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the unzipped folder
5. Open Gmail and compose an email — the mic button appears next to Send

## 🎬 How It Works

1. Click the **🎤 mic button** to the right of the Send/Schedule button
2. Click **Start Recording** — the waveform visualizer and live transcript activate
3. Speak your message — words appear in real-time
4. Click **Stop** when done
5. **Play** to preview, then **Attach** to add to the email, or **Discard** to start over

When you attach, the recipient gets:
- A **WAV audio file** as an attachment (plays everywhere with one click)
- A **formatted transcript** in the email body (toggleable via checkbox)

## 🏗️ Architecture

```
gmail-audio-recorder/
├── manifest.json          # Chrome Extension Manifest V3
├── content.js             # Main content script (recording, transcription, Gmail injection)
├── styles.css             # Scoped UI styles (gar-* prefix, no global pollution)
├── src/
│   ├── wav-encoder.js     # Pure WAV encoder (Float32 PCM → RIFF/WAV blob)
│   └── utils.js           # Utility functions (formatTime, escapeHtml, etc.)
├── tests/
│   ├── wav-encoder.test.js   # 21 tests — WAV header, PCM encoding, edge cases
│   ├── utils.test.js         # 35 tests — formatting, XSS escaping, manifest validation
│   └── integration.test.js   # 32 tests — file existence, manifest, CSS/JS integrity
├── icons/                 # Extension icons (16, 48, 128px)
├── docs/                  # GitHub Pages landing page
├── store-assets/          # Chrome Web Store promotional images
├── .github/workflows/
│   └── ci.yml             # GitHub Actions CI (test + lint on Node 18/20/22)
└── CHROME_WEB_STORE_SUBMISSION.md
```

## 🧪 Testing

```bash
# Install dependencies
npm install

# Run all tests (88 tests across 3 suites)
npm test

# Run with coverage
npm test -- --coverage

# Lint
npm run lint

# Full validation (lint + test)
npm run validate
```

### Test coverage

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `src/wav-encoder.js` | 100% | 100% | 100% | 100% |
| `src/utils.js` | 100% | 100% | 100% | 100% |

### CI pipeline

The [GitHub Actions workflow](.github/workflows/ci.yml) runs on every push and PR:

- **Test matrix** across Node.js 18, 20, and 22
- **ESLint** static analysis
- **Jest** with coverage reporting
- **Extension validation** — manifest, file integrity, PNG magic bytes

### Auto-publish to Chrome Web Store

The [publish workflow](.github/workflows/publish.yml) auto-deploys to the Chrome Web Store when you push a version tag:

```bash
# Bump version in manifest.json, then:
git tag v1.0.1
git push origin v1.0.1
```

The workflow runs the full test suite first — if all 88 tests pass, it packages the extension and uploads it to the Chrome Web Store automatically. See [CHROME_WEB_STORE_SUBMISSION.md](CHROME_WEB_STORE_SUBMISSION.md) for the one-time setup of Google API credentials.

## 🔐 Privacy & Permissions

| Permission | Reason |
|-----------|--------|
| `host_permissions: mail.google.com` | Inject recorder into Gmail compose windows |
| Microphone | Requested at runtime via browser's standard permission prompt |

**No data leaves your browser.** Audio recording and speech recognition both happen entirely on-device using native browser APIs. There are no network requests, no analytics, no telemetry.

## 🤔 Why WAV?

WAV is the most universally supported audio format in existence. Unlike WebM or OGG, every email client (Gmail, Outlook, Apple Mail, Thunderbird), every OS (Windows, macOS, Linux, iOS, Android), and every device can play WAV files natively. The recipient clicks play and hears the audio — no downloads, no codecs, no friction.

The tradeoff is file size (~5 MB per minute), but for voice messages of a few minutes that's perfectly fine for email.

## ⚠️ Known Limitations

- **Gmail DOM selectors** — Gmail's internal class names change periodically with updates. If the button stops appearing after a Gmail update, the selectors in `content.js` may need updating.
- **Transcription accuracy** — Depends on Chrome's Web Speech API. Works well for clear speech in supported languages, but isn't perfect in noisy environments.
- **Chrome only** — The Web Speech API and extension architecture are Chrome-specific. Firefox/Safari are not supported.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Make sure all tests pass (`npm run validate`) before submitting.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built by [Daniel Cregg](https://github.com/danielcregg)**

If this project helped you, consider giving it a ⭐

</div>
