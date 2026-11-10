/**
 * X Follow Highlight - Content Script
 *
 * Automatically detects accounts that follow the currently logged-in user on X
 * and visually highlights the "Follows you" indicator in bright green.
 *
 * Language-independent detection using [data-testid="userFollowIndicator"].
 */

(() => {
  'use strict';

  // Constants
  const SELECTOR = '[data-testid="userFollowIndicator"]';
  const HIGHLIGHT_CLASS = 'x-follow-highlight';
  const STORAGE_KEY = 'enabled';
  const DEFAULT_ENABLED = true;

  // Internal state
  let isEnabled = DEFAULT_ENABLED;
  let observer = null;
  let pendingNodes = [];
  let rafId = null;

  /**
   * Safely obtain the storage provider (sync preferred, fallback to local).
   * @returns {chrome.storage.StorageArea|null}
   */
  function getStorageArea() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome.storage.sync || chrome.storage.local || null;
      }
    } catch (e) {
      console.warn('[X Follow Highlight] Error accessing chrome.storage:', e);
    }
    return null;
  }

  /**
   * Applies the highlight CSS class to the given element if not already applied.
   * @param {Element} el
   */
  function applyHighlight(el) {
    if (!el || !el.classList) return;
    if (!el.classList.contains(HIGHLIGHT_CLASS)) {
      el.classList.add(HIGHLIGHT_CLASS);
    }
  }

  /**
   * Removes the highlight CSS class from the given element.
   * @param {Element} el
   */
  function removeHighlight(el) {
    if (!el || !el.classList) return;
    el.classList.remove(HIGHLIGHT_CLASS);
  }

  /**
   * Scans a DOM subtree and applies the highlight to all matching elements.
   * Checks both the root itself and any matching descendants.
   * @param {Node} rootNode
   */
  function scanAndHighlight(rootNode = document) {
    if (!isEnabled || !rootNode) return;

    try {
      // If rootNode is an Element that matches the selector
      if (rootNode.nodeType === Node.ELEMENT_NODE && rootNode.matches && rootNode.matches(SELECTOR)) {
        applyHighlight(rootNode);
      }

      // Query all descendants matching the selector
      if (rootNode.querySelectorAll) {
        const matches = rootNode.querySelectorAll(SELECTOR);
        for (let i = 0; i < matches.length; i++) {
          applyHighlight(matches[i]);
        }
      }
    } catch (err) {
      console.error('[X Follow Highlight] Scan error:', err);
    }
  }

  /**
   * Removes highlighting from all elements in the entire document.
   */
  function removeAllHighlights() {
    try {
      const highlighted = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
      for (let i = 0; i < highlighted.length; i++) {
        removeHighlight(highlighted[i]);
      }

      // Redundant safety sweep on any matching selectors
      const elements = document.querySelectorAll(SELECTOR);
      for (let i = 0; i < elements.length; i++) {
        removeHighlight(elements[i]);
      }
    } catch (err) {
      console.error('[X Follow Highlight] Error removing highlights:', err);
    }
  }

  /**
   * Batched processing callback scheduled with requestAnimationFrame.
   * Drains pendingNodes and highlights any matching indicators.
   */
  function flushPendingNodes() {
    rafId = null;

    if (!isEnabled) {
      pendingNodes = [];
      return;
    }

    const nodesToProcess = pendingNodes;
    pendingNodes = [];

    for (let i = 0; i < nodesToProcess.length; i++) {
      const node = nodesToProcess[i];
      // Only process connected element nodes
      if (node.isConnected && node.nodeType === Node.ELEMENT_NODE) {
        scanAndHighlight(node);
      }
    }
  }

  /**
   * MutationObserver callback. Collects newly added element nodes
   * and schedules a batched scan via requestAnimationFrame.
   * @param {MutationRecord[]} mutations
   */
  function handleMutations(mutations) {
    if (!isEnabled) return;

    let hasNewElements = false;

    for (let i = 0; i < mutations.length; i++) {
      const added = mutations[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        const node = added[j];
        if (node.nodeType === Node.ELEMENT_NODE) {
          pendingNodes.push(node);
          hasNewElements = true;
        }
      }
    }

    if (hasNewElements && !rafId) {
      rafId = requestAnimationFrame(flushPendingNodes);
    }
  }

  /**
   * Starts DOM observation and performs an immediate full page sweep.
   */
  function startHighlighting() {
    isEnabled = true;

    // Immediate initial scan
    scanAndHighlight(document);

    // Initialize MutationObserver if not created yet
    if (!observer) {
      observer = new MutationObserver(handleMutations);
    }

    // Observe documentElement / body for child additions only (ignoring attribute churn)
    const target = document.body || document.documentElement;
    if (target) {
      observer.disconnect(); // prevent double observation
      observer.observe(target, {
        childList: true,
        subtree: true
      });
    }
  }

  /**
   * Stops DOM observation, cancels pending batches, and clears all highlights.
   */
  function stopHighlighting() {
    isEnabled = false;

    if (observer) {
      observer.disconnect();
    }

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    pendingNodes = [];
    removeAllHighlights();
  }

  /**
   * Updates extension enabled/disabled state.
   * @param {boolean} enabled
   */
  function setEnabledState(enabled) {
    const shouldEnable = Boolean(enabled);
    if (shouldEnable === isEnabled && observer) {
      return;
    }

    if (shouldEnable) {
      startHighlighting();
    } else {
      stopHighlighting();
    }
  }

  /**
   * Handles SPA route transitions and page lifecycle events.
   */
  function handleUrlChange() {
    if (isEnabled) {
      // Short delay to allow dynamic SPA view to begin mounting
      setTimeout(() => scanAndHighlight(document), 100);
      setTimeout(() => scanAndHighlight(document), 500);
    }
  }

  /**
   * Setup SPA listeners (popstate and hashchange)
   */
  function setupNavigationListeners() {
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Also observe document readyState
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (isEnabled) {
          startHighlighting();
        }
      });
    }
  }

  /**
   * Initializes storage listeners and retrieves saved preferences.
   */
  function initStorage() {
    const storage = getStorageArea();

    if (!storage) {
      // If storage unavailable, default to enabled
      startHighlighting();
      return;
    }

    // Load initial preference
    try {
      storage.get({ [STORAGE_KEY]: DEFAULT_ENABLED }, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[X Follow Highlight] Error reading storage, using default:', chrome.runtime.lastError.message);
          startHighlighting();
          return;
        }

        const enabled = result ? result[STORAGE_KEY] !== false : DEFAULT_ENABLED;
        setEnabledState(enabled);
      });
    } catch (err) {
      console.warn('[X Follow Highlight] Exception while reading storage:', err);
      startHighlighting();
    }

    // Listen for storage changes across tabs & windows
    try {
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'sync' || areaName === 'local') {
            if (changes[STORAGE_KEY] && typeof changes[STORAGE_KEY].newValue !== 'undefined') {
              setEnabledState(changes[STORAGE_KEY].newValue);
            }
          }
        });
      }
    } catch (err) {
      console.warn('[X Follow Highlight] Failed to attach storage listener:', err);
    }
  }

  /**
   * Listen for direct runtime messages from the popup or background script.
   */
  function setupMessageListener() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message && message.type === 'TOGGLE_STATE') {
            setEnabledState(message.enabled);
            sendResponse({ success: true, enabled: isEnabled });
          } else if (message && message.type === 'GET_STATE') {
            sendResponse({ success: true, enabled: isEnabled });
          }
          return true; // Keep message channel open for async response if needed
        });
      }
    } catch (err) {
      console.warn('[X Follow Highlight] Failed to attach runtime message listener:', err);
    }
  }

  // Bootstrap extension
  setupNavigationListeners();
  setupMessageListener();
  initStorage();
})();
