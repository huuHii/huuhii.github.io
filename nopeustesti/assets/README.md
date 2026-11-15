# Game assets

Put browser-ready assets for Nopeustesti in this folder, such as images, audio, fonts, or data files.

Reference them from the game page with paths like `assets/example.png`.

The game serves 128 kbps MP3 audio, WOFF fonts and smaller WebP versions of the
bolt and legacy buttons. The WAV, TTF and PNG sources are kept for future edits.

## UI icon preloading

Small icons used by the interface are preloaded in `../index.html` because
they are used as CSS masks and may otherwise flash on first use. When adding a
new UI icon mask, add a matching `<link rel="preload" as="image">` with the
appropriate image type to the page head. Do not preload every button state or theme image: those larger
assets should load when needed to keep the initial mobile download small.
