# Deploy Guide — echocco.com v2

> Generated 2026-09-01. Replaces the existing static site on Cloudflare Pages.

---

## TL;DR

3 steps, ~10 minutes:

1. Fill the 56 `echocc00` placeholders + upload `cv.pdf` / `avatar.png` (15 min)
2. Push the `html/` folder to a Git repo (5 min)
3. Connect the repo to Cloudflare Pages, deploy (5 min)

After deploy, run the 4 post-launch verification steps at the bottom of this guide.

---

## Step 1 — Fill placeholders

Search and replace across all `.html` files in this folder:

| Find | Replace with | Occurrences |
|---|---|---|
| `echocc00` | your real name | ~56 |
| `286043314+echocc00@users.noreply.github.com` | your real email | ~20 |

**In PowerShell (from this folder):**

```powershell
Get-ChildItem -Recurse -Filter *.html | ForEach-Object {
  (Get-Content $_.FullName -Raw) `
    -replace "echocc00", "Your Real Name" `
    -replace "286043314+echocc00@users.noreply.github.com", "you@yourdomain.com" |
  Set-Content -NoNewline $_.FullName -Encoding utf8
}
```

**Verify:**

```powershell
Get-ChildItem -Recurse -Filter *.html | Select-String "echocc00"
# Should return nothing
```

## Step 1b — Upload personal files

Drop these two files into `assets/`:

```
assets/cv.pdf       ← your CV as PDF (2 pages A4, designed to match site)
assets/avatar.png   ← your avatar (256×256 PNG, real photo or hand-drawn — NOT AI-generated face)
```

Optional: delete `assets/avatar-placeholder.svg` (it is just a fallback).

---


## i18n — Chinese version

The site now ships in both English and Chinese. The Chinese version lives under /zh/ and shares all assets (CSS, OG images, diagrams, avatar, CV) with the English version.

**URL structure:**

| Language | URL prefix | Example |
|---|---|---|
| English | (none) | /about/ |
| Chinese | /zh/ | /zh/about/ |

**Language switcher** is in the nav (right side). Clicking swaps to the same page in the other language (computed from current path automatically).

**SEO:**
- Every page has `<link rel="alternate" hreflang="en">` and `hreflang="zh-CN">`
- Sitemap includes both languages with cross-references
- Google indexes them as two separate URLs and serves the right one based on user locale

**Translated sections:** home, about, career timeline, now grid, testimonials placeholders, project descriptions, project capabilities, all nav labels, status pills, stats labels.

**Replacing `echocc00` placeholder:** it appears 65 times total. Run the same replacement in both the root and /zh/ folders.

After deployment, verify i18n by visiting https://www.echocco.com/ and https://www.echocco.com/zh/ — the nav should show 中文 / EN toggle, and switching should land on the equivalent page in the other language.
## Step 2 — Push to Git

Option A — separate repo (recommended if you want domain-isolated CI):

```bash
# Create a new repo on github.com/echocc00/echocco-site (or whatever name)
cd html
git init
git add .
git commit -m "Deploy: echocco.com v2 with P0/P1 fixes"
git branch -M main
git remote add origin https://github.com/echocc00/echocco-site.git
git push -u origin main
```

Option B — push into your existing repo (e.g. under a `site/` folder):

```bash
cd existing-repo
mkdir site && cp -r ../html/* site/
git add site/
git commit -m "Deploy: echocco.com v2"
git push
```

---

## Step 3 — Connect to Cloudflare Pages

If you already have `echocco.com` on Cloudflare Pages:

1. https://dash.cloudflare.com → Workers & Pages → your `echocco.com` project
2. **Settings → Builds → Configure build** → change branch if needed, leave **Build command** empty and **Build output directory** as `/`
3. **Deployments → Create deployment → choose your commit** → Deploy

If you are creating a new Pages project:

