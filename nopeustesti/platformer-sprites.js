const PlatformerSprites = (() => {
  const glow = PLATFORMER_SETTINGS.outlineGlow;
  const maxCachedSizes = 12;
  let pixelRatio = 1;
  let groundGlow;
  let particleGlowKey;
  const particleTextures = new Map();

  function makeLayers(image) {
    const { naturalWidth: width, naturalHeight: height } = image;
    const fill = document.createElement('canvas');
    const highlights = document.createElement('canvas');
    fill.width = highlights.width = width;
    fill.height = highlights.height = height;
    const fillCtx = fill.getContext('2d');
    const highlightCtx = highlights.getContext('2d');
    fillCtx.drawImage(image, 0, 0);
    const fillPixels = fillCtx.getImageData(0, 0, width, height);
    const highlightPixels = highlightCtx.createImageData(width, height);
    const pixels = fillPixels.data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 230) continue;
      highlightPixels.data[i + 3] = pixels[i + 3];
      pixels[i + 3] = 0;
    }
    fillCtx.putImageData(fillPixels, 0, 0);
    highlightCtx.putImageData(highlightPixels, 0, 0);
    highlightCtx.globalCompositeOperation = 'source-in';
    highlightCtx.fillStyle = GAME_THEME.ledColor;
    highlightCtx.fillRect(0, 0, width, height);
    return { fill, highlights };
  }

  function load(file, onReady) {
    const image = new Image();
    const sprite = { image, layers: null, glow: new Map() };
    sprite.ready = new Promise(resolve => {
      image.addEventListener('error', resolve, { once: true });
      image.addEventListener('load', () => {
        try { sprite.layers = makeLayers(image); } catch {
          // Fall back to the original image if pixel access is restricted.
        }
        onReady();
        resolve();
      }, { once: true });
      image.src = `assets/proto-assets/${file}`;
    });
    return sprite;
  }

  function drawLit(ctx, paint, radii = glow.blur) {
    if (glow.opacity > 0 && glow.blur.length) {
      ctx.save();
      const { a, b, c, d, e, f } = ctx.getTransform();
      const offset = 2 * (ctx.canvas.width + ctx.canvas.height);
      // Move the sharp shape off canvas and offset its shadow back onto the scene.
      ctx.setTransform(a, b, c, d, e - offset, f);
      ctx.shadowOffsetX = offset;
      ctx.shadowColor = GAME_THEME.ledGlowColor;
      ctx.globalAlpha *= glow.opacity;
      for (const blur of radii) {
        ctx.shadowBlur = blur * pixelRatio;
        paint();
      }
      ctx.restore();
    }
    paint();
  }

  function prepareGroundGlow(pixel) {
    if (glow.opacity <= 0 || !glow.blur.length) return;
    const rows = Math.max(1, Math.round(pixel * pixelRatio));
    const key = [pixelRatio, rows, glow.opacity, GAME_THEME.ledGlowColor, ...glow.blur].join('/');
    if (groundGlow?.key !== key) {
      const pad = Math.ceil(Math.max(...glow.blur) * pixelRatio * 2);
      const texture = document.createElement('canvas');
      texture.width = pad * 2 + 1;
      texture.height = pad * 2 + rows;
      const brush = texture.getContext('2d');
      drawLit(brush, () => brush.fillRect(0, pad, texture.width, rows));
      // The sharp line is painted separately so the bumps can interrupt it.
      brush.clearRect(0, pad, texture.width, rows);
      groundGlow = { key, texture, pad };
    }
    return groundGlow;
  }

  function drawGroundGlow(ctx, width, y, pixel) {
    const prepared = prepareGroundGlow(pixel);
    if (!prepared) return;
    const { texture, pad } = prepared;
    const rows = texture.height - pad * 2;
    const padding = pad * pixel / rows;
    ctx.drawImage(texture, pad, 0, 1, texture.height, 0, y - padding, width, pixel + padding * 2);
  }

  function prepareParticle(columns, rows) {
    const blur = glow.blur[0];
    const key = [pixelRatio, rows, blur, glow.opacity, GAME_THEME.ledColor, GAME_THEME.ledGlowColor].join('/');
    if (particleGlowKey !== key) {
      particleTextures.clear();
      particleGlowKey = key;
    }
    if (particleTextures.has(columns)) return particleTextures.get(columns);
    const pad = glow.opacity > 0 && glow.blur.length ? Math.ceil(blur * pixelRatio * 2) : 0;
    const texture = document.createElement('canvas');
    texture.width = columns + pad * 2;
    texture.height = rows + pad * 2;
    const brush = texture.getContext('2d');
    brush.fillStyle = GAME_THEME.ledColor;
    drawLit(brush, () => brush.fillRect(pad, pad, columns, rows), glow.blur.slice(0, 1));
    const stamp = { texture, pad };
    particleTextures.set(columns, stamp);
    return stamp;
  }

  function cachedGlow(sprite, width, height) {
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    const key = [pixelRatio, w, h, glow.opacity, GAME_THEME.ledGlowColor, ...glow.blur].join('/');
    let result = sprite.glow.get(key);
    if (result) {
      sprite.glow.delete(key);
      sprite.glow.set(key, result);
      return result;
    }
    const padding = Math.ceil(Math.max(...glow.blur) * pixelRatio * 2);
    const texture = document.createElement('canvas');
    texture.width = w + padding * 2;
    texture.height = h + padding * 2;
    const ctx = texture.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawLit(ctx, () => ctx.drawImage(sprite.layers.highlights, padding, padding, w, h), glow.blur);
    result = { texture, u: padding / w, v: padding / h };
    sprite.glow.set(key, result);
    if (sprite.glow.size > maxCachedSizes) sprite.glow.delete(sprite.glow.keys().next().value);
    return result;
  }

  function draw(ctx, sprite, x, y, width, height) {
    if (!sprite.image.naturalWidth) return;
    if (!sprite.layers) {
      ctx.drawImage(sprite.image, x, y, width, height);
      return;
    }
    const { fill, highlights } = sprite.layers;
    ctx.drawImage(fill, x, y, width, height);
    if (glow.opacity > 0 && glow.blur.length) {
      const { texture, u, v } = cachedGlow(sprite, width, height);
      const padX = width * u;
      const padY = height * v;
      ctx.drawImage(texture, x - padX, y - padY, width + padX * 2, height + padY * 2);
    } else ctx.drawImage(highlights, x, y, width, height);
  }

  function prepare(sprite, width, height) {
    if (sprite.layers && glow.opacity > 0 && glow.blur.length) cachedGlow(sprite, width, height);
  }

  return { load, draw, drawLit, prepare, prepareGroundGlow, drawGroundGlow, prepareParticle,
    setPixelRatio(ratio) { pixelRatio = ratio; } };
})();
