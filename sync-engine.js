/**
 * HLS DualSync Engine
 * Dual HLS Video & Audio Synchronization Engine for Web Browsers
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const videoEl = document.getElementById('v-player');
  const audioEl = document.getElementById('a-player');
  const videoUrlInput = document.getElementById('video-url');
  const audioUrlInput = document.getElementById('audio-url');
  
  const streamForm = document.getElementById('stream-form');
  const btnPlayLoad = document.getElementById('btn-play-load');
  const btnPlayText = document.getElementById('btn-play-text');
  const btnClearInputs = document.getElementById('btn-clear-inputs');
  const btnForceSync = document.getElementById('btn-force-sync');
  
  // Theme Toggle Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');

  // Status Badges
  const vStatusBadge = document.getElementById('v-status-badge');
  const aStatusBadge = document.getElementById('a-status-badge');
  const globalStatusBadge = document.getElementById('global-status-badge');
  const globalStatusText = document.getElementById('global-status-text');

  // Video Container & Overlays
  const videoContainer = document.getElementById('video-container');
  const videoOverlay = document.getElementById('video-overlay');
  const overlayPlayBtn = document.getElementById('overlay-play-btn');
  const overlayMessage = document.getElementById('overlay-message');
  const syncPill = document.getElementById('sync-pill');
  const syncStatusLabel = document.getElementById('sync-status-label');
  const syncDiffLabel = document.getElementById('sync-diff-label');
  const audioVisualizer = document.getElementById('audio-visualizer');

  // Controls Bar
  const seekBar = document.getElementById('seek-bar');
  const bufferBar = document.getElementById('buffer-bar');
  const ctrlPlayPause = document.getElementById('ctrl-play-pause');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const timeCurrent = document.getElementById('time-current');
  const timeDuration = document.getElementById('time-duration');
  const ctrlMute = document.getElementById('ctrl-mute');
  const iconVolHigh = document.getElementById('icon-vol-high');
  const iconVolMute = document.getElementById('icon-vol-mute');
  const volSlider = document.getElementById('vol-slider');
  const playbackSpeedSelect = document.getElementById('playback-speed-select');
  const syncToleranceSelect = document.getElementById('sync-tolerance-select');
  const ctrlFullscreen = document.getElementById('ctrl-fullscreen');

  // Metrics
  const mOffset = document.getElementById('m-offset');
  const mVBuffer = document.getElementById('m-v-buffer');
  const mABuffer = document.getElementById('m-a-buffer');
  const mRate = document.getElementById('m-rate');

  // --- Engine State ---
  let hlsVideo = null;
  let hlsAudio = null;
  let syncIntervalId = null;
  let idleTimerId = null;

  let hasVideo = false;
  let hasAudio = false;
  let isSeeking = false;
  let isLoaded = false;
  let userTolerance = parseFloat(syncToleranceSelect.value) || 0.1;
  let targetSpeed = 1.0;

  // Check HLS.js Support
  if (!Hls.isSupported()) {
    setGlobalStatus('error', 'HLS.js not supported');
    alert('Your browser does not support HLS playback via hls.js.');
  }

  // --- Event Listeners Initialization ---
  function initListeners() {
    // Theme Switcher
    btnThemeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // Form & Buttons
    btnPlayLoad.addEventListener('click', handlePlayLoad);
    overlayPlayBtn.addEventListener('click', handlePlayLoad);
    btnClearInputs.addEventListener('click', clearInputs);
    btnForceSync.addEventListener('click', forceSync);
    
    syncToleranceSelect.addEventListener('change', (e) => {
      userTolerance = parseFloat(e.target.value);
    });

    playbackSpeedSelect.addEventListener('change', (e) => {
      targetSpeed = parseFloat(e.target.value);
      setPlaybackSpeed(targetSpeed);
    });

    // Custom Player Controls
    ctrlPlayPause.addEventListener('click', togglePlayPause);
    videoEl.addEventListener('click', togglePlayPause);
    
    // Seek Bar Interaction
    seekBar.addEventListener('input', () => {
      isSeeking = true;
      const primaryMedia = hasVideo ? videoEl : audioEl;
      const targetTime = (seekBar.value / 100) * (primaryMedia.duration || 0);
      timeCurrent.textContent = formatTime(targetTime);
    });

    seekBar.addEventListener('change', () => {
      const primaryMedia = hasVideo ? videoEl : audioEl;
      if (primaryMedia.duration) {
        const targetTime = (seekBar.value / 100) * primaryMedia.duration;
        if (hasVideo) videoEl.currentTime = targetTime;
        if (hasAudio) audioEl.currentTime = targetTime;
      }
      isSeeking = false;
    });

    // Volume Slider
    volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      if (hasAudio) {
        audioEl.volume = vol;
        audioEl.muted = (vol === 0);
      }
      if (hasVideo && !hasAudio) {
        videoEl.volume = vol;
        videoEl.muted = (vol === 0);
      }
      updateVolumeIcons();
    });

    ctrlMute.addEventListener('click', () => {
      const targetMedia = hasAudio ? audioEl : videoEl;
      targetMedia.muted = !targetMedia.muted;
      volSlider.value = targetMedia.muted ? 0 : targetMedia.volume || 1;
      updateVolumeIcons();
    });

    // Fullscreen Toggle & Autohide controls
    ctrlFullscreen.addEventListener('click', toggleFullscreen);
    videoContainer.addEventListener('mousemove', handleFullscreenMouseMove);

    // Keyboard Shortcuts (Spacebar to toggle play/pause)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
      }
    });

    // Media Event Listeners for Synchronization
    setupMediaSyncEvents();
  }

  // --- Theme Toggle Logic ---
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (btnThemeToggle) {
      const isDark = theme === 'dark';
      btnThemeToggle.setAttribute('aria-checked', isDark ? 'true' : 'false');
      btnThemeToggle.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btnThemeToggle.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    }
  }

  // --- Clear Inputs ---
  function clearInputs() {
    videoUrlInput.value = '';
    audioUrlInput.value = '';
    vStatusBadge.textContent = 'Disconnected';
    vStatusBadge.className = 'status-badge';
    aStatusBadge.textContent = 'Disconnected';
    aStatusBadge.className = 'status-badge';
  }

  // --- Load Streams & Initialize HLS Instances ---
  function handlePlayLoad() {
    const vUrl = videoUrlInput.value.trim();
    const aUrl = audioUrlInput.value.trim();

    if (!vUrl && !aUrl) {
      alert('Please enter at least one Video or Audio HLS (.m3u8) URL');
      return;
    }

    // Clean existing streams if already loaded
    destroyStreams();

    hasVideo = Boolean(vUrl);
    hasAudio = Boolean(aUrl);

    setGlobalStatus('syncing', 'Loading streams...');
    btnPlayText.textContent = 'Loading...';

    let videoReady = !hasVideo;
    let audioReady = !hasAudio;

    function checkReady() {
      if (videoReady && audioReady) {
        isLoaded = true;
        setGlobalStatus('synced', 'Stream Loaded');
        btnPlayText.textContent = 'Playing';
        videoOverlay.classList.add('hidden');
        
        // Reset playback speed selector
        setPlaybackSpeed(targetSpeed);

        // Start playback
        playBoth();
        
        if (hasVideo && hasAudio) {
          startSyncLoop();
        } else {
          setSyncState('synced', hasVideo ? 'Video Only' : 'Audio Only');
        }
      }
    }

    // 1. Load Video HLS if provided
    if (hasVideo) {
      hlsVideo = new Hls({ enableWorker: true, lowLatencyMode: false });
      // Mute video element ONLY if separate audio track is present
      videoEl.muted = hasAudio;

      hlsVideo.loadSource(vUrl);
      hlsVideo.attachMedia(videoEl);
      hlsVideo.on(Hls.Events.MANIFEST_PARSED, () => {
        vStatusBadge.textContent = 'Video OK';
        vStatusBadge.className = 'status-badge online';
        videoReady = true;
        checkReady();
      });
      hlsVideo.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          vStatusBadge.textContent = 'Video Error';
          vStatusBadge.className = 'status-badge error';
          setGlobalStatus('error', 'Video HLS Error');
        }
      });
    } else {
      vStatusBadge.textContent = 'Not Used';
      vStatusBadge.className = 'status-badge';
    }

    // 2. Load Audio HLS if provided
    if (hasAudio) {
      hlsAudio = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsAudio.loadSource(aUrl);
      hlsAudio.attachMedia(audioEl);
      hlsAudio.on(Hls.Events.MANIFEST_PARSED, () => {
        aStatusBadge.textContent = 'Audio OK';
        aStatusBadge.className = 'status-badge online';
        audioReady = true;
        checkReady();
      });
      hlsAudio.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          aStatusBadge.textContent = 'Audio Error';
          aStatusBadge.className = 'status-badge error';
          setGlobalStatus('error', 'Audio HLS Error');
        }
      });
    } else {
      aStatusBadge.textContent = 'Not Used';
      aStatusBadge.className = 'status-badge';
    }
  }

  // --- Speed Control ---
  function setPlaybackSpeed(speed) {
    targetSpeed = speed;
    if (hasVideo && videoEl) videoEl.playbackRate = speed;
    if (hasAudio && audioEl) audioEl.playbackRate = speed;
    mRate.textContent = `${speed.toFixed(2)}x`;
  }

  // --- Media Sync Event Listeners ---
  function setupMediaSyncEvents() {
    // Play Event
    videoEl.addEventListener('play', () => {
      if (hasAudio && audioEl.paused) audioEl.play().catch(e => console.warn('Audio play error:', e));
      updatePlayPauseIcons(true);
      audioVisualizer.classList.add('playing');
    });

    audioEl.addEventListener('play', () => {
      if (!hasVideo) {
        updatePlayPauseIcons(true);
        audioVisualizer.classList.add('playing');
      }
    });

    // Pause Event
    videoEl.addEventListener('pause', () => {
      if (hasAudio) audioEl.pause();
      updatePlayPauseIcons(false);
      audioVisualizer.classList.remove('playing');
    });

    audioEl.addEventListener('pause', () => {
      if (!hasVideo) {
        updatePlayPauseIcons(false);
        audioVisualizer.classList.remove('playing');
      }
    });

    // Seeking Events
    videoEl.addEventListener('seeking', () => {
      if (hasAudio) audioEl.currentTime = videoEl.currentTime;
    });

    videoEl.addEventListener('seeked', () => {
      if (hasAudio) audioEl.currentTime = videoEl.currentTime;
    });

    // Buffering & Timeupdate for primary media
    const trackMedia = hasVideo ? videoEl : audioEl;
    trackMedia.addEventListener('timeupdate', () => {
      if (!isSeeking && trackMedia.duration) {
        const progress = (trackMedia.currentTime / trackMedia.duration) * 100;
        seekBar.value = progress;
        timeCurrent.textContent = formatTime(trackMedia.currentTime);
        timeDuration.textContent = formatTime(trackMedia.duration);
        updateBufferBar();
      }
    });
  }

  // --- Periodic Synchronization Loop (Dual Mode Only) ---
  function startSyncLoop() {
    if (syncIntervalId) clearInterval(syncIntervalId);

    syncIntervalId = setInterval(() => {
      if (!isLoaded || !hasVideo || !hasAudio || videoEl.paused || videoEl.seeking) return;

      const vTime = videoEl.currentTime;
      const aTime = audioEl.currentTime;
      const diff = aTime - vTime;
      const absDiff = Math.abs(diff);
      const diffMs = Math.round(diff * 1000);

      // Metrics display
      mOffset.textContent = (diffMs > 0 ? `+${diffMs}` : `${diffMs}`) + ' ms';
      syncDiffLabel.textContent = `${Math.abs(diffMs)} ms`;
      mVBuffer.textContent = getBufferLength(videoEl).toFixed(1) + 's';
      mABuffer.textContent = getBufferLength(audioEl).toFixed(1) + 's';

      // 1. Major Drift (> 300ms) -> Hard Snap
      if (absDiff > 0.3) {
        audioEl.currentTime = vTime;
        audioEl.playbackRate = targetSpeed;
        mRate.textContent = `${targetSpeed.toFixed(2)}x (Snap)`;
        setSyncState('syncing', 'Forced Snap');
      } 
      // 2. Minor Drift (> tolerance) -> Smooth Micro-adjustment
      else if (absDiff > userTolerance) {
        const correctionFactor = diff > 0 ? 0.95 : 1.05;
        audioEl.playbackRate = targetSpeed * correctionFactor;
        mRate.textContent = `${audioEl.playbackRate.toFixed(2)}x (Corr)`;
        setSyncState('syncing', 'Micro-Adjusting');
      } 
      // 3. Perfect Sync
      else {
        audioEl.playbackRate = targetSpeed;
        mRate.textContent = `${targetSpeed.toFixed(2)}x`;
        setSyncState('synced', 'Synced');
      }
    }, 100);
  }

  // --- Force Immediate Sync ---
  function forceSync() {
    if (isLoaded && hasVideo && hasAudio) {
      audioEl.currentTime = videoEl.currentTime;
      audioEl.playbackRate = targetSpeed;
      setSyncState('synced', 'Synced');
    }
  }

  // --- Helper Play/Pause Control ---
  function togglePlayPause() {
    if (!isLoaded) {
      handlePlayLoad();
      return;
    }

    const mainMedia = hasVideo ? videoEl : audioEl;
    if (mainMedia.paused) {
      playBoth();
    } else {
      pauseBoth();
    }
  }

  function playBoth() {
    if (hasVideo && hasAudio) audioEl.currentTime = videoEl.currentTime;
    
    const promises = [];
    if (hasVideo) promises.push(videoEl.play());
    if (hasAudio) promises.push(audioEl.play());

    Promise.all(promises).catch(err => console.warn('Autoplay exception handled:', err));
  }

  function pauseBoth() {
    if (hasVideo) videoEl.pause();
    if (hasAudio) audioEl.pause();
  }

  // --- Fullscreen & Idle Logic ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  function handleFullscreenMouseMove() {
    videoContainer.classList.remove('user-idle');
    if (idleTimerId) clearTimeout(idleTimerId);

    if (document.fullscreenElement) {
      idleTimerId = setTimeout(() => {
        videoContainer.classList.add('user-idle');
      }, 2500);
    }
  }

  // --- UI State Helpers ---
  function setGlobalStatus(state, message) {
    globalStatusText.textContent = message;
    globalStatusBadge.className = 'badge badge-pulse';
    if (state === 'synced') globalStatusBadge.classList.add('active');
  }

  function setSyncState(state, labelText) {
    syncPill.className = `sync-pill ${state}`;
    syncStatusLabel.textContent = labelText;
  }

  function updatePlayPauseIcons(isPlaying) {
    if (isPlaying) {
      iconPlay.classList.add('hidden');
      iconPause.classList.remove('hidden');
      btnPlayText.textContent = 'Pause';
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      btnPlayText.textContent = 'Play';
    }
  }

  function updateVolumeIcons() {
    const targetMedia = hasAudio ? audioEl : videoEl;
    if (targetMedia.muted || targetMedia.volume === 0) {
      iconVolHigh.classList.add('hidden');
      iconVolMute.classList.remove('hidden');
    } else {
      iconVolHigh.classList.remove('hidden');
      iconVolMute.classList.add('hidden');
    }
  }

  function updateBufferBar() {
    const targetMedia = hasVideo ? videoEl : audioEl;
    if (targetMedia.buffered.length > 0 && targetMedia.duration) {
      const bufferedEnd = targetMedia.buffered.end(targetMedia.buffered.length - 1);
      const widthPercent = (bufferedEnd / trackMediaDuration(targetMedia)) * 100;
      bufferBar.style.width = widthPercent + '%';
    }
  }

  function trackMediaDuration(mediaElement) {
    return mediaElement.duration || 1;
  }

  function getBufferLength(mediaElement) {
    if (!mediaElement || !mediaElement.buffered || !mediaElement.buffered.length) return 0;
    const currentTime = mediaElement.currentTime;
    for (let i = 0; i < mediaElement.buffered.length; i++) {
      if (mediaElement.buffered.start(i) <= currentTime && currentTime <= mediaElement.buffered.end(i)) {
        return mediaElement.buffered.end(i) - currentTime;
      }
    }
    return 0;
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const formattedMins = mins < 10 ? `0${mins}` : mins;
    const formattedSecs = secs < 10 ? `0${secs}` : secs;
    return `${formattedMins}:${formattedSecs}`;
  }

  function destroyStreams() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    if (hlsVideo) {
      hlsVideo.destroy();
      hlsVideo = null;
    }
    if (hlsAudio) {
      hlsAudio.destroy();
      hlsAudio = null;
    }
    videoEl.pause();
    audioEl.pause();
    videoEl.removeAttribute('src');
    audioEl.removeAttribute('src');
    videoEl.load();
    audioEl.load();
    isLoaded = false;
    hasVideo = false;
    hasAudio = false;
  }

  // --- Document Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initListeners();
  });

})();
