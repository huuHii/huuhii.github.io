# Game assets

Put browser-ready assets for Nopeustesti in this folder, such as images, audio, fonts, or data files.

Reference them from the game page with paths like `assets/example.png`.

## UI icon preloading

Small SVG icons used by the interface are preloaded in `../index.html` because
they are used as CSS masks and may otherwise flash on first use. When adding a
new UI icon, add a matching `<link rel="preload" as="image" type="image/svg+xml">`
to the page head. Do not preload every button state or theme image: those larger
assets should load when needed to keep the initial mobile download small.
