/* Distances use LED screen width; frame rate changes the steps, not the speed. */
const SCREEN_ANIMATIONS = {
  'scroll-loop': { frameRate: 27, speed: 57, gap: 30 },
  'scroll-stop': { frameRate: 27, speed: 364 },
  'static': { frameRate: 27, speed: 0 }
};
/* Hold time starts once the title has reached the center. */
const SCREEN_SEQUENCE_SETTINGS = {
  'title-loop': { holdSeconds: 1, welcomeHoldSeconds: 2, practiceHoldSeconds: 1 }
};
(() => {
  const display = document.querySelector('.score-screen');
  const message = document.querySelector('.screen-message');
  const track = document.createElement('span');
  track.className = 'scroll-loop-track';
  track.setAttribute('aria-hidden', 'true');
  let copy, animation, settings, ready = false;
  let screenWidth = 0, start = 0, cycle = 0, target = 0, travelled = 0;
  let lastTick = null, stopped = false;
  let sequence = null;
  let onComplete = null;

  function render() {
    if (!cycle) return;
    let x = start - travelled * screenWidth;
    if (animation === 'static') {
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
    if (!ready || !copy) return;
    const screenRect = display.getBoundingClientRect();
    const messageRect = message.getBoundingClientRect();
    screenWidth = screenRect.width;
    if (!screenWidth) return;
    track.style.fontSize = '1em';
    let textWidth = copy.getBoundingClientRect().width;
    // A stopped menu heading must fit the available content width.
    if (animation !== 'scroll-loop' && textWidth > messageRect.width) {
      track.style.fontSize = `${messageRect.width / textWidth}em`;
      textWidth = copy.getBoundingClientRect().width;
    }
    const gap = screenWidth * (settings.gap || 0) / 100;
    cycle = textWidth + gap;
    if (!cycle) return;
    start = screenRect.right - messageRect.left + screenWidth * 0.1;
    target = (messageRect.width - textWidth) / 2;
    track.style.gap = `${gap}px`;
    const count = animation === 'scroll-loop' ? Math.max(2, Math.ceil(screenWidth / cycle) + 2) : 1;
    while (track.children.length > 1) track.lastElementChild.remove();
    while (track.children.length < count) track.append(copy.cloneNode(true));
    render();
    message.classList.add('is-animating');
  }
  function show(text, name = 'scroll-loop', { restart = true, icon = null, variant = 'main', onComplete: complete = null } = {}) {
    sequence = null; // Switching views cancels any pending title/loop transition.
    onComplete = complete;
    if (!SCREEN_ANIMATIONS[name]) throw new Error(`Unknown screen animation: ${name}`);
    const changed = animation !== name;
    animation = name;
    settings = SCREEN_ANIMATIONS[name];
    if (restart || changed) { travelled = 0; lastTick = null; stopped = false; }
    message.classList.remove('is-animating');
    message.dataset.animation = name;
    message.dataset.typography = variant;
    message.style.opacity = '1';
    message.setAttribute('aria-label', text);
    copy = document.createElement('span');
    copy.className = 'scroll-loop-copy';
    copy.textContent = text;
    if (icon) {
      copy.classList.add('screen-main-metric');
      const symbol = document.createElement('span');
      symbol.className = `led-icon ${icon}`;
      symbol.setAttribute('aria-hidden', 'true');
      copy.prepend(symbol);
    }
    track.replaceChildren(copy);
    message.replaceChildren(track);
    measure();
  }
  function titleLoop(title, loopText, { holdSeconds = SCREEN_SEQUENCE_SETTINGS['title-loop'].holdSeconds, onLoopStart = null } = {}) {
    show(title, 'scroll-stop');
    sequence = { loopText, holdSeconds, elapsed: 0, onLoopStart };
  }
  function tick(now) {
    const frameMs = 1000 / Math.max(1, settings.frameRate);
    if (lastTick === null) lastTick = now;
    const frames = Math.floor((now - lastTick) / frameMs);
    if (frames > 0) {
      lastTick += frames * frameMs;
      if (!stopped) {
        travelled += frames * frameMs / 1000 * settings.speed / 100;
        render();
      } else if (sequence) {
        sequence.elapsed += frames * frameMs / 1000;
        if (sequence.elapsed >= sequence.holdSeconds) {
          const nextText = sequence.loopText;
          const callback = sequence.onLoopStart;
          show(nextText, 'scroll-loop');
          callback?.();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  window.ScreenText = { show, titleLoop, setVisible(visible) { message.style.opacity = visible ? '1' : '0'; } };
  show(message.textContent, message.dataset.animation);
  document.fonts.ready.then(() => {
    ready = true;
    measure();
    new ResizeObserver(measure).observe(display);
    requestAnimationFrame(tick);
  });
  document.addEventListener('visibilitychange', () => { lastTick = null; });
})();
