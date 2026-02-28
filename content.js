(function() {
  'use strict';

  const POST_SELECTOR = '[data-testid="post-container"]';
  const COMMENT_PATTERN = /^\/r\/[\w]+\/comments\//;
  const PINNED_SELECTOR = '[data-testid="post-container"][data-prefixed-id]';
  const SEEN_ATTR = 'data-enough-reddit-seen';
  const HIDDEN_ATTR = 'data-enough-reddit-hidden';

  const DEFAULT_THRESHOLD = 10;

  let threshold = DEFAULT_THRESHOLD;
  let counter = 0;
  let allowedUpTo = 0;
  let isOverlayActive = false;

  let intersectionObserver = null;
  let mutationObserver = null;
  let feedContainer = null;
  let overlayElement = null;
  let lastUrl = window.location.href;

  function isCommentPage(pathname) {
    return COMMENT_PATTERN.test(pathname);
  }

  function isPinnedPost(element) {
    const pinIndicator = element.querySelector('[data-testid="post-meta-text"]');
    if (pinIndicator && pinIndicator.textContent.toLowerCase().includes('pinned')) {
      return true;
    }
    return false;
  }

  function getAllPosts() {
    return Array.from(document.querySelectorAll(POST_SELECTOR));
  }

  function getVisiblePosts() {
    return Array.from(document.querySelectorAll(`${POST_SELECTOR}:not([${SEEN_ATTR}])`));
  }

  function findFeedContainer() {
    const candidates = document.querySelectorAll('main [role="feed"], [data-testid="front-page-feed"]');
    for (const container of candidates) {
      if (container.clientHeight > 0 || container.childElementCount > 0) {
        return container;
      }
    }
    return candidates[0] || null;
  }

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

  function hidePostsBeyondAllowed() {
    const posts = getAllPosts();
    posts.forEach((post, index) => {
      if (index >= allowedUpTo && counter >= threshold) {
        hidePost(post);
      }
    });
  }

  function showPostsUpToAllowed() {
    const posts = getAllPosts();
    posts.forEach((post, index) => {
      if (index < allowedUpTo) {
        showPost(post);
      }
    });
  }

  function createOverlay() {
    if (overlayElement) return;

    overlayElement = document.createElement('div');
    overlayElement.id = 'enough-reddit-overlay';
    overlayElement.innerHTML = `
      <div class="enough-reddit-card">
        <h2 class="enough-reddit-title">You've scrolled through ${counter} posts.</h2>
        <p class="enough-reddit-message">Take a break?</p>
        <button class="enough-reddit-button" id="enough-reddit-load-more">
          Load more
        </button>
      </div>
    `;
    document.body.appendChild(overlayElement);

    document.getElementById('enough-reddit-load-more').addEventListener('click', handleLoadMore);
  }

  function removeOverlay() {
    if (overlayElement) {
      overlayElement.remove();
      overlayElement = null;
    }
  }

  function showOverlay() {
    if (isOverlayActive) return;
    isOverlayActive = true;

    clearBadge();
    hidePostsBeyondAllowed();
    createOverlay();

    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
  }

  function hideOverlay() {
    if (!isOverlayActive) return;
    isOverlayActive = false;
    removeOverlay();
  }

  function handleLoadMore() {
    allowedUpTo += threshold;
    counter = 0;
    updateBadge();

    showPostsUpToAllowed();

    if (allowedUpTo >= threshold) {
      hideOverlay();
      observeNewPosts();
    } else {
      isOverlayActive = false;
      removeOverlay();
      observeNewPosts();
    }
  }

  function updateBadge() {
    const remaining = Math.max(0, threshold - counter);
    browser.action.setBadgeText({ text: remaining.toString() });
    browser.action.setBadgeBackgroundColor({ color: '#ff4500' });
  }

  function clearBadge() {
    browser.action.setBadgeText({ text: '' });
  }

  function handlePostIntersection(entries) {
    if (isOverlayActive) return;

    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        const post = entry.target;
        if (post.hasAttribute(SEEN_ATTR)) return;
        if (isPinnedPost(post)) return;

        post.setAttribute(SEEN_ATTR, 'true');
        counter++;
        updateBadge();

        if (counter >= threshold) {
          showOverlay();
        }
      }
    });
  }

  function initIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    intersectionObserver = new IntersectionObserver(handlePostIntersection, {
      threshold: 0.5,
      root: null
    });
  }

  function observePost(post) {
    if (!post.hasAttribute(SEEN_ATTR) && !post.hasAttribute(HIDDEN_ATTR)) {
      intersectionObserver.observe(post);
    }
  }

  function observeNewPosts() {
    const posts = getVisiblePosts();
    posts.forEach(post => {
      if (!isPinnedPost(post)) {
        observePost(post);
      }
    });
  }

  function handleMutations(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const posts = node.querySelectorAll ? node.querySelectorAll(POST_SELECTOR) : [];
        posts.forEach(post => {
          if (counter >= threshold) {
            hidePost(post);
          } else if (!post.hasAttribute(SEEN_ATTR) && !isPinnedPost(post)) {
            observePost(post);
          }
        });

        if (node.matches && node.matches(POST_SELECTOR)) {
          if (counter >= threshold) {
            hidePost(node);
          } else if (!node.hasAttribute(SEEN_ATTR) && !isPinnedPost(node)) {
            observePost(node);
          }
        }
      });
    });
  }

  function initMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function reset() {
    counter = 0;
    allowedUpTo = 0;
    isOverlayActive = false;
    updateBadge();

    getAllPosts().forEach(post => {
      post.removeAttribute(SEEN_ATTR);
      post.removeAttribute(HIDDEN_ATTR);
      showPost(post);
    });

    removeOverlay();
    initIntersectionObserver();

    feedContainer = findFeedContainer();
    if (feedContainer) {
      observeNewPosts();
    }
  }

  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (!isCommentPage(window.location.pathname)) {
        reset();
      }
    }
  }
      }
    }
  }

  function init() {
    if (isCommentPage(window.location.pathname)) {
      return;
    }

    run();
  }

  function run() {
    initIntersectionObserver();
    initMutationObserver();
    updateBadge();

    feedContainer = findFeedContainer();

    setTimeout(() => {
      observeNewPosts();
    }, 1000);

    setInterval(checkUrlChange, 500);
  }

  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    setTimeout(checkUrlChange, 100);
  };

  window.addEventListener('popstate', () => {
    setTimeout(checkUrlChange, 100);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
