const OBSTACLE_SETTINGS = {
  everyBeats: 1, // use 0 to hide obstacles without changing the button game
  previewBeats: 2, // plan cues ahead so obstacles can scroll in before their starting beatline
  types: {
    spike: { file: 'spike.png', size: 0.11 }, // sizes are fractions of display height
    spikechain: {
      file: 'spikeball.png', size: 0.9,
      hangFromBottom: 0.31, // bottom of the sprite at rest, independent of its size
      swingDegrees: 11,
      swingSeconds: 1.5 // period at starting tempo and neutral pace; 0 keeps it still
    },
    cactus: { file: 'cactus.png', size: 0.34 }
  },
  cues: {
    blue: { type: 'spike', lane: 'center' }, // jump
    yellow: { type: 'spikechain', lane: 'center' }, // roll
    green: { type: 'cactus', lane: 'right' }, // dodge left
    red: { type: 'cactus', lane: 'left' } // dodge right
  }
};
