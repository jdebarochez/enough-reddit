// background.js
// Receives badge update requests from content.js, which cannot
// call browser.action directly (privileged API, background only).

browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'SET_BADGE') {
      browser.action.setBadgeText({ text: message.text });
      if (message.color) {
        browser.action.setBadgeBackgroundColor({ color: message.color });
      }
    }
  });