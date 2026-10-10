// The professional journal loads independently of the optional adventure.
(() => {
  const status = document.getElementById('load-status');
  const start = document.getElementById('start-game');
  import('./game.js').then(({ boot }) => boot()).catch(error => {
    console.error('The adventure could not start:', error);
    document.body.classList.add('game-unavailable');
    start.hidden = true;
    document.getElementById('journey-entry').hidden = true;
    status.textContent = 'The coast could not load on this device. The complete portfolio is ready to read.';
    document.getElementById('fallback-link').hidden = false;
  });
})();
