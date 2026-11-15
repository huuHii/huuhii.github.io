const MenuCamera = (() => {
  const world = document.querySelector('.camera-menu-world');
  const positions = MENU_TRANSITIONS.positions;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = t => (1 - Math.cos(Math.PI * t)) / 2;
  let position = positions.home;
  let moving = false;

  function place(element, view) {
    const { x, y } = positions[view];
    element.style.left = `${x * 100}%`;
    element.style.top = `${y * 100}%`;
  }

  function apply(next) {
    position = next;
    world.style.transform = `translate(${-next.x * 100}%, ${-next.y * 100}%)`;
  }

  function move(view, arrived) {
    if (moving) return;
    const from = position;
    const to = positions[view];
    const duration = from.y === to.y ? MENU_TRANSITIONS.horizontalMs : MENU_TRANSITIONS.verticalMs;
    if (motion.matches || duration <= 0) {
      apply(to);
      arrived();
      return;
    }
    moving = true;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      if (progress === 1) {
        apply(to);
        moving = false;
        arrived();
      } else {
        const t = ease(progress);
        apply({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  return { place, move, get moving() { return moving; }, get position() { return position; },
    get reducedMotion() { return motion.matches; } };
})();
