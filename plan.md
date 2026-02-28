# enough-reddit — Extension Plan

## Goal
A Firefox extension that limits how many Reddit posts a user can scroll past in one "session" (page load / navigation). After a configurable threshold, a disruptive overlay appears and blocks new posts from loading until the user actively chooses to continue.

---

## Scope & Constraints
- **Browser:** Firefox only
- **Target site:** `reddit.com` — new Reddit layout only
- **Pages in scope:** Home feed, subreddit feeds, search results, profile feeds
- **Pages out of scope:** Comment threads, settings, wiki pages, direct post links
- **Ads:** Ignored (assumed blocked by ad blocker)
- **Pinned/sticky posts:** Not counted
- **Multiple tabs:** Each tab has an independent counter

---

## Extension Architecture

### Files
```
enough-reddit/
├── manifest.json          # Extension manifest (MV3)
├── content.js             # Injected into reddit.com — core logic
├── overlay.css            # Styles for the blocking overlay
├── popup/
│   ├── popup.html         # Toolbar popup UI
│   ├── popup.js           # Reads/writes settings
│   └── popup.css
└── background.js          # (minimal) Storage bridge if needed
```

### Manifest (MV3)
- `host_permissions`: `*://*.reddit.com/*`
- `content_scripts`: inject `content.js` + `overlay.css` on `*://*.reddit.com/*`
- `action`: toolbar popup for settings
- `permissions`: `storage` (for the configurable threshold)

---

## Core Logic — `content.js`

### 1. Page type detection
On each page load, check `window.location.pathname`:
- If it matches a comment thread pattern (`/r/*/comments/*`) → **do nothing**
- Otherwise → start the post counter

### 2. Post detection strategy
Reddit's new layout renders posts as `<div>` elements with a known attribute/class (e.g., `data-testid="post-container"`). Posts are counted **when they enter the viewport** — meaning the user has actually seen them.

- Use an **`IntersectionObserver`** targeting post elements (`data-testid="post-container"`)
- A post is counted the first time it crosses the visibility threshold (e.g., 50% visible)
- Each post is counted **at most once** — once seen, it is marked and ignored on future scroll-back
- A **`MutationObserver`** on the feed container still runs in the background to register newly inserted posts with the `IntersectionObserver` as Reddit loads them
- Ignore pinned posts (identifiable by a "pinned" label attribute)

### 3. Threshold
- Default: **10**
- User-configurable: 10 / 20 / 50
- Loaded from `browser.storage.sync` at page init

### 4. Blocking mechanism
When `counter >= threshold`:
1. **Disconnect the `IntersectionObserver`** — stop counting new views
2. **Record the index of the last allowed post** in the feed. All posts beyond index `lastAllowed + X` are **hidden** (CSS `visibility: hidden` or `pointer-events: none` so the page doesn't reflow). Reddit's own infinite scroll may still insert DOM nodes — they must also be hidden immediately on insertion until the user clicks through
3. **Render the overlay**

### 5. Unlock behavior
Each "Load more" click unlocks exactly the next **X** posts:
- `allowedUpTo += threshold`
- Posts up to the new `allowedUpTo` index are un-hidden
- The `IntersectionObserver` is re-attached to those newly visible posts
- When those posts are scrolled through and the counter hits the threshold again, the overlay returns

This means Reddit's infinite scroll continues to load posts in the background — they are just hidden until earned.

### 6. Overlay
- Fixed position, `z-index` high enough to cover everything including Reddit's own modals
- Covers 100% of the viewport with a darkened, blurred backdrop
- Centered card with:
  - Message: *"You've scrolled through X posts. Take a break?"*
  - A single prominent **"Load more"** button
- No dismiss or close option — action is required

### 7. Navigation/reset
Reddit is a **SPA (Single Page Application)** — navigating between subreddits does not trigger a full page reload. To handle this:
- Use a `MutationObserver` on `document.title` or listen to `popstate` / `pushState` intercept to detect URL changes
- On URL change: reset counter to 0, remove any existing overlay, re-initialize the observer

---

## Settings Popup — `popup.html`

Simple UI with:
- A label: *"Show overlay after how many posts?"*
- A `<select>` with options: 10, 20, 50
- Saves to `browser.storage.sync` on change
- Change takes effect on **next page load / navigation**

---

## Known Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| Reddit DOM structure may change | Target `data-testid` attributes which are more stable than class names; make selector configurable in a single constant |
| SPA navigation not triggering reload | Intercept `history.pushState` + listen to `popstate` |
| Reddit lazy-loads posts in batches | `MutationObserver` registers new posts with `IntersectionObserver` as they are inserted; hidden posts beyond `allowedUpTo` are hidden immediately on insertion |
| Post counted multiple times on scroll-back | Each post element is marked with a data attribute once seen; ignored on subsequent intersections |
| `IntersectionObserver` misses posts already in viewport at init | After setup, do a one-time pass to observe all already-rendered posts |
| Hidden posts cause layout gaps | Use `visibility: hidden` instead of `display: none` to preserve layout and prevent feed reflow |
| Content script timing (observer set up before feed renders) | Attach `MutationObserver` to `document.body` with `subtree: true`, defer `IntersectionObserver` setup until feed container appears |

---

## Out of Scope (Future Ideas)
- Daily cross-session post limit
- Snooze / dismiss button on overlay
- Progress bar showing proximity to limit
- Support for old Reddit layout
- Per-subreddit limits

---

## Open Questions (Pending Your Input)
None — all questions resolved. Ready for implementation.
