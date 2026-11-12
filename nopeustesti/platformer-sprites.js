const PlatformerSprites = (() => {
  const glow = PLATFORMER_SETTINGS.outlineGlow;

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

  function load(file) {
    const image = new Image();
    const sprite = { image, layers: null };
    image.addEventListener('load', () => {
      try { sprite.layers = makeLayers(image); } catch {
        // Pixel access can be restricted when an asset is served from a different origin.
      }
    }, { once: true });
    image.src = `assets/proto-assets/${file}`;
    return sprite;
  }

  function drawLit(ctx, paint) {
    if (glow.opacity > 0 && glow.blur.length) {
      ctx.save();
      const { a, b, c, d, e, f } = ctx.getTransform();
      const offset = 2 * (ctx.canvas.width + ctx.canvas.height);
      // Move the sharp shape off canvas and offset its shadow back onto the scene.
      ctx.setTransform(a, b, c, d, e - offset, f);
      ctx.shadowOffsetX = offset;
      ctx.shadowColor = GAME_THEME.ledGlowColor;
      ctx.globalAlpha *= glow.opacity;
      for (const blur of glow.blur) {
        ctx.shadowBlur = blur * (window.devicePixelRatio || 1);
        paint();
      }
      ctx.restore();
    }
    paint();
  }

  function draw(ctx, sprite, x, y, width, height) {
    if (!sprite.image.naturalWidth) return;
    if (!sprite.layers) {
      ctx.drawImage(sprite.image, x, y, width, height);
      return;
    }
    const { fill, highlights } = sprite.layers;
    ctx.drawImage(fill, x, y, width, height);
    drawLit(ctx, () => ctx.drawImage(highlights, x, y, width, height));
  }

  return { load, draw, drawLit };
})();
