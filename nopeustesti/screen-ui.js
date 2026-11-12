/* Screen typography and glow. The reference width is capped by the display height. */
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
  const units = value => `calc(${value} * var(--led-unit, 1cqw))`;
  display.style.setProperty('--led-main-font', `'${SCREEN_UI_LAYOUT.mainFont}', monospace`);
  display.style.setProperty('--led-main-font-size', units(SCREEN_UI_LAYOUT.mainFontSize));
  display.style.setProperty('--led-score-font', `'${SCREEN_UI_LAYOUT.scoreFont}', monospace`);
  display.style.setProperty('--led-score-font-size', units(SCREEN_UI_LAYOUT.scoreFontSize));
  display.style.setProperty('--led-main-text-offset', units(SCREEN_UI_LAYOUT.mainTextVerticalOffset));
  display.style.setProperty('--led-bottom-font', `'${SCREEN_UI_LAYOUT.bottomFont}', monospace`);
  display.style.setProperty('--led-bottom-font-size', units(SCREEN_UI_LAYOUT.bottomFontSize));
  display.style.setProperty('--led-padding-x', units(SCREEN_UI_LAYOUT.paddingX));
  display.style.setProperty('--led-padding-top', units(SCREEN_UI_LAYOUT.paddingTop));
  display.style.setProperty('--led-padding-bottom', units(SCREEN_UI_LAYOUT.paddingBottom));
  display.style.setProperty('--led-bottom-icon-size', `${SCREEN_UI_LAYOUT.bottomIconSize}em`);
  display.style.setProperty('--led-letter-spacing', `${SCREEN_UI_LAYOUT.letterSpacing}em`);
  display.style.setProperty('--led-glow-strength', SCREEN_UI_LAYOUT.glowStrength);
})();
