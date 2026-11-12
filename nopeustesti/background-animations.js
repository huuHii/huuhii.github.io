const BACKGROUND_ANIMATIONS = {
  clouds: {
    files: ['cloud1.png', 'cloud2.png'],
    speed: 0.05, // multiplier of ground speed
    spawnGap: [0.1, 1.25], // min/max clear distance between clouds in display heights; smaller is denser
    fromBottom: [0.58, 0.88], // min/max height of the cloud's bottom edge, as fractions of the display
    size: [0.04, 0.125], // min/max sprite height, as fractions of the display
    mirrorChance: 0.5,
    opacity: 0.55
  }
};
