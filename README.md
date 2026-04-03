# FQHC Social Studio

A self-hosted social media content generator built specifically for the FQHC ecosystem. Paste alert content from Google Alerts (or future sources), select platforms, and generate ready-to-post content for Facebook, Reddit, and LinkedIn — powered by the Anthropic Claude API.

---

## Features

- Generate posts for Facebook (page + group), Reddit, and LinkedIn simultaneously
- Tone selector: Informative, Thought Leadership, Urgent/Advocacy, Community
- Post history saved in browser localStorage
- Settings panel for API key and default preferences
- Built to be extended with RSS, Gmail API, Zapier webhooks, and more

---

## Project structure

```
fqhc-social-studio/
├── index.html        # Main app shell and HTML
├── css/
│   └── style.css     # All styles
├── js/
│   └── app.js        # All application logic
└── README.md
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/fqhc-social-studio.git
cd fqhc-social-studio
```

### 2. Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and generate an API key
3. Copy the key (starts with `sk-ant-...`)

### 3. Add your API key in the app

Open the app, go to **Settings**, paste your API key, and click Save.

Your key is stored only in your browser's `localStorage` — it is never sent anywhere except directly to Anthropic's API.

---

## Deploy to GitHub Pages (free hosting)

This is a pure HTML/CSS/JS app with no build step required. GitHub Pages can host it directly.

### Steps:

1. Push this repo to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fqhc-social-studio.git
git push -u origin main
```

2. In your GitHub repo, go to **Settings → Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click Save

Your app will be live at:
```
https://YOUR_USERNAME.github.io/fqhc-social-studio/
```

It may take 1-2 minutes for the first deploy to appear.

---

## How to use

1. **Compose tab** — Paste your Google Alert content, add the source org and URL, select platforms and tone, click Generate
2. **History tab** — All generated batches are saved automatically and viewable here
3. **Settings tab** — Set your API key and default preferences (org name, tone)

---

## Planned integrations

These are stubbed out in `js/app.js` under `SOURCE_HANDLERS` — ready to be built out:

| Integration | Status | Notes |
|---|---|---|
| Gmail API | Planned | OAuth + Gmail API to pull alert emails directly |
| RSS feed monitor | Planned | Auto-fetch from NACHC, HRSA, state PCA feeds |
| Zapier / Make.com webhook | Planned | Receive alert payloads via webhook |
| Buffer / Hootsuite export | Planned | Schedule posts from the studio |

To add a new source, extend the `SOURCE_HANDLERS` object in `js/app.js` and wire up the corresponding tab in `index.html`.

---

## Adding a backend (for production use)

For production, you'll want to move the API key to a backend server so it's not exposed in the browser. Options:

- **Vercel serverless functions** — free tier, easy setup
- **Netlify functions** — same idea
- **Node/Express backend** — full control

A minimal Vercel function example is in `api/generate.js` (coming in a future update).

---

## Tech stack

- Vanilla HTML, CSS, JavaScript — no frameworks, no build tools
- [Anthropic Claude API](https://docs.anthropic.com)
- Google Fonts (DM Sans + DM Serif Display)
- Browser `localStorage` for history and settings

---

## License

MIT — use freely, modify as needed.
