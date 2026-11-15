(() => {
  const splash = document.querySelector('.startup-splash');
  const stage = document.querySelector('.game-stage');
  const minimum = new Promise(resolve => setTimeout(resolve, 650));
  const images = Array.from(document.images, image => image.decode());
  stage.inert = true;

  const ready = Promise.allSettled([screenFontsReady, Platformer.ready, GameAudio.ready, ...images]);
  const timeout = setTimeout(reveal, 4000);
  Promise.all([ready, minimum]).then(reveal);

  function reveal() {
    if (!splash.isConnected) return;
    clearTimeout(timeout);
    stage.inert = false;
    splash.remove();
    GameMenu.startupComplete();
  }
})();
