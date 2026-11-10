# X Follow Highlight

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-1.0.1-39e58c.svg)](https://github.com/bynextex/x-follow-highlight/releases)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25_Local-blue.svg)](#privacy-statement)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight, production-ready Google Chrome extension (Manifest V3) that automatically detects accounts that follow you on **X** (formerly Twitter) and visually highlights the **"Follows you"** indicator in a bright, high-contrast neon green (`#39e58c`).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Visual Design](#visual-design)
- [How It Works: Technical Architecture](#how-it-works-technical-architecture)
- [Project Structure](#project-structure)
- [Installation Guide](#installation-guide)
  - [Method 1: Chrome Developer Mode (Unpacked)](#method-1-chrome-developer-mode-unpacked)
  - [Method 2: Install from ZIP Archive](#method-2-install-from-zip-archive)
- [Usage & Controls](#usage--controls)
- [Performance & Security Standards](#performance--security-standards)
- [Privacy Statement](#privacy-statement)
- [Disclaimer](#disclaimer)
- [Author & Creator](#author--creator)
- [License](#license)

---

## Overview

When browsing profiles, follower lists, search results, or user hovercards on X, identifying which accounts already follow you back can be difficult due to subtle, low-contrast gray indicators.

**X Follow Highlight** solves this by instantly styling every follow indicator with a vivid, modern green pill badge that stands out clearly in both Dark Mode ("Lights out" & "Dim") and Light Mode, regardless of the language configured on your X account.

---

## Key Features

- **Language-Independent Detection**: Uses X's internal test attribute (`[data-testid="userFollowIndicator"]`) rather than localized text matching. Works seamlessly across all 40+ languages supported by X (English, Turkish, Spanish, French, Japanese, etc.).
- **Dynamic SPA Support**: Seamlessly tracks client-side route changes and infinite-scroll feeds on X's Single Page Application without requiring page reloads.
- **Batched DOM Observation**: Utilizes an efficient `MutationObserver` paired with `requestAnimationFrame` to eliminate DOM thrashing and preserve 60 FPS scrolling performance.
- **Modern Popup Interface**: Includes a compact dark-themed popup featuring an intuitive ON/OFF toggle switch, real-time status indicator, and automatic persistence.
- **Cross-Session Persistence**: Automatically saves your toggle preference via `chrome.storage.sync` (with resilient local storage fallback) and restores it across browser restarts.
- **Instant Hot-Toggling**: When toggled OFF, all highlight classes are stripped immediately from the DOM; when toggled ON, the active view is scanned and highlighted instantly.
- **Minimal Footprint**: 100% vanilla JavaScript with zero external frameworks, remote scripts, or tracking libraries. Only the necessary `storage` permission is requested.

---

## Visual Design

The extension applies a modern, sleek pill badge with the following specification:

| Property | Value | Description |
| :--- | :--- | :--- |
| **Accent Text** | `#39e58c` | Bright neon green for maximum legibility |
| **Background** | `rgba(57, 229, 140, 0.12)` | Subtle tinted translucent container |
| **Border** | `rgba(57, 229, 140, 0.32)` | Clean 1px boundary |
| **Hover State** | `rgba(57, 229, 140, 0.20)` | Interactive glow feedback |
| **Typography** | Bold (`700`), 11px | High contrast, balanced line height |
| **Geometry** | Rounded Pill (`border-radius: 9999px`) | Perfectly complements X's UI styling |

All styles are applied strictly via the dedicated `.x-follow-highlight` CSS class, ensuring X's native layout, margins, and responsiveness remain undisturbed.

---

## How It Works: Technical Architecture

### 1. Robust Language-Agnostic Selector

Rather than inspecting element text content (e.g. searching for `"Follows you"` or `"Takip ediyor"`), the extension targets X's programmatic DOM attribute:

```css
[data-testid="userFollowIndicator"]
```

Because X's React web client renders this exact `data-testid` across all language localizations, the detection is 100% immune to language changes, translation extensions, and UI copy updates.

### 2. High-Efficiency MutationObserver with RAF Batching

Modern X feeds render thousands of DOM nodes during infinite scrolling. Naive mutation observers that re-scan the entire `document` cause severe CPU spikes and dropped frames.

**X Follow Highlight** employs a high-performance batched pipeline:

1. **Selective Observation**: The observer watches only `{ childList: true, subtree: true }`, completely ignoring attribute changes, style changes, and character data mutations.
2. **Batch Collection**: Newly inserted `Node.ELEMENT_NODE` nodes are pushed to an in-memory queue.
3. **Frame Coalescing**: DOM scans are scheduled via `requestAnimationFrame(flushPendingNodes)`. Multiple DOM insertions occurring within the same render tick are coalesced into a single pass.
4. **Targeted Subtree Scanning**: Only the newly added subtrees (and root elements matching the selector) are checked, leaving the rest of the DOM untouched.

### 3. Real-Time State Synchronization

- **Popup to Content Script**: Changes made in the popup write to `chrome.storage.sync`.
- **Cross-Tab Reactivity**: Content scripts listen to `chrome.storage.onChanged`. If you toggle the extension in one tab, all other open X tabs reflect the change simultaneously without a refresh.
- **Graceful Error Handling**: If storage synchronization encounters quota or network limits, it falls back seamlessly to `chrome.storage.local`.

---

## Project Structure

```text
x-follow-highlight/
├── manifest.json         # Manifest V3 extension configuration
├── content.js            # Content script: DOM observer & highlighter engine
├── styles.css            # Highlight styling (.x-follow-highlight)
├── popup.html            # Extension popup user interface
├── popup.css             # Dark-themed styling for popup
├── popup.js              # Preference management & toggle controller
├── icons/                # High-resolution raster extension icons
│   ├── icon16.png        # 16x16 toolbar icon
│   ├── icon48.png        # 48x48 extension management icon
│   └── icon128.png       # 128x128 Chrome Web Store icon
├── X-Follow-Highlight-v1.0.1.zip # Production-ready packaged archive
└── README.md             # Complete technical documentation
```

---

## Installation Guide

### Method 1: Chrome Developer Mode (Unpacked)

1. **Download or Clone** this repository to your computer:
   ```bash
   git clone https://github.com/bynextex/x-follow-highlight.git
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle switch located in the upper-right corner.
4. Click the **Load unpacked** button in the upper-left corner.
5. In the file picker dialog, select the `x-follow-highlight` root directory (containing `manifest.json`).
6. The extension is now installed and active! Pin the extension icon to your Chrome toolbar for easy access.

### Method 2: Install from ZIP Archive

1. Download the packaged release archive: [`X-Follow-Highlight-v1.0.1.zip`](./X-Follow-Highlight-v1.0.1.zip).
2. Extract the ZIP archive into a local folder on your computer.
3. Go to `chrome://extensions/` and ensure **Developer mode** is enabled.
4. Click **Load unpacked** and select the extracted folder.

---

## Usage & Controls

### Automatic Highlighting
Once installed, the extension is enabled by default. Open any profile or feed on [x.com](https://x.com) or [twitter.com](https://twitter.com). If the user follows you, their "Follows you" badge will immediately appear in bright green.

### Enabling / Disabling Highlighting
1. Click the **X Follow Highlight** icon in the Chrome extension toolbar.
2. Toggle the switch:
   - **ON** (Green switch + glowing green indicator): Highlighting is active.
   - **OFF** (Gray switch + muted indicator): Highlighting is disabled and all highlight styles are removed instantly from the current page.
3. Your selection is automatically remembered across browser sessions and restarts.

---

## Performance & Security Standards

- **No Remote Scripts**: All logic runs locally. Complies strictly with Chrome Web Store Manifest V3 security requirements.
- **Zero Dependencies**: Pure vanilla JavaScript (ES6+). Zero npm packages, zero external CDNs, zero bundler bloat.
- **Leak-Free Lifecycle**: Mutation observers and animation frames are disconnected cleanly whenever highlighting is disabled or navigation occurs.
- **Minimal Permissions**: Requests only the `"storage"` permission to save user preferences. Does **not** request broad browsing history, cookies, or webRequest permissions.

---

## Privacy Statement

**X Follow Highlight** is committed to absolute user privacy:

- **No Telemetry or Analytics**: The extension does not collect, log, or transmit any analytical data.
- **No Network Requests**: The extension makes zero external HTTP/HTTPS network calls.
- **No Account Access**: The extension does not read, modify, or transmit your credentials, private messages, tokens, or personal information.
- **100% Local Processing**: All detection and visual styling happen exclusively in your local browser sandbox.

---

## Disclaimer

This extension is an independent open-source project and is **not** affiliated with, endorsed by, authorized by, or in any way officially connected to **X Corp.** or **Twitter, Inc.**

The official X website can be found at [https://x.com](https://x.com). "X" and "Twitter" are registered trademarks of X Corp.

---

## Author & Creator

- **Created by:** [@kuntekul](https://x.com/kuntekul)
- **Repository:** [https://github.com/bynextex/x-follow-highlight](https://github.com/bynextex/x-follow-highlight)

---

## License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute it in accordance with the terms of the license.

