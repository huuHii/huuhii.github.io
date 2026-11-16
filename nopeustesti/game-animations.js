/* Countdown and button light timings are in seconds. */
const GAME_COUNTDOWN = { holdSeconds: 0.75 };
const GAME_LIGHT_ANIMATIONS = {
  gameOver: { flashes: 3, intervalSeconds: 0.22 },
  standby: {
    stepSeconds: 0.55,
    pauseSeconds: 0.6 // Extra dark time after the last button. Use 0 to skip the pause.
  }
};
(() => {
  const colors = GameButtons.colorsInOrder;
  let timers = [];
  let standbyTimer = null;
  function all(lit) { colors.forEach(color => GameButtons.setLit(color, lit)); }
  function cancel() {
    timers.forEach(clearTimeout);
    timers = [];
    clearTimeout(standbyTimer);
    standbyTimer = null;
    all(false);
  }
  function after(ms, action) { timers.push(setTimeout(action, ms)); }
  window.GameLights = {
    all, cancel,
    standby(delaySeconds = 0) {
      cancel();
      const { stepSeconds, pauseSeconds } = GAME_LIGHT_ANIMATIONS.standby;
      const stepMs = stepSeconds * 1000;
      let index = 0;
      function lightNext() {
        const color = colors[index];
        GameButtons.setLit(color, true);
        const last = index === colors.length - 1;
        standbyTimer = setTimeout(() => {
          GameButtons.setLit(color, false);
          if (last) {
            index = 0;
            standbyTimer = setTimeout(lightNext, stepMs + pauseSeconds * 1000);
          } else {
            index++;
            lightNext();
          }
        }, stepMs);
      }
      standbyTimer = setTimeout(lightNext, Math.max(stepMs, delaySeconds * 1000));
    },
    ready(durationSeconds, done) {
      cancel();
      const ms = durationSeconds * 1000;
      colors.forEach((color, i) => after(ms * i / colors.length, () => GameButtons.setLit(color, true)));
      after(ms, () => { all(false); done(); });
    },
    gameOver(done, onFlash = () => {}) {
      cancel();
      const { flashes, intervalSeconds } = GAME_LIGHT_ANIMATIONS.gameOver;
      for (let i = 0; i < flashes * 2; i++) after(i * intervalSeconds * 1000, () => {
        const lit = i % 2 === 0;
        all(lit);
        onFlash(lit);
      });
      after(flashes * 2 * intervalSeconds * 1000, () => { all(false); done(); });
    }
  };
})();
