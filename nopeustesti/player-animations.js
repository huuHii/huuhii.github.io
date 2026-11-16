const PLAYER_ANIMATION_SETTINGS = {
  stride: { stepsPerBeat: 2, sway: 0.004 }, // sway is a fraction of display height
  clearance: 0.025, // extra space before returning, in display heights
  fall: {
    durationSeconds: 0.65,
    blinkIntervalSeconds: 0.1, // time between switching visible and invisible; 0 disables blinking
    rotationDegrees: 470, // clockwise
    jumpHeight: 0.075 // fraction of display height
  },
  // Times are in beats. The pose holds until both the minimum and obstacle clearance are met.
  // Lane offsets are fractions of display width; jump height is a fraction of display height.
  actions: {
    green: { lane: 'left', xOffset: 0.02, enterBeats: 0.17, holdBeats: 0.08, returnBeats: 0.18 },
    red: { lane: 'right', xOffset: -0.02, enterBeats: 0.17, holdBeats: 0.08, returnBeats: 0.18 },
    blue: { lift: 0.19, enterBeats: 0.22, holdBeats: 0.06, returnBeats: 0.22 },
    yellow: { heightScale: 0.38, turnsPerBeat: 1.5, enterBeats: 0.16, holdBeats: 0.08, returnBeats: 0.18 }
  }
};

const PlayerAnimations = (() => {
  const layout = PLATFORMER_LAYOUT;
  const settings = PLAYER_ANIMATION_SETTINGS;
  const turn = 2 * Math.PI;
  const rest = { x: layout.player.x, fromBottom: layout.lanes.center,
    lift: 0, heightScale: 1, roll: 0, stride: 1 };
  const clamp = progress => Math.min(1, Math.max(0, progress));
  const ease = progress => (1 - Math.cos(Math.PI * clamp(progress))) / 2;
  const phase = (elapsed, duration) => duration > 0 ? elapsed / duration : 1;
  const nearestTurn = roll => Math.round(roll / turn) * turn;

  function blend(from, to, amount) {
    return Object.fromEntries(Object.keys(rest).map(key => [key, from[key] + (to[key] - from[key]) * amount]));
  }

  function start(color, from, position, distance) {
    const config = settings.actions[color];
    return {
      from: { ...from, roll: from.roll - nearestTurn(from.roll) },
      position, distance, config,
      target: { ...rest, x: rest.x + (config.xOffset ?? 0),
        fromBottom: layout.lanes[config.lane ?? 'center'],
        lift: config.lift ?? rest.lift, heightScale: config.heightScale ?? rest.heightScale, stride: 0 }
    };
  }

  function playerPose(action, position, distance, approach, clear) {
    const { from, config } = action;
    if (action.returning) {
      const { at, pose } = action.returning;
      const amount = ease(phase(position - at, config.returnBeats));
      return amount === 1 ? rest : blend(pose, { ...rest, roll: nearestTurn(pose.roll) }, amount);
    }
    const timeProgress = phase(position - action.position, config.enterBeats);
    // Reach the pose by the obstacle's leading edge when the gap is short.
    const distanceProgress = !clear && action.approach > 0 ? 1 - approach / action.approach : 0;
    action.entry = clamp(Math.max(action.entry ?? 0, timeProgress, distanceProgress));
    const target = { ...action.target };
    if (config.turnsPerBeat) {
      target.roll = (distance - action.distance) / layout.beatSpacing * config.turnsPerBeat * turn;
    }
    if (action.entry < 1) return blend(from, target, ease(action.entry));
    action.heldAt ??= position;
    if (clear && position >= action.heldAt + config.holdBeats) {
      action.returning = { at: position, pose: target };
    }
    return target;
  }

  function runOffset(distance) {
    const { stepsPerBeat, sway } = settings.stride;
    const steps = distance / layout.beatSpacing * stepsPerBeat;
    return sway * Math.sin(steps * Math.PI);
  }

  function fallPose(from, elapsedSeconds) {
    const { durationSeconds, blinkIntervalSeconds, rotationDegrees, jumpHeight } = settings.fall;
    const t = clamp(phase(elapsedSeconds, durationSeconds));
    const rotation = rotationDegrees * Math.PI / 180;
    return {
      ...from,
      fromBottom: from.fromBottom + (rest.fromBottom - from.fromBottom) * t,
      lift: from.lift * (1 - t) + jumpHeight * 4 * t * (1 - t),
      roll: from.roll + rotation * ease(t),
      heightScale: from.heightScale + (1 - from.heightScale) * t,
      visible: blinkIntervalSeconds <= 0 || Math.floor(elapsedSeconds / blinkIntervalSeconds) % 2 === 0
    };
  }

  return { rest, start, playerPose, runOffset, fallPose };
})();
