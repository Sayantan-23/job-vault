---
id: t-0023
title: Job-URL scrape into the cover-letter paste form
status: backlog
created: 2026-06-16
updated: 2026-08-25T12:30:00Z
estimate: M
tags: [frontend, scraping, polish]
---

In the "paste a JD" mode, let the user paste a job **URL** and auto-fill title /
company / description by reusing the existing scraper.

**Why.** The scraper is already wired into the jobs add flow; the cover-letter
paste form makes the user retype what it could fetch.

**Verified 2026-08-25:** still open. `useScrapeJob` is used in exactly one
place — `components/jobs/url-paste-form.tsx` — and `PasteJobFields` in
`generate-cover-letter-bar.tsx` is three manual inputs with no scrape
affordance.
