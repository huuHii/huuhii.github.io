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
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume().catch(console.warn);
  }
  async function play(file, channel) {
    const isTone = channel === 'beepVolume';
    const request = isTone ? ++toneRequest : null;
    if (isTone && activeTone) {
      activeTone.stop();
      activeTone = null;
    }
    try {
      unlock();
      const volume = GAME_AUDIO[channel] / GAME_AUDIO.maxVolume;
      if (!volume) return;
      if (!buffers.has(file)) buffers.set(file, bytes.get(file).then(data => data ? context.decodeAudioData(data.slice(0)) : null));
      const buffer = await buffers.get(file);
      if (!buffer || (isTone && request !== toneRequest)) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      source.onended = () => {
        if (activeTone === source) activeTone = null;
        source.disconnect(); gain.disconnect();
      };
      if (isTone) activeTone = source;
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
