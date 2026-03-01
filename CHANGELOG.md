# Changelog

All notable changes to this extension will be documented in this file.

## [1.0.1] - 2026-03-01

### Added
- Configurable threshold setting via popup (10, 20, or 50 posts per batch)
- Storage sync for persisting user preferences across browsers

### Changed
- Bumped version to support AMO submission

## [1.0.0] - 2026-02-XX

### Added
- Extension ID and browser-specific settings for Firefox
- Beautiful icons in multiple sizes
- Scroll lock when overlay is displayed

### Fixed
- Adjusted post selector to work with current Reddit DOM
- Removed pinned post handling case

### Initial Release
- Core functionality: counts posts as they enter viewport
- After 10 posts (default), a full-screen overlay appears
- Clicking "Load more" unlocks the next batch
- Counter resets on page load and subreddit navigation
- Badge shows remaining posts before next block
