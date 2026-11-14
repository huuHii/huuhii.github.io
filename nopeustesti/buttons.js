/* Track holds and lights independently of the artwork used to render them. */
(() => {
  const arrowColors = { left: 'red', down: 'yellow', up: 'blue', right: 'green' };
  const shortcuts = {
    red: ['ArrowLeft', 'A', 'Z'],
    yellow: ['ArrowDown', 'S', 'X'],
    blue: ['ArrowUp', 'W', 'C'],
    green: ['ArrowRight', 'D', 'V']
  };
  const shortcutColors = new Map(Object.entries(shortcuts).flatMap(([color, keys]) =>
    keys.map(key => [key.toLowerCase(), color])
  ));
  const { preset, presets } = BUTTON_CONFIG;
  const config = presets[preset];
  const pad = document.querySelector('.button-pad');
  const states = new Map();
  let menuFeedback = true;
  function sprite(src, className = '') {
    const image = new Image();
    image.alt = '';
    image.draggable = false;
    image.className = className;
    image.src = src;
    return image;
  }
  function mountArrows(button, direction) {
    const mirrored = direction === 'right';
    const base = `assets/arrow-buttons-v1/${mirrored ? 'left' : direction}`;
    const art = document.createElement('span');
    art.className = 'arrow-art';
    art.classList.toggle('is-mirrored', mirrored);
    art.setAttribute('aria-hidden', 'true');
    art.style.setProperty('--arrow-hue', `${config.buttonHue[direction]}deg`);
    art.style.setProperty('--arrow-saturation', config.buttonSaturation[direction]);
    const cap = document.createElement('span');
    cap.className = 'arrow-cap';
    cap.append(sprite(`${base}-button.png`), sprite(`${base}-button-lit.png`, 'arrow-lit'));
    art.append(sprite(`${base}-backframe.png`, 'arrow-backframe'), cap,
      sprite(`${base}-frontframe.png`, 'arrow-frontframe'));
    button.append(art);
    return lit => { art.dataset.lit = String(lit); };
  }
  function mountLegacy(button, color) {
    const base = `assets/${color}`;
    const image = sprite(`${base}-default.png`);
    for (const name of ['pressed', 'lit', 'lit-pressed']) sprite(`${base}-${name}.png`);
    button.append(image);
    return (lit, pressed) => {
      const name = lit ? (pressed ? 'lit-pressed' : 'lit') : (pressed ? 'pressed' : 'default');
      image.src = `${base}-${name}.png`;
    };
  }
  function render(state) {
    const pressed = state.holds.size > 0;
    const lit = state.lit || (menuFeedback && pressed);
    state.renderArt(lit, pressed);
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
  const arrows = preset === 'arrows-v1';
  pad.dataset.preset = preset;
  if (arrows) {
    pad.style.setProperty('--arrow-press-distance', `${config.pressDistancePx}px`);
    pad.style.setProperty('--arrow-transition', `${config.transitionMs}ms`);
    // Sepia gives the grayscale art a warm base hue to rotate from.
    const tint = config.frameHue === null ? '' : `sepia(1) saturate(2) hue-rotate(${config.frameHue - 45}deg) `;
    pad.style.setProperty('--arrow-frame-filter', `${tint}brightness(${config.frameBrightness})`);
  }
  for (const slot of config.order) {
    const color = arrows ? arrowColors[slot] : slot;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-button';
    button.dataset.color = color;
    button.setAttribute('aria-label', color[0].toUpperCase() + color.slice(1));
    button.setAttribute('aria-keyshortcuts', shortcuts[color].join(' '));
    const renderArt = arrows ? mountArrows(button, slot) : mountLegacy(button, color);
    const state = { color, button, renderArt, lit: false, holds: new Set() };
    states.set(color, state);
    render(state);
    pad.append(button);
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
      release(state, 'key: ');
      release(state, 'key:Enter');
    });
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const state = states.get(shortcutColors.get(key));
    if (!state || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target?.isContentEditable || event.target?.closest?.('input, textarea, select')) return;
    event.preventDefault();
    if (!event.repeat) press(state, `shortcut:${event.code || key}`);
  });
  document.addEventListener('keyup', event => {
    const id = `shortcut:${event.code || event.key.toLowerCase()}`;
    for (const state of states.values()) release(state, id);
  });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.GameButtons = {
    setLit(color, lit) { const state = states.get(color); if (state) { state.lit = lit; render(state); } },
    setMenuFeedback(enabled) { menuFeedback = enabled; states.forEach(render); },
    releaseAll
  };
})();
