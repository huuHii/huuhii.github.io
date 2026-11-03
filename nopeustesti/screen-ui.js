/* Screen typography and glow. Font size tracks the rendered screen width. */
const SCREEN_UI_LAYOUT = {
  mainFont: 'DS-DIGIT',
  mainFontSize: 14, // percent of screen container width
  scoreFont: 'DS-DIGIT',
  scoreFontSize: 18, // percent of screen width, independent of mainFontSize
  mainTextVerticalOffset: 2, // percent of screen width; negative moves up, positive moves down
  bottomFont: 'DS-DIGIT',
  bottomFontSize: 4.4, // percent of screen container width
  paddingX: 5, // percent of screen width
  paddingTop: 4,
  paddingBottom: 3.7,
  bottomIconSize: 1, // relative to the bottom font size
  letterSpacing: 0.08,
  glowStrength: 0.8
};
(() => {
  const display = document.querySelector('.score-screen');
  display.style.setProperty('--led-main-font', `'${SCREEN_UI_LAYOUT.mainFont}', monospace`);
  display.style.setProperty('--led-main-font-size', `${SCREEN_UI_LAYOUT.mainFontSize}cqw`);
  display.style.setProperty('--led-score-font', `'${SCREEN_UI_LAYOUT.scoreFont}', monospace`);
  display.style.setProperty('--led-score-font-size', `${SCREEN_UI_LAYOUT.scoreFontSize}cqw`);
  display.style.setProperty('--led-main-text-offset', `${SCREEN_UI_LAYOUT.mainTextVerticalOffset}cqw`);
  display.style.setProperty('--led-bottom-font', `'${SCREEN_UI_LAYOUT.bottomFont}', monospace`);
  display.style.setProperty('--led-bottom-font-size', `${SCREEN_UI_LAYOUT.bottomFontSize}cqw`);
  display.style.setProperty('--led-padding-x', `${SCREEN_UI_LAYOUT.paddingX}cqw`);
  display.style.setProperty('--led-padding-top', `${SCREEN_UI_LAYOUT.paddingTop}cqw`);
  display.style.setProperty('--led-padding-bottom', `${SCREEN_UI_LAYOUT.paddingBottom}cqw`);
  display.style.setProperty('--led-bottom-icon-size', `${SCREEN_UI_LAYOUT.bottomIconSize}em`);
  display.style.setProperty('--led-letter-spacing', `${SCREEN_UI_LAYOUT.letterSpacing}em`);
  display.style.setProperty('--led-glow-strength', SCREEN_UI_LAYOUT.glowStrength);
})();
