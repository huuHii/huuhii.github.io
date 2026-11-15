(() => {
  const world = document.querySelector('.camera-menu-world');
  const hud = document.querySelector('.game-hud-position');
  const footer = hud.querySelector('.screen-bottom-row');
  const announcement = document.querySelector('.menu-announcement');
  const practiceSpeeds = PRACTICE_MENU.startingSpeeds;
  const standbyIdleSeconds = 5;
  const characterKey = 'nopeustesti.runner';
  const directions = { red: 'left', yellow: 'down', blue: 'up', green: 'right' };
  const panels = new Map();
  let view = 'home';
  let lockedUntil = 0;
  let settingsIndex = 0;
  let settingsTop = 0;
  let practiceIndex = Math.max(0, practiceSpeeds.indexOf(PRACTICE_MENU.initialSpeed));
  let activeHold;
  const menuHolds = {
    home: {
      right: {
        label: 'HOLD TO PRACTICE',
        duration: PRACTICE_MENU.holdMs,
        tap: () => document.dispatchEvent(new CustomEvent('game-start-request')),
        hold: () => go('practice')
      }
    }
  };
  let savedRunner;
  try { savedRunner = localStorage.getItem(characterKey); } catch {}
  const runners = CHARACTERS_MENU.options;
  let runnerIndex = runners.findIndex(runner => runner.id === savedRunner);
  if (runnerIndex < 0) runnerIndex = Math.max(0, runners.findIndex(runner => runner.id === CHARACTERS_MENU.defaultId));

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function icon(name) {
    const node = element('span', `led-icon ${name}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function arrow(direction) {
    const shell = element('span', 'camera-arrow');
    shell.dataset.arrow = direction;
    shell.append(icon(`led-arrow led-arrow-${direction}`));
    return shell;
  }
  function hint(direction, label, right = direction === 'right') {
    const node = element('span', 'camera-hint');
    const words = element('span', 'camera-hint-label', label);
    node.append(...(right ? [words, arrow(direction)] : [arrow(direction), words]));
    return node;
  }
  function panel(id, config) {
    const section = element('section', 'camera-panel');
    section.dataset.menu = id;
    section.setAttribute('aria-label', config.title);
    section.setAttribute('aria-hidden', 'true');
    MenuCamera.place(section, id);
    world.append(section);
    panels.set(id, section);
    return section;
  }
  panel('settings', SETTINGS_MENU);
  panel('characters', CHARACTERS_MENU);
  panel('highscores', HIGHSCORES_MENU);
  panel('statistics', STATISTICS_MENU);
  panel('practice', PRACTICE_MENU);

  function drawPanel(id, config, content, hints, counter = '') {
    const target = panels.get(id);
    const header = element('header', 'camera-panel-heading');
    const label = element('div');
    label.append(element('p', 'camera-caption', config.caption), element('h2', '', config.title));
    header.append(label);
    if (counter) header.append(element('span', 'camera-caption camera-counter', counter));
    const nav = element('div', 'camera-panel-nav');
    nav.append(...hints);
    target.replaceChildren(header, content, nav);
  }
  function selectPanel(id) {
    for (const [name, panel] of panels) panel.setAttribute('aria-hidden', String(id !== name));
    hud.setAttribute('aria-hidden', String(id !== 'home'));
  }
  const number = new Intl.NumberFormat();
  const average = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(undefined, HIGHSCORES_MENU.dateFormat);
  const counter = (index, total) => `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  function drawSettings() {
    const { rows, visibleRows } = SETTINGS_MENU;
    const list = element('ul', 'settings-menu-list');
    list.style.setProperty('--settings-visible-rows', visibleRows);
    rows.slice(settingsTop, settingsTop + visibleRows).forEach((setting, offset) => {
      const selected = settingsIndex === settingsTop + offset;
      const row = element('li', 'camera-list-row');
      if (selected) row.setAttribute('aria-current', 'true');
      const value = GameAudio.getVolume(setting.channel);
      const meter = element('span', 'settings-meter');
      meter.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < GAME_AUDIO.maxVolume; i++) {
        meter.append(element('span', i < value ? 'is-filled' : ''));
      }
      row.append(element('span', 'camera-row-label', setting.label), meter,
        element('span', 'camera-row-value', value || 'OFF'));
      list.append(row);
    });
    const adjust = hint('right', 'ADJUST');
    adjust.prepend(arrow('left'));
    drawPanel('settings', SETTINGS_MENU, list, [
      hint('up', settingsIndex === 0 ? 'SURFACE' : 'PREV'),
      settingsIndex < rows.length - 1 ? hint('down', 'NEXT') : element('span'),
      adjust
    ], counter(settingsIndex, rows.length));
  }

  function drawCharacters() {
    const list = element('ul', 'character-menu-list');
    for (const shift of [-1, 0, 1]) {
      const runner = runners[(runnerIndex + shift + runners.length) % runners.length];
      const row = element('li', 'camera-list-row', runner.name);
      if (shift === 0) row.setAttribute('aria-current', 'true');
      else row.setAttribute('aria-hidden', 'true');
      list.append(row);
    }
    const cycle = hint('up', 'BROWSE');
    cycle.append(arrow('down'));
    drawPanel('characters', CHARACTERS_MENU, list, [
      cycle, hint('right', 'SELECT & RETURN')
    ], counter(runnerIndex, runners.length));
  }

  function drawHighscores() {
    const entries = GameRecords.entries;
    const content = element('div', 'records-content');
    if (!entries.length) {
      content.append(element('p', 'records-empty', 'NO RUNS ON RECORD'));
    } else {
      const table = element('table', 'scores-table');
      table.setAttribute('aria-label', 'Local highscore entries');
      const columns = table.createTHead().insertRow();
      for (const label of ['#', 'PROFILE', 'SCORE', 'DATE']) {
        const heading = element('th', '', label);
        heading.scope = 'col';
        columns.append(heading);
      }
      const rows = table.createTBody();
      entries.forEach((entry, index) => {
        const row = rows.insertRow();
        for (const value of [
          index + 1,
          entry.profile ?? '—',
          number.format(entry.score),
          entry.date ? date.format(new Date(entry.date)) : '—'
        ]) row.append(element('td', '', value));
      });
      content.append(table);
    }
    drawPanel('highscores', HIGHSCORES_MENU, content, [
      hint('down', 'SURFACE'), hint('up', 'STATS')
    ]);
  }

  function duration(ms) {
    const seconds = Math.floor(ms / 1000);
    const fields = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60];
    return fields.map(value => String(value).padStart(2, '0')).join(':');
  }
  function drawStatistics() {
    const stats = GameRecords.statistics;
    const list = element('dl', 'stats-menu-grid');
    for (const { label, key, format } of STATISTICS_MENU.rows) {
      const value = stats[key];
      const card = element('div', 'camera-stat');
      card.append(element('dt', '', label), element('dd', '',
        format === 'time' ? duration(value) : format === 'average' ? average.format(value) : number.format(value)
      ));
      list.append(card);
    }
    drawPanel('statistics', STATISTICS_MENU, list, [hint('down', 'HIGHSCORES')]);
  }

  function drawPractice() {
    const content = element('div', 'practice-menu-value');
    content.append(element('strong', '', practiceSpeeds[practiceIndex]),
      element('span', '', `${Math.round(GameRules.bpmAt(practiceSpeeds[practiceIndex]))} BPM`));
    const speed = hint('up', 'SPEED');
    speed.append(arrow('down'));
    drawPanel('practice', PRACTICE_MENU, content, [
      hint('left', 'SURFACE'), speed, hint('right', 'START')
    ], counter(practiceIndex, practiceSpeeds.length));
  }

  function drawHome() {
    MenuCamera.place(hud, 'home');
    hud.hidden = false;
    footer.dataset.view = 'standard';
    const scores = hint('up', 'SCORES');
    scores.append(icon('led-star'), element('span', '', number.format(GameRecords.highscore)));
    scores.setAttribute('aria-label', `Up: highscores, best ${GameRecords.highscore}`);
    footer.replaceChildren(hint('left', 'RUNNER'), scores, hint('down', 'SETTINGS'), hint('right', 'PLAY'));
    const rightArrow = { icon: 'led-arrow led-arrow-right', label: 'right arrow' };
    ScreenText.titleLoop('STANDARD', ['PRESS ', rightArrow, ' TO START  /  HOLD ', rightArrow, ' FOR PRACTICE']);
  }

  function draw(target) {
    ({ home: drawHome, settings: drawSettings, characters: drawCharacters,
      highscores: drawHighscores, statistics: drawStatistics, practice: drawPractice })[target]();
  }
  function blocksInput() {
    return MenuCamera.moving || performance.now() < lockedUntil;
  }
  function enterHome() {
    Platformer.enterRunner(runners[runnerIndex], 'home');
    drawHome();
  }
  function go(target) {
    cancelHold();
    if (target === 'characters') ScreenText.clear();
    if (target === 'practice') {
      panels.get('practice').hidden = false;
      Platformer.setPracticeTempo(GameRules.bpmAt(practiceSpeeds[practiceIndex]));
    } else if (view === 'practice') {
      Platformer.setPracticeTempo(0);
    }
    if (target !== 'home') draw(target);
    MenuCamera.move(target, () => {
      view = target;
      lockedUntil = performance.now() + MENU_TRANSITIONS.settleMs;
      selectPanel(view);
      if (view === 'home') enterHome();
      else if (view === 'practice') Platformer.enterRunner(runners[runnerIndex], 'practice');
      else Platformer.hideRunner();
      announcement.textContent = view === 'home' ? 'Surface' : panels.get(view).getAttribute('aria-label');
    });
  }
  function startPractice() {
    document.dispatchEvent(new CustomEvent('practice-start-request', { detail: { startingSpeed: practiceSpeeds[practiceIndex] } }));
  }

  function cancelHold() {
    if (!activeHold) return;
    const { frame, ring, label, normalLabel } = activeHold;
    cancelAnimationFrame(frame);
    ring?.removeAttribute('data-holding');
    ring?.style.removeProperty('--hold-progress');
    if (label) label.textContent = normalLabel;
    activeHold = undefined;
  }

  function completeHold(held, longPress) {
    cancelHold();
    if (view !== held.view || blocksInput() || GameSession.phase !== 'idle') return;
    if (longPress) held.action.hold();
    else held.action.tap?.();
  }

  function beginHold(direction, action) {
    const container = view === 'home' ? footer : panels.get(view);
    const ring = container.querySelector(`.camera-arrow[data-arrow="${direction}"]`);
    const hint = ring?.closest('.camera-hint');
    const label = hint?.querySelector('.camera-hint-label');
    const held = { direction, action, view, ring, label, normalLabel: label?.textContent, startedAt: performance.now() };
    activeHold = held;
    ring?.setAttribute('data-holding', '');
    if (label && action.label) label.textContent = action.label;
    function tick(now) {
      const progress = Math.max(0, Math.min(1, (now - held.startedAt) / action.duration));
      ring?.style.setProperty('--hold-progress', progress);
      if (progress >= 1) completeHold(held, true);
      else held.frame = requestAnimationFrame(tick);
    }
    held.frame = requestAnimationFrame(tick);
  }

  document.addEventListener('game-button-release', ({ detail: { color, cancelled } }) => {
    const held = activeHold;
    if (!held || held.direction !== directions[color]) return;
    if (cancelled) cancelHold();
    else completeHold(held, performance.now() - held.startedAt >= held.action.duration);
  });

  document.addEventListener('game-button-press', ({ detail: { color } }) => {
    if (blocksInput() || window.GameSession?.blocksMenu) return;
    const direction = directions[color];
    if (!direction) return;
    cancelHold();
    const phase = window.GameSession?.phase;
    if (phase === 'result' || phase === 'practice-result') {
      if (direction === 'right') {
        if (phase === 'practice-result') startPractice();
        else document.dispatchEvent(new CustomEvent('game-start-request'));
      } else if (direction === 'left') {
        GameSession.leave();
        if (phase === 'practice-result') {
          go('home');
        } else {
          selectPanel('home');
          enterHome();
        }
        GameLights.standby(standbyIdleSeconds);
      }
      return;
    }
    GameLights.standby(standbyIdleSeconds);
    const holdAction = menuHolds[view]?.[direction];
    if (holdAction) return beginHold(direction, holdAction);
    if (view === 'home') {
      go({ left: 'characters', down: 'settings', up: 'highscores' }[direction]);
    } else if (view === 'settings') {
      const { rows, visibleRows } = SETTINGS_MENU;
      if (direction === 'up' && settingsIndex === 0) return go('home');
      if (direction === 'up' || direction === 'down') {
        settingsIndex = Math.min(rows.length - 1, settingsIndex + (direction === 'up' ? -1 : 1));
        settingsTop = Math.max(settingsIndex - visibleRows + 1, Math.min(settingsTop, settingsIndex));
      } else {
        const { channel, preview } = rows[settingsIndex];
        GameAudio.setVolume(channel, GameAudio.getVolume(channel) + (direction === 'right' ? 1 : -1));
        if (preview) GameAudio.tone(color);
      }
      drawSettings();
      const { label, channel } = rows[settingsIndex];
      announcement.textContent = `${label}: ${GameAudio.getVolume(channel) || 'off'}`;
    } else if (view === 'characters') {
      if (direction === 'right') {
        try { localStorage.setItem(characterKey, runners[runnerIndex].id); } catch {}
        go('home');
      } else if (direction === 'up' || direction === 'down') {
        const step = direction === 'down' ? 1 : -1;
        const previous = runners[runnerIndex];
        runnerIndex = (runnerIndex + step + runners.length) % runners.length;
        Platformer.previewRunner(runners[runnerIndex], { previous, step });
        drawCharacters();
        announcement.textContent = runners[runnerIndex].name;
      }
    } else if (view === 'highscores') {
      if (direction === 'down') go('home');
      if (direction === 'up') go('statistics');
    } else if (view === 'statistics') {
      if (direction === 'down') go('highscores');
    } else if (view === 'practice') {
      if (direction === 'left') go('home');
      else if (direction === 'right') startPractice();
      else {
        practiceIndex = Math.max(0, Math.min(practiceSpeeds.length - 1, practiceIndex + (direction === 'up' ? 1 : -1)));
        Platformer.setPracticeTempo(GameRules.bpmAt(practiceSpeeds[practiceIndex]));
        drawPractice();
        announcement.textContent = `Starting speed ${practiceSpeeds[practiceIndex]}`;
      }
    }
  });

  window.GameMenu = {
    get current() { return view; },
    get blocksInput() { return blocksInput(); },
    prepareForGame(practice) {
      const target = practice ? 'practice' : 'home';
      MenuCamera.place(hud, target);
      panels.get('practice').hidden = practice;
      hud.hidden = false;
      hud.removeAttribute('aria-hidden');
      if (practice) Platformer.setPracticeTempo(GameRules.bpmAt(practiceSpeeds[practiceIndex]));
    }
  };
  GameButtons.setInputGuard(blocksInput);
  Platformer.previewRunner(runners[runnerIndex]);
  Platformer.setVisible(true);
  selectPanel('home');
  enterHome();
  GameLights.standby();
})();
