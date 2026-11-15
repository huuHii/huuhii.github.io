/* Named sounds and tone assignments are ready for the later game logic. */
const GAME_AUDIO = {
  clackVolume: 5,
  beepVolume: 5,
  maxVolume: 5,
  sounds: { press: 'button-press.mp3', release: 'button-release.mp3', gameOver: 'gameover.mp3' },
  tones: { red: 'd#3_1.mp3', yellow: 'g#3_1.mp3', blue: 'd#4_1.mp3', green: 'g#4_1.mp3' }
};
(() => {
  const volumeKey = 'nopeustesti.audio';
  const channels = ['clackVolume', 'beepVolume'];
  function applyVolume(channel, value) {
    if (channels.includes(channel) && Number.isFinite(value)) {
      GAME_AUDIO[channel] = Math.max(0, Math.min(GAME_AUDIO.maxVolume, value));
    }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(volumeKey));
    for (const channel of channels) applyVolume(channel, saved?.[channel]);
  } catch {}
  let context;
  let activeTone = null;
  let toneRequest = 0;
  let generation = 0;
  let needsFreshContext = false;
  const sources = new Set();
  const bytes = new Map();
  const buffers = new Map();
  function download(file) {
    if (!bytes.has(file)) {
      bytes.set(file, fetch(`assets/${encodeURIComponent(file)}`).then(r => {
        if (!r.ok) throw new Error(`Sound not found: ${file}`);
        return r.arrayBuffer();
      }).catch(error => {
        bytes.delete(file);
        console.warn(error);
        return null;
      }));
    }
    return bytes.get(file);
  }
  const cueFiles = [...Object.values(GAME_AUDIO.tones), GAME_AUDIO.sounds.gameOver];
  const ready = Promise.all([...Object.values(GAME_AUDIO.sounds), ...Object.values(GAME_AUDIO.tones)].map(download));
  function decode(file, audioContext) {
    if (!buffers.has(file)) {
      buffers.set(file, download(file).then(async data => {
        if (!data) throw new Error(`Sound unavailable: ${file}`);
        return audioContext.decodeAudioData(data.slice(0));
      }).catch(error => {
        buffers.delete(file);
        console.warn(error);
        return null;
      }));
    }
    return buffers.get(file);
  }
  function unlock() {
    if (document.hidden) return;
    if (context?.state === 'closed') context = null;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    // Safari also uses "interrupted" after a lock, call, or app switch.
    return context.state === 'running' ? Promise.resolve() : context.resume().catch(console.warn);
  }
  function stopAll() {
    generation++;
    toneRequest++;
    for (const source of sources) {
      try { source.stop(); } catch { /* Already ended. */ }
    }
    sources.clear();
    activeTone = null;
  }
  function restoreOnGesture() {
    if (document.hidden) return;
    if (needsFreshContext) {
      // Some iOS versions report "running" even when the old context is silent.
      // Replace it once per background session, inside the next real gesture.
      stopAll();
      const previous = context;
      context = null;
      needsFreshContext = false;
      if (previous && previous.state !== 'closed') previous.close().catch(console.warn);
    }
    unlock();
  }
  function background() {
    stopAll();
    needsFreshContext = Boolean(context);
  }
  document.addEventListener('pointerdown', restoreOnGesture, { capture: true });
  document.addEventListener('pointerup', restoreOnGesture, { capture: true });
  document.addEventListener('keydown', restoreOnGesture, { capture: true });
  document.addEventListener('click', restoreOnGesture, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) background();
    else if (context) unlock();
  });
  addEventListener('pagehide', background);
  addEventListener('pageshow', () => { if (context) unlock(); });
  async function play(file, channel) {
    // Don't queue sounds to unexpectedly play when the app is reopened.
    if (document.hidden || needsFreshContext) return;
    const isTone = channel === 'beepVolume';
    const request = isTone ? ++toneRequest : null;
    if (isTone && activeTone) {
      activeTone.stop();
      activeTone = null;
    }
    try {
      unlock();
      const audioContext = context;
      const playbackGeneration = generation;
      const volume = GAME_AUDIO[channel] / GAME_AUDIO.maxVolume;
      if (!volume || !audioContext) return;
      const buffer = await decode(file, audioContext);
      if (!buffer || document.hidden || playbackGeneration !== generation || audioContext !== context || audioContext.state !== 'running' || (isTone && request !== toneRequest)) return;
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(audioContext.destination);
      source.onended = () => {
        sources.delete(source);
        if (activeTone === source) activeTone = null;
        source.disconnect(); gain.disconnect();
      };
      if (isTone) activeTone = source;
      sources.add(source);
      source.start();
    } catch (error) { console.warn('Audio could not play:', error); }
  }
  window.GameAudio = {
    unlock,
    ready,
    async prepareRun() {
      if (!GAME_AUDIO.beepVolume) return true;
      let timer;
      try {
        const resume = unlock();
        const audioContext = context;
        if (!audioContext) return false;
        const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(false), 6000); });
        const prepare = Promise.all([resume, ...cueFiles.map(file => decode(file, audioContext))])
          .then(([, ...decoded]) => context === audioContext && audioContext.state === 'running' && decoded.every(Boolean));
        return await Promise.race([prepare, timeout]);
      } catch (error) {
        console.warn('Cue audio could not be prepared:', error);
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
    press: () => play(GAME_AUDIO.sounds.press, 'clackVolume'),
    release: () => play(GAME_AUDIO.sounds.release, 'clackVolume'),
    tone: color => play(GAME_AUDIO.tones[color], 'beepVolume'),
    gameOver: () => play(GAME_AUDIO.sounds.gameOver, 'beepVolume'),
    stopTone() {
      toneRequest++;
      if (activeTone) { activeTone.stop(); activeTone = null; }
    },
    getVolume: channel => GAME_AUDIO[channel],
    setVolume(channel, value) {
      applyVolume(channel, value);
      try { localStorage.setItem(volumeKey, JSON.stringify(Object.fromEntries(channels.map(key => [key, GAME_AUDIO[key]])))); } catch {}
    }
  };
})();
