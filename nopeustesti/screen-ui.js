/* Screen typography and glow. Font size tracks the rendered screen width. */
const SCREEN_UI_LAYOUT = {
  mainFont: 'DS-DIGIT',
  mainFontSize: 15, // percent of screen container width
  letterSpacing: 0.08,
  glowStrength: 0.8
};
(() => {
  const display = document.querySelector('.score-screen');
  display.style.setProperty('--led-main-font', `'${SCREEN_UI_LAYOUT.mainFont}', monospace`);
  display.style.setProperty('--led-main-font-size', `${SCREEN_UI_LAYOUT.mainFontSize}cqw`);
  display.style.setProperty('--led-letter-spacing', `${SCREEN_UI_LAYOUT.letterSpacing}em`);
  display.style.setProperty('--led-glow-strength', SCREEN_UI_LAYOUT.glowStrength);
})();