1. https://dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git
2. Pick your `echocco-site` repo
3. Framework preset: **None** (since this is plain HTML)
4. Build command: *(empty)*
5. Build output directory: `/` (or `html/` if you used Option B with a subfolder)
6. Save and Deploy

Cloudflare will assign a `*.echocco-xxx.pages.dev` URL. Verify there before changing DNS.

---

## Custom domain

1. Cloudflare Pages → your project → **Custom domains** → Set up a custom domain
2. Enter `www.echocco.com` (and add `echocco.com` root if not already)
3. Cloudflare auto-configures DNS if domain is already on Cloudflare; otherwise it tells you which CNAME to add
4. Wait 1–5 min for SSL provisioning

If you want `www.echocco.com` as the canonical (and `echocco.com` to redirect to it):

Cloudflare Dashboard → Rules → Redirect Rules → Create:

```
If: Hostname equals echocco.com
Then: Static redirect to https://www.echocco.com/some-path with status 301
```

(Replace the `/some-path` part with the actual Cloudflare macro `${request.uri}` — the redirect rule editor has that picker.)

---

## Step 4 — Post-launch verification

Run these immediately after deploy:

1. **Test OG previews** — paste each URL into https://www.opengraph.xyz/
   - `https://www.echocco.com/` → should show `echocc00` + 6 project cards
   - `https://www.echocco.com/projects/secsight/` → should show SecSight card
2. **Validate JSON-LD** — https://search.google.com/test/rich-results
   - Enter `https://www.echocco.com/` → should show Person + ItemList with 6 SoftwareSourceCode
3. **Test sitemap** — visit `https://www.echocco.com/sitemap.xml` (should serve XML, NOT your HTML)
4. **Test robots** — visit `https://www.echocco.com/robots.txt` (should serve the file, NOT SPA fallback)
5. **Click all links from homepage** — every project card, nav, footer should work
6. **Test mobile** — Chrome DevTools → device emulation → iPhone 14 Pro

If any of these fail, check Cloudflare Pages → Functions logs or your browser devtools.

---

## Step 5 — Optional but recommended

1. **Turn off Cloudflare Email Obfuscation** — it was breaking your CTA. Dashboard → Speed → Optimization → Email Obfuscation → **OFF**
2. **Sync version numbers** in your GitHub profile README (`echocc00/.github/profile/README.md`) — they lag behind
3. **Push mirrored README** to `echocc00/awesome-echocc00` if you want it discoverable
4. **Submit sitemap to Google Search Console** — `https://www.echocco.com/sitemap.xml`
5. **Verify on social** — post a project link in Slack/WeChat/LinkedIn to confirm OG image renders

---

## What this package contains

```
html/
├─ _headers                   ← Cloudflare cache + security headers
├─ _redirects                 ← Maps trailing-slash URLs to .html
├─ 404.html                   ← Custom 404 page
├─ index.html                 ← Optimized home
├─ about.html                 ← Rewritten About (timeline + now + testimonials)
├─ projects/                  ← 6 project pages + index with category filter
├─ robots.txt                 ← Real robots file (was SPA fallback)
├─ sitemap.xml                ← Real sitemap (8 URLs)
├─ manifest.webmanifest       ← PWA manifest (scope fixed)
├─ icon.svg                   ← Favicon
├─ apple-touch-icon.png       ← 180×180 PWA icon
└─ assets/
    ├─ css/main.css          ← 21 KB enhanced CSS
    ├─ og/                   ← 8 OG images 1200×630
    ├─ diagrams/             ← 5 SVG architecture diagrams
    ├─ avatar.png            ← TODO: your photo
    └─ cv.pdf                ← TODO: your CV
```

## Rollback

If something breaks:

1. Cloudflare Pages → Deployments → click the previous successful deployment → "Rollback to this deployment"
2. Or via git: `git revert HEAD && git push` (then trigger a redeploy)

---

## Need help?

Stuck on any step? Reply with:
- which step number
- what you saw (screenshot or error message)
- what you expected