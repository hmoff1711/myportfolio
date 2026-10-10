import * as THREE from '../vendor/three/three.module.js';
import { createWorld } from './world.js';
import { createJourneyController } from './journey.js';
import { START, OBJECTS, createState, restoreState, saveState, movePlayer, nearestObject, interact, objective, findPath } from './quest-state.mjs';

export function boot() {
  const $ = id => document.getElementById(id), canvas = $('coast');
  const media = matchMedia('(prefers-reduced-motion: reduce)'), storageKey = 'hikmat-night-shift-v1';
  let state;
  try { state = restoreState(JSON.parse(localStorage.getItem(storageKey))); } catch { state = createState(); }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), dusk = new THREE.Color('#78959e'), morning = new THREE.Color('#e7bfa5');
  scene.background = dusk.clone(); scene.fog = new THREE.Fog(dusk, 55, 105);
  scene.add(new THREE.HemisphereLight('#d3e7ea', '#665565', 2.4));
  const sun = new THREE.DirectionalLight('#ffe1bd', 3.2);
  sun.position.set(-12, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 65 });
  sun.shadow.normalBias = .045; scene.add(sun);
  const world = createWorld(scene), camera = new THREE.OrthographicCamera(-25, 25, 18, -18, .1, 180);
  const target = new THREE.Vector3(-2, 0, 0), desired = target.clone(), offset = new THREE.Vector3(21, 29, 32);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#fff2b6', transparent: true, opacity: .88, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.58, .64, 40), ringMaterial);
  ring.rotation.x = -Math.PI / 2; ring.position.y = .08; ring.visible = false; scene.add(ring);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.12, .2, 24), ringMaterial.clone());
  marker.rotation.x = -Math.PI / 2; marker.position.y = .07; marker.visible = false; scene.add(marker);
  let playing = false, paused = false, journalOpen = document.body.classList.contains('portfolio-open');
  let path = [], keys = new Set(), touchKeys = new Set(), pushing = 0, nearest = null;
  let last = performance.now(), elapsed = 0, step = 0, moved = 0, frame = 0, dawn = state.complete ? 1 : 0;
  let mapView = false, lowQuality = innerWidth < 700, toastTimer, saveTimer = 0, slowFrames = 0;
  let sound = false, audioContext, contextLost = false, endDismissed = state.complete;
  let journey;
  let objectiveKey = '', actionKey = '', lastTick = 0;
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(saveState(state))); } catch { /* Storage is optional, including in private mode. */ } }
  function toast(message) {
    clearTimeout(toastTimer); $('game-message').textContent = message; $('game-message').classList.add('visible');
    toastTimer = setTimeout(() => $('game-message').classList.remove('visible'), 5000);
  }
  function chime(kind) {
    if (!sound || !audioContext) return;
    const notes = kind === 'complete' ? [261.63, 329.63, 392, 523.25] : kind === 'turn' ? [420] : [392, 523.25];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      const at = audioContext.currentTime + index * .15;
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.065, at + .025); gain.gain.exponentialRampToValueAtTime(.001, at + .55);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + .6);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  function playNote(frequency, duration = .4, type = 'sine') {
    if (!sound || !audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), at = audioContext.currentTime;
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(.045, at + .015); gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  async function toggleSound() {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume(); sound = !sound; $('sound-toggle').textContent = sound ? 'Sound on' : 'Sound off'; $('sound-toggle').setAttribute('aria-pressed', String(sound));
      if (sound) chime('signal');
    } catch { toast('Sound is unavailable in this browser. The world still works silently.'); }
  }
  function resize() {
    const width = canvas.clientWidth || innerWidth, height = canvas.clientHeight || innerHeight;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const span = playing ? (mapView ? Math.max(16, 24 / aspect) : width < 700 ? 11 : 13) : Math.max(14, (width < 700 ? 21 : 30) / aspect);
    camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span; camera.updateProjectionMatrix();
  }
  function setQuality(value) {
    lowQuality = value; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, value ? 1 : 1.7));
    renderer.shadowMap.enabled = !value; world.setQuality(value);
    $('quality-toggle').textContent = value ? 'Detail: simple' : 'Detail: full';
    $('quality-toggle').setAttribute('aria-pressed', String(value)); resize();
    journey?.setQuality(value);
  }
  function clearInput() { keys.clear(); touchKeys.clear(); path = []; pushing = 0; marker.visible = false; }
  function isActive() { return playing && !paused && !journalOpen && !contextLost && !document.hidden && !$('help-dialog').open && !journey?.active && !journey?.modalOpen; }
  function currentObject() {
    const object = nearestObject(state), distance = Math.hypot(state.x - state.crateX, state.z - 2);
    if (!state.bridge && distance < 1.9 && (!object || distance < object.distance)) return { id: 'crate', x: state.crateX, z: 2, action: 'Push counterweight', distance };
    return object;
  }
  function updateInterface() {
    const task = objective(state);
    if (objectiveKey !== task.title) {
      objectiveKey = task.title; $('objective-title').textContent = task.title; $('objective-detail').textContent = task.text;
      $('chapter-number').textContent = state.complete ? '✓' : !state.signal ? '01' : !state.bridge ? '02' : !state.carrying ? '03' : '04';
    }
    nearest = playing ? currentObject() : null;
    const nextKey = nearest?.id || '';
    if (nextKey !== actionKey) { actionKey = nextKey; $('interact').hidden = !nearest; $('interaction-label').textContent = nearest?.action || ''; }
    ring.visible = Boolean(nearest && isActive()); if (nearest) ring.position.set(nearest.x, .085, nearest.z);
    const region = state.x < -8 ? 'The reflector garden' : state.x > 10 ? 'The lens workshop' : 'Lighthouse island';
    if ($('location-name').textContent !== region) $('location-name').textContent = region;
    const progress = state.complete ? 'complete' : state.carrying ? 'lens' : state.bridge ? 'bridge' : state.signal ? 'signal' : 'start';
    if ($('game-hud').dataset.progress !== progress) $('game-hud').dataset.progress = progress;
  }
  function act() {
    if (!isActive()) return;
    nearest = currentObject(); if (!nearest) return;
    path = []; marker.visible = false;
    if (nearest.id === 'crate') {
      if (state.x < state.crateX - .4 && Math.abs(state.z - 2) < .7) { pushing = 3; toast('Keep the weight moving toward the brass plate.'); }
      else toast('Stand on the left side of the rail, then push toward the brass plate.');
      return;
    }
    const event = interact(state, nearest.id);
    if (event.type === 'note') window.dispatchEvent(new CustomEvent('portfolio:open', { detail: { id: event.section } }));
    if (event.type === 'signal') toast('A little light goes a long way. The coastal lamps are awake.');
    if (event.type === 'lens') toast('You have the lens. Take it back to the lighthouse.');
    if (event.type === 'message') toast(event.message);
    if (event.type === 'complete') {
      clearInput(); toast('The coast is awake. You kept the light.');
      if (!endDismissed) setTimeout(() => { if (state.complete) { $('ending').hidden = false; $('keep-exploring').focus(); } }, media.matches ? 50 : 2600);
    }
    chime(event.type); save(); updateInterface();
  }
  function navigateTo(x, z) {
    if (!isActive()) return;
    let destination = { x, z };
    const object = OBJECTS.filter(o => !(o.id === 'lens' && (state.carrying || state.delivered))).find(o => Math.hypot(x - o.x, z - o.z) < .95);
    if (!state.bridge && Math.hypot(x - state.crateX, z - 2) < 1) destination = { x: state.crateX - 1.15, z: 2 };
    else if (object) {
      const options = Array.from({ length: 12 }, (_, i) => ({ x: object.x + Math.cos(i * Math.PI / 6) * 1.2, z: object.z + Math.sin(i * Math.PI / 6) * 1.2 }))
        .sort((a, b) => Math.hypot(a.x - state.x, a.z - state.z) - Math.hypot(b.x - state.x, b.z - state.z));
      const reachable = options.map(option => ({ option, path: findPath(state, option.x, option.z) })).find(item => item.path.length);
      if (reachable) destination = reachable.option;
    }
    const route = findPath(state, destination.x, destination.z);
    if (!route.length) { toast('Choose a spot on reachable ground. The eastern island needs its bridge.'); return; }
    clearInput(); path = route;
    const end = route[route.length - 1]; marker.position.set(end.x, .07, end.z); marker.visible = true; canvas.focus({ preventScroll: true });
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !isActive()) return;
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera); if (raycaster.ray.intersectPlane(plane, hit)) navigateTo(hit.x, hit.z);
  });
  const movementCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  document.addEventListener('keydown', event => {
    if (!isActive() || event.target !== canvas) return;
    if (movementCodes.has(event.code)) { event.preventDefault(); keys.add(event.code); path = []; marker.visible = false; pushing = 0; }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); act(); }
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  for (const button of document.querySelectorAll('[data-move]')) {
    button.addEventListener('pointerdown', event => { event.preventDefault(); if (!isActive()) return; button.setPointerCapture(event.pointerId); touchKeys.add(button.dataset.move); path = []; pushing = 0; });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => touchKeys.delete(button.dataset.move));
    button.addEventListener('click', event => {
      if (event.detail !== 0 || !isActive()) return;
      const vectors = { up: [-.548, -.837], down: [.548, .837], left: [-.837, .548], right: [.837, -.548] };
      const [x, z] = vectors[button.dataset.move]; movePlayer(state, x * .55, z * .55); updateInterface();
    });
  }
  $('interact').addEventListener('click', act);
  $('start-game').addEventListener('click', () => {
    playing = true; document.body.classList.add('playing'); $('intro').hidden = true; $('game-hud').hidden = false;
    $('game-controls').hidden = false; resize(); canvas.focus({ preventScroll: true }); toast('Walk with WASD / arrows, or click the ground. Press E beside an object.');
  });
  $('pause-game').addEventListener('click', () => { paused = !paused; clearInput(); $('pause-game').textContent = paused ? 'Resume' : 'Pause'; $('pause-game').setAttribute('aria-pressed', String(paused)); $('pause-label').hidden = !paused; });
  $('map-toggle').addEventListener('click', () => { mapView = !mapView; $('map-toggle').textContent = mapView ? 'Follow keeper' : 'View coast'; $('map-toggle').setAttribute('aria-pressed', String(mapView)); resize(); });
  $('hint-toggle').addEventListener('click', () => { const expanded = $('hint-toggle').getAttribute('aria-expanded') === 'true'; $('hint-toggle').setAttribute('aria-expanded', String(!expanded)); $('objective-detail').hidden = expanded; });
  $('help-toggle').addEventListener('click', () => { clearInput(); $('help-dialog').showModal(); });
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('return-pier').addEventListener('click', () => { clearInput(); state.x = START.x; state.z = START.z; save(); $('help-dialog').close(); toast('Back at the landing. Your progress is safe.'); });
  $('restart-game').addEventListener('click', () => { state = createState(); dawn = 0; endDismissed = false; clearInput(); $('ending').hidden = true; $('help-dialog').close(); save(); updateInterface(); toast('A new night. A familiar coast.'); });
  $('keep-exploring').addEventListener('click', () => { endDismissed = true; $('ending').hidden = true; canvas.focus({ preventScroll: true }); });
  $('quality-toggle').addEventListener('click', () => setQuality(!lowQuality));
  $('sound-toggle').addEventListener('click', toggleSound);
  window.addEventListener('portfolio:visibility', event => {
    journalOpen = event.detail.open;
    if (journalOpen && $('help-dialog').open) $('help-dialog').close();
    clearInput();
  });
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => { clearInput(); last = performance.now(); if (document.hidden) save(); });
  window.addEventListener('pagehide', save); window.addEventListener('resize', resize); media.addEventListener('change', clearInput);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; clearInput(); save(); document.body.classList.add('game-unavailable'); $('game-controls').hidden = true;
    journey?.contextLost(); $('journey-entry').hidden = true;
    clearTimeout(toastTimer); $('game-message').textContent = ''; $('game-message').classList.remove('visible');
    $('load-status').textContent = 'The scene was interrupted. Reload to return to the coast, or open the portfolio.';
    $('intro').hidden = false; $('start-game').hidden = true; $('fallback-link').hidden = false;
  });
  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (contextLost) return;
    if (journey?.active) { journey.tick(now, dt); return; }
    if (journey?.modalOpen) return;
    if (contextLost || document.hidden || journalOpen || paused || $('help-dialog').open) return;
    if (!isActive() && now - lastTick < 32) return;
    lastTick = now; elapsed += dt; moved = 0;
    if (isActive() && $('ending').hidden) {
      let dx = 0, dz = 0;
      const left = keys.has('KeyA') || keys.has('ArrowLeft') || touchKeys.has('left'), right = keys.has('KeyD') || keys.has('ArrowRight') || touchKeys.has('right');
      const up = keys.has('KeyW') || keys.has('ArrowUp') || touchKeys.has('up'), down = keys.has('KeyS') || keys.has('ArrowDown') || touchKeys.has('down');
      dx = (Number(right) - Number(left)) * .837 + (Number(down) - Number(up)) * .548;
      dz = (Number(left) - Number(right)) * .548 + (Number(down) - Number(up)) * .837;
      if (pushing > 0 && !state.bridge) { dx = 1; dz = 0; pushing -= dt; }
      else if (path.length && !dx && !dz) {
        const waypoint = path[0], distance = Math.hypot(waypoint.x - state.x, waypoint.z - state.z);
        if (distance < .13) { path.shift(); if (!path.length) marker.visible = false; }
        else { dx = (waypoint.x - state.x) / distance; dz = (waypoint.z - state.z) / distance; }
      }
      const length = Math.hypot(dx, dz);
      if (length) {
        const speed = state.carrying ? 3 : 4, result = movePlayer(state, dx / length * speed * dt, dz / length * speed * dt); moved = result.moved;
        if (moved > .001) world.character.rotation.y = Math.atan2(dx, dz);
        else if (path.length) { path = []; marker.visible = false; }
        if (result.opened) { pushing = 0; toast('The bridge settles. The workshop is within reach.'); chime('bridge'); save(); }
      }
      saveTimer += dt; if (saveTimer > 2) { saveTimer = 0; save(); }
    }
    step += moved * 5; world.character.position.set(state.x, 0, state.z);
    world.update(state, dt, media.matches ? 0 : elapsed, { moving: moved > .001, step: media.matches ? 0 : step, reduced: media.matches });
    if (state.complete) dawn = Math.min(1, dawn + dt * (media.matches ? 20 : .16));
    scene.background.copy(dusk).lerp(morning, dawn); scene.fog.color.copy(scene.background); sun.intensity = 3.2 + dawn * 1.3;
    if (playing && !mapView && !state.complete) desired.set(state.x, .3, state.z);
    else if (!playing && innerWidth < 700) desired.set(-1, 21, 0);
    else desired.set(playing ? -1 : -10, 0, 0);
    target.lerp(desired, media.matches ? 1 : 1 - Math.exp(-dt * 3)); camera.position.copy(target).add(offset); camera.lookAt(target);
    updateInterface(); renderer.render(scene, camera);
    if (!lowQuality && dt > .038 && ++slowFrames > 180) { setQuality(true); slowFrames = 0; }
  }
  journey = createJourneyController({ renderer, canvas, media, toast,
    audio: { note: playNote, toggle: toggleSound, enabled: () => sound }, clearCoast: clearInput,
    resumeCoast: () => {
      playing = true; paused = false; clearInput(); document.body.classList.add('playing');
      $('intro').hidden = true; $('game-hud').hidden = false; $('game-controls').hidden = false;
      $('pause-game').textContent = 'Pause'; $('pause-game').setAttribute('aria-pressed', 'false'); $('pause-label').hidden = true;
      resize(); canvas.focus({ preventScroll: true }); updateInterface();
    }
  });
  setQuality(lowQuality); world.character.position.set(state.x, 0, state.z);
  camera.position.copy(target).add(offset); camera.lookAt(target); world.update(state, 0, 0, { moving: false, step: 0, reduced: media.matches }); renderer.render(scene, camera);
  document.body.classList.add('game-ready'); $('start-game').disabled = false;
  $('start-game').textContent = state.bridge || state.signal ? 'Return to the coast' : 'Take the night shift';
  $('load-status').textContent = 'A short first shift. Four worlds beyond. No rush.';
  updateInterface(); frame = requestAnimationFrame(tick);
  window.addEventListener('pageshow', () => { last = performance.now(); });
}
