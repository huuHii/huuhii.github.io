/* Independent held/lit states: all four state images are preloaded. */
(() => {
  const states = new Map();
  let menuFeedback = true;
  function render(state) {
    const pressed = state.holds.size > 0;
    const lit = state.lit || (menuFeedback && pressed);
    const name = lit ? (pressed ? 'lit-pressed' : 'lit') : (pressed ? 'pressed' : 'default');
    state.image.src = `assets/${state.color}-${name}.png`;
    state.button.setAttribute('aria-pressed', String(pressed));
  }
  function press(state, id) {
    if (state.holds.has(id)) return;
    const wasHeld = state.holds.size > 0;
    state.holds.add(id);
    render(state);
    if (!wasHeld) {
      GameAudio.press();
      document.dispatchEvent(new CustomEvent('game-button-press', { detail: { color: state.color } }));
    }
  }
  function release(state, id) {
    if (!state.holds.delete(id)) return;
    render(state);
    if (!state.holds.size) {
      GameAudio.release();
      document.dispatchEvent(new CustomEvent('game-button-release', { detail: { color: state.color } }));
    }
  }
  function releaseAll() {
    for (const state of states.values()) for (const id of [...state.holds]) release(state, id);
  }
  for (const button of document.querySelectorAll('.game-button')) {
    const color = button.dataset.color;
    const state = { color, button, image: button.querySelector('img'), lit: false, holds: new Set() };
    states.set(color, state);
    for (const name of ['default', 'pressed', 'lit', 'lit-pressed']) {
      const image = new Image();
      image.src = `assets/${color}-${name}.png`;
    }
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      press(state, event.pointerId);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, event => release(state, event.pointerId));
    }
    button.addEventListener('keydown', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault();
      if (!event.repeat) press(state, `key:${event.key}`);
    });
    button.addEventListener('keyup', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault();
      release(state, `key:${event.key}`);
    });
    button.addEventListener('blur', () => {
      for (const id of [...state.holds]) if (typeof id === 'string') release(state, id);
    });
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.GameButtons = {
    setLit(color, lit) { const state = states.get(color); if (state) { state.lit = lit; render(state); } },
    setMenuFeedback(enabled) { menuFeedback = enabled; states.forEach(render); },
    releaseAll
  };
})();
