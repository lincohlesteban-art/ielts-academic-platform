# IELTS Academic Practice Platform

A standalone, single-page web app for practicing **Cambridge IELTS Academic Reading, Listening, and Writing tests (Books 1–20)**. No build step, no backend — open `index.html` (or serve the folder) and start practicing.

## Features

- **Browse all 240+ tests** organized by Cambridge book (1 through 20)
- **Reading tests** open in a split-pane view (passage left, questions right) with a draggable divider
- **Interactive question types** auto-detected from the source content:
  - True / False / Not Given
  - Yes / No / Not Given
  - Multiple Choice (A/B/C/D radios)
  - Matching (with auto-extracted "List of People/Researchers/Headings")
  - Sentence completion / Fill in the blank
  - Notes / Summary / Table completion (embedded blanks)
- **Annotation toolbar**: highlight (yellow / green / blue / pink), underline, strikethrough, and a freehand drawing canvas with eraser
- **60-minute timer** with warning (≤5 min) and danger (≤1 min) states
- **Check Answers** button with per-question correctness feedback and a score display
- **Listening tests** include an inline audio player (proxied through `wsrv.nl` for hotlink-protected files)

## Project Layout

```
.
├── index.html      Markup + inline SVG icons + toolbar / sidebar / context-menu skeleton
├── styles.css      All styling (custom properties, split-pane, annotation marks, embedded notes, matching list)
├── app.js          Application logic — content fetching, parsing, rendering, annotation, timer
└── data.js         IELTS_DATA — every test's id, name, source URL, and audio slug
```

## How content loads

Test pages are fetched from `practicepteonline.com` through a chain of CORS proxies (`corsproxy.io` → `allorigins.win` → `codetabs.com`). The HTML is parsed in-browser:

- **Reading tests**: `parseReadingContent()` walks the article DOM, classifies each block as either passage or questions (toggling on `Questions X-Y` headers and centered passage titles), then `buildInteractiveQuestions()` builds the typed answer form.
- **Listening tests**: audio URL is constructed from the test's `audio` slug; questions render below.
- **Writing tests**: prompt content rendered in single-pane mode.

## Running locally

Just open `index.html` in a browser, or serve with any static file server:

```bash
# Python
python -m http.server 3000

# Node (npx)
npx serve -l 3000
```

Then visit `http://localhost:3000`.

## Notes

- Content is loaded live from the source site via CORS proxies. If all proxies fail, an "Open on IELTS Master" link is shown.
- `localStorage` remembers the last test you opened so it reopens on reload.
- All annotation/drawing state lives in memory for the current session.
