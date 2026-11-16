const GRAPHICS_CONFIG = {
  // Upper limit for the scene canvas on desktop and mobile. Devices with a
  // lower pixel ratio use their native ratio. HUD text is drawn separately.
  // Try 1.5 first, 1 for the lightest load, or 2 for the previous sharper look.
  canvasPixelRatioCap: 1.5,

  // Turn this off to compare FPS with and without CRT distortion.
  // Scanlines and the CRT glass stay visible either way.
  crtCurvature: true
};
