/* Milestones are beep/starting-score positions. Add entries such as
   { at: 150, everyBeeps: 2, bpmIncrease: 1 }, between existing entries.
   At 200 the acceleration rate is halved, not the current BPM. */
const GAME_RULES = {
  startingBpm: 80,
  maxBpm: 600,
  maxLateBeeps: 3, // allowed backlog IN ADDITION to the current beep
  milestones: [
    { at: 0, everyBeeps: 1, bpmIncrease: 1 },
    { at: 100, everyBeeps: 1, bpmIncrease: 1 },
    { at: 200, everyBeeps: 2, bpmIncrease: 1 }
  ]
};
(() => {
  function bpmAt(position) {
    const milestones = [...GAME_RULES.milestones].sort((a,b) => a.at - b.at);
    let bpm = GAME_RULES.startingBpm;
    for (let i = 0; i < milestones.length; i++) {
      const rule = milestones[i];
      const end = Math.min(position, milestones[i + 1]?.at ?? position);
      const length = Math.max(0, end - rule.at);
      bpm += Math.floor(length / Math.max(1, rule.everyBeeps)) * rule.bpmIncrease;
    }
    return Math.max(1, Math.min(GAME_RULES.maxBpm, bpm));
  }
  let highscore = 0;
  try { highscore = Math.max(0, Number(localStorage.getItem('nopeustesti.highscore')) || 0); } catch {}
  window.GameRules = { bpmAt };
  window.GameRecords = {
    get highscore() { return highscore; },
    save(score) {
      highscore = Math.max(highscore, score);
      try { localStorage.setItem('nopeustesti.highscore', String(highscore)); } catch {}
    }
  };
})();
