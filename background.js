// Minimal background script - storage is handled directly by content.js and popup.js
// This file exists for potential future use (e.g., handling browser.runtime events)

browser.runtime.onInstalled.addListener(() => {
  browser.storage.sync.set({ threshold: 10 });
});
