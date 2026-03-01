# enough-reddit

A Firefox extension that stops you from doomscrolling Reddit.

After scrolling past a set number of posts, a full-screen overlay appears and blocks the feed and scroll, until you actively choose to continue. No sneaky auto-resume — every batch requires a deliberate click.

---

## How it works

- Counts posts as they **enter your viewport** — only what you actually see counts
- After **10 posts** (default), the feed is blocked and an overlay forces a pause
- Clicking **"Load 10 more"** unlocks exactly the next batch, then blocks again
- Counter resets on every page load and subreddit navigation
- Each browser tab is tracked independently

---

## Configuration

| Setting | Default | Options |
|---|---|---|
| Posts per batch | 10 | 10, 20, 50 |

> ⚠️ The settings popup requires a persistent extension install. When running as a temporary add-on, the default of 10 is used.

---

## Installation

### Temporary (development)

Using web-ext, you can run this extension with:

```bash
web-ext run --firefox=deved
```

### Persistent

Signed `.xpi` installation coming when the extension is submitted to [addons.mozilla.org](https://addons.mozilla.org).

---

## Chrome support

The extension targets Firefox. Porting to Chrome requires:

1. Replace all `browser.*` calls with `chrome.*` in `content.js` and `background.js`
2. Change the manifest background declaration from `"scripts"` to `"service_worker"`

Alternatively, use Mozilla's [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) to support both browsers from a single codebase.

---

## Project structure

```
enough-reddit/
├── manifest.json        # Extension manifest (MV3)
├── content.js           # Core logic — injected into reddit.com
├── background.js        # Badge updates (privileged API proxy)
├── overlay.css          # Blocking overlay styles
└── popup/
    ├── popup.html       # Settings UI
    ├── popup.js         # Reads/writes threshold setting
    └── popup.css
```

---

## Known limitations

- **New Reddit only** — old Reddit layout is not supported
- **Comment threads are excluded** — the counter only runs on feeds
- **Reddit DOM changes** — the extension targets `article[data-post-id]` elements; if Reddit updates its markup, the selector may need updating
- **No daily limit** — the counter resets on every navigation; cross-session tracking is a planned future feature

---

## Roadmap

- [x] Progress indicator showing posts remaining before next block
- [ ] Submission to addons.mozilla.org
- [ ] Configurable threshold via settings popup
- [ ] Daily post limit across all sessions
- [ ] Snooze option on the overlay
- [ ] Chrome / Chromium support

---

## License

MIT