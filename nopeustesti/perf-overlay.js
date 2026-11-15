export function showPerfOverlay() {
  if (document.querySelector('.perf-overlay')) return;

  const sampleMs = 1000;
  const overlay = document.createElement('button');
  overlay.type = 'button';
  overlay.className = 'perf-overlay';
  overlay.textContent = 'Sampling performance…';
  document.body.append(overlay);

  let frame;
  let windowStart;
  let previousFrame;
  const frameGaps = [];
  const longTasks = [];
  const taskObserver = globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')
    ? new PerformanceObserver(entries => longTasks.push(...entries.getEntries()))
    : null;

  function sample(now) {
    windowStart ??= now;
    if (previousFrame !== undefined) frameGaps.push(now - previousFrame);
    previousFrame = now;

    const elapsed = now - windowStart;
    if (elapsed >= sampleMs) {
      frameGaps.sort((a, b) => a - b);
      const fps = Math.round(frameGaps.length * 1000 / elapsed);
      const p95 = frameGaps[Math.ceil(frameGaps.length * .95) - 1];
      const peak = frameGaps[frameGaps.length - 1];
      let metrics = `${fps} FPS · frame p95/max ${p95.toFixed(1)}/${peak.toFixed(1)} ms`;

      if (taskObserver) {
        longTasks.push(...taskObserver.takeRecords());
        const since = now - sampleMs;
        let busyMs = 0;
        for (let i = longTasks.length - 1; i >= 0; i--) {
          const { startTime, duration } = longTasks[i];
          const end = startTime + duration;
          if (end <= since) longTasks.splice(i, 1);
          else busyMs += Math.max(0, Math.min(end, now) - Math.max(startTime, since, windowStart));
        }
        metrics += ` · long tasks ${Math.round(busyMs)} ms/s`;
      }

      overlay.textContent = metrics;
      frameGaps.length = 0;
      windowStart = now;
    }

    frame = requestAnimationFrame(sample);
  }

  function updateVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      taskObserver?.disconnect();
      frameGaps.length = longTasks.length = 0;
      previousFrame = windowStart = undefined;
      return;
    }

    overlay.textContent = 'Sampling performance…';
    taskObserver?.observe({ type: 'longtask' });
    frame = requestAnimationFrame(sample);
  }

  overlay.addEventListener('click', () => {
    cancelAnimationFrame(frame);
    taskObserver?.disconnect();
    document.removeEventListener('visibilitychange', updateVisibility);
    overlay.remove();
  });
  document.addEventListener('visibilitychange', updateVisibility);
  updateVisibility();
}
