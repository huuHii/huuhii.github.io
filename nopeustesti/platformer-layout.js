/* X is a fraction of the display width. Sizes and heights use display height. */
const PLATFORMER_LAYOUT = {
  lanes: { left: 0.25, center: 0.16, right: 0.07 }, // height above the bottom edge
  player: {
    x: 0.25,
    fromBottom: 0, // additional height above the active lane
    size: 0.21 // sprite height at rest
  },
  'ground-line': 0.3, // height above the bottom edge
  perspectiveSpread: .1, // proportional widening from ground line to bottom
  beatSpacing: 2 // distance between beatlines in display heights
};
