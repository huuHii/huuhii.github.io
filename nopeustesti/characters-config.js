const CHARACTERS_MENU = {
  title: 'CHOOSE A RUNNER',
  caption: 'THE WARM-UP TRACK',
  options: [
    { id: 'cheetah', name: 'Cheetah', sprite: 'snail.png' },
    { id: 'rabbit', name: 'Rabbit', sprite: 'snail.png' },
    { id: 'bear', name: 'Bear', sprite: 'snail.png' },
    { id: 'snail', name: 'Snail', sprite: 'snail.png' },
    { id: 'ostrich', name: 'Ostrich', sprite: 'snail.png' }
  ],
  defaultId: 'snail',
  previewX: 0.3, // fraction of screen width
  groundSpeed: 1.1, // display heights per second
  stridesPerHeight: 2.5,
  strideBounce: 0.025, // fraction of screen height
  swapMs: 185,
  swapTravel: 0.11 // fraction of screen height
};
