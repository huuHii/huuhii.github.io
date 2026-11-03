/* Shared visual theme: page gradient, screen tint and LED text color. */
const GAME_THEME = {
  backgroundTop: '#D15B50',
  backgroundBottom: '#B3293E',
  screenTint: '#bd2828',
  screenTintStrength: 0.28,
  ledColor: '#ff8383',
  ledGlowColor: '#e24f4a',
  ledGlowBlur: 20,
  screenBrightness: 1.08
};
const themeRoot = document.documentElement;
themeRoot.style.setProperty('--game-top', GAME_THEME.backgroundTop);
themeRoot.style.setProperty('--game-bottom', GAME_THEME.backgroundBottom);
themeRoot.style.setProperty('--screen-tint', GAME_THEME.screenTint);
themeRoot.style.setProperty('--screen-tint-strength', GAME_THEME.screenTintStrength);
themeRoot.style.setProperty('--screen-brightness', GAME_THEME.screenBrightness);
themeRoot.style.setProperty('--led-color', GAME_THEME.ledColor);
themeRoot.style.setProperty('--led-glow-color', GAME_THEME.ledGlowColor);
// Reference blur at the artwork's 538px width; scales with the display.
themeRoot.style.setProperty('--led-glow-blur', `${GAME_THEME.ledGlowBlur / 538 * 100}cqw`);
