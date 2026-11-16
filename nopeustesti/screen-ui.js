/* Screen typography and glow. The reference width is capped by the display height. */
const SCREEN_FONTS = {
  dsDigit: 'DS-DIGIT',
  ariDisplay: 'Ari W9500 Display',
  ariCondensed: 'Ari W9500 Condensed Display',
  ariBold: 'Ari W9500 Bold'
};

// Change this for the whole screen, or choose a preset for an individual font below.
const SCREEN_FONT = SCREEN_FONTS.dsDigit;
const ARIDISPLAY_FONT = SCREEN_FONTS.ariDisplay;
const ARICONDENSED_FONT = SCREEN_FONTS.ariCondensed;
const ARIBOLD_FONT = SCREEN_FONTS.ariBold;

const SCREEN_UI_LAYOUT = {
  mainFont: ARICONDENSED_FONT,
  mainFontSize: 8, // percent of screen container width
  scoreFont: ARIDISPLAY_FONT,
  scoreFontSize: 10, // percent of screen width, independent of mainFontSize
  mainTextVerticalOffset: 2, // percent of screen width; negative moves up, positive moves down
  bottomFont: ARICONDENSED_FONT,
  bottomFontSize: 3, // percent of screen container width
  bottomIconSize: 1, // relative to the bottom font size
  letterSpacing: 0.08,
  glowStrength: 0.8
};

// Load the lobby faces before measuring the startup text.
const screenFontsReady = Promise.allSettled(
  [...new Set([LOBBY_UI.modeTitleStyle.font, LOBBY_UI.pressPlayFont.font, SCREEN_UI_LAYOUT.mainFont, SCREEN_UI_LAYOUT.bottomFont])]
    .map(font => document.fonts.load(`16px '${font}'`))
);

function formatRunTime(timeMs) {
  const seconds = Math.floor(timeMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

(() => {
  const display = document.querySelector('.score-screen');
  const units = value => `calc(${value} * var(--led-unit, 1cqw))`;
  for (const [name, style] of [['mode-title', LOBBY_UI.modeTitleStyle], ['press-play', LOBBY_UI.pressPlayFont]]) {
    display.style.setProperty(`--lobby-${name}-font`, `'${style.font}', monospace`);
    display.style.setProperty(`--lobby-${name}-size`, units(style.fontSize));
    display.style.setProperty(`--lobby-${name}-spacing`, style.letterSpacing);
    display.style.setProperty(`--lobby-${name}-offset`, units(style.verticalOffset));
  }
  display.style.setProperty('--led-main-font', `'${SCREEN_UI_LAYOUT.mainFont}', monospace`);
  display.style.setProperty('--led-main-font-size', units(SCREEN_UI_LAYOUT.mainFontSize));
  display.style.setProperty('--led-score-font', `'${SCREEN_UI_LAYOUT.scoreFont}', monospace`);
  display.style.setProperty('--led-score-font-size', units(SCREEN_UI_LAYOUT.scoreFontSize));
  display.style.setProperty('--led-main-text-offset', units(SCREEN_UI_LAYOUT.mainTextVerticalOffset));
  display.style.setProperty('--led-bottom-font', `'${SCREEN_UI_LAYOUT.bottomFont}', monospace`);
  display.style.setProperty('--led-bottom-font-size', units(SCREEN_UI_LAYOUT.bottomFontSize));
  display.style.setProperty('--led-padding-x', units(LOBBY_UI.paddingX));
  display.style.setProperty('--led-padding-top', units(LOBBY_UI.paddingTop));
  display.style.setProperty('--led-padding-bottom', units(LOBBY_UI.paddingBottom));
  display.style.setProperty('--led-bottom-icon-size', `${SCREEN_UI_LAYOUT.bottomIconSize}em`);
  display.style.setProperty('--led-letter-spacing', `${SCREEN_UI_LAYOUT.letterSpacing}em`);
  display.style.setProperty('--led-glow-strength', SCREEN_UI_LAYOUT.glowStrength);
})();
