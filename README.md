# 🎬 HLS DualSync Player

A modern, ultra-minimalist web application for playing and synchronizing separate HLS (`.m3u8`) video and audio streams in real-time directly inside the browser, powered by **`hls.js`**.

![HLS DualSync Player](https://img.shields.io/badge/HLS.js-v1.x-indigo?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square) ![Web](https://img.shields.io/badge/HTML5--CSS3--JS-Client--Side-emerald?style=flat-square)

---

## ✨ Features

- **Dual-Stream Synchronization**: Plays independent video `.m3u8` and audio `.m3u8` URLs in lock-step without downloading, re-muxing, or server-side processing.
- **Flexible Playback Modes**:
  - **Dual Mode**: Synchronizes separate video and audio streams into a unified playback experience.
  - **Video Only**: Plays a single video HLS stream with its native audio track.
  - **Audio Only**: Plays a single audio HLS stream with an interactive audio wave visualizer.
- **Real-Time Drift Correction Engine**:
  - **Micro-adjustments**: Smoothly speeds up or slows down audio `playbackRate` to eliminate minor time differences (e.g. 50ms - 250ms drift) without audio pitch popping.
  - **Hard Snap**: Instantly seeks audio to match video position if drift exceeds 300ms.
- **Ultra-Minimalist & Responsive UI**:
  - Dark glassmorphism & Apple/Vercel-inspired clean Light Mode.
  - Smooth sliding theme toggle switch with Sun ☀️ and Moon 🌙 icons.
  - Crisp player overlay controls (Play/Pause, scrub bar, volume, speed selector `0.5x` - `2.0x`, fullscreen).
  - **Clean Fullscreen**: Hides top status bars, autohides player controls, and vanishes the mouse cursor after 2.5s of inactivity.
  - Inline real-time diagnostics bar displaying time drift (in `ms`), buffer health, and playback speed.
- **100% Client-Side**: Operates entirely in the browser with zero backend requirements.

---

## 🛠️ Project Structure

```
m3u/
├── index.html        # Main HTML5 application markup
├── styles.css        # Master stylesheet (CSS design system & responsive layout)
├── sync-engine.js    # Dual HLS synchronization engine & player controller
└── README.md         # Documentation & setup guide
```

---

## 🚀 Quick Start

### 1. Run Locally (No Build Step Required)

Since **HLS DualSync Player** is built with native HTML5, CSS3, and JavaScript, you can open `index.html` directly in any Chromium-based browser (Chrome, Brave, Edge) or Firefox.

#### Option A: Direct Open
Simply double-click [`index.html`](file:///c:/Users/%C3%81ngel/Documents/m3u/index.html) or open it with your browser.

#### Option B: Local HTTP Server (Recommended)
Using Python:
```bash
python -m http.server 8080
```
Using Node.js / `serve`:
```bash
npx serve -l 8080 .
```
Then visit [`http://localhost:8080`](http://localhost:8080) in your browser.

---

## 💻 How to Use

1. Paste your HLS video `.m3u8` URL in the **Video Stream URL** input (or leave empty if playing audio only).
2. Paste your HLS audio `.m3u8` URL in the **Audio Stream URL** input (or leave empty if playing video only).
3. Click **Load & Play** (or press the big Play button in the video area).
4. Use the player controls to play/pause, scrub through the timeline, adjust volume, change playback speed, or click **Sync Now** to force immediate synchronization.

---

## 🌐 Deploying Online

You can host this static web app for free in less than a minute on any static hosting provider:

- **[Netlify Drop](https://app.netlify.com/drop)**: Drag and drop the project folder directly to get an instant HTTPS URL.
- **[Vercel](https://vercel.com)**: Import the repository to Vercel for instant deployment.
- **[GitHub Pages](https://pages.github.com)**: Push to a GitHub repository and enable Pages in Settings.
- **[Cloudflare Pages](https://pages.cloudflare.com)**: Free global CDN static hosting.

---

## ⚡ Tech Stack

- **HTML5 & CSS3**: Vanilla CSS with custom properties, glassmorphism, responsive flexbox/grid layout.
- **JavaScript (ES6+)**: Event-driven media playback controller.
- **[hls.js](https://github.com/video-dev/hls.js/)**: HLS library for rendering `.m3u8` streams via MediaSource Extensions (MSE).

---

## 📄 License

Distributed under the MIT License. Feel free to use, modify, and distribute for personal or commercial projects.
