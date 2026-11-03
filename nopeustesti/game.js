/* Gameplay owns the buttons only during READY, play and result animations. */
(() => {
  const colors = ['red', 'yellow', 'blue', 'green'];
  const footer = document.querySelector('.screen-bottom-row');
  const banner = document.querySelector('.practice-mode-label');
  let phase = 'idle', practice = false, score = 0, bpm = 0;
  let startingScore = 0, beats = 0, queue = [], lastColor = null;
  let beatTimer = null, returnTimer = null, session = 0, nextBeat = 0;
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
    const nodes = [];
    if (result && !practice) {
      const menu = element('screen-bottom-item screen-bottom-left');
      menu.append(icon('led-arrow led-arrow-left'), element('', 'MENU'));
      nodes.push(menu);
    }
    const tempo = metric('led-metronome', Math.round(bpm));
    tempo.setAttribute('aria-label', `BPM ${Math.round(bpm)}`);
    nodes.push(tempo);
    if (!practice) {
      const best = Math.max(GameRecords.highscore, score);
      const highscore = metric('led-star', best);
      highscore.setAttribute('aria-label', `Highscore ${best}`);
      nodes.push(highscore);
    }
    if (result && !practice) {
      const replay = element('screen-bottom-item screen-bottom-right');
      replay.append(element('', 'PLAY'), icon('led-arrow'));
      nodes.push(replay);
    }
    footer.dataset.view = practice ? 'practice-game' : result ? 'game-result' : 'game';
    footer.replaceChildren(...nodes);
  }
  function leave() {
    session++;
    clearTimeout(beatTimer);
    clearTimeout(returnTimer);
    GameLights.cancel();
    ScreenText.setVisible(true);
    GameAudio.stopTone();
    GameButtons.setMenuFeedback(true);
    banner.hidden = true;
    phase = 'idle';
    queue = [];
  }
  function finish() {
    if (phase !== 'playing') return;
    phase = 'ending';
    clearTimeout(beatTimer);
    GameAudio.stopTone();
    if (!practice) GameRecords.save(score);
    ScreenText.show(String(score), 'static', { variant: 'score' });
    GameAudio.gameOver();
    renderFooter(!practice);
    const token = session;
    GameLights.gameOver(() => {
      if (session !== token) return;
      ScreenText.setVisible(true);
      if (practice) {
        phase = 'practice-result';
        returnTimer = setTimeout(() => {
          if (session !== token) return;
          leave();
          GameMenu.returnToPracticeValue();
        }, GAME_LIGHT_ANIMATIONS.practiceResultHoldSeconds * 1000);
      } else {
        phase = 'result';
        GameButtons.setMenuFeedback(true);
      }
    }, lit => { if (session === token) ScreenText.setVisible(lit); });
  }
  function beat() {
    if (phase !== 'playing') return;
    // maxLateBeeps excludes the current beep: 0 requires clearing each before the next.
    if (queue.length > GAME_RULES.maxLateBeeps) { finish(); return; }
    bpm = GameRules.bpmAt(startingScore + beats);
    const candidates = colors.filter(color => color !== lastColor);
    const color = candidates[Math.floor(Math.random() * candidates.length)];
    lastColor = color;
    GameLights.all(false);
    GameButtons.setLit(color, true);
    queue.push(color);
    GameAudio.tone(color);
    beats++;
    renderFooter();
    nextBeat += 60000 / GameRules.bpmAt(startingScore + beats);
    beatTimer = setTimeout(() => {
      // Avoid a burst of missed beats after a stalled/hidden browser.
      if (performance.now() - nextBeat > 60000 / bpm) finish();
      else beat();
    }, Math.max(0, nextBeat - performance.now()));
  }
  function start(isPractice, selectedScore = 0) {
    if (window.GameSession.blocksMenu) return;
    leave();
    GameMenu.prepareForGame();
    practice = isPractice;
    startingScore = isPractice ? selectedScore : 0;
    score = startingScore;
    beats = 0;
    lastColor = null;
    bpm = GameRules.bpmAt(startingScore);
    phase = 'ready';
    banner.hidden = !practice;
    GameButtons.setMenuFeedback(false);
    renderFooter();
    const token = session;
    let textDone = false, lightsDone = false;
    function begin() {
      if (session !== token || phase !== 'ready' || !textDone || !lightsDone) return;
      phase = 'playing';
      ScreenText.show(String(score), 'static', { variant: 'score' });
      nextBeat = performance.now() + 60000 / bpm;
      beatTimer = setTimeout(beat, 60000 / bpm);
    }
    ScreenText.show('READY', 'scroll-stop', { onComplete() { textDone = true; begin(); } });
    GameLights.ready(() => { lightsDone = true; begin(); });
  }
  document.addEventListener('game-start-request', () => start(false));
  document.addEventListener('practice-start-request', event => start(true, event.detail.startingSpeed));
  document.addEventListener('game-button-press', event => {
    if (phase !== 'playing' || !queue.length) return;
    if (event.detail.color !== queue[0]) { finish(); return; }
    queue.shift();
    score++;
    ScreenText.show(String(score), 'static', { variant: 'score' });
    renderFooter();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && phase === 'playing') finish();
  });
  window.GameSession = {
    get phase() { return phase; },
    get blocksMenu() { return ['ready', 'playing', 'ending', 'practice-result'].includes(phase); },
    get score() { return score; },
    get bpm() { return bpm; },
    leave
  };
})();
