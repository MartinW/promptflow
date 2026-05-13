# Scripts

## Screenshot

Takes a screenshot of the homepage and saves it to `docs/homepage.png` for use in the README.

### One-time setup

Run this once to save a Google session so subsequent screenshots can run headlessly.

```bash
bun run dev          # terminal 1 — keep running
bun run screenshot:setup  # terminal 2
```

Chrome opens in incognito. Sign in with Google, then press **Enter** in the terminal. The session is saved to `.auth/session.json` (gitignored).

### Retake the screenshot

```bash
bun run dev          # if not already running
bun run screenshot
```

Commit `docs/homepage.png` when happy with the result.

### Notes

- Google rejects Playwright's default Chromium as "insecure". The setup script uses real Chrome (`channel: "chrome"`), incognito mode, and `--disable-blink-features=AutomationControlled` to pass Google's checks.
- If the session expires, re-run `screenshot:setup`.
- Override defaults with env vars: `SCREENSHOT_URL`, `SCREENSHOT_OUTPUT`.
