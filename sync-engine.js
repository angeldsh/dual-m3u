/**
 * HLS DualSync Engine
 * Motor de sincronización de vídeo y audio HLS independientes en el navegador
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
  let isSeeking = false;
  let isLoaded = false;
  let userTolerance = parseFloat(syncToleranceSelect.value) || 0.1; // Default 100ms tolerance

  // Ensure Video Element is Muted by default so only external Audio track is played
  videoEl.muted = true;

  // Check HLS.js Support
  if (!Hls.isSupported()) {
    setGlobalStatus('error', 'HLS.js no compatible en este navegador');
    alert('Tu navegador no admite la reproducción HLS mediante hls.js.');
  }

  // --- Event Listeners Initialization ---
  function initListeners() {
    // Form & Buttons
    btnPlayLoad.addEventListener('click', handlePlayLoad);
    overlayPlayBtn.addEventListener('click', handlePlayLoad);
    btnClearInputs.addEventListener('click', clearInputs);
    btnForceSync.addEventListener('click', forceSync);
    
    syncToleranceSelect.addEventListener('change', (e) => {
      userTolerance = parseFloat(e.target.value);
    });

    // Custom Player Controls
    ctrlPlayPause.addEventListener('click', togglePlayPause);
    videoEl.addEventListener('click', togglePlayPause);
    
    // Seek Bar Interaction
    seekBar.addEventListener('input', () => {
      isSeeking = true;
      const targetTime = (seekBar.value / 100) * videoEl.duration;
      timeCurrent.textContent = formatTime(targetTime);
    });

    seekBar.addEventListener('change', () => {
      if (videoEl.duration) {
        const targetTime = (seekBar.value / 100) * videoEl.duration;
        videoEl.currentTime = targetTime;
        audioEl.currentTime = targetTime;
      }
      isSeeking = false;
    });

    // Volume Slider (Controls Audio Element)
    volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      audioEl.volume = vol;
      audioEl.muted = (vol === 0);
      updateVolumeIcons();
    });

    ctrlMute.addEventListener('click', () => {
      audioEl.muted = !audioEl.muted;
      volSlider.value = audioEl.muted ? 0 : audioEl.volume || 1;
      updateVolumeIcons();
    });

    // Fullscreen Toggle
    ctrlFullscreen.addEventListener('click', toggleFullscreen);

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



  // --- Clear Inputs ---
  function clearInputs() {
    videoUrlInput.value = '';
    audioUrlInput.value = '';
    vStatusBadge.textContent = 'Desconectado';
    vStatusBadge.className = 'status-badge';
    aStatusBadge.textContent = 'Desconectado';
    aStatusBadge.className = 'status-badge';
  }

  // --- Load Streams & Initialize HLS Instances ---
  function handlePlayLoad() {
    const vUrl = videoUrlInput.value.trim();
    const aUrl = audioUrlInput.value.trim();

    if (!vUrl || !aUrl) {
      alert('Por favor, ingresa tanto la URL del vídeo como la URL del audio HLS (.m3u8)');
      return;
    }

    // Clean existing streams if already loaded
    destroyStreams();

    setGlobalStatus('syncing', 'Cargando streams...');
    btnPlayText.textContent = 'Cargando...';

    // 1. Create Video HLS Instance
    hlsVideo = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 60
    });

    // 2. Create Audio HLS Instance
    hlsAudio = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 60
    });

    let videoReady = false;
    let audioReady = false;

    function checkBothReady() {
      if (videoReady && audioReady) {
        isLoaded = true;
        setGlobalStatus('synced', 'Streams Cargados');
        btnPlayText.textContent = 'Reproduciendo';
        videoOverlay.classList.add('hidden');
        
        // Start playback simultaneously
        playBoth();
        startSyncLoop();
      }
    }

    // Attach Video HLS
    hlsVideo.loadSource(vUrl);
    hlsVideo.attachMedia(videoEl);
    hlsVideo.on(Hls.Events.MANIFEST_PARSED, () => {
      vStatusBadge.textContent = 'Vídeo OK';
      vStatusBadge.className = 'status-badge online';
      videoReady = true;
      checkBothReady();
    });
    hlsVideo.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        vStatusBadge.textContent = 'Error Vídeo';
        vStatusBadge.className = 'status-badge error';
        setGlobalStatus('error', 'Error al cargar vídeo HLS');
      }
    });

    // Attach Audio HLS
    hlsAudio.loadSource(aUrl);
    hlsAudio.attachMedia(audioEl);
    hlsAudio.on(Hls.Events.MANIFEST_PARSED, () => {
      aStatusBadge.textContent = 'Audio OK';
      aStatusBadge.className = 'status-badge online';
      audioReady = true;
      checkBothReady();
    });
    hlsAudio.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        aStatusBadge.textContent = 'Error Audio';
        aStatusBadge.className = 'status-badge error';
        setGlobalStatus('error', 'Error al cargar audio HLS');
      }
    });
  }

  // --- Media Sync Event Listeners ---
  function setupMediaSyncEvents() {
    // Play Event
    videoEl.addEventListener('play', () => {
      if (audioEl.paused) {
        audioEl.play().catch(e => console.warn('Audio play error:', e));
      }
      updatePlayPauseIcons(true);
      audioVisualizer.classList.add('playing');
    });

    // Pause Event
    videoEl.addEventListener('pause', () => {
      audioEl.pause();
      updatePlayPauseIcons(false);
      audioVisualizer.classList.remove('playing');
    });

    // Seeking Event
    videoEl.addEventListener('seeking', () => {
      audioEl.currentTime = videoEl.currentTime;
    });

    videoEl.addEventListener('seeked', () => {
      audioEl.currentTime = videoEl.currentTime;
    });

    // Rate Change Event
    videoEl.addEventListener('ratechange', () => {
      audioEl.playbackRate = videoEl.playbackRate;
    });

    // Video Buffering (Waiting) Event
    videoEl.addEventListener('waiting', () => {
      setSyncState('syncing', 'Vídeo Buffering');
      audioEl.pause();
    });

    videoEl.addEventListener('playing', () => {
      if (audioEl.paused && !videoEl.paused) {
        audioEl.play().catch(e => console.warn('Audio resume error:', e));
      }
    });

    // Time & Duration Updates
    videoEl.addEventListener('timeupdate', () => {
      if (!isSeeking && videoEl.duration) {
        const progress = (videoEl.currentTime / videoEl.duration) * 100;
        seekBar.value = progress;
        timeCurrent.textContent = formatTime(videoEl.currentTime);
        timeDuration.textContent = formatTime(videoEl.duration);
        updateBufferBar();
      }
    });
  }

  // --- Periodic Synchronization Correction Loop ---
  function startSyncLoop() {
    if (syncIntervalId) clearInterval(syncIntervalId);

    syncIntervalId = setInterval(() => {
      if (!isLoaded || videoEl.paused || videoEl.seeking) return;

      const vTime = videoEl.currentTime;
      const aTime = audioEl.currentTime;
      const diff = aTime - vTime; // Audio relative to Video (positive = audio ahead)
      const absDiff = Math.abs(diff);
      const diffMs = Math.round(diff * 1000);

      // Update Diagnostics metrics
      mOffset.textContent = (diffMs > 0 ? `+${diffMs}` : `${diffMs}`) + ' ms';
      syncDiffLabel.textContent = `${Math.abs(diffMs)} ms`;
      mVBuffer.textContent = getBufferLength(videoEl).toFixed(1) + 's';
      mABuffer.textContent = getBufferLength(audioEl).toFixed(1) + 's';

      // 1. Major Drift (> 300ms) -> Hard Snap seek audio to video
      if (absDiff > 0.3) {
        audioEl.currentTime = vTime;
        audioEl.playbackRate = videoEl.playbackRate;
        mRate.textContent = `${videoEl.playbackRate.toFixed(2)}x (Snap)`;
        setSyncState('syncing', 'Ajuste Forzado');
      } 
      // 2. Minor Drift (> tolerance) -> Smooth Micro-adjustment of Audio Playback Rate
      else if (absDiff > userTolerance) {
        // If audio is ahead (diff > 0), slow down audio (e.g. 0.96x)
        // If audio is behind (diff < 0), speed up audio (e.g. 1.04x)
        const correctionFactor = diff > 0 ? 0.95 : 1.05;
        audioEl.playbackRate = videoEl.playbackRate * correctionFactor;
        mRate.textContent = `${audioEl.playbackRate.toFixed(2)}x (Corr)`;
        setSyncState('syncing', 'Micro-Ajustando');
      } 
      // 3. Perfect Sync (<= tolerance)
      else {
        audioEl.playbackRate = videoEl.playbackRate;
        mRate.textContent = `${videoEl.playbackRate.toFixed(2)}x`;
        setSyncState('synced', 'Sincronizado');
      }
    }, 100);
  }

  // --- Force Immediate Sync ---
  function forceSync() {
    if (isLoaded) {
      audioEl.currentTime = videoEl.currentTime;
      audioEl.playbackRate = videoEl.playbackRate;
      setSyncState('synced', 'Sincronizado');
    }
  }

  // --- Helper Play/Pause Dual Control ---
  function togglePlayPause() {
    if (!isLoaded) {
      handlePlayLoad();
      return;
    }

    if (videoEl.paused) {
      playBoth();
    } else {
      pauseBoth();
    }
  }

  function playBoth() {
    // Match audio time to video before play
    audioEl.currentTime = videoEl.currentTime;
    
    const p1 = videoEl.play();
    const p2 = audioEl.play();

    Promise.all([p1, p2]).catch(err => {
      console.warn('Autoplay exception handled:', err);
    });
  }

  function pauseBoth() {
    videoEl.pause();
    audioEl.pause();
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
      btnPlayText.textContent = 'Pausar';
    } else {
      iconPlay.classList.remove('hidden');
      iconPause.classList.add('hidden');
      btnPlayText.textContent = 'Reproducir';
    }
  }

  function updateVolumeIcons() {
    if (audioEl.muted || audioEl.volume === 0) {
      iconVolHigh.classList.add('hidden');
      iconVolMute.classList.remove('hidden');
    } else {
      iconVolHigh.classList.remove('hidden');
      iconVolMute.classList.add('hidden');
    }
  }

  function updateBufferBar() {
    if (videoEl.buffered.length > 0 && videoEl.duration) {
      const bufferedEnd = videoEl.buffered.end(videoEl.buffered.length - 1);
      const widthPercent = (bufferedEnd / videoEl.duration) * 100;
      bufferBar.style.width = widthPercent + '%';
    }
  }

  function getBufferLength(mediaElement) {
    if (!mediaElement.buffered.length) return 0;
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
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
  }

  // --- Document Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initListeners();
  });

})();
