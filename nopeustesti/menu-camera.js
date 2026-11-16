const MenuCamera = (() => {
  const world = document.querySelector('.camera-menu-world');
  const positions = MENU_TRANSITIONS.positions;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = t => (1 - Math.cos(Math.PI * t)) / 2;
  let position = positions.home;
  let transition;

  function place(element, view) {
    const { x, y } = positions[view];
    element.style.left = `${x * 100}%`;
    element.style.top = `${y * 100}%`;
  }

  function apply(next) {
    position = next;
    world.style.setProperty('--camera-x', `${-next.x * 100}%`);
    world.style.setProperty('--camera-y', `${-next.y * 100}%`);
  }

  function move(view, arrived) {
    if (transition) return;
    const from = position;
    const to = positions[view];
    const duration = from.y === to.y ? MENU_TRANSITIONS.horizontalMs : MENU_TRANSITIONS.verticalMs;
    if (motion.matches || duration <= 0) {
      apply(to);
      arrived();
    } else {
      world.setAttribute('data-moving', '');
      transition = { from, to, duration, arrived, start: undefined };
    }
    Platformer.invalidate();
  }

  // Draw the canvas and move the HUD on the same frame.
  function update(now) {
    if (!transition) return;
    transition.start ??= now;
    const { from, to, duration, arrived, start } = transition;
    const progress = (now - start) / duration;
    if (progress >= 1 || motion.matches) {
      apply(to);
      world.removeAttribute('data-moving');
      transition = undefined;
      arrived();
    } else {
      const t = ease(progress);
      apply({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
  }

  return { place, move, update, get moving() { return Boolean(transition); }, get position() { return position; },
    get reducedMotion() { return motion.matches; } };
})();
