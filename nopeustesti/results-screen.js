/* Font sizes and gaps are relative to the LED screen width. */
const RESULTS_SCREEN = {
  failureDelaySeconds: 0.35,
  // Use 'upper' for all caps or 'sentence' to capitalize only the first letter.
  title: { text: 'SPEEDTEST RESULTS', casing: 'upper', entrySeconds: 0.45, fontSize: '3.3cqw', gapAboveScore: '0.8cqw' },
  score: { fontSize: '10cqw', verticalOffset: '2cqw' },
  milestone: { casing: 'upper', revealSeconds: 0.2, fontSize: '2.7cqw', gapBelowScore: '0.8cqw' },
  details: { fontSize: '2.49cqw', itemGap: '10cqw', continueGap: '2cqw', widthsPerSecond: 0.32 },
  continue: { fontSize: '2.49cqw', iconGap: '0.65cqw', entryDelaySeconds: 0.15, entrySeconds: 0.3 },
  countUp: {
    pointsPerSecond: 60,
    minSeconds: 1,
    maxSeconds: 5,
    easeOutPower: 3 // 1 is linear. Higher values slow down more near the final score.
  }
};

const ResultsScreen = (() => {
  const section = document.querySelector('.run-results');
  const titleText = section.querySelector('#run-results-title');
  const scoreText = section.querySelector('.run-results-score');
  const milestoneText = section.querySelector('.run-results-animal');
  const track = section.querySelector('.run-results-track');
  const ticker = section.querySelector('.run-results-ticker');
  const continueButton = section.querySelector('.run-results-continue');
  const milestones = [...SPEED_MILESTONES].sort((a, b) => a.taps - b.taps);
  const number = new Intl.NumberFormat();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const { title, score, milestone, details, continue: continueControl } = RESULTS_SCREEN;
  let frame = null;
  let titleEntry;
  let onContinue;
  for (const [property, value] of Object.entries({
    'title-size': title.fontSize,
    'title-gap': title.gapAboveScore,
    'score-size': score.fontSize,
    'score-offset': score.verticalOffset,
    'milestone-size': milestone.fontSize,
    'milestone-gap': milestone.gapBelowScore,
    'milestone-reveal': `${milestone.revealSeconds}s`,
    'details-size': details.fontSize,
    'details-gap': details.itemGap,
    'footer-gap': details.continueGap,
    'continue-size': continueControl.fontSize,
    'continue-gap': continueControl.iconGap,
    'continue-delay': `${continueControl.entryDelaySeconds}s`,
    'continue-entry': `${continueControl.entrySeconds}s`
  })) section.style.setProperty(`--results-${property}`, value);

  function setScrollTiming() {
    const width = ticker.clientWidth;
    if (!width || details.widthsPerSecond <= 0) return;
    section.style.setProperty('--results-scroll-start', `${width}px`);
    section.style.setProperty('--results-scroll-entry', `${1 / details.widthsPerSecond}s`);
    section.style.setProperty('--results-scroll-duration', `${track.offsetWidth / (2 * width * details.widthsPerSecond)}s`);
  }
  const resize = new ResizeObserver(setScrollTiming);
  resize.observe(ticker);
  resize.observe(track);

  function applyCase(text, casing) {
    if (casing === 'upper') return text.toUpperCase();
    if (casing === 'sentence') return text.slice(0, 1).toUpperCase() + text.slice(1).toLowerCase();
    return text;
  }

  function cancelAnimations() {
    titleEntry?.cancel();
    titleEntry = undefined;
    cancelAnimationFrame(frame);
    frame = null;
  }

  function countUp(finalScore) {
    const { pointsPerSecond, minSeconds, maxSeconds, easeOutPower } = RESULTS_SCREEN.countUp;
    const duration = Math.min(maxSeconds, Math.max(minSeconds, finalScore / pointsPerSecond)) * 1000;
    scoreText.setAttribute('aria-label', `Score ${number.format(finalScore)}`);
    const instant = motion.matches || duration <= 0 || finalScore === 0;
    scoreText.textContent = number.format(instant ? finalScore : 0);
    scoreText.hidden = false;
    if (instant) {
      milestoneText.hidden = false;
      return;
    }
    const startedAt = performance.now();
    function tick(now) {
      const progress = motion.matches ? 1 : Math.max(0, Math.min(1, (now - startedAt) / duration));
      const eased = 1 - (1 - progress) ** easeOutPower;
      scoreText.textContent = number.format(Math.floor(finalScore * eased));
      frame = progress < 1 ? requestAnimationFrame(tick) : null;
      if (progress === 1) milestoneText.hidden = false;
    }
    frame = requestAnimationFrame(tick);
  }

  continueButton.addEventListener('click', () => onContinue?.());

  return {
    show({ score, speed, timeMs }, confirm) {
      cancelAnimations();
      onContinue = confirm;
      scoreText.hidden = true;
      milestoneText.hidden = true;
      titleText.textContent = applyCase(title.text, title.casing);
      const reached = milestones.findLast(milestone => milestone.taps <= score);
      const next = milestones.find(milestone => milestone.taps > score);
      milestoneText.textContent = applyCase(reached?.animal ?? milestones[0]?.animal ?? '', milestone.casing);
      const copy = document.createElement('div');
      copy.className = 'run-results-copy';
      for (const detail of [
        `Total time: ${formatRunTime(timeMs)}`,
        `Speed reached: ${speed} taps/min`,
        next ? `Taps away from next milestone: ${next.taps - score} (${next.animal})` : 'All animal milestones reached'
      ]) {
        const item = document.createElement('span');
        item.textContent = detail;
        copy.append(item);
      }
      const duplicate = copy.cloneNode(true);
      duplicate.setAttribute('aria-hidden', 'true');
      track.replaceChildren(copy, duplicate);
      section.hidden = false;
      setScrollTiming();
      if (motion.matches || title.entrySeconds <= 0) {
        countUp(score);
      } else {
        const entry = titleText.animate(
          [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }],
          { duration: title.entrySeconds * 1000, easing: 'ease-out' }
        );
        titleEntry = entry;
        entry.onfinish = () => {
          if (titleEntry !== entry) return;
          titleEntry = undefined;
          countUp(score);
        };
      }
    },
    hide() {
      cancelAnimations();
      onContinue = undefined;
      section.hidden = true;
    }
  };
})();
