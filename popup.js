/**
 * X Follow Highlight - Popup Controller
 *
 * Manages user preference toggling with chrome.storage.sync
 * and updates the popup UI accordingly.
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggle-switch');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const storageStatus = document.getElementById('storage-status');

  const STORAGE_KEY = 'enabled';
  const DEFAULT_ENABLED = true;

  /**
   * Safe getter for chrome storage (sync preferred, local fallback).
   */
  function getStorageArea() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome.storage.sync || chrome.storage.local || null;
      }
    } catch (e) {
      console.warn('[Popup] Storage access warning:', e);
    }
    return null;
  }

  /**
   * Updates the visual UI elements according to the enabled state.
   * @param {boolean} isEnabled
   */
  function updateUI(isEnabled) {
    toggleSwitch.checked = isEnabled;

    if (isEnabled) {
      statusDot.classList.add('active');
      statusText.textContent = 'Highlighting is on';
      statusText.style.color = '#f7f9f9';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Highlighting is off';
      statusText.style.color = '#8b98a5';
    }
  }

  /**
   * Displays temporary status feedback in the footer.
   * @param {string} msg
   * @param {boolean} isError
   */
  function showFeedback(msg, isError = false) {
    if (!storageStatus) return;
    storageStatus.textContent = msg;
    storageStatus.style.color = isError ? '#ff6b6b' : '#39e58c';

    setTimeout(() => {
      storageStatus.textContent = 'Saved across sessions';
      storageStatus.style.color = '';
    }, 2000);
  }

  /**
   * Broadcasts the updated state to any currently active tabs.
   * Note: chrome.storage.onChanged handles all content scripts automatically,
   * but direct messaging provides immediate real-time synchronization.
   * @param {boolean} isEnabled
   */
  function notifyActiveTabs(isEnabled) {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError || !tabs || tabs.length === 0) return;
          const activeTab = tabs[0];
          if (activeTab.id && activeTab.url && (activeTab.url.includes('x.com') || activeTab.url.includes('twitter.com'))) {
            chrome.tabs.sendMessage(activeTab.id, {
              type: 'TOGGLE_STATE',
              enabled: isEnabled
            }, () => {
              // Ignore response errors if content script was not injected on this tab
              if (chrome.runtime.lastError) {
                /* noop */
              }
            });
          }
        });
      }
    } catch (e) {
      // Safe failover
    }
  }

  /**
   * Saves preference to storage.
   * @param {boolean} newState
   */
  function saveState(newState) {
    const storage = getStorageArea();

    if (!storage) {
      updateUI(newState);
      showFeedback('Storage unavailable', true);
      return;
    }

    try {
      storage.set({ [STORAGE_KEY]: newState }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Storage save error:', chrome.runtime.lastError.message);
          // Attempt local storage fallback if sync failed
          if (chrome.storage && chrome.storage.local && storage !== chrome.storage.local) {
            chrome.storage.local.set({ [STORAGE_KEY]: newState }, () => {
              updateUI(newState);
              notifyActiveTabs(newState);
              showFeedback('Saved locally');
            });
            return;
          }
          showFeedback('Save failed', true);
          return;
        }

        updateUI(newState);
        notifyActiveTabs(newState);
        showFeedback('Settings saved');
      });
    } catch (err) {
      console.error('[Popup] Exception saving state:', err);
      showFeedback('Save error', true);
    }
  }

  /**
   * Loads initial state from storage and initializes UI.
   */
  function loadState() {
    const storage = getStorageArea();

    if (!storage) {
      updateUI(DEFAULT_ENABLED);
      return;
    }

    try {
      storage.get({ [STORAGE_KEY]: DEFAULT_ENABLED }, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('[Popup] Error loading state, using default:', chrome.runtime.lastError.message);
          updateUI(DEFAULT_ENABLED);
          return;
        }

        const isEnabled = result ? result[STORAGE_KEY] !== false : DEFAULT_ENABLED;
        updateUI(isEnabled);
      });
    } catch (err) {
      console.warn('[Popup] Exception reading storage:', err);
      updateUI(DEFAULT_ENABLED);
    }
  }

  // Event listener for toggle switch change
  toggleSwitch.addEventListener('change', (e) => {
    saveState(e.target.checked);
  });

  // Initial load
  loadState();
});
