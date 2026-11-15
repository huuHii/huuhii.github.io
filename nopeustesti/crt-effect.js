const CRT_SETTINGS = {
  enabled: true,
  // CSS pixels. Positive speeds move down, negative speeds move up.
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
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const set = (name, value) => display.style.setProperty(`--crt-${name}`, value);
  const map = document.createElement('canvas');
  map.width = map.height = 128;
  const context = map.getContext('2d');
  let previousCurve = '';

  function updateCurvature({ width: screenWidth, height: screenHeight }) {
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

  function updateRoll(height) {
    if (glass.hidden || roll.hidden) return;
    if (!height) return;
    const band = height * clamp(settings.rollHeight, 0, 1);
    const down = settings.rollSpeed > 0;
    const duration = (height + band) / Math.abs(settings.rollSpeed);
    set('roll-height', `${band}px`);
    set('roll-start', `${down ? -band : height}px`);
    set('roll-end', `${down ? height : -band}px`);
    set('roll-duration', `${duration}s`);
    set('roll-delay', `${-duration / 2}s`);
  }

  function updateGeometry() {
    updateRoll(glass.getBoundingClientRect().height);
    updateCurvature(display.getBoundingClientRect());
  }

  function configure(changes = {}) {
    for (const [name, value] of Object.entries(changes)) {
      if (Object.hasOwn(settings, name) && typeof value === typeof settings[name] &&
          (typeof value !== 'number' || Number.isFinite(value))) settings[name] = value;
    }

    const thickness = Math.max(0, settings.scanlineThickness);
    const gap = Math.max(0, settings.scanlineGap);
    const pitch = Math.max(2, thickness + gap);
    const opacity = clamp(settings.scanlineOpacity, 0, 1);
    scanlines.hidden = !settings.enabled || !thickness || !opacity;
    if (!scanlines.hidden) {
      const center = `rgb(0 0 0 / ${opacity})`;
      set('pitch', `${pitch}px`);
      set('scanlines', `repeating-linear-gradient(to bottom, transparent 0, ${center} ${thickness / 2}px, transparent ${thickness}px, transparent ${pitch}px)`);
      scanlines.toggleAttribute('data-moving', settings.scanlineSpeed !== 0);
      if (settings.scanlineSpeed) {
        set('scanline-travel', `${Math.sign(settings.scanlineSpeed) * pitch}px`);
        set('scanline-duration', `${pitch / Math.abs(settings.scanlineSpeed)}s`);
      }
    }

    roll.hidden = !settings.rollSpeed || settings.rollHeight <= 0 || settings.rollOpacity <= 0;
    glass.hidden = !settings.enabled || (roll.hidden && settings.edgeShade <= 0);
    set('edge-shade', clamp(settings.edgeShade, 0, 1));
    set('roll-opacity', clamp(settings.rollOpacity, 0, 1));
    updateGeometry();
  }

  new ResizeObserver(([entry]) => updateCurvature(entry.contentRect)).observe(display);
  new ResizeObserver(([entry]) => updateRoll(entry.contentRect.height)).observe(glass);
  configure();
  return { configure };
})();
