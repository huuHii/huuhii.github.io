const CRT_SETTINGS = {
  enabled: true,
  // Distances in pixels and speeds are measured at the artwork's 212px height.
  // Positive speeds move down, negative speeds move up.
  scanlineGap: 2.8,
  scanlineThickness: 1.2,
  scanlineOpacity: 0.19,
  scanlineSpeed: 0,
  rollSpeed: 33,
  rollHeight: 0.24, // Fraction of the display height.
  rollOpacity: 0.16,
  edgeShade: 0.12,
  // Maximum displacement near the corners, as fractions of width and height.
  curvatureX: 0.03,
  curvatureY: 0.03,
  // Flat region along each axis, from 0 (center) to 1 (edge).
  curvatureStartX: .1, // Where the top and bottom begin to bend.
  curvatureStartY: 0.4  // Where the left and right begin to bend.
};

const CrtEffect = (() => {
  const display = document.querySelector('.score-screen');
  const filter = display.querySelector('#crt-curvature');
  const field = filter.querySelector('feImage');
  const displacement = filter.querySelector('feDisplacementMap');
  const scanlines = document.createElement('div');
  const glass = document.createElement('div');
  const roll = document.createElement('div');
  scanlines.className = 'crt-overlay crt-scanlines';
  glass.className = 'crt-overlay crt-glass';
  roll.className = 'crt-roll';
  scanlines.setAttribute('aria-hidden', 'true');
  glass.setAttribute('aria-hidden', 'true');
  glass.append(roll);
  display.append(scanlines, glass);

  const settings = { ...CRT_SETTINGS };
  const referenceHeight = 212;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const set = (name, value) => display.style.setProperty(`--crt-${name}`, value);
  const map = document.createElement('canvas');
  map.width = map.height = 128;
  const context = map.getContext('2d');
  let previousCurve = '';

  function updateCurvature({ width: screenWidth, height: screenHeight }) {
    // SVG takes one displacement scale, so encode the per-axis strength in the map.
    const xStrength = screenWidth * clamp(settings.curvatureX, 0, 0.2);
    const yStrength = screenHeight * clamp(settings.curvatureY, 0, 0.2);
    const strength = Math.max(xStrength, yStrength);
    if (!settings.enabled || !strength || !context) {
      set('curvature', 'none');
      return;
    }

    const xWeight = xStrength / strength;
    const yWeight = yStrength / strength;
    const startX = clamp(settings.curvatureStartX, 0, 0.95);
    const startY = clamp(settings.curvatureStartY, 0, 0.95);
    const curve = `${xWeight.toFixed(4)},${yWeight.toFixed(4)},${startX},${startY}`;
    if (curve !== previousCurve) {
      const { width, height } = map;
      const image = context.createImageData(width, height);
      // Measure each edge independently in normalized screen coordinates.
      // Squaring the ramp gives a smooth join to the flat region.
      const edgeRamp = (position, start) => (Math.max(0, Math.abs(position) - start) / (1 - start)) ** 2;
      const columns = Array.from({ length: width }, (_, column) => {
        const x = 2 * (column + 0.5) / width - 1;
        return { x, bendY: edgeRamp(x, startX) };
      });
      for (let row = 0; row < height; row++) {
        const y = 2 * (row + 0.5) / height - 1;
        const bendX = edgeRamp(y, startY);
        for (let column = 0; column < width; column++) {
          const { x, bendY } = columns[column];
          const pixel = 4 * (row * width + column);
          image.data[pixel] = 127.5 * (1 + x * bendX * xWeight);
          image.data[pixel + 1] = 127.5 * (1 + y * bendY * yWeight);
          image.data[pixel + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
      field.setAttribute('href', map.toDataURL());
      previousCurve = curve;
    }
    field.setAttribute('width', screenWidth);
    field.setAttribute('height', screenHeight);
    displacement.setAttribute('scale', 2 * strength);
    set('curvature', 'url(#crt-curvature)');
  }

  function updateRoll(scale) {
    if (glass.hidden || roll.hidden) return;
    const height = glass.getBoundingClientRect().height;
    if (!height) return;
    const band = height * clamp(settings.rollHeight, 0, 1);
    const down = settings.rollSpeed > 0;
    const duration = (height + band) / (Math.abs(settings.rollSpeed) * scale);
    set('roll-height', `${band}px`);
    set('roll-start', `${down ? -band : height}px`);
    set('roll-end', `${down ? height : -band}px`);
    set('roll-duration', `${duration}s`);
    set('roll-delay', `${-duration / 2}s`);
  }

  function updateScanlines(scale) {
    if (scanlines.hidden) return;
    const pitch = Math.max(2, settings.scanlineThickness + Math.max(0, settings.scanlineGap));
    const scaledPitch = pitch * scale;
    const thickness = settings.scanlineThickness * scale;
    const center = `rgb(0 0 0 / ${clamp(settings.scanlineOpacity, 0, 1)})`;
    set('pitch', `${scaledPitch}px`);
    set('scanlines', `repeating-linear-gradient(to bottom, transparent 0, ${center} ${thickness / 2}px, transparent ${thickness}px, transparent ${scaledPitch}px)`);
    scanlines.toggleAttribute('data-moving', settings.scanlineSpeed !== 0);
    if (settings.scanlineSpeed) {
      set('scanline-travel', `${Math.sign(settings.scanlineSpeed) * scaledPitch}px`);
      set('scanline-duration', `${pitch / Math.abs(settings.scanlineSpeed)}s`);
    }
  }

  function updateGeometry(rect) {
    updateCurvature(rect);
    if (rect.height <= 0) return;
    const scale = rect.height / referenceHeight;
    updateScanlines(scale);
    updateRoll(scale);
  }

  function configure(changes = {}) {
    for (const [name, value] of Object.entries(changes)) {
      if (Object.hasOwn(settings, name) && typeof value === typeof settings[name] &&
          (typeof value !== 'number' || Number.isFinite(value))) settings[name] = value;
    }

    scanlines.hidden = !settings.enabled || settings.scanlineThickness <= 0 || settings.scanlineOpacity <= 0;
    roll.hidden = !settings.rollSpeed || settings.rollHeight <= 0 || settings.rollOpacity <= 0;
    glass.hidden = !settings.enabled || (roll.hidden && settings.edgeShade <= 0);
    set('edge-shade', clamp(settings.edgeShade, 0, 1));
    set('roll-opacity', clamp(settings.rollOpacity, 0, 1));
    updateGeometry(display.getBoundingClientRect());
  }

  new ResizeObserver(([entry]) => updateGeometry(entry.contentRect)).observe(display);
  configure();
  return { configure };
})();
