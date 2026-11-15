const GameRecords = (() => {
  const key = 'nopeustesti.records.v1';
  const count = value => Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  let saved, oldHighscore, profileName;
  try {
    profileName = localStorage.getItem('nopeustesti.profileName')?.trim();
    oldHighscore = count(Number(localStorage.getItem('nopeustesti.highscore')));
    saved = JSON.parse(localStorage.getItem(key));
  } catch {}
  const profile = profileName || HIGHSCORES_MENU.defaultProfileName;
  const totals = { runs: 0, score: 0, totalTaps: 0, totalTimeMs: 0, totalDeaths: 0 };
  for (const metric of Object.keys(totals)) totals[metric] = count(saved?.totals?.[metric]);
  const entries = Array.isArray(saved?.entries) ? saved.entries.filter(entry =>
    Number.isFinite(entry?.score) && entry.score >= 0 &&
    (entry.profile === null || typeof entry.profile === 'string') &&
    (entry.date === null || (typeof entry.date === 'string' && Number.isFinite(Date.parse(entry.date))))
  ) : [];
  // The old save contained a score only. Keep it without inventing a name or a date.
  if (!Array.isArray(saved?.entries) && oldHighscore > 0) {
    entries.push({ score: oldHighscore, profile: null, date: null });
  }
  function rank() {
    entries.sort((a, b) => b.score - a.score || (b.date || '').localeCompare(a.date || ''));
    entries.length = Math.min(entries.length, HIGHSCORES_MENU.entryLimit);
  }
  rank();

  return {
    get highscore() { return entries[0]?.score ?? 0; },
    get entries() { return entries.slice(); },
    get statistics() { return { ...totals, averageScore: totals.runs ? totals.score / totals.runs : 0 }; },
    saveRun({ score, taps, timeMs }) {
      entries.push({ score, profile, date: new Date().toISOString() });
      rank();
      totals.runs++;
      totals.score += score;
      totals.totalTaps += taps;
      totals.totalTimeMs += count(timeMs);
      totals.totalDeaths++;
      try { localStorage.setItem(key, JSON.stringify({ entries, totals })); } catch {}
    }
  };
})();
