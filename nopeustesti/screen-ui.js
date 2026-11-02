/* Screen typography and glow. mainFontSize is a percentage of screen width. */
const SCREEN_UI_LAYOUT = {
  mainFont: 'DS-DIGIT',
  mainFontSize: 13,
  letterSpacing: 0.08,
  glowStrength: 0.8
};
const screenMessage = document.querySelector('.screen-message');
const screen = document.querySelector('.score-screen');
screenMessage.style.fontFamily = SCREEN_UI_LAYOUT.mainFont;
screenMessage.style.letterSpacing = `${SCREEN_UI_LAYOUT.letterSpacing}em`;
screenMessage.style.setProperty('--led-glow-strength', SCREEN_UI_LAYOUT.glowStrength);
const resizeScreenText = () => {
  screenMessage.style.fontSize = `${screen.getBoundingClientRect().width * SCREEN_UI_LAYOUT.mainFontSize / 100}px`;
};
new ResizeObserver(resizeScreenText).observe(screen);
resizeScreenText();
