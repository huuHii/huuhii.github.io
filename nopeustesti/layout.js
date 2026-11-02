/* Size is driven by viewport width only. Height changes move anchors, not scale. */
const GAME_LAYOUT = {
  landscape: { maxLayoutAspectRatio: 2.2, screenWidth: 40, buttonToScreen: .5, boltToScreen: 0.08, screenBottomAnchor: 45, minScreenButtonGap: 15, sidePadding: 3, bottomPadding: 5, buttonGap: 1 },
  portrait:  { maxLayoutAspectRatio: 0.8, screenWidth: 85, buttonToScreen: 0.55, boltToScreen: 0.08, screenBottomAnchor: 40, minScreenButtonGap: 5, sidePadding: 5, bottomPadding: 8, buttonGap: 2 },
  bolts: { inset: 5 }
};
const root = document.documentElement;
const stage = document.querySelector('.game-stage');
const screen = document.querySelector('.score-screen');
const pad = document.querySelector('.button-pad');
function update() {
  const mode = innerWidth > innerHeight ? 'landscape' : 'portrait';
  const cfg = GAME_LAYOUT[mode];
  root.dataset.orientation = mode;
  const cols = mode === 'landscape' ? 4 : 2;
  const rows = mode === 'landscape' ? 1 : 2;
  pad.style.gridTemplateColumns = `repeat(${cols}, var(--button-size))`;
  requestAnimationFrame(() => {
    const width = innerWidth;
    const height = innerHeight;
    const side = width * cfg.sidePadding / 100;
    const gap = width * cfg.buttonGap / 100;
    const artRatio = 212 / 538;
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
    const scale = Math.min(1, widthScale, aspectRatioScale, verticalScale);
    const screenW = desiredScreenW * scale;
    const buttonSize = desiredButton * scale;
    root.style.setProperty('--bolt-size', `${screenW * cfg.boltToScreen}px`);
    const scaledGap = gap * scale;
    screen.style.width = `${screenW}px`;
    screen.style.left = '50%';
    screen.style.top = `${screenBottom - screenW * artRatio}px`;
    screen.style.transform = 'translateX(-50%)';
    pad.style.setProperty('--button-size', `${buttonSize}px`);
    pad.style.gap = `${scaledGap}px`;
    pad.style.width = `${cols * buttonSize + (cols - 1) * scaledGap}px`;
    pad.style.left = '50%';
    pad.style.bottom = `${buttonBottom}px`;
    pad.style.transform = 'translateX(-50%)';
    pad.style.justifyItems = 'center';
  });
}
root.style.setProperty('--bolt-inset', `${GAME_LAYOUT.bolts.inset}vmin`);
update();
addEventListener('resize', update);




