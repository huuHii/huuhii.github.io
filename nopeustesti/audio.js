/* Named sounds and tone assignments are ready for the later game logic. */
const GAME_AUDIO = {
  clackVolume: 5,
  beepVolume: 5,
  maxVolume: 5,
  sounds: { press: 'button-press.wav', release: 'button-release.wav', gameOver: 'gameover.wav' },
  tones: { red: 'd#3_1.wav', yellow: 'g#3_1.wav', blue: 'd#4_1.wav', green: 'g#4_1.wav' }
};
(() => {
  let context;
  let activeTone = null;
  let toneRequest = 0;
  let generation = 0;
  let needsFreshContext = false;
  const sources = new Set();
  const bytes = new Map();
  const buffers = new Map();
  // Fetch early; decode once audio has been unlocked by a user gesture.
  for (const file of [...Object.values(GAME_AUDIO.sounds), ...Object.values(GAME_AUDIO.tones)]) {
    bytes.set(file, fetch(`assets/${encodeURIComponent(file)}`).then(r => {
      if (!r.ok) throw new Error(`Sound not found: ${file}`);
      return r.arrayBuffer();
    }).catch(error => { console.warn(error); return null; }));
  }
  function unlock() {
    if (document.hidden) return;
    if (context?.state === 'closed') context = null;
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    // Safari also uses "interrupted" after a lock, call, or app switch.
    if (context.state !== 'running') context.resume().catch(console.warn);
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
  document.addEventListener('keydown', restoreOnGesture, { capture: true });
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
      if (!volume) return;
      if (!buffers.has(file)) buffers.set(file, bytes.get(file).then(data => data ? audioContext.decodeAudioData(data.slice(0)) : null).catch(error => {
        buffers.delete(file);
        throw error;
      }));
      const buffer = await buffers.get(file);
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
    press: () => play(GAME_AUDIO.sounds.press, 'clackVolume'),
    release: () => play(GAME_AUDIO.sounds.release, 'clackVolume'),
    tone: color => play(GAME_AUDIO.tones[color], 'beepVolume'),
    gameOver: () => play(GAME_AUDIO.sounds.gameOver, 'beepVolume'),
    stopTone() {
      toneRequest++;
      if (activeTone) { activeTone.stop(); activeTone = null; }
    },
    getVolume: channel => GAME_AUDIO[channel],
    setVolume(channel, value) { GAME_AUDIO[channel] = Math.max(0, Math.min(GAME_AUDIO.maxVolume, value)); }
  };
})();
