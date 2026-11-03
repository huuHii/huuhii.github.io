/* READY sweep and game-over flashing. Times are in seconds. */
const GAME_LIGHT_ANIMATIONS = {
  ready: { durationSeconds: 1 },
  gameOver: { flashes: 3, intervalSeconds: 0.22 },
  practiceResultHoldSeconds: 2
};
(() => {
  const colors = ['red', 'yellow', 'blue', 'green'];
  let timers = [];
  function all(lit) { colors.forEach(color => GameButtons.setLit(color, lit)); }
  function cancel() { timers.forEach(clearTimeout); timers = []; all(false); }
  function after(ms, action) { timers.push(setTimeout(action, ms)); }
  window.GameLights = {
    all, cancel,
    ready(done) {
      cancel();
      const ms = GAME_LIGHT_ANIMATIONS.ready.durationSeconds * 1000;
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
