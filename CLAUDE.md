# Gmail Audio Recorder

Chrome extension that adds voice messages with live transcription to Gmail.

## Key Info

- **Chrome Web Store ID:** `olnipfdionohacjlccfpkpjooffennfp`
- **Store URL:** https://chrome.google.com/webstore/detail/gmail-audio-recorder/olnipfdionohacjlccfpkpjooffennfp
- **Landing page:** https://danielcregg.is-a.dev/gmail-audio-recorder/
- **Status:** Published, public

## Releasing a New Version

1. Bump `"version"` in `manifest.json`
2. Commit the change
3. Tag and push:
   ```bash
   git tag v<version>
   git push origin main --tags
   ```
4. The `publish.yml` workflow runs tests, creates a GitHub Release, and uploads to the Chrome Web Store automatically

## CI/CD

- **CI** (`ci.yml`): Runs on every push/PR to main. Lints, tests (Node 18/20/22), validates extension files.
- **Publish** (`publish.yml`): Triggered by `v*` tags. Runs tests, packages ZIP, creates GitHub Release, uploads to Chrome Web Store.

### GitHub Secrets (already configured)

| Secret | Purpose |
|--------|---------|
| `CHROME_EXTENSION_ID` | Extension ID for CWS upload |
| `CHROME_CLIENT_ID` | Google OAuth client (Desktop app type) |
| `CHROME_CLIENT_SECRET` | Google OAuth secret |
| `CHROME_REFRESH_TOKEN` | OAuth refresh token for CWS API |

OAuth credentials are in Google Cloud Console under the same account as the Chrome Developer Dashboard.

## Commands

```bash
npm test          # Run all tests (88 tests, 3 suites)
npm run lint      # ESLint
npm run validate  # Lint + test
```

## Architecture

- `manifest.json` — Manifest V3
- `content.js` — Main content script (recording, transcription, Gmail injection)
- `styles.css` — Scoped UI styles (gar-* prefix)
- `src/wav-encoder.js` — WAV encoder
- `src/utils.js` — Utility functions
- `docs/` — GitHub Pages landing page
- `store-assets/` — Chrome Web Store promotional images
