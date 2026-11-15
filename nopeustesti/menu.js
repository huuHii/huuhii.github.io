(() => {
  const world = document.querySelector('.camera-menu-world');
  const hud = document.querySelector('.game-hud-position');
  const footer = hud.querySelector('.screen-bottom-row');
  const runBar = hud.querySelector('.run-bar');
  const results = hud.querySelector('.run-results');
  const resultScore = results.querySelector('.run-results-score');
  const resultAnimal = results.querySelector('.run-results-animal');
  const resultsTrack = results.querySelector('.run-results-track');
  const milestones = [...SPEED_MILESTONES].sort((a, b) => a.taps - b.taps);
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
  let startingUp = true;
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
    section.hidden = true;
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
    const captionClass = config.caption ? 'camera-caption' : 'camera-caption camera-counter';
    label.append(element('p', captionClass, config.caption ?? counter), element('h2', '', config.title));
    header.append(label);
    if (config.caption && counter) header.append(element('span', 'camera-caption camera-counter', counter));
    const nav = element('div', 'camera-panel-nav');
    nav.append(...hints);
    target.replaceChildren(header, content, nav);
  }
  function selectPanel(id) {
    for (const [name, panel] of panels) {
      panel.hidden = id !== name;
      panel.setAttribute('aria-hidden', String(panel.hidden));
    }
    hud.hidden = id !== 'home';
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
    const atTop = settingsIndex === 0;
    const vertical = hint('down', atTop ? 'Down' : 'Up/Down');
    const hints = [adjust, vertical];
    if (atTop) hints.push(hint('up', 'RETURN'));
    else vertical.append(arrow('up'));
    drawPanel('settings', SETTINGS_MENU, list, hints, counter(settingsIndex, rows.length));
  }

  const characterList = element('ul', 'character-menu-list');
  const characterRows = Array.from({ length: 3 }, (_, index) => {
    const row = element('li', 'camera-list-row');
    row.setAttribute(index === 1 ? 'aria-current' : 'aria-hidden', 'true');
    characterList.append(row);
    return row;
  });
  function buildCharacters() {
    const cycle = hint('up', 'BROWSE');
    cycle.append(arrow('down'));
    drawPanel('characters', CHARACTERS_MENU, characterList, [
      cycle, hint('right', 'SELECT & RETURN')
    ], counter(runnerIndex, runners.length));
    return panels.get('characters').querySelector('.camera-counter');
  }
  const characterCounter = buildCharacters();
  function drawCharacters() {
    characterRows.forEach((row, index) => {
      row.textContent = runners[(runnerIndex + index - 1 + runners.length) % runners.length].name;
    });
    characterCounter.textContent = counter(runnerIndex, runners.length);
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
      hint('down', 'RETURN'), hint('up', 'STATS')
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
    drawPanel('statistics', STATISTICS_MENU, list, [hint('left', 'RETURN'), hint('down', 'HIGHSCORES')]);
  }

  function drawPractice() {
    const content = element('div', 'practice-menu-value');
    content.append(element('strong', '', practiceSpeeds[practiceIndex]),
      element('span', '', `${Math.round(GameRules.bpmAt(practiceSpeeds[practiceIndex]))} BPM`));
    const speed = hint('up', 'SPEED');
    speed.append(arrow('down'));
    drawPanel('practice', PRACTICE_MENU, content, [
      hint('left', 'RETURN'), speed, hint('right', 'START')
    ], counter(practiceIndex, practiceSpeeds.length));
  }

  function drawHomeOptions() {
    footer.dataset.view = 'standard';
    const scores = hint('up', 'SCORES');
    if (runBar.hidden) scores.append(icon('led-star'), element('span', '', number.format(GameRecords.highscore)));
    scores.setAttribute('aria-label', `Up: highscores, best ${GameRecords.highscore}`);
    footer.replaceChildren(hint('left', 'RUNNER'), scores, hint('down', 'SETTINGS'), hint('right', 'PLAY'));
  }

  function drawHome({ result, welcome = false } = {}) {
    MenuCamera.place(hud, 'home');
    hud.hidden = false;
    footer.hidden = false;
    if (result) {
      drawHomeOptions();
      drawResults(result);
    } else {
      const rightArrow = { icon: 'led-arrow led-arrow-right', label: 'right arrow' };
      const instructions = ['PRESS ', rightArrow, ' TO START  /  HOLD ', rightArrow, ' FOR PRACTICE'];
      if (welcome) {
        footer.dataset.view = 'welcome';
        footer.replaceChildren(element('span', 'app-version', 'v2 6.11.2026'));
        ScreenText.titleLoop('WELCOME', instructions, {
          holdSeconds: SCREEN_SEQUENCE_SETTINGS['title-loop'].welcomeHoldSeconds,
          onLoopStart: drawHomeOptions
        });
      } else {
        drawHomeOptions();
        ScreenText.titleLoop('STANDARD', instructions);
      }
    }
  }

  function drawResults({ score, speed, timeMs }) {
    const reached = milestones.findLast(milestone => milestone.taps <= score);
    const next = milestones.find(milestone => milestone.taps > score);
    resultScore.textContent = number.format(score);
    resultAnimal.textContent = reached ? `${reached.animal} speed reached` : 'No animal milestone reached';
    const copy = element('div', 'run-results-copy');
    copy.append(
      element('span', '', `Total time: ${formatRunTime(timeMs)}`),
      element('span', '', `Speed reached: ${speed} taps/min`),
      element('span', '', next
        ? `Taps away from next milestone: ${next.taps - score} (${next.animal})`
        : 'All animal milestones reached')
    );
    const duplicate = copy.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    resultsTrack.replaceChildren(copy, duplicate);
    ScreenText.clear();
    results.hidden = false;
  }

  function draw(target) {
    ({ home: drawHome, settings: drawSettings, characters: drawCharacters,
      highscores: drawHighscores, statistics: drawStatistics, practice: drawPractice })[target]();
  }
  function blocksInput() {
    return startingUp || MenuCamera.moving || performance.now() < lockedUntil;
  }
  function enterHome(options) {
    Platformer.enterRunner(runners[runnerIndex], 'home');
    drawHome(options);
  }
  function go(target) {
    cancelHold();
    ScreenText.clear();
    results.hidden = true;
    runBar.hidden = true;
    if (target === 'characters') Platformer.previewRunner(runners[runnerIndex]);
    if (target === 'practice') {
      Platformer.setPracticeTempo(GameRules.bpmAt(practiceSpeeds[practiceIndex]));
    } else if (view === 'practice') {
      Platformer.setPracticeTempo(0);
    }
    if (target !== 'home') {
      panels.get(target).hidden = false;
      draw(target);
    }
    MenuCamera.move(target, () => {
      if (target !== 'characters') Platformer.hidePreview();
      view = target;
      lockedUntil = performance.now() + MENU_TRANSITIONS.settleMs;
      selectPanel(view);
      if (view === 'home') enterHome();
      else if (view === 'practice') Platformer.enterRunner(runners[runnerIndex], 'practice');
      else Platformer.hideRunner();
      announcement.textContent = view === 'home' ? 'RETURN' : panels.get(view).getAttribute('aria-label');
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
    if (GameSession.phase === 'practice-result') {
      if (direction === 'right') {
        startPractice();
      } else if (direction === 'left') {
        GameSession.leave();
        go('home');
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
      if (direction === 'left') go('home');
      else if (direction === 'down') go('highscores');
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
    startupComplete() {
      startingUp = false;
      Platformer.setVisible(true);
      selectPanel('home');
      enterHome({ welcome: true });
      GameLights.standby();
    },
    restoreAfterReady() {
      runBar.hidden = true;
      if (view === 'home') enterHome();
      else {
        hud.hidden = true;
        panels.get('practice').hidden = false;
        Platformer.setPracticeTempo(GameRules.bpmAt(practiceSpeeds[practiceIndex]));
        drawPractice();
      }
      selectPanel(view);
      GameLights.standby();
    },
    showRunResults(result) {
      selectPanel('home');
      enterHome({ result });
    },
    prepareForGame(practice) {
      const target = practice ? 'practice' : 'home';
      results.hidden = true;
      runBar.hidden = practice;
      footer.hidden = !practice;
      MenuCamera.place(hud, target);
      panels.get('practice').hidden = true;
      hud.hidden = false;
      hud.removeAttribute('aria-hidden');
      if (practice) Platformer.setPracticeTempo(GameRules.bpmAt(practiceSpeeds[practiceIndex]));
    }
  };
  GameButtons.setInputGuard(blocksInput);
})();
