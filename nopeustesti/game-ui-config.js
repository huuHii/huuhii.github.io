const GAME_UI = {
  topBar: {
    topPadding: '0cqw', // additional space below the screen's top inset
    horizontalPadding: '0cqw',
    fontSize: '2.49cqw',
    gap: '1cqw',
    justifyContent: 'space-between',
    // Array order controls display order. Each item can override fontSize.
    items: [
      { id: 'coins', label: 'COINS', value: 24 },
      { id: 'lives', label: 'LIVES', value: 1 },
      { id: 'bpm', label: 'BPM', icon: 'led-metronome' },
      { id: 'time', label: 'TIME' },

    ]
  }
};
