/* World coordinates are measured in display heights. Every ground sprite shares one scroll distance. */
const Platformer = (() => {
  const canvas = document.querySelector('.platformer-scene');
  const context = canvas.getContext('2d');
  const layout = PLATFORMER_LAYOUT;
  const settings = PLATFORMER_SETTINGS;
  const playerSettings = PLAYER_ANIMATION_SETTINGS;
  const obstacleSettings = OBSTACLE_SETTINGS;
  const idleBeatMs = 60000 / GameRules.bpmAt(0);
  const centerDepth = layout.lanes.center;
  const runnerSprites = new Map();
  const seed = Math.floor(Math.random() * 2 ** 32);
  function runnerSprite(runner) {
    if (!runnerSprites.has(runner.sprite)) runnerSprites.set(runner.sprite, PlatformerSprites.load(runner.sprite, invalidate));
    return runnerSprites.get(runner.sprite);
  }
  const obstacleTypes = Object.fromEntries(Object.entries(obstacleSettings.types).map(([name, type]) =>
    [name, { ...type, sprite: PlatformerSprites.load(type.file, invalidate) }]
  ));
  const makeTrack = (config, gap, size, salt, makeItem) => ({
    config, salt, makeItem, items: [],
    spacing: (gap[0] + gap[1]) / 2 + size,
    sprites: config.files?.map(file => PlatformerSprites.load(file, invalidate)) ?? []
  });
  const cloudsConfig = BACKGROUND_ANIMATIONS.clouds;
  // A small set of sizes lets every cloud glow fit in the sprite cache.
  const cloudSizes = Array.from({ length: 8 }, (_, index) =>
    cloudsConfig.size[0] + (cloudsConfig.size[1] - cloudsConfig.size[0]) * index / 7);
  const bumps = makeTrack(settings.bumps, settings.bumps.gap, .12, 1, () => ({}));
  const clouds = makeTrack(cloudsConfig, cloudsConfig.spawnGap, .18, 2, random => ({
    size: cloudSizes[Math.floor(random() * cloudSizes.length)],
    fromBottom: randomBetween(cloudsConfig.fromBottom, random)
  }));
  const particles = makeTrack(GROUND_PARTICLES, GROUND_PARTICLES.spawnGap, .025, 3, random =>
    random() < GROUND_PARTICLES.spawnChance ? {
      fraction: randomBetween(GROUND_PARTICLES.fromBottom, random),
      size: randomBetween(GROUND_PARTICLES.length, random)
    } : null);
  const obstacles = [];
  const actions = [];
  let width = 0, height = 0, frame = null;
  let run = null;
  let action = null;
  let updatedAt = performance.now();
  let groundDistance = 0;
  let cloudDistance = 0;
  let beatOrigin = 0;
  let cameraNudge = 0;
  let menuPlayer, runnerView, entranceAt, previewPlayer, previewSwap;
  let practiceTempo = 0;
  const menuSprites = new Set([
    ...CHARACTERS_MENU.options.map(runnerSprite), ...bumps.sprites, ...clouds.sprites
  ]);
  let warmSize;
  let menuSpritesLoaded = false;
  const ready = Promise.all([...menuSprites].map(sprite => sprite.ready)).then(() => {
    menuSpritesLoaded = true;
    resize();
  });

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    ({ width, height } = bounds);
    if (!width || !height || !context) return;
    const ratio = Math.min(settings.maxPixelRatio, window.devicePixelRatio || 1);
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    context.imageSmoothingEnabled = false;
    PlatformerSprites.setPixelRatio(ratio);
    const size = [width, height, ratio].join('/');
    if (menuSpritesLoaded && warmSize !== size) {
      prepareMenuGlows();
      warmSize = size;
    }
    invalidate();
  }
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);

  function cuePosition(now) {
    return run.beats + Math.min(1, Math.max(0, (now - run.startedAt) / run.beatMs));
  }
  function actionBeat(cueBeat) {
    return cueBeat + 1;
  }
  function earlyPressStrength(cueBeat, position) {
    const { fullAtBeatsEarly, neutralAtBeatsEarly } = settings.earlyPressNudge;
    const lead = actionBeat(cueBeat) - position;
    return Math.min(1, Math.max(0, (lead - neutralAtBeatsEarly) /
      Math.max(0.001, fullAtBeatsEarly - neutralAtBeatsEarly)));
  }
  function runnerDistance() {
    return run ? beatOrigin + run.position * layout.beatSpacing : groundDistance;
  }
  function advanceWorld(now) {
    if (now <= updatedAt) return;
    const elapsed = (now - updatedAt) / 1000;
    const nudge = settings.earlyPressNudge;
    let targetNudge = 0;
    if (run) {
      const { smoothingSeconds, maxCatchUpSpeed } = settings.playhead;
      const blend = smoothingSeconds > 0 ? -Math.expm1(-elapsed / smoothingSeconds) : 1;
      // Track the cue clock at normal pace and ease only the extra travel after a wait.
      const cue = cuePosition(now);
      const target = Math.min(cue, actionBeat(run.confirmedCue + 1));
      const cueTravel = cue - run.cue;
      const remaining = Math.max(0, target - run.position);
      const maxTravel = elapsed * 1000 / run.beatMs * maxCatchUpSpeed;
      run.position += Math.min(remaining, maxTravel, cueTravel + Math.max(0, remaining - cueTravel) * blend);
      run.cue = cue;
      groundDistance = beatOrigin + cue * layout.beatSpacing;
      // Keep the last press's shift across cues, then taper it as the next response gets later.
      const strength = run.confirmedCue === run.beats ? run.earlyPress :
        Math.min(run.earlyPress, earlyPressStrength(run.beats, cue));
      targetNudge = nudge.maxRight * strength;
    } else if (!MenuCamera.reducedMotion) {
      const { x, y } = MenuCamera.position;
      if (practiceTempo) {
        groundDistance += Math.min(elapsed, 0.05) * practiceTempo / 60 * layout.beatSpacing;
      } else {
        const proximity = y === 0 ? Math.max(0, Math.min(1, x / MENU_TRANSITIONS.positions.characters.x)) : 0;
        groundDistance += Math.min(elapsed, 0.05) * CHARACTERS_MENU.groundSpeed * proximity;
      }
    }
    if (!MenuCamera.reducedMotion || run) {
      // Clouds keep drifting even when the player and ground are at rest.
      cloudDistance += Math.min(elapsed, 0.05) * 1000 / (run?.beatMs ?? idleBeatMs) *
        layout.beatSpacing * clouds.config.speed;
    }
    const nudgeBlend = nudge.smoothingSeconds > 0 ? -Math.expm1(-elapsed / nudge.smoothingSeconds) : 1;
    cameraNudge += (targetNudge - cameraNudge) * nudgeBlend;
    updatedAt = now;
  }
  function scaleAt(fromBottom) {
    return 1 + layout.perspectiveSpread * (1 - fromBottom / layout['ground-line']);
  }
  function projectX(worldX, fromBottom) {
    return width / 2 + worldX * height * scaleAt(fromBottom);
  }
  function projectY(fromBottom) {
    return height * (1 - fromBottom);
  }
  function runnerX(x) {
    return (x - 0.5) * width / height;
  }
  function beatLineX(beat) {
    const restX = (layout.player.x - 0.5) * width / height / scaleAt(centerDepth);
    return beatOrigin + restX + beat * layout.beatSpacing;
  }
  function obstacleX(obstacle) {
    // The action starts at the leading line; the obstacle sits at the cell's center.
    return beatLineX(obstacle.beat + 0.5);
  }
  function spriteWidth(sprite, size) {
    return size * sprite.image.naturalWidth / sprite.image.naturalHeight;
  }
  function groundPixel(py) {
    return Math.max(1, Math.round(settings.groundLineWidth / py)) * py;
  }
  function bumpWidth(sprite, pixel, px) {
    return Math.round(sprite.image.naturalWidth * pixel / px) * px;
  }
  function prepareMenuGlows() {
    const px = width / canvas.width;
    const py = height / canvas.height;
    const pixel = groundPixel(py);
    const runnerSize = layout.player.size * height;
    for (const sprite of runnerSprites.values()) {
      PlatformerSprites.prepare(sprite, spriteWidth(sprite, runnerSize), runnerSize);
    }
    for (const sprite of clouds.sprites) {
      for (const fraction of cloudSizes) {
        const size = fraction * height;
        PlatformerSprites.prepare(sprite, spriteWidth(sprite, size), size);
      }
    }
    for (const sprite of bumps.sprites) {
      PlatformerSprites.prepare(sprite, bumpWidth(sprite, pixel, px), sprite.image.naturalHeight * pixel);
    }
    PlatformerSprites.prepareGroundGlow(pixel);
    const { length, opacity, spawnChance, thickness } = GROUND_PARTICLES;
    if (opacity > 0 && spawnChance > 0) {
      const rows = Math.max(1, Math.round(thickness / py));
      for (let columns = Math.max(1, Math.round(length[0] / px)); columns <= Math.round(length[1] / px); columns++) {
        PlatformerSprites.prepareParticle(columns, rows);
      }
    }
  }
  function randomBetween([min, max], random) {
    return min + (max - min) * random();
  }
  function updateTrack(track, left, right) {
    const { config, items, sprites, spacing, salt } = track;
    const first = Math.floor(left / spacing) - 1;
    const last = Math.ceil(right / spacing) + 1;
    if (first === track.first && last === track.last) return;
    track.first = first;
    track.last = last;
    items.length = 0;
    // A world slot has the same contents each time it becomes visible.
    for (let i = first; i <= last; i++) {
      let state = seed ^ Math.imul(i, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b);
      const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) | 0;
        const mixed = Math.imul(state ^ (state >>> 16), 0x21f0aaad);
        return ((mixed ^ (mixed >>> 15)) >>> 0) / 2 ** 32;
      };
      const x = (i + random() * .7) * spacing;
      const item = track.makeItem(random);
      if (item) items.push({ ...item, x, sprite: sprites[Math.floor(random() * sprites.length)],
        mirror: random() < config.mirrorChance });
    }
  }
  function drawScenery(item, x, y, w, h) {
    if (x + w < -16 || x > width + 16) return;
    if (item.mirror) {
      context.save();
      context.translate(x + w, y);
      context.scale(-1, 1);
      PlatformerSprites.draw(context, item.sprite, 0, 0, w, h);
      context.restore();
    } else {
      PlatformerSprites.draw(context, item.sprite, x, y, w, h);
    }
  }
  function drawClouds(camera) {
    const config = clouds.config;
    const parallax = MENU_TRANSITIONS.skyParallax * width / height;
    const travel = cloudDistance + camera.x * parallax;
    const cloudWidth = item => spriteWidth(item.sprite, item.size * height);
    const halfSpan = width / (2 * height);
    updateTrack(clouds, travel - halfSpan - .5, travel + halfSpan);
    context.globalAlpha = config.opacity;
    for (let band = Math.floor(camera.y); band <= Math.min(0, Math.ceil(camera.y)); band++) {
      for (const cloud of clouds.items) {
        if (!cloud.sprite?.image.naturalWidth) continue;
        const size = cloud.size * height;
        // Stagger the cloud decks so each level of sky has a different silhouette.
        const fromBottom = band % 2 ? config.fromBottom[1] + config.fromBottom[0] - cloud.fromBottom : cloud.fromBottom;
        drawScenery(cloud, projectX(cloud.x - travel, layout['ground-line']),
          projectY(fromBottom) + band * height - size, cloudWidth(cloud), size);
      }
    }
    context.globalAlpha = 1;
  }
  function drawGroundParticles(distance) {
    const { spawnChance, length, thickness, opacity } = GROUND_PARTICLES;
    if (opacity <= 0 || spawnChance <= 0) return;

    const horizon = layout['ground-line'];
    const px = width / canvas.width;
    const py = height / canvas.height;
    const top = Math.ceil(projectY(horizon) / py);
    const rows = Math.min(canvas.height - top, Math.max(1, Math.round(thickness / py)));
    if (rows <= 0) return;

    const worldPixel = 1 / (height * Math.min(scaleAt(0), scaleAt(horizon)));
    const halfSpan = width / 2 * worldPixel;
    updateTrack(particles, distance - halfSpan - (length[1] + px) * worldPixel, distance + halfSpan);

    const bottom = canvas.height - rows;
    context.globalAlpha = opacity;
    for (const { x, fraction, size } of particles.items) {
      const column = Math.round(projectX(x - distance, fraction * horizon) / px);
      if (column * px < -length[1] || column * px > width) continue;
      const row = Math.round(bottom - fraction * (bottom - top));
      const { texture, pad } = PlatformerSprites.prepareParticle(Math.max(1, Math.round(size / px)), rows);
      context.drawImage(texture, (column - pad) * px, (row - pad) * py, texture.width * px, texture.height * py);
    }
    context.globalAlpha = 1;
  }
  function drawGround(distance, beatDistance) {
    const horizon = layout['ground-line'];
    const horizonY = projectY(horizon);
    if (settings.showBeatLines) {
      const halfSpan = width / (2 * height);
      const firstBeat = Math.ceil((beatDistance - halfSpan - beatLineX(0)) / layout.beatSpacing);
      context.lineWidth = settings.beatLineWidth;
      context.strokeStyle = GAME_THEME.ledColor;
      context.globalAlpha = settings.beatLineOpacity;
      const lines = new Path2D();
      for (let beat = firstBeat; ; beat++) {
        const worldX = beatLineX(beat) - beatDistance;
        if (worldX > halfSpan) break;
        lines.moveTo(projectX(worldX, horizon), horizonY);
        lines.lineTo(projectX(worldX, 0), height);
      }
      PlatformerSprites.drawLit(context, () => context.stroke(lines));
    }

    // Align the line and the bottom row of each bump to the same backing pixels.
    const px = width / canvas.width;
    const py = height / canvas.height;
    const pixel = groundPixel(py);
    const y = Math.round((horizonY - pixel / 2) / py) * py;
    const halfSpan = width / (2 * height);
    updateTrack(bumps, distance - halfSpan - .5, distance + halfSpan);
    context.fillStyle = GAME_THEME.ledColor;
    context.globalAlpha = settings.groundLineOpacity;
    PlatformerSprites.drawGroundGlow(context, width, y, pixel);
    const groundLine = new Path2D();
    let cursor = 0;
    for (const bump of bumps.items) {
      if (!bump.sprite?.image.naturalWidth) continue;
      const x = Math.round(projectX(bump.x - distance, horizon) / px) * px;
      const w = bumpWidth(bump.sprite, pixel, px);
      if (x >= width) break;
      if (x + w <= 0) continue;
      if (x > cursor) groundLine.rect(cursor, y, x - cursor, pixel);
      const h = bump.sprite.image.naturalHeight * pixel;
      drawScenery(bump, x, y + pixel - h, w, h);
      cursor = Math.max(cursor, x + w);
    }
    if (cursor < width) groundLine.rect(cursor, y, width - cursor, pixel);
    context.fill(groundLine);
    context.globalAlpha = 1;
  }
  function obstacleSize({ type, depth }) {
    return type.hangFromBottom === undefined ? type.size * scaleAt(depth) / scaleAt(centerDepth) : type.size;
  }
  function drawObstacle(obstacle, viewDistance) {
    const { type, depth } = obstacle;
    if (!type.sprite.image.naturalWidth) return;
    const hanging = type.hangFromBottom !== undefined;
    const size = obstacleSize(obstacle) * height;
    const w = spriteWidth(type.sprite, size);
    const x = projectX(obstacleX(obstacle) - viewDistance, depth);
    if (x < -size || x > width + size) return;
    if (hanging) {
      const swingTravel = type.swingSeconds * 1000 / idleBeatMs * layout.beatSpacing;
      const swing = swingTravel > 0 ?
        Math.sin(groundDistance / swingTravel * 2 * Math.PI) * type.swingDegrees * Math.PI / 180 : 0;
      context.save();
      context.translate(x, projectY(type.hangFromBottom) - size);
      context.rotate(swing);
      PlatformerSprites.draw(context, type.sprite, -w / 2, 0, w, size);
      context.restore();
    } else {
      PlatformerSprites.draw(context, type.sprite, x - w / 2, projectY(depth) - size, w, size);
    }
  }
  function drawPlayer(pose, player, x) {
    if (!player?.image.naturalWidth) return;
    const size = layout.player.size * height * (scaleAt(pose.fromBottom) / scaleAt(centerDepth));
    const w = spriteWidth(player, size);
    if (x + w < 0 || x - w > width) return;
    const y = projectY(pose.fromBottom + layout.player.fromBottom + pose.lift);
    if (!pose.roll) {
      const h = size * pose.heightScale;
      PlatformerSprites.draw(context, player, x - w / 2, y - h, w, h);
      return;
    }
    // Squash after rotating, and keep the rotated sprite's lower edge at lane height.
    const radiusY = (Math.abs(Math.sin(pose.roll)) * w + Math.abs(Math.cos(pose.roll)) * size) / 2;
    context.save();
    context.translate(x, y - radiusY * pose.heightScale);
    context.scale(1, pose.heightScale);
    context.rotate(pose.roll);
    PlatformerSprites.draw(context, player, -w / 2, -size / 2, w, size);
    context.restore();
  }
  function drawMenuRunners(now, cameraX) {
    const { rest } = PlayerAnimations;
    if (menuPlayer) {
      const config = MENU_TRANSITIONS.homeEntrance;
      const t = entranceAt === undefined ? 1 : Math.max(0, Math.min(1, (now - entranceAt) / config.durationMs));
      const progress = 1 - (1 - t) ** 2;
      const anchor = MENU_TRANSITIONS.positions[runnerView].x;
      const stride = runnerView === 'practice' && practiceTempo && !MenuCamera.reducedMotion ?
        PlayerAnimations.runOffset(groundDistance) * height * t : 0;
      const x = (anchor + config.startX + (rest.x - config.startX) * progress - cameraX) * width + stride;
      const lift = Math.abs(Math.sin(Math.PI * config.strideCycles * t)) * config.bounce * (1 - t);
      drawPlayer({ ...rest, lift }, menuPlayer, x);
      if (t === 1) entranceAt = undefined;
    }
    if (!previewPlayer) return;
    const config = CHARACTERS_MENU;
    const anchor = config.previewX + MENU_TRANSITIONS.positions.characters.x;
    const stride = Math.PI * groundDistance * config.stridesPerHeight;
    const x = (anchor - cameraX) * width + Math.sin(stride) * height * playerSettings.stride.sway;
    const lift = MenuCamera.reducedMotion ? 0 : Math.abs(Math.sin(stride)) * config.strideBounce;
    if (previewSwap) {
      const t = Math.max(0, Math.min(1, (now - previewSwap.at) / config.swapMs));
      const travel = config.swapTravel * previewSwap.step;
      context.globalAlpha = 1 - t;
      drawPlayer({ ...rest, lift: lift + t * travel }, previewSwap.player, x);
      context.globalAlpha = t;
      drawPlayer({ ...rest, lift: lift - (1 - t) * travel }, previewPlayer, x);
      context.globalAlpha = 1;
      if (t === 1) previewSwap = undefined;
    } else {
      drawPlayer({ ...rest, lift }, previewPlayer, x);
    }
  }
  function obstacleRange(action, distance) {
    if (!action.obstacle) return { approach: 0, clear: true };
    const { type, depth } = action.obstacle;
    const size = obstacleSize(action.obstacle);
    const obstacleRadius = type.sprite.image.naturalWidth ? spriteWidth(type.sprite, size) / 2 : size / 2;
    // Include the spikeball's full sweep so it cannot swing back into a returning player.
    const swing = type.swingSeconds > 0 ? size * Math.sin(Math.abs(type.swingDegrees) * Math.PI / 180) : 0;
    const playerSize = layout.player.size * scaleAt(layout.lanes.right) / scaleAt(centerDepth);
    const playerWidth = menuPlayer?.image.naturalWidth ? spriteWidth(menuPlayer, playerSize) : playerSize;
    const rotating = action.config.turnsPerBeat || action.from.roll !== 0;
    const playerRadius = (rotating ? Math.hypot(playerWidth, playerSize) : playerWidth) / 2;
    const padding = playerRadius + playerSettings.stride.sway + playerSettings.clearance;
    const center = (obstacleX(action.obstacle) - distance) * scaleAt(depth);
    const left = runnerX(Math.min(action.from.x, action.target.x, layout.player.x)) - padding;
    const right = runnerX(Math.max(action.from.x, action.target.x, layout.player.x)) + padding;
    return {
      approach: center - obstacleRadius - swing - right,
      clear: center + obstacleRadius + swing <= left
    };
  }
  function poseAt(position, distance) {
    const { rest, playerPose } = PlayerAnimations;
    if (!action) return rest;
    const { approach, clear } = obstacleRange(action, distance);
    action.cleared ||= clear;
    const pose = playerPose(action, position, distance, approach, action.cleared);
    if (pose === rest) action = null;
    return pose;
  }
  function updatePlayer() {
    const { rest, start } = PlayerAnimations;
    if (!run) return rest;
    while (actions.length && actions[0].beat <= run.position) {
      const { color, beat, obstacle } = actions.shift();
      // Sample the pose at the crossing, even when a frame lands past the line.
      const distance = beatOrigin + beat * layout.beatSpacing;
      action = start(color, poseAt(beat, distance), beat, distance);
      action.obstacle = obstacle;
      action.approach = obstacleRange(action, distance).approach;
    }
    return poseAt(run.position, runnerDistance());
  }
  function invalidate() {
    if ((context || MenuCamera.moving) && frame === null && !canvas.hidden && !document.hidden) {
      frame = requestAnimationFrame(render);
    }
  }
  function render(now) {
    frame = null;
    MenuCamera.update(now);
    if (context && width && height) {
      advanceWorld(now);
      context.clearRect(0, 0, width, height);
      const camera = MenuCamera.position;
      const cameraScale = width / (height * scaleAt(centerDepth));
      const gameDistance = groundDistance - cameraNudge * cameraScale;
      const distance = gameDistance + camera.x * cameraScale;
      context.save();
      context.translate(0, -camera.y * height);
      drawClouds(camera);
      if (camera.y > -layout['ground-line'] && camera.y < 1) {
        drawGroundParticles(distance);
        drawGround(distance, run ? gameDistance : distance);
        if (run) {
          const pose = updatePlayer();
          const runner = runnerDistance();
          const left = gameDistance - width / (2 * height);
          // An obstacle can leave the camera before the runner reaches it.
          const discardBefore = Math.min(left, runner - layout.beatSpacing);
          while (obstacles.length && obstacleX(obstacles[0]) + obstacleSize(obstacles[0]) < discardBefore) obstacles.shift();
          for (const obstacle of obstacles) {
            if (obstacle.depth >= pose.fromBottom) drawObstacle(obstacle, gameDistance);
          }
          const scroll = (runner - gameDistance) * height * scaleAt(centerDepth);
          const stride = PlayerAnimations.runOffset(runner - beatOrigin) * height * pose.stride;
          drawPlayer(pose, menuPlayer, pose.x * width + scroll + stride);
          for (const obstacle of obstacles) {
            if (obstacle.depth < pose.fromBottom) drawObstacle(obstacle, gameDistance);
          }
        } else {
          drawMenuRunners(now, camera.x);
        }
      }
      context.restore();
    }
    if (run || MenuCamera.moving || (!MenuCamera.reducedMotion && MenuCamera.position.y < 1)) invalidate();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = null;
    } else invalidate();
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', invalidate);
  return {
    invalidate,
    ready,
    enterRunner(runner, view) {
      menuPlayer = runnerSprite(runner);
      runnerView = view;
      const config = MENU_TRANSITIONS.homeEntrance;
      entranceAt = config.enabled && config.durationMs > 0 && !MenuCamera.reducedMotion ? performance.now() + config.delayMs : undefined;
      invalidate();
    },
    hideRunner() { menuPlayer = undefined; invalidate(); },
    setPracticeTempo(bpm) {
      advanceWorld(performance.now());
      practiceTempo = bpm;
      invalidate();
    },
    previewRunner(runner, { previous, step } = {}) {
      previewPlayer = runnerSprite(runner);
      previewSwap = previous && CHARACTERS_MENU.swapMs > 0 && !MenuCamera.reducedMotion ?
        { player: runnerSprite(previous), step, at: performance.now() } : undefined;
      invalidate();
    },
    hidePreview() { previewPlayer = previewSwap = undefined; },
    setVisible(visible) {
      if (visible === !canvas.hidden) return;
      canvas.hidden = !visible;
      if (visible) {
        if (!run) updatedAt = performance.now();
        resize();
      } else {
        cancelAnimationFrame(frame);
        frame = null;
      }
    },
    startRun(startedAt, nextBeat) {
      advanceWorld(startedAt);
      entranceAt = undefined;
      practiceTempo = 0;
      beatOrigin = groundDistance;
      cameraNudge = 0;
      run = { beats: 0, startedAt, beatMs: nextBeat - startedAt, cue: 0, position: 0, confirmedCue: 0, earlyPress: 0 };
      invalidate();
    },
    planBeat(beat, color) {
      if (!run) return;
      const { everyBeats, cues } = obstacleSettings;
      if (!everyBeats || (beat - 1) % everyBeats) return;
      const cue = cues[color];
      if (!cue) return;
      obstacles.push({ beat: actionBeat(beat), depth: layout.lanes[cue.lane], type: obstacleTypes[cue.type] });
    },
    beat(scheduledAt, nextBeat) {
      if (!run) return;
      run.beats++;
      run.startedAt = scheduledAt;
      run.beatMs = nextBeat - scheduledAt;
      advanceWorld(performance.now());
    },
    endRun() {
      if (!run) return;
      advanceWorld(performance.now());
      run = null;
      cameraNudge = 0;
      action = null;
      actions.length = 0;
      obstacles.length = 0;
      invalidate();
    },
    act(color, cueBeat) {
      if (!run) return;
      const now = performance.now();
      advanceWorld(now);
      const beat = actionBeat(cueBeat);
      actions.push({ color, beat, obstacle: obstacles.find(obstacle => obstacle.beat === beat) });
      run.confirmedCue = cueBeat;
      run.earlyPress = earlyPressStrength(cueBeat, run.cue);
    }
  };
})();
