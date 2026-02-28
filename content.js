(function() {
  'use strict';

  const POST_SELECTOR = 'article';
  const COMMENT_PATTERN = /^\/r\/[\w]+\/comments\//;
  const SEEN_ATTR = 'data-enough-reddit-seen';
  const HIDDEN_ATTR = 'data-enough-reddit-hidden';

  const DEFAULT_THRESHOLD = 10;

  let threshold = DEFAULT_THRESHOLD;
  let counter = 0;
  // FIX: allowedUpTo starts at threshold (the initial grant), not 0.
  // It represents the total number of posts the user has ever unlocked
  // across all "Load more" clicks in this session.
  let allowedUpTo = DEFAULT_THRESHOLD;
  let isOverlayActive = false;

  let intersectionObserver = null;
  let mutationObserver = null;
  let overlayElement = null;
  let lastUrl = window.location.href;

  // --- Badge (proxied through background.js) ---

  function updateBadge() {
    const remaining = Math.max(0, threshold - counter);
    browser.runtime.sendMessage({
      type: 'SET_BADGE',
      text: remaining.toString(),
      color: '#cc0000'
    });
  }

  function clearBadge() {
    browser.runtime.sendMessage({ type: 'SET_BADGE', text: '' });
  }

  // --- Utilities ---

  function isCommentPage(pathname) {
    return COMMENT_PATTERN.test(pathname);
  }

  function getAllPosts() {
    return Array.from(document.querySelectorAll(POST_SELECTOR));
  }

  // --- Show / hide individual posts ---

  function hidePost(element) {
    element.style.visibility = 'hidden';
    element.style.pointerEvents = 'none';
    element.setAttribute(HIDDEN_ATTR, 'true');
  }

  function showPost(element) {
    element.style.visibility = '';
    element.style.pointerEvents = '';
    element.removeAttribute(HIDDEN_ATTR);
  }

  // FIX: Hide posts whose index is >= allowedUpTo.
  // No longer guards on counter — allowedUpTo IS the source of truth
  // for what the user has been granted to view.
  function enforceHiding() {
    getAllPosts().forEach((post, index) => {
      if (index >= allowedUpTo) {
        hidePost(post);
      } else {
        // Reveal posts that are now within the new allowedUpTo window
        // (needed after each "Load more" click).
        if (post.hasAttribute(HIDDEN_ATTR)) {
          showPost(post);
        }
      }
    });
  }

  // --- Overlay ---

  function createOverlay() {
    if (overlayElement) return;

    overlayElement = document.createElement('div');
    overlayElement.id = 'enough-reddit-overlay';
    overlayElement.innerHTML = `
      <div class="enough-reddit-card">
        <h2 class="enough-reddit-title">You've scrolled through ${allowedUpTo} posts.</h2>
        <p class="enough-reddit-message">Take a break?</p>
        <button class="enough-reddit-button" id="enough-reddit-load-more">
          Load ${threshold} more
        </button>
      </div>
    `;
    document.body.appendChild(overlayElement);
    document.getElementById('enough-reddit-load-more').addEventListener('click', handleLoadMore);
  }

  function removeOverlay() {
    disableScrollLock();
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }
  }

  function enableScrollLock() {
    document.documentElement.classList.add('enough-reddit-scroll-lock');
    document.body.classList.add('enough-reddit-scroll-lock');
  }

  function disableScrollLock() {
    document.documentElement.classList.remove('enough-reddit-scroll-lock');
    document.body.classList.remove('enough-reddit-scroll-lock');
  }

  function showOverlay() {
    if (isOverlayActive) return;
    isOverlayActive = true;
    clearBadge();
    enableScrollLock();

    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    enforceHiding();
    createOverlay();
  }

  function handleLoadMore() {
    // Unlock exactly one more batch of threshold posts.
    allowedUpTo += threshold;
    counter = 0;
    isOverlayActive = false;

    removeOverlay();
    enforceHiding();       // reveals posts now within allowedUpTo, hides rest
    updateBadge();
    observeUnseen();       // re-attach IntersectionObserver to newly visible posts
  }

  // --- Intersection Observer (counts viewed posts) ---

  function initIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
    intersectionObserver = new IntersectionObserver(handlePostIntersection, {
      threshold: 0.5,
      root: null
    });
  }

  function handlePostIntersection(entries) {
    if (isOverlayActive) return;

    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;

      const post = entry.target;
      if (post.hasAttribute(SEEN_ATTR)) return;

      post.setAttribute(SEEN_ATTR, 'true');
      intersectionObserver.unobserve(post);
      counter++;
      updateBadge();

      if (counter >= threshold) {
        showOverlay();
      }
    });
  }

  function observeUnseen() {
    getAllPosts().forEach(post => {
      if (!post.hasAttribute(SEEN_ATTR) && !post.hasAttribute(HIDDEN_ATTR)) {
        intersectionObserver.observe(post);
      }
    });
  }

  // --- Mutation Observer (registers new posts inserted by Reddit's SPA) ---

  function initMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function handleMutations(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        // Collect any post-container nodes in the subtree, plus the node itself.
        const posts = [];
        if (node.matches && node.matches(POST_SELECTOR)) posts.push(node);
        if (node.querySelectorAll) {
          node.querySelectorAll(POST_SELECTOR).forEach(p => posts.push(p));
        }

        posts.forEach(post => {
          const allPosts = getAllPosts();
          const index = allPosts.indexOf(post);

          // FIX: hide based on index vs allowedUpTo, not counter vs threshold.
          // This correctly hides posts beyond the current unlock window even
          // when counter has just been reset to 0 after a "Load more" click.
          if (index !== -1 && index >= allowedUpTo) {
            hidePost(post);
          } else if (!post.hasAttribute(SEEN_ATTR) && !isOverlayActive) {
            intersectionObserver.observe(post);
          }
        });
      });
    });
  }

  // --- Navigation (SPA URL change detection) ---

  function reset() {
    counter = 0;
    allowedUpTo = threshold;   // reset to the initial grant for the new page
    isOverlayActive = false;

    removeOverlay();

    getAllPosts().forEach(post => {
      post.removeAttribute(SEEN_ATTR);
      post.removeAttribute(HIDDEN_ATTR);
      showPost(post);
    });

    initIntersectionObserver();
    updateBadge();

    // Give the SPA a moment to render the new feed before observing.
    setTimeout(observeUnseen, 800);
  }

  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (!isCommentPage(window.location.pathname)) {
        reset();
      }
    }
  }

  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    setTimeout(checkUrlChange, 100);
  };

  window.addEventListener('popstate', () => setTimeout(checkUrlChange, 100));

  // --- Init ---

  function init() {
    if (isCommentPage(window.location.pathname)) return;

    // Load user-configured threshold before starting.
    
    threshold = DEFAULT_THRESHOLD;
    allowedUpTo = threshold;   // keep in sync after threshold is loaded

    initIntersectionObserver();
    initMutationObserver();
    updateBadge();

    setTimeout(observeUnseen, 800);
    
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();