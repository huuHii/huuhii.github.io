/* Gameplay controls the countdown, cues, and result screen. */
(() => {
  const colors = ['red', 'yellow', 'blue', 'green'];
  const footer = document.querySelector('.screen-bottom-row');
  const banner = document.querySelector('.practice-mode-label');
  const runBar = document.querySelector('.run-bar');
  const barItems = new Map();
  const { topBar } = GAME_UI;
  for (const [name, value] of Object.entries({
    'top-padding': topBar.topPadding,
    'horizontal-padding': topBar.horizontalPadding,
    'font-size': topBar.fontSize,
    gap: topBar.gap,
    justify: topBar.justifyContent
  })) runBar.style.setProperty('--game-bar-' + name, value);
  let phase = 'idle', practice = false, score = 0, bpm = 0;
  let startingScore = 0, beats = 0, queue = [], lastColor = null;
  const plannedColors = [];
  let beatTimer = null, clockTimer = null, session = 0, nextBeat = 0;
  let recoveryTimer = null;
  let runStartedAt = 0, taps = 0, cueAudio = false;
  let practiceTempo;
  function element(className, value) {
    const node = document.createElement('span');
    node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function icon(className) {
    const node = element(`led-icon ${className}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }
  function metric(symbol, value) {
    const group = element('game-metric');
    group.append(icon(symbol), element('', value));
    return group;
  }
  function prepareRunBar() {
    barItems.clear();
    runBar.replaceChildren();
    for (const item of topBar.items) {
      if (item.id === 'bpm' && !GameMenu.bpmIndicator) continue;
      const node = element('game-metric');
      const text = element('');
      if (item.fontSize) node.style.fontSize = item.fontSize;
      if (item.icon) node.append(icon(item.icon));
      node.append(text);
      runBar.append(node);
      barItems.set(item.id, { text, label: item.label });
      renderBarItem(item.id, item.value ?? '');
    }
  }
  function renderBarItem(id, value) {
    const item = barItems.get(id);
    if (!item) return;
    const text = [item.label, value].filter(part => part !== '' && part != null).join(' ');
    if (item.text.textContent !== text) item.text.textContent = text;
  }
  function renderFooter(result = false) {
    const tempo = Math.round(bpm);
    if (!practice) {
      renderBarItem('bpm', tempo);
      return;
    }
    const view = result ? 'practice-result' : 'practice-game';
    if (footer.dataset.view === view) {
      if (practiceTempo) updateMetric(practiceTempo, 'BPM', tempo);
      return;
    }
    const nodes = [];
    if (result) {
      const menu = element('screen-bottom-item screen-bottom-left');
      menu.append(icon('led-arrow led-arrow-left'), element('', 'RETURN'));
      nodes.push(menu);
    }
    practiceTempo = GameMenu.bpmIndicator ? metric('led-metronome', tempo) : null;
    if (practiceTempo) {
      updateMetric(practiceTempo, 'BPM', tempo);
      nodes.push(practiceTempo);
    }
    if (result) {
      const replay = element('screen-bottom-item screen-bottom-right');
      replay.append(element('', 'RETRY'), icon('led-arrow'));
      nodes.push(replay);
    }
    footer.dataset.view = view;
    footer.replaceChildren(...nodes);
  }
  function updateMetric(node, label, value) {
    const text = String(value);
    if (node.lastElementChild.textContent !== text) node.lastElementChild.textContent = text;
    const name = `${label} ${text}`;
    if (node.getAttribute('aria-label') !== name) node.setAttribute('aria-label', name);
  }
  function renderTime(timeMs) {
    renderBarItem('time', formatRunTime(timeMs));
  }
  function tickClock() {
    const elapsed = performance.now() - runStartedAt;
    renderTime(elapsed);
    clockTimer = setTimeout(tickClock, 1000 - elapsed % 1000);
  }
  function leave() {
    session++;
    clearTimeout(beatTimer);
    clearTimeout(clockTimer);
    GameLights.cancel();
    ScreenText.clear();
    GameAudio.stopTone();
    GameButtons.setMenuFeedback(true);
    banner.hidden = true;
    phase = 'idle';
    queue = [];
    if (recoveryTimer !== null) recoverRunner();
    else Platformer.endRun();
  }
  function recoverRunner() {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
    Platformer.endRun();
    GameMenu.reenterRunner();
  }
  function finish() {
    if (phase !== 'playing') return;
    const failedAt = performance.now();
    const timeMs = failedAt - runStartedAt;
    phase = 'ending';
    clearTimeout(beatTimer);
    clearTimeout(clockTimer);
    const tripMs = Platformer.trip();
    GameAudio.stopTone();
    if (!practice) {
      renderTime(timeMs);
      GameRecords.saveRun({ score, taps, timeMs });
    }
    ScreenText.clear();
    if (cueAudio) GameAudio.gameOver();
    const revealMs = RESULTS_SCREEN.failureDelaySeconds * 1000;
    if (practice) {
      GameLights.gameOver(() => {
        beatTimer = setTimeout(() => {
          recoverRunner();
          GameButtons.setMenuFeedback(true);
          phase = 'practice-result';
          ScreenText.show(String(score), 'static', { variant: 'score' });
          renderFooter(true);
          GameLights.standby();
        }, Math.max(0, failedAt + tripMs - performance.now()));
      });
    } else {
      GameLights.gameOver(() => {});
      beatTimer = setTimeout(() => {
        GameButtons.setMenuFeedback(true);
        phase = 'result';
        GameMenu.showRunResults({ score, speed: Math.round(bpm), timeMs }, continueToLobby);
      }, revealMs);
      recoveryTimer = setTimeout(recoverRunner, Math.max(tripMs, revealMs));
    }
  }
  function continueToLobby() {
    if (phase !== 'result') return;
    phase = 'idle';
    GameMenu.returnFromResults();
    GameLights.standby();
  }
  function planColors(count) {
    while (plannedColors.length < count) {
      const candidates = colors.filter(color => color !== lastColor);
      lastColor = candidates[Math.floor(Math.random() * candidates.length)];
      plannedColors.push(lastColor);
      Platformer.planBeat(beats + plannedColors.length, lastColor);
    }
  }
  function planObstacleCues() {
    planColors(OBSTACLE_SETTINGS.previewBeats);
  }
  function beat() {
    if (phase !== 'playing') return;
    // maxLateBeeps excludes the current beep: 0 requires clearing each before the next.
    if (queue.length > GAME_RULES.maxLateBeeps) { finish(); return; }
    bpm = GameRules.bpmAt(startingScore + beats);
    const scheduledBeat = nextBeat;
    nextBeat += 60000 / GameRules.bpmAt(startingScore + beats + 1);
    if (!beats) {
      Platformer.startRun(scheduledBeat, nextBeat);
      ScreenText.show('GO!', 'static');
      if (!practice) tickClock();
    } else {
      Platformer.beat(scheduledBeat, nextBeat);
    }
    planColors(1);
    const color = plannedColors.shift();
    GameLights.all(false);
    GameButtons.setLit(color, true);
    queue.push(color);
    if (cueAudio) GameAudio.tone(color);
    beats++;
    renderFooter();
    planObstacleCues();
    beatTimer = setTimeout(() => {
      // Avoid a burst of missed beats after a stalled/hidden browser.
      if (performance.now() - nextBeat > 60000 / bpm) finish();
      else beat();
    }, Math.max(0, nextBeat - performance.now()));
  }
  function start(isPractice, selectedScore = 0) {
    if (window.GameSession.blocksMenu || GameMenu.blocksInput ||
      GameMenu.current !== (isPractice ? 'practice' : 'home')) return;
    leave();
    GameMenu.prepareForGame(isPractice);
    practice = isPractice;
    startingScore = isPractice ? selectedScore : 0;
    score = startingScore;
    beats = 0;
    taps = 0;
    lastColor = null;
    plannedColors.length = 0;
    bpm = GameRules.bpmAt(startingScore);
    phase = 'ready';
    if (!practice) {
      prepareRunBar();
      renderTime(0);
    }
    banner.hidden = !practice;
    GameButtons.setMenuFeedback(false);
    renderFooter();
    const token = session;
    const { holdSeconds } = GAME_COUNTDOWN;
    function showReady() {
      ScreenText.show('READY', 'scroll-stop', { onComplete() {
        GameLights.ready(holdSeconds, () => {
          ScreenText.show('SET', 'static');
          beatTimer = setTimeout(() => {
            phase = 'playing';
            nextBeat = runStartedAt = performance.now();
            beat();
          }, holdSeconds * 1000);
        });
      } });
    }
    GameAudio.prepareRun().then(available => {
      if (session !== token || phase !== 'ready') return;
      cueAudio = available;
      if (available) {
        showReady();
      } else {
        ScreenText.show('VISUAL ONLY', 'static');
        beatTimer = setTimeout(showReady, 900);
      }
    });
  }
  document.addEventListener('game-start-request', () => start(false));
  document.addEventListener('practice-start-request', event => start(true, event.detail.startingSpeed));
  document.addEventListener('game-button-press', event => {
    if (phase === 'result' && event.detail.color === 'green') {
      continueToLobby();
      return;
    }
    if (phase !== 'playing') return;
    taps++;
    if (!queue.length) return;
    if (event.detail.color !== queue[0]) { finish(); return; }
    queue.shift();
    Platformer.act(event.detail.color, beats - queue.length);
    score++;
    ScreenText.show(String(score), 'static', { variant: 'score' });
    renderFooter();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (phase === 'playing') finish();
    if (phase === 'ready') {
      leave();
      GameMenu.restoreAfterReady();
    }
  });
  window.GameSession = {
    get phase() { return phase; },
    get blocksMenu() { return phase !== 'idle' && phase !== 'practice-result'; },
    get score() { return score; },
    get bpm() { return bpm; },
    leave
  };
})();
