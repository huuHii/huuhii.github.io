/* Speeds are percentages of the LED screen width per second. */
const SCREEN_ANIMATIONS = {
  'scroll-loop': { speed: 57, gap: 30 },
  'scroll-stop': { speed: 364 },
  'static': { speed: 0 }
};
/* Hold time starts once the title has reached the center. */
const SCREEN_SEQUENCE_SETTINGS = {
  'title-loop': { holdSeconds: 1, welcomeHoldSeconds: 2, practiceHoldSeconds: 1 }
};
(() => {
  const display = document.querySelector('.score-screen');
  const message = document.querySelector('.screen-message');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const track = document.createElement('span');
  track.className = 'scroll-loop-track';
  track.setAttribute('aria-hidden', 'true');
  let copy, animation, settings;
  let screenWidth = 0, start = 0, cycle = 0, target = 0, travelled = 0;
  let frame = null, lastTick = null, stopped = false;
  let sequence = null;
  let onComplete = null;

  function render() {
    if (!cycle) return;
    let x = start - travelled * screenWidth;
    if (animation === 'static' || motion.matches) {
      x = target;
      stopped = true;
    } else if (animation === 'scroll-stop') {
      if (stopped || x <= target) { x = target; stopped = true; }
    } else if (x <= -cycle) x = -((-x) % cycle);
    track.style.transform = `translate3d(${x}px, -50%, 0)`;
    if (stopped && onComplete) {
      const complete = onComplete;
      onComplete = null;
      complete();
    }
  }
  function measure() {
    if (!copy) return;
    const screenRect = display.getBoundingClientRect();
    const messageRect = message.getBoundingClientRect();
    screenWidth = screenRect.width;
    if (!screenWidth) return;
    track.style.fontSize = '1em';
    let textWidth = copy.getBoundingClientRect().width;
    // A stopped menu heading must fit the available content width.
    if ((animation !== 'scroll-loop' || motion.matches) && textWidth > messageRect.width) {
      track.style.fontSize = `${messageRect.width / textWidth}em`;
      textWidth = copy.getBoundingClientRect().width;
    }
    const gap = screenWidth * (settings.gap || 0) / 100;
    cycle = textWidth + gap;
    if (!cycle) return;
    start = screenRect.right - messageRect.left + screenWidth * 0.1;
    target = (messageRect.width - textWidth) / 2;
    track.style.gap = `${gap}px`;
    const count = animation === 'scroll-loop' && !motion.matches ? Math.max(2, Math.ceil(screenWidth / cycle) + 2) : 1;
    while (track.children.length > count) track.lastElementChild.remove();
    while (track.children.length < count) track.append(copy.cloneNode(true));
    render();
    message.classList.add('is-animating');
    scheduleTick();
  }
  function makeIcon(icon) {
    const symbol = document.createElement('span');
    symbol.className = `led-icon ${icon}`;
    symbol.setAttribute('aria-hidden', 'true');
    return symbol;
  }
  function show(content, name = 'scroll-loop', { restart = true, icon = null, variant = 'main', onComplete: complete = null } = {}) {
    sequence = null; // Switching views cancels any pending title/loop transition.
    onComplete = complete;
    if (!SCREEN_ANIMATIONS[name]) throw new Error(`Unknown screen animation: ${name}`);
    const changed = animation !== name;
    animation = name;
    settings = SCREEN_ANIMATIONS[name];
    cycle = 0;
    if (restart || changed) { travelled = 0; lastTick = null; stopped = false; }
    message.classList.remove('is-animating');
    message.dataset.animation = name;
    message.dataset.typography = variant;
    message.style.opacity = '1';
    const parts = Array.isArray(content) ? content : [content];
    message.setAttribute('aria-label', parts.map(part => typeof part === 'string' ? part : part.label).join(''));
    copy = document.createElement('span');
    copy.className = 'scroll-loop-copy';
    copy.append(...parts.map(part => typeof part === 'string' ? part : makeIcon(part.icon)));
    if (icon) {
      copy.classList.add('screen-main-metric');
      copy.prepend(makeIcon(icon));
    }
    track.replaceChildren(copy);
    message.replaceChildren(track);
    measure();
  }
  function titleLoop(title, loopText, { holdSeconds = SCREEN_SEQUENCE_SETTINGS['title-loop'].holdSeconds, onLoopStart = null } = {}) {
    show(title, motion.matches ? 'static' : 'scroll-stop');
    if (motion.matches) return;
    sequence = { loopText, holdSeconds, elapsed: 0, onLoopStart };
    scheduleTick();
  }
  function clear() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = lastTick = copy = sequence = onComplete = null;
    cycle = 0;
    message.classList.remove('is-animating');
    message.removeAttribute('aria-label');
    message.replaceChildren();
  }
  function scheduleTick() {
    if (frame === null && cycle && !document.hidden && !motion.matches && (!stopped || sequence)) {
      frame = requestAnimationFrame(tick);
    }
  }
  function tick(now) {
    frame = null;
    const elapsed = (now - (lastTick ?? now)) / 1000;
    lastTick = now;
    if (cycle && elapsed > 0) {
      if (!stopped) {
        travelled += elapsed * settings.speed / 100;
        render();
      } else if (sequence) {
        sequence.elapsed += elapsed;
        if (sequence.elapsed >= sequence.holdSeconds) {
          const nextText = sequence.loopText;
          const callback = sequence.onLoopStart;
          show(nextText, 'scroll-loop');
          callback?.();
        }
      }
    }
    scheduleTick();
  }
  window.ScreenText = { show, titleLoop, clear, setVisible(visible) { message.style.opacity = visible ? '1' : '0'; } };
  document.fonts.addEventListener('loadingdone', measure);
  new ResizeObserver(measure).observe(display);
  motion.addEventListener('change', () => {
    if (!motion.matches && animation !== 'static') stopped = false;
    measure();
  });
  document.addEventListener('visibilitychange', () => {
    lastTick = null;
    scheduleTick();
  });
})();
