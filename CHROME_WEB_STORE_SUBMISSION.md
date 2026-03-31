# Chrome Web Store Submission Guide

## Prerequisites

1. **Register as a Chrome Web Store developer**
   - Go to: https://chrome.google.com/webstore/devconsole
   - Sign in with your Google account
   - Pay the one-time **$5 registration fee**
   - Accept the developer agreement

## Step 1 — Package the extension

Create a ZIP of the extension files (exclude `docs/`, `store-assets/`, and this guide):

```bash
zip -r gmail-audio-recorder.zip manifest.json content.js styles.css icons/
```

## Step 2 — Create a new item

1. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"**
3. Upload the ZIP file from Step 1

## Step 3 — Fill in the listing details

### Store Listing tab

| Field | Value |
|-------|-------|
| **Name** | Gmail Audio Recorder |
| **Summary** | Record and attach audio messages with live transcription directly in Gmail. |
| **Description** | *(see below)* |
| **Category** | Productivity |
| **Language** | English |

**Description** (paste this):

```
Record voice messages and attach them directly to emails in Gmail — with live transcription.

✦ ONE-CLICK RECORDING
A mic button appears right next to Send in every Gmail compose window. Click it to start recording instantly.

✦ LIVE TRANSCRIPTION
See your words appear in real-time as you speak, powered by Chrome's built-in speech recognition. No external services, no API keys.

✦ UNIVERSAL PLAYBACK
Records in WAV format — the most universally supported audio format. Recipients can play it on any device, any email client, any OS without installing anything.

✦ TRANSCRIPT IN EMAIL
Optionally inserts a formatted transcript block directly into the email body, so recipients can read the message without opening the attachment.

✦ FULLY PRIVATE
All recording and transcription happens locally in your browser. No data is sent to any server. No account needed. No tracking.

✦ WAVEFORM VISUALIZER
Live animated audio visualization while recording, so you always know the mic is picking you up.

How it works:
1. Open Gmail and compose an email
2. Click the mic button next to Send
3. Hit Start Recording and speak your message
4. Click Stop, preview with Play, then Attach
5. The audio file and transcript are added to your email

Free and open source: https://github.com/danielcregg/gmail-audio-recorder
```

### Graphics tab

Upload the images from the `store-assets/` folder:

| Asset | File | Required |
|-------|------|----------|
| Extension icon | `icons/icon128.png` | Yes |
| Small promo tile (440×280) | `store-assets/promo-small-440x280.png` | Yes |
| Large promo tile (920×680) | `store-assets/promo-large-920x680.png` | Recommended |
| Marquee (1400×560) | `store-assets/marquee-1400x560.png` | Optional |
| Screenshot (1280×800) | `store-assets/screenshot-1280x800.png` | At least 1 required |

**Tip:** Replace the screenshot with an actual screenshot of the extension running in Gmail for best results.

### Privacy tab

| Field | Value |
|-------|-------|
| **Single purpose** | Record audio messages and transcribe them for attachment in Gmail compose windows. |
| **Permission justification — host_permissions (mail.google.com)** | Required to inject the recording button and panel into Gmail's compose window interface. |
| **Data usage** | The extension does not collect, transmit, or store any user data. All audio recording and speech recognition occurs locally in the browser. |

### Distribution tab

| Field | Value |
|-------|-------|
| **Visibility** | Public |
| **Distribution** | All regions |

## Step 4 — Submit for review

1. Review all tabs for completeness
2. Click **"Submit for review"**
3. Review typically takes **1–3 business days**

## Step 5 — After approval

Once approved, update the "Add to Chrome" links on the GitHub Pages landing page and README with your actual Chrome Web Store URL:

```
https://chrome.google.com/webstore/detail/gmail-audio-recorder/YOUR_EXTENSION_ID
```

Replace `YOUR_EXTENSION_ID` with the ID shown in your developer dashboard.
