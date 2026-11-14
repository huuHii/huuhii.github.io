/* Width drives desired size; available height caps it to keep the layout on screen. */
const GAME_LAYOUT = {
  landscape: { maxLayoutAspectRatio: 2.2, screenWidth: 50, screenAspectRatio: 538 / 212, buttonToScreen: .37, boltToScreen: 0.08, screenBottomAnchor: 50, minScreenButtonGap: 5, sidePadding: 3, bottomPadding: 5, buttonGap: 0 },
  portrait:  { maxLayoutAspectRatio: 0.8, screenWidth: 85, screenAspectRatio: 538 / 212, buttonToScreen: 0.55, boltToScreen: 0.08, screenBottomAnchor: 40, minScreenButtonGap: 5, sidePadding: 5, bottomPadding: 8, buttonGap: 2 },
  bolts: { inset: 5 }
};
const root = document.documentElement;
const stage = document.querySelector('.game-stage');
const screen = document.querySelector('.score-screen');
const pad = document.querySelector('.button-pad');
let layoutFrame = 0;
let settleTimers = [];
function update() {
  if (layoutFrame || document.hidden) return;
  layoutFrame = requestAnimationFrame(applyLayout);
}
function applyLayout() {
  layoutFrame = 0;
  if (document.hidden) return;
  // Choose the mode and dimensions in the same frame after rotation.
  const viewport = window.visualViewport;
  root.style.setProperty('--viewport-width', `${viewport?.width || innerWidth}px`);
  root.style.setProperty('--viewport-height', `${viewport?.height || innerHeight}px`);
  root.style.setProperty('--viewport-left', `${viewport?.offsetLeft || 0}px`);
  root.style.setProperty('--viewport-top', `${viewport?.offsetTop || 0}px`);
  const { width, height } = stage.getBoundingClientRect();
  if (width <= 0 || height <= 0) return;
  const mode = width > height ? 'landscape' : 'portrait';
  const cfg = GAME_LAYOUT[mode];
  root.dataset.orientation = mode;
  const cols = mode === 'landscape' ? 4 : 2;
  const rows = mode === 'landscape' ? 1 : 2;
  const side = width * cfg.sidePadding / 100;
  const gap = width * cfg.buttonGap / 100;
  const desiredScreenW = width * cfg.screenWidth / 100;
  const desiredButton = desiredScreenW * cfg.buttonToScreen;
  const screenMax = width - 2 * side;
  const desiredRowWidth = cols * desiredButton + (cols - 1) * gap;
  const desiredGroupWidth = Math.max(desiredScreenW, desiredRowWidth);
  const widthScale = Math.min(screenMax / desiredScreenW, screenMax / desiredRowWidth);
  const aspectRatioScale = height * cfg.maxLayoutAspectRatio / desiredGroupWidth;
  const screenBottom = height * cfg.screenBottomAnchor / 100;
  const buttonBottom = height * cfg.bottomPadding / 100;
  const buttonGap = height * cfg.minScreenButtonGap / 100;
  const buttonRoom = Math.max(0, height - screenBottom - buttonBottom - buttonGap);
  const desiredButtonsHeight = rows * desiredButton + (rows - 1) * gap;
  const verticalScale = buttonRoom / desiredButtonsHeight;
  const screenHeightScale = screenBottom * cfg.screenAspectRatio / desiredScreenW;
  const scale = Math.min(1, widthScale, aspectRatioScale, verticalScale, screenHeightScale);
  const screenW = desiredScreenW * scale;
  const screenH = screenW / cfg.screenAspectRatio;
  const buttonSize = desiredButton * scale;
  // Ignore transient invalid measurements instead of saving a collapsed layout.
  if (!Number.isFinite(buttonSize) || buttonSize <= 0 || !Number.isFinite(screenW) || screenW <= 0) return;
  root.style.setProperty('--bolt-size', `${screenW * cfg.boltToScreen}px`);
  const scaledGap = gap * scale;
  screen.style.width = `${screenW}px`;
  screen.style.height = `${screenH}px`;
  // A wider screen reveals more of the scene while the HUD still fits vertically.
  screen.style.setProperty('--led-unit', `${Math.min(screenW, screenH * (538 / 212)) / 100}px`);
  screen.style.left = '50%';
  screen.style.top = `${screenBottom - screenH}px`;
  screen.style.transform = 'translateX(-50%)';
  pad.style.setProperty('--button-size', `${buttonSize}px`);
  // Explicit row sizes keep the portrait grid visible when iOS restores it.
  pad.style.gridTemplateColumns = `repeat(${cols}, var(--button-size))`;
  pad.style.gridTemplateRows = `repeat(${rows}, var(--button-size))`;
  pad.style.gap = `${scaledGap}px`;
  pad.style.width = `${cols * buttonSize + (cols - 1) * scaledGap}px`;
  pad.style.height = `${rows * buttonSize + (rows - 1) * scaledGap}px`;
  pad.style.left = '50%';
  pad.style.bottom = `${buttonBottom}px`;
  pad.style.transform = 'translateX(-50%)';
  pad.style.justifyItems = 'center';
}
root.style.setProperty('--bolt-inset', `${GAME_LAYOUT.bolts.inset}vmin`);
update();
// Bounded rechecks let iOS finish updating its viewport and safe-area insets.
function settleLayout() {
  settleTimers.forEach(clearTimeout);
  update();
  settleTimers = [100, 300, 700, 1500].map(delay => setTimeout(update, delay));
}
addEventListener('resize', settleLayout);
addEventListener('orientationchange', settleLayout);
window.screen.orientation?.addEventListener('change', settleLayout);
window.visualViewport?.addEventListener('resize', settleLayout);
window.visualViewport?.addEventListener('scroll', update);
// Safe-area changes can resize the stage without a window resize event.
if (window.ResizeObserver) new ResizeObserver(update).observe(stage);
addEventListener('pageshow', settleLayout);
addEventListener('focus', settleLayout);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    settleTimers.forEach(clearTimeout);
  } else settleLayout();
});
