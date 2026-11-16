(() => {
  const world = document.querySelector('.camera-menu-world');
  const hud = document.querySelector('.game-hud-position');
  const footer = hud.querySelector('.screen-bottom-row');
  const runBar = hud.querySelector('.run-bar');
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
  let settingsIndicatorTimer;
  let settingsDescriptionTimer;
  let settingsConfirmed = false;
  const settingsSelections = new Map();
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
  const settingsPanel = panel('settings', SETTINGS_MENU);
  settingsPanel.style.setProperty('--settings-top-padding', SETTINGS_MENU.topPadding);
  settingsPanel.style.setProperty('--settings-title-gap', SETTINGS_MENU.titleGap);
  settingsPanel.style.setProperty('--settings-title-font-size', SETTINGS_MENU.titleFontSize);
  settingsPanel.style.setProperty('--settings-item-gap', SETTINGS_MENU.itemGap);
  settingsPanel.style.setProperty('--settings-item-font-size', SETTINGS_MENU.itemFontSize);
  settingsPanel.style.setProperty('--settings-indicator-blink', `${SETTINGS_MENU.indicatorBlinkMs}ms`);
  settingsPanel.style.setProperty('--settings-description-scroll', `${SETTINGS_MENU.descriptionScrollMs}ms`);
  panel('characters', CHARACTERS_MENU);
  panel('highscores', HIGHSCORES_MENU);
  panel('statistics', STATISTICS_MENU);
  panel('practice', PRACTICE_MENU);

  function drawPanel(id, config, content, hints, counter = '') {
    const target = panels.get(id);
    const header = element('header', 'camera-panel-heading');
    const label = element('div');
    const counterAtEnd = id === 'settings' || config.caption;
    if (id !== 'settings') {
      const captionClass = config.caption ? 'camera-caption' : 'camera-caption camera-counter';
      label.append(element('p', captionClass, config.caption ?? counter));
    }
    label.append(element('h2', '', config.title));
    header.append(label);
    if (counterAtEnd && counter) header.append(element('span', 'camera-caption camera-counter', counter));
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

  function settingsValue(setting) {
    if (setting.type === 'placeholder') return '—';
    if (setting.type === 'toggle') return (settingsSelections.get(setting) ?? setting.defaultOn) ? 'ON' : 'OFF';
    if (setting.type === 'choice') return setting.options[settingsSelections.get(setting) ?? 0];
    if (setting.type === 'confirm') return settingsConfirmed ? 'UNLOCKS RESET' : 'HOLD TO CONFIRM';
    return GameAudio.getVolume(setting.channel) || 'OFF';
  }

  function lightSettingsIndicators() {
    clearTimeout(settingsIndicatorTimer);
    settingsPanel.setAttribute('data-indicators-lit', '');
    settingsIndicatorTimer = setTimeout(() => {
      settingsPanel.removeAttribute('data-indicators-lit');
    }, SETTINGS_MENU.indicatorLitMs);
  }

  function scheduleSettingsDescription() {
    clearTimeout(settingsDescriptionTimer);
    const description = settingsPanel.querySelector('.settings-description');
    if (!description) return;
    settingsDescriptionTimer = setTimeout(() => {
      description.closest('.camera-list-row').setAttribute('data-show-description', '');
    }, SETTINGS_MENU.descriptionDelayMs);
  }

  function drawSettings() {
    const { rows, visibleRows } = SETTINGS_MENU;
    const list = element('ul', 'settings-menu-list');
    list.toggleAttribute('data-can-scroll-up', settingsTop > 0);
    list.toggleAttribute('data-can-scroll-down', settingsTop + visibleRows < rows.length);
    rows.slice(settingsTop, settingsTop + visibleRows).forEach((setting, offset) => {
      const selected = settingsIndex === settingsTop + offset;
      const row = element('li', 'camera-list-row');
      if (selected) row.setAttribute('aria-current', 'true');
      const label = element('span', 'camera-row-label');
      label.append(element('span', 'settings-row-name', setting.label));
      row.append(label);
      if (selected && setting.description) {
        const description = element('span', 'settings-description');
        const track = element('span', 'settings-description-track', setting.description);
        track.addEventListener('animationend', () => {
          if (!row.isConnected || !row.hasAttribute('data-show-description')) return;
          row.removeAttribute('data-show-description');
          scheduleSettingsDescription();
        });
        description.append(track);
        label.append(description);
      }
      const value = settingsValue(setting);
      if (setting.type === 'confirm') {
        if (selected) {
          const confirmation = hint('right', value);
          confirmation.classList.add('settings-confirmation');
          if (settingsConfirmed) {
            const indicator = confirmation.lastElementChild;
            delete indicator.dataset.arrow;
            indicator.replaceChildren(icon('led-check'));
          }
          row.append(confirmation);
        }
      } else {
        if (setting.channel) {
          const meter = element('span', 'settings-meter');
          meter.setAttribute('aria-hidden', 'true');
          for (let i = 0; i < GAME_AUDIO.maxVolume; i++) {
            meter.append(element('span', i < value ? 'is-filled' : ''));
          }
          row.append(meter);
        }
        row.append(element('span', 'camera-row-value', value));
      }
      list.append(row);
    });
    const vertical = hint('down', settingsIndex === 0 ? 'NAVIGATE/RETURN' : 'NAVIGATE');
    vertical.classList.add('settings-nav-navigate');
    vertical.append(arrow('up'));
    const hints = [vertical];
    const selectedType = rows[settingsIndex].type;
    if (selectedType !== 'confirm' && selectedType !== 'placeholder') {
      const adjust = hint('right', 'ADJUST');
      adjust.classList.add('settings-nav-adjust');
      adjust.prepend(arrow('left'));
      hints.unshift(adjust);
    }
    drawPanel('settings', SETTINGS_MENU, list, hints, counter(settingsIndex, rows.length));
    if (view === 'settings') scheduleSettingsDescription();
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

  function drawHome({ welcome = false } = {}) {
    MenuCamera.place(hud, 'home');
    hud.hidden = false;
    footer.hidden = false;
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
    clearTimeout(settingsDescriptionTimer);
    settingsPanel.querySelector('[data-show-description]')?.removeAttribute('data-show-description');
    settingsConfirmed = false;
    ScreenText.clear();
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
      if (view === 'settings') scheduleSettingsDescription();
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
      lightSettingsIndicators();
      if (direction === 'up' || direction === 'down') {
        const nextIndex = Math.min(rows.length - 1, settingsIndex + (direction === 'up' ? -1 : 1));
        if (nextIndex !== settingsIndex) settingsConfirmed = false;
        settingsIndex = nextIndex;
        settingsTop = Math.max(settingsIndex - visibleRows + 1, Math.min(settingsTop, settingsIndex));
      } else {
        const setting = rows[settingsIndex];
        if (setting.type === 'placeholder') return;
        if (setting.type === 'confirm') {
          if (direction === 'right' && !settingsConfirmed) {
            beginHold(direction, {
              duration: setting.holdMs,
              hold: () => {
                settingsConfirmed = true;
                lightSettingsIndicators();
                drawSettings();
                announcement.textContent = settingsValue(setting);
              }
            });
          }
          return;
        }
        const step = direction === 'right' ? 1 : -1;
        if (setting.type === 'toggle') {
          settingsSelections.set(setting, direction === 'right');
        } else if (setting.type === 'choice') {
          const index = settingsSelections.get(setting) ?? 0;
          const count = setting.options.length;
          settingsSelections.set(setting, (index + step + count) % count);
        } else {
          GameAudio.setVolume(setting.channel, GameAudio.getVolume(setting.channel) + step);
          if (setting.preview) GameAudio.tone(color);
        }
      }
      drawSettings();
      const setting = rows[settingsIndex];
      announcement.textContent = `${setting.label}: ${settingsValue(setting)}`;
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
    get bpmIndicator() {
      const setting = SETTINGS_MENU.rows.find(row => row.id === 'bpmIndicator');
      return settingsSelections.get(setting) ?? setting?.defaultOn ?? false;
    },
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
    reenterRunner() {
      if (view === 'home' || view === 'results' || view === 'practice') {
        Platformer.enterRunner(runners[runnerIndex], view === 'practice' ? 'practice' : 'home');
      }
    },
    showRunResults(result, onContinue) {
      view = 'results';
      footer.hidden = true;
      ScreenText.clear();
      ResultsScreen.show(result, onContinue);
    },
    returnFromResults() {
      ResultsScreen.hide();
      runBar.hidden = true;
      view = 'home';
      selectPanel(view);
      drawHome();
    },
    prepareForGame(practice) {
      const target = practice ? 'practice' : 'home';
      runBar.hidden = practice;
      footer.hidden = !practice;
      MenuCamera.place(hud, target);
      panels.get('practice').hidden = true;
      hud.hidden = false;
      hud.removeAttribute('aria-hidden');
      if (practice) Platformer.setPracticeTempo(0);
    }
  };
  GameButtons.setInputGuard(blocksInput);
})();
