/* Gameplay controls the lights from READY through the result screen. */
(() => {
  const colors = ['red', 'yellow', 'blue', 'green'];
  const footer = document.querySelector('.screen-bottom-row');
  const banner = document.querySelector('.practice-mode-label');
  let phase = 'idle', practice = false, score = 0, bpm = 0;
  let startingScore = 0, beats = 0, queue = [], lastColor = null;
  const plannedColors = [];
  let beatTimer = null, session = 0, nextBeat = 0;
  let runStartedAt = 0, taps = 0, cueAudio = false;
  let playingFooter;
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
  function renderFooter(result = false) {
    const view = result ? (practice ? 'practice-result' : 'game-result') : (practice ? 'practice-game' : 'game');
    const best = Math.max(GameRecords.highscore, score);
    if (!result && playingFooter && footer.dataset.view === view) {
      updateMetric(playingFooter.tempo, 'BPM', Math.round(bpm));
      if (!practice) updateMetric(playingFooter.best, 'Highscore', best);
      return;
    }
    const nodes = [];
    if (result) {
      const menu = element('screen-bottom-item screen-bottom-left');
      menu.append(icon('led-arrow led-arrow-left'), element('', practice ? 'SURFACE' : 'MENU'));
      nodes.push(menu);
    }
    const tempo = metric('led-metronome', Math.round(bpm));
    updateMetric(tempo, 'BPM', Math.round(bpm));
    nodes.push(tempo);
    let highscore;
    if (!practice) {
      highscore = metric('led-star', best);
      updateMetric(highscore, 'Highscore', best);
      nodes.push(highscore);
    }
    if (result) {
      const replay = element('screen-bottom-item screen-bottom-right');
      replay.append(element('', practice ? 'RETRY' : 'PLAY'), icon('led-arrow'));
      nodes.push(replay);
    }
    playingFooter = result ? null : { tempo, best: highscore };
    footer.dataset.view = view;
    footer.replaceChildren(...nodes);
  }
  function updateMetric(node, label, value) {
    const text = String(value);
    if (node.lastElementChild.textContent !== text) node.lastElementChild.textContent = text;
    const name = `${label} ${text}`;
    if (node.getAttribute('aria-label') !== name) node.setAttribute('aria-label', name);
  }
  function leave() {
    session++;
    clearTimeout(beatTimer);
    GameLights.cancel();
    ScreenText.clear();
    GameAudio.stopTone();
    GameButtons.setMenuFeedback(true);
    banner.hidden = true;
    phase = 'idle';
    queue = [];
    Platformer.endRun();
  }
  function finish() {
    if (phase !== 'playing') return;
    phase = 'ending';
    clearTimeout(beatTimer);
    Platformer.endRun();
    GameAudio.stopTone();
    if (!practice) GameRecords.saveRun({ score, taps, timeMs: performance.now() - runStartedAt });
    ScreenText.show(String(score), 'static', { variant: 'score' });
    if (cueAudio) GameAudio.gameOver();
    renderFooter(true);
    const token = session;
    GameLights.gameOver(() => {
      if (session !== token) return;
      ScreenText.setVisible(true);
      phase = practice ? 'practice-result' : 'result';
      GameButtons.setMenuFeedback(true);
      GameLights.standby();
    }, lit => { if (session === token) ScreenText.setVisible(lit); });
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
    planColors(1);
    const color = plannedColors.shift();
    GameLights.all(false);
    GameButtons.setLit(color, true);
    queue.push(color);
    if (cueAudio) GameAudio.tone(color);
    beats++;
    renderFooter();
    const scheduledBeat = nextBeat;
    nextBeat += 60000 / GameRules.bpmAt(startingScore + beats);
    Platformer.beat(scheduledBeat, nextBeat);
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
    banner.hidden = !practice;
    GameButtons.setMenuFeedback(false);
    renderFooter();
    const token = session;
    let textDone = false, lightsDone = false, audioDone = false;
    function begin() {
      if (session !== token || phase !== 'ready' || !textDone || !lightsDone || !audioDone) return;
      phase = 'playing';
      ScreenText.show(String(score), 'static', { variant: 'score' });
      const startedAt = performance.now();
      runStartedAt = startedAt;
      nextBeat = startedAt + 60000 / bpm;
      Platformer.startRun(startedAt, nextBeat);
      planObstacleCues();
      beatTimer = setTimeout(beat, 60000 / bpm);
    }
    ScreenText.show('READY', 'scroll-stop', { onComplete() { textDone = true; begin(); } });
    GameLights.ready(() => { lightsDone = true; begin(); });
    GameAudio.prepareRun().then(available => {
      if (session !== token || phase !== 'ready') return;
      cueAudio = available;
      if (available) {
        audioDone = true;
        begin();
      } else {
        ScreenText.show('VISUAL ONLY', 'static');
        beatTimer = setTimeout(() => { audioDone = textDone = true; begin(); }, 900);
      }
    });
  }
  document.addEventListener('game-start-request', () => start(false));
  document.addEventListener('practice-start-request', event => start(true, event.detail.startingSpeed));
  document.addEventListener('game-button-press', event => {
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
    get blocksMenu() { return ['ready', 'playing', 'ending'].includes(phase); },
    get score() { return score; },
    get bpm() { return bpm; },
    leave
  };
})();
