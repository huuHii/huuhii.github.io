const PLATFORMER_SETTINGS = {
  maxPixelRatio: 2,
  startAcceleration: { maxSeconds: 0.3, maxBeatFraction: 0.45 },
  obstacleFadeSeconds: 0.45, // linear fade starting at failure; 0 hides immediately
  fallCamera: {
    stopSeconds: 1.05,
    minStopDistance: 0.7, // screen widths; faster runs can coast farther
    speedMultiplier: 1 // scale the stopping distance calculated from the run tempo
  },
  // Runner progress through the world. Catch-up speed is relative to the current tempo.
  playhead: { smoothingSeconds: 0.033, maxCatchUpSpeed: 1.8 },
  earlyPressNudge: {
    maxRight: 0.1, // fraction of display width at the runner's center lane
    fullAtBeatsEarly: 0.65, // time remaining before the next cue, in beats
    neutralAtBeatsEarly: 0.1,
    smoothingSeconds: 0.4
  },
  groundLineOpacity: 0.72,
  groundLineWidth: 1, // also the size of one bump sprite pixel, in CSS px
  showBeatLines: false, // set to false to hide the beatlines
  beatLineOpacity: 0.52,
  beatLineWidth: 1, // CSS px, independent of pixel density
  outlineGlow: { blur: [3, 7], opacity: 0.8 }, // shared blur in CSS px; use opacity 0 to disable
  bumps: {
    files: ['bump1.png', 'bump2.png', 'bump3.png'],
    gap: [0.55, 2.2], // clear distance between sprites, in display heights
    mirrorChance: 0.5
  }
};
