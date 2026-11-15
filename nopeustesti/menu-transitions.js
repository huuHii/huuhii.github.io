/* Camera coordinates are in screen widths (x) and heights (y). */
const MENU_TRANSITIONS = {
  positions: {
    home: { x: 0, y: 0 },
    characters: { x: -1, y: 0 },
    settings: { x: 0, y: 1 },
    highscores: { x: 0, y: -1 },
    statistics: { x: 0, y: -2 },
    practice: { x: 1, y: 0 }
  },
  horizontalMs: 620,
  verticalMs: 680,
  settleMs: 120, // discard presses for this long after the camera arrives
  skyParallax: 0.28,
  homeEntrance: {
    enabled: true,
    delayMs: 90,
    durationMs: 640,
    startX: -0.15, // fraction of screen width; negative starts off the left edge
    strideCycles: 5,
    bounce: 0.025 // fraction of screen height
  }
};
