const LOBBY_RIGHT_ARROW = { icon: 'led-arrow led-arrow-right', label: 'right arrow' };

const LOBBY_UI = {
  // Each hold starts when the text reaches the center.
  // Enter a positive speed in percent of LED screen width per second, or null for the default.
  welcome: { text: 'WELCOME', holdSeconds: 2, speed: null },
  modeTitle: { text: 'CLASSIC', holdSeconds: 1, speed: 85 },
  // Prompt text can be a string or an array of text and icons.
  pressToStart: { text: ['PRESS ', LOBBY_RIGHT_ARROW, ' TO PLAY'], holdSeconds: 3, speed: 28 },
  holdToPractice: { text: ['HOLD ', LOBBY_RIGHT_ARROW, ' TO PRACTICE'], holdSeconds: 3, speed: 28 },
  // WELCOME shares the mode title typography.
  modeTitleStyle: {
    font: 'Ari W9500 Condensed Display',
    fontSize: 9, // percent of the reference screen width
    letterSpacing: '0.08em',
    verticalOffset: 2 // percent of the reference screen width; positive moves down
  },
  pressPlayFont: {
    font: 'Ari W9500 Condensed Display',
    fontSize: 6,
    letterSpacing: '0.08em',
    verticalOffset: 2
  },
  // Default UI insets for all views, in percent of the reference LED screen width.
  paddingX: 3.5, // applies to both left and right
  paddingTop: 3,
  paddingBottom: 2.4,
  version: 'v2 6.11.2026',
  practiceHoldLabel: 'PRACTICE',
  // Items appear in array order. Set align to start, center, or end within each slot.
  top: {
    offset: '0cqw', // additional offset from the top padding
    gap: '6cqw',
    fontSize: '2.49cqw',
    columns: 'max-content',
    justify: 'center',
    items: [
      { id: 'highscore', label: '', align: 'center' },
      { id: 'scores', label: 'HIGHSCORES', align: 'center' }
    ]
  },
  bottom: {
    offset: '0cqw', // additional offset from the bottom padding
    gap: '1cqw',
    fontSize: '2.49cqw',
    columns: 'minmax(0, 1fr)',
    justify: 'stretch',
    items: [
      { id: 'runner', label: 'RUNNER', align: 'start' },
      { id: 'settings', label: 'SETTINGS', align: 'center' },
      { id: 'play', label: 'PLAY', align: 'end' }
    ]
  }
};
