const BUTTON_CONFIG = {
  preset: 'arrows-v1',
  presets: {
    'arrows-v1': {
      // Slot order, left to right on each row.
      order: ['left', 'down', 'up', 'right'],
      frameHue: -12, // Hue in degrees, or null for the original gray frames.
      frameBrightness: .67, // Multiplier for all back and front frames.
      frameSaturation: 3.5, // Tint saturation for all frames. Use 0 for grayscale.
      // Hue rotations in degrees from the original red sprites.
      buttonHue: { left: 0, down: 55, up: 225, right: 130 },
      // Saturation multipliers for both the unlit and lit sprites.
      buttonSaturation: { left: 1.2, down: 1.5, up: .7, right: 1 },
      pressDistancePercent: 6, // Relative to the height of the button.
      pressMs: 60,
      minPressMs: 90,
      releaseMs: 110
    },
    'legacy-round-colored': {
      order: ['red', 'yellow', 'blue', 'green']
    }
  }
};
