/* Standard is the home screen. Reorder the remaining entries for the red menu cycle. */
const MENU_ITEMS = [
  { id: 'standard', title: 'STANDARD', text: 'PRESS GREEN TO PLAY', footer: 'standard', sequence: 'title-loop' },
  { id: 'practice', title: 'PRACTICE', text: 'SET STARTING SPEED', footer: 'practice', sequence: 'title-loop' },
  { id: 'clack-volume', text: 'CLACK VOL', channel: 'clackVolume', footer: 'volume' },
  { id: 'beep-volume', text: 'BEEP VOL', channel: 'beepVolume', footer: 'volume' },
  { id: 'highscores', text: 'HIGHSCORES: 0', footer: 'menu' }
];
const MENU_SETTINGS = { limitFeedbackSeconds: 0.8 };
const PRACTICE_SETTINGS = {
  startingSpeeds: [100, 200, 300, 400, 500, 600, 700],
  initialIndex: 0
};
(() => {
  let current = MENU_ITEMS.findIndex(item => item.id === 'standard');
  let speedIndex = PRACTICE_SETTINGS.initialIndex;
  let practiceDetail = false;
  let limitFeedback = null;
  let limitTimer = null;
  const footer = document.querySelector('.screen-bottom-row');
  function icon(name) {
    const span = document.createElement('span');
    span.className = `led-icon ${name}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
  function text(value) { const span = document.createElement('span'); span.textContent = value; return span; }
  function speed() { return PRACTICE_SETTINGS.startingSpeeds[speedIndex]; }
  function volumeLabel(channel) { return GameAudio.getVolume(channel) || 'OFF'; }
  function metric(name, value) {
    const group = document.createElement('span');
    group.className = 'practice-metric';
    group.append(icon(name), text(String(value)));
    return group;
  }
  function clearLimit() {
    clearTimeout(limitTimer);
    limitTimer = null;
    limitFeedback = null;
  }
  function renderValue() {
    const item = MENU_ITEMS[current];
    if (item.id === 'practice' && practiceDetail) {
      ScreenText.show(String(limitFeedback || speed()), 'static', { icon: 'led-practice-start' });
    } else if (item.channel) {
      ScreenText.show(`${item.text}: ${limitFeedback || volumeLabel(item.channel)}`, 'static');
    }
  }
  function showLimit(label) {
    clearLimit();
    limitFeedback = label;
    renderValue();
    limitTimer = setTimeout(() => {
      limitTimer = null;
      limitFeedback = null;
      renderValue();
    }, MENU_SETTINGS.limitFeedbackSeconds * 1000);
  }
  function renderFooter(item) {
    const left = document.createElement('span');
    const middle = document.createElement('span');
    const right = document.createElement('span');
    left.className = 'screen-bottom-item screen-bottom-left';
    middle.className = 'screen-bottom-item screen-bottom-center';
    right.className = 'screen-bottom-item screen-bottom-right';
    left.append(icon('led-arrow led-arrow-left'));
    let leftText = 'MENU';
    let rightText = item.id === 'standard' ? 'PLAY' : 'RETURN';
    if (item.footer === 'volume') {
      middle.append(icon('led-arrow led-arrow-down'), text('VOLUME'), icon('led-arrow led-arrow-up'));
    } else if (item.footer === 'practice') {
      if (practiceDetail) {
        leftText = 'RETURN';
        rightText = 'PRACTICE';
        middle.append(metric('led-metronome', Math.round(GameRules.bpmAt(speed()))));
        middle.setAttribute('aria-label', `BPM ${Math.round(GameRules.bpmAt(speed()))}`);
      } else {
        middle.append(icon('led-arrow led-arrow-down'), text('SPEED'), icon('led-arrow led-arrow-up'));
      }
    } else {
      middle.append(icon('led-star'), text(String(GameRecords.highscore)));
      middle.setAttribute('aria-label', `Highscore ${GameRecords.highscore}`);
    }
    if (leftText) left.append(text(leftText));
    right.append(text(rightText), icon('led-arrow'));
    footer.dataset.view = item.footer;
    footer.replaceChildren(left, middle, right);
  }
  function enter({ boot = false } = {}) {
    clearLimit();
    practiceDetail = false;
    const item = MENU_ITEMS[current];
    renderFooter(item);
    if (item.sequence === 'title-loop') {
      const timing = SCREEN_SEQUENCE_SETTINGS['title-loop'];
      const holdSeconds = boot ? timing.welcomeHoldSeconds : item.id === 'practice' ? timing.practiceHoldSeconds : timing.holdSeconds;
      ScreenText.titleLoop(boot ? 'WELCOME' : item.title, item.text, { holdSeconds });
    } else {
      const heading = item.id === 'highscores' ? `HIGHSCORES: ${GameRecords.highscore}` : item.channel ? `${item.text}: ${volumeLabel(item.channel)}` : item.text;
      ScreenText.show(heading, item.animation || 'scroll-stop');
    }
  }
  document.addEventListener('game-button-press', event => {
    if (window.GameSession?.blocksMenu) return;
    if (window.GameSession?.phase === 'result') GameSession.leave();
    const color = event.detail.color;
    const item = MENU_ITEMS[current];
    if (color === 'red') {
      if (item.id === 'practice' && practiceDetail) enter();
      else { current = (current + 1) % MENU_ITEMS.length; enter(); }
    } else if (color === 'green') {
      if (item.id === 'practice' && practiceDetail) {
        document.dispatchEvent(new CustomEvent('practice-start-request', { detail: { startingSpeed: speed(), bpm: speed() } }));
      } else if (item.id === 'standard') {
        document.dispatchEvent(new CustomEvent('game-start-request'));
      } else {
        current = MENU_ITEMS.findIndex(entry => entry.id === 'standard');
        enter();
      }
    } else {
      const delta = color === 'yellow' ? -1 : color === 'blue' ? 1 : 0;
      if (!delta) return;
      if (item.id === 'practice') {
        if (!practiceDetail) {
          practiceDetail = true;
          clearLimit();
          renderFooter(item);
          renderValue();
          return; // First down/up press reveals the remembered speed without changing it.
        }
        const next = speedIndex + delta;
        practiceDetail = true;
        clearLimit();
        if (next >= 0 && next < PRACTICE_SETTINGS.startingSpeeds.length) speedIndex = next;
        renderFooter(item);
        if (next < 0 || next >= PRACTICE_SETTINGS.startingSpeeds.length) showLimit(next < 0 ? 'MIN' : 'MAX');
        else renderValue();
      } else if (item.channel) {
        const next = GameAudio.getVolume(item.channel) + delta;
        clearLimit();
        GameAudio.setVolume(item.channel, next);
        if (next > GAME_AUDIO.maxVolume) showLimit('MAX');
        else renderValue();
        if (item.channel === 'beepVolume') GameAudio.tone(color);
      }
    }
  });
  window.GameMenu = {
    get current() { return MENU_ITEMS[current].id; },
    get practiceSpeed() { return speed(); },
    prepareForGame: clearLimit,
    returnToPracticeValue() {
      clearLimit();
      current = MENU_ITEMS.findIndex(item => item.id === 'practice');
      practiceDetail = true;
      renderFooter(MENU_ITEMS[current]);
      renderValue();
    }
  };
  enter({ boot: true });
})();
