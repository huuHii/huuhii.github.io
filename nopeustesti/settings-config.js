const SETTINGS_MENU = {
  title: 'SETTINGS',
  topPadding: '4cqw',
  titleGap: '3cqw',
  titleFontSize: '4cqw',
  visibleRows: 4,
  itemGap: '1.5cqw',
  itemFontSize: '3cqw',
  descriptionDelayMs: 0, // pause before each description scroll
  descriptionScrollMs: 5500, // time for one pass across the description area
  indicatorBlinkMs: 1000, // full on/off cycle
  indicatorLitMs: 450, // steady light after input
  rows: [
    {
      label: 'GAME MODE',
      type: 'choice',
      options: ['CLASSIC', '3 LIVES', 'ONE LIFE', 'SIMON SAYS', 'REACTION TIME']
    },
    { label: 'BEEP VOLUME', channel: 'beepVolume', preview: true },
    { label: 'CLICK VOLUME', channel: 'clackVolume' },
    { label: 'SFX VOLUME', type: 'placeholder' },
    {
      label: 'BPM INDICATOR',
      id: 'bpmIndicator',
      type: 'toggle',
      defaultOn: false,
      description: 'Shows a beats per minute indicator during gameplay.'
    },
    { label: 'RESET UNLOCKS', type: 'confirm', holdMs: 900 }
  ]
};
