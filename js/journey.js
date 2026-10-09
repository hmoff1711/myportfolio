import * as THREE from '../vendor/three/three.module.js';
import { createUniverseWorld } from './universe-world.js';
import { REGIONS, createJourney, restoreJourney, saveJourney, mergeJourneyProgress, getObjects, moveJourney, findJourneyPath, travelJourney, setEra, setOrbit, setStep, setTempo, interactJourney, journeyObjective, recordFilm } from './journey-state.mjs';
import { DESTINATIONS, DISCOVERIES, FILM_SCRIPTS as FILMS, SECRETS, WORLD_IDEAS } from './afterlight-content.js';

// One renderer serves the coast and these rooms. Only the current room owns GPU resources.
export function createJourneyController({ renderer, canvas, media, toast, audio, clearCoast, resumeCoast }) {
  const $ = id => document.getElementById(id), dialog = $('journey-dialog'), content = $('journey-content');
  const storageKey = 'hikmat-afterlight-v1';
  let state;
  try { state = restoreJourney(JSON.parse(localStorage.getItem(storageKey))); } catch { state = createJourney(); }
  let active = false, paused = false, journalOpen = document.body.classList.contains('portfolio-open');
  let scene, world, camera, nearest, path = [], keys = new Set(), touch = new Set();
  let elapsed = 0, stride = 0, saveTime = 0, lastDraw = 0, tone = -1, toneUntil = 0, low = innerWidth < 700;
  let loop = false, beat = 0, beatTime = 0, film = null, filmTime = 0, filmPaused = false, filmScene = -1;
  let currentScreen = '', lastFocus = null, nextAfterClose = null;
  let patternDirty = false, tempoDirty = false;
  const pointer = new THREE.Vector2(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const frequencies = [261.63, 329.63, 392, 523.25], tracks = ['Pulse', 'Glass', 'Air', 'Light'];
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function mergeStored(stored) {
    if (!stored || stored.version !== 1) return;
    mergeJourneyProgress(state, stored);
    const latest = restoreJourney(stored);
    if (!patternDirty) state.pattern = latest.pattern;
    if (!tempoDirty) state.tempo = latest.tempo;
  }
  function save() {
    // A tab which has only read the portfolio must not overwrite a visitor's journey.
    if (!active) return;
    try {
      mergeStored(JSON.parse(localStorage.getItem(storageKey)));
      localStorage.setItem(storageKey, JSON.stringify(saveJourney(state)));
      patternDirty = false; tempoDirty = false;
    } catch { /* Play remains available without storage. */ }
  }
  function syncSound() { content.querySelectorAll('[data-sound]').forEach(b => { b.textContent = audio.enabled() ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', String(audio.enabled())); }); }
  function clear() { keys.clear(); touch.clear(); path = []; }
  function disposeScene() {
    world?.dispose();
    scene?.traverse(object => { if (object.isLight) object.shadow?.dispose(); });
    world = null; scene = null;
  }
  function stopMedia() { loop = false; film = null; filmTime = 0; }
  function modal(title, markup, screen) {
    stopMedia(); clear(); currentScreen = screen;
    $('journey-title').textContent = title; content.innerHTML = markup;
    if (!dialog.open) { lastFocus = document.activeElement; dialog.showModal(); }
    dialog.scrollTop = 0; $('journey-title').tabIndex = -1; $('journey-title').focus({ preventScroll: true });
  }
  dialog.addEventListener('close', () => {
    stopMedia(); keys.clear(); touch.clear(); save();
    if (nextAfterClose) { const action = nextAfterClose; nextAfterClose = null; action(); }
    else if (active) canvas.focus({ preventScroll: true });
    else if (lastFocus?.isConnected && !lastFocus.closest('[hidden]')) lastFocus.focus({ preventScroll: true });
  });
  $('journey-close').addEventListener('click', () => dialog.close());
  function resize() {
    if (!active || !camera) return;
    const width = canvas.clientWidth, height = canvas.clientHeight, aspect = width / height;
    renderer.setSize(width, height, false);
    const span = Math.max(12, 14 / aspect);
    camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span; camera.updateProjectionMatrix();
  }
  function setQuality(value) { low = value; world?.setQuality(low); resize(); }
  function enter(region) {
    clearCoast(); clear(); stopMedia();
    if (state.region !== region) travelJourney(state, region);
    disposeScene(); active = true; paused = false;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#0c142b'); scene.fog = new THREE.Fog('#0c142b', 55, 160);
    scene.add(new THREE.HemisphereLight('#d1d7ff', '#41415a', 2.8));
    const sun = new THREE.DirectionalLight('#ffe4c2', 3.8); sun.position.set(-12, 24, 10);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 18, bottom: -18, near: 1, far: 65 }); sun.shadow.normalBias = .045; scene.add(sun);
    world = createUniverseWorld(scene, state.region); world.setQuality(low);
    camera = new THREE.OrthographicCamera(-20, 20, 15, -15, .1, 220); camera.position.set(17, 25, 29); camera.lookAt(0, 1, 0);
    document.body.classList.add('journey-active', 'playing');
    canvas.setAttribute('aria-label', `${REGIONS.find(r => r.id === state.region).title}, an explorable fictional world`);
    canvas.setAttribute('aria-describedby', 'journey-instructions');
    $('intro').hidden = true; $('game-hud').hidden = true; $('game-controls').hidden = true; $('ending').hidden = true; $('pause-label').hidden = true;
    $('journey-hud').hidden = false; $('journey-controls').hidden = false;
    $('journey-pause').textContent = 'Pause'; $('journey-pause').setAttribute('aria-pressed', 'false');
    resize(); updateInterface(); save();
    if (dialog.open) dialog.close(); else canvas.focus({ preventScroll: true });
    toast(DESTINATIONS[state.region].intro);
  }
  function home() {
    clear(); stopMedia(); save(); active = false; paused = false; disposeScene();
    document.body.classList.remove('journey-active'); $('journey-hud').hidden = true; $('journey-controls').hidden = true;
    canvas.setAttribute('aria-label', 'The Night Shift, an explorable coastal world'); canvas.setAttribute('aria-describedby', 'game-instructions');
    if (dialog.open) { nextAfterClose = resumeCoast; dialog.close(); } else resumeCoast();
  }
  function canWalk() { return active && !paused && !journalOpen && !dialog.open && !document.hidden; }
  function walkTo(x, z, object) {
    const options = object ? Array.from({ length: 16 }, (_, i) => ({ x: object.x + Math.cos(i * Math.PI / 8) * 1.2, z: object.z + Math.sin(i * Math.PI / 8) * 1.2 })) : [{ x, z }];
    options.sort((a, b) => Math.hypot(a.x - state.x, a.z - state.z) - Math.hypot(b.x - state.x, b.z - state.z));
    const route = options.map(p => findJourneyPath(state, p.x, p.z)).find(p => p.length);
    if (!route) { toast(state.region === 'chronos' ? 'This route needs yesterday’s bridge. Change time, then try again.' : 'Choose a point on the island.'); return false; }
    clear(); path = route; return true;
  }
  function atlas() {
    const complete = { observatory: state.telescopeSeen, chronos: state.timeShard, resonance: state.resonance, cinema: state.filmSeen.length === 3 };
    const routes = REGIONS.map((r, i) => `<button class="journey-route" data-travel="${r.id}"><span>0${i + 1}</span><span><strong>${r.title}</strong><small>${r.description}${complete[r.id] ? ' · Discovered ✓' : ''}</small></span><span>↗</span></button>`).join('');
    const found = Object.keys(DISCOVERIES).map(id => `<button data-read="${id}" data-found="${state.discoveries.includes(id)}" ${state.discoveries.includes(id) ? '' : 'disabled'}><small>${id.split('-')[0]} / ${id.slice(-1)}</small><strong>${state.discoveries.includes(id) ? escape(DISCOVERIES[id].title) : 'A signal waiting'}</strong><span class="signal-letter">${state.discoveries.includes(id) ? DISCOVERIES[id].fragment : '·'}</span></button>`).join('');
    const nearby = active ? `<h3>Within walking distance</h3><p class="journey-fineprint">Choose a landmark to walk there. Then press E or the nearby action button. This route list also works with a keyboard.</p><nav class="landmark-list" aria-label="Walk to a landmark">${getObjects(state).map(o => `<button data-walk="${o.id}">${escape(o.label)} <span aria-hidden="true">→</span></button>`).join('')}</nav>` : '';
    modal('Beyond the last light.', `<div class="journey-layout"><nav class="journey-nav" aria-label="World destinations">${routes}<button class="journey-route" data-home><span>↩</span><span><strong>The coast</strong><small>Your night shift is kept safely.</small></span><span>↗</span></button></nav><div class="journey-room"><p class="journey-room-intro">A sky that listens. A garden with two yesterdays. A room you can turn into music. A cinema that keeps its windows lit.</p><p>Every destination is open from the beginning. Follow a task, collect a story, or simply stay. Your discoveries and your music will be here when you return.</p><div class="journey-tools"><button data-sound aria-pressed="${audio.enabled()}">${audio.enabled() ? 'Sound on' : 'Sound off'}</button><button data-detail>Detail: ${low ? 'simple' : 'full'}</button><button data-profile>Meet Hikmat ↗</button><button data-ideas>Behind the worlds</button></div><p class="journey-fineprint">An original fictional world. These stories are not biography. Progress is saved only in this browser.</p>${nearby}</div></div><h3 class="journey-section-label">Signals you brought home · ${state.discoveries.length} / 12</h3><div class="collection-grid">${found}</div>${state.discoveries.length === 12 ? `<div class="archive-payoff"><p class="archive-code">${SECRETS.code}</p><h3>${SECRETS.title}</h3><p>${SECRETS.text}</p><p>${SECRETS.signature}</p></div>` : ''}`, 'atlas');
  }
  function read(id) {
    const item = DISCOVERIES[id]; if (!item || !state.discoveries.includes(id)) return;
    modal(item.title, `<article class="discovery-reader"><p class="eyebrow">Fiction · ${item.kind}</p><p class="journey-meta">${item.eyebrow}</p>${item.text.map(p => `<p>${p}</p>`).join('')}<p class="discovery-thought">${item.thought}</p><div class="discovery-fragment"><span>A signal kept</span><strong>${item.fragment}</strong></div><div class="journey-tools"><button data-atlas>Back to the archive</button><button data-close>Keep exploring</button></div></article>`, 'reader');
  }
  function ideas() {
    modal('The ideas between the islands.', `<p class="journey-room-intro">Choices, memory, and room to listen.</p><p>These themes shape the fictional world. The professional journal tells the person’s real story.</p><div class="interest-index">${WORLD_IDEAS.entries.map(item => `<article><h3>${item.title}</h3><p>${item.line}</p><div class="journey-tools"><button data-travel="${item.destination}">Visit this world ↗</button></div></article>`).join('')}</div><div class="journey-tools"><button data-atlas>Back to the atlas</button><button data-profile>Meet Hikmat ↗</button></div>`, 'ideas');
  }
  function orbit(index) {
    modal(['Inner', 'Middle', 'Outer'][index] + ' orbit', `<p class="journey-room-intro">Three rings share one sky. The luminous marks remember positions 3, 6, 2.</p><div class="orbit-controls"><label for="orbit-position">${['Inner', 'Middle', 'Outer'][index]} ring <input id="orbit-position" type="range" min="1" max="8" step="1" value="${state.orbit[index] + 1}" data-orbit="${index}"><output id="orbit-value">${state.orbit[index] + 1} / 8</output></label></div><p id="orbit-status" class="journey-status" role="status">${state.starsAligned ? 'The constellation is aligned. Visit the telescope.' : 'Use the dial or arrow keys to tune this ring.'}</p><div class="journey-tools"><button data-close>Back to the island</button></div>`, 'orbit');
  }
  function instrument() {
    modal('A pocket orchestra.', `<p class="journey-room-intro">Leave a melody where there used to be silence.</p><p>Four voices, eight steps. Add a note, leave a rest, and listen to what changes. Your loop is saved automatically.</p><div class="journey-tools"><button data-loop aria-pressed="false">Play your loop</button><label for="loop-tempo">Tempo <input id="loop-tempo" type="range" min="60" max="150" value="${state.tempo}"><output id="tempo-value">${state.tempo} BPM</output></label><button data-sound aria-pressed="${audio.enabled()}">${audio.enabled() ? 'Sound on' : 'Sound off'}</button></div><div class="sequencer" role="group" aria-label="Four voice sequencer">${tracks.map((name, row) => `<div class="step-row"><span class="step-name">${name}</span>${state.pattern[row].map((on, col) => `<button class="step-pad" data-step="${row},${col}" aria-pressed="${on}" aria-label="${name}, step ${col + 1}">${col + 1}</button>`).join('')}</div>`).join('')}</div><p id="loop-status" class="journey-status" role="status">Ready. Press Play to begin.</p><div class="journey-tools"><button data-close>Back to the room</button></div>`, 'instrument');
  }
  function programme() {
    modal('Tonight, under the stars.', `<p class="journey-room-intro">Three original miniature films. Light, a little motion, and someone on the other end.</p><nav class="journey-nav" aria-label="Choose a film">${FILMS.map((f, i) => `<button class="journey-route" data-film="${f.id}"><span>0${i + 1}</span><span><strong>${f.title}</strong><small>${f.subtitle} · 24 seconds${state.filmSeen.includes(f.id) ? ' · Kept ✓' : ''}</small></span><span>▶</span></button>`).join('')}</nav><p class="journey-fineprint">Sound is optional. You can pause, or read the film frame by frame. Reduced motion starts in reading mode.</p><div class="journey-tools"><button data-close>Back to the island</button></div>`, 'programme');
  }
  function playFilm(id, reading = media.matches) {
    const f = FILMS.find(item => item.id === id); if (!f) return;
    modal(f.title, `<div class="film-stage"><canvas id="tiny-film" width="960" height="540" aria-label="Original animated short: ${f.title}"></canvas><div class="film-caption" aria-live="polite" aria-atomic="true"><strong id="film-scene"></strong><p id="film-line"></p></div></div><progress id="film-progress" class="film-progress" max="24" value="0" aria-label="Film progress"></progress><div class="journey-tools"><button data-film-pause ${reading ? 'hidden' : ''} aria-pressed="false">Pause film</button><button data-film-next ${reading ? '' : 'hidden'}>Next frame</button><button data-film-reading ${reading ? 'hidden' : ''}>Read frame by frame</button><button data-programme>Other reels</button><button data-sound aria-pressed="${audio.enabled()}">${audio.enabled() ? 'Sound on' : 'Sound off'}</button></div><p id="film-status" class="journey-status" role="status">${reading ? 'Reading mode · Take as long as you need.' : 'Stay through the last frame to keep this reel.'}</p><p class="journey-fineprint">${f.credits}</p>`, 'film');
    film = { ...f, reading }; filmTime = 0; filmScene = -1; filmPaused = false; drawFilm();
  }
  function finishFilm() {
    if (!film) return;
    recordFilm(state, film.id); save(); updateInterface(); filmPaused = true; film.complete = true;
    $('film-progress').value = film.duration; $('film-status').textContent = 'The final frame is yours. This reel is kept in your archive.';
    content.querySelector('[data-film-pause]').hidden = true; content.querySelector('[data-film-next]').hidden = true;
    if (document.activeElement?.matches('[data-film-pause], [data-film-next]')) content.querySelector('[data-programme]').focus({ preventScroll: true });
  }
  function drawFilm() {
    if (!film || !$('tiny-film')) return;
    const ctx = $('tiny-film').getContext('2d'); if (!ctx) return;
    const sceneIndex = Math.min(3, Math.floor(filmTime / 6));
    const t = film.reading || media.matches ? sceneIndex * 6 + 3 : filmTime;
    ctx.fillStyle = '#0a112a'; ctx.fillRect(0, 0, 960, 540);
    for (let i = 0; i < 85; i++) { ctx.fillStyle = i % 3 ? '#8b9cb8' : '#e9d3b0'; ctx.fillRect((i * 173) % 960, (i * 91) % 360, 2, 2); }
    const glow = (x, y, r, color) => { ctx.fillStyle = color; ctx.shadowBlur = 30; ctx.shadowColor = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; };
    if (film.id === 'signal') {
      ctx.strokeStyle = '#475576'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(240, 240, 35 + ((t * 18 + i * 55) % 310), -.9, .9); ctx.stroke(); }
      glow(240, 240, 10 + (sceneIndex > 0 ? Math.sin(t * 2) * 3 : 0), '#f2c876');
      if (sceneIndex === 3) { glow(730, 240, 13, '#8de4db'); ctx.strokeStyle = '#8de4db'; ctx.beginPath(); ctx.moveTo(600, 240); ctx.lineTo(365, 240); ctx.stroke(); }
    } else if (film.id === 'orbit') {
      ctx.strokeStyle = '#4c5875'; ctx.lineWidth = 2;
      for (const r of [120, sceneIndex < 2 ? 120 : 190]) { ctx.beginPath(); ctx.ellipse(480, 235, r, r * .45, -.2, 0, Math.PI * 2); ctx.stroke(); }
      const angle = t * .35, r = sceneIndex < 2 ? 120 : 190;
      glow(480 + Math.cos(angle) * 120, 235 + Math.sin(angle) * 54, 20, '#e9b791');
      glow(480 + Math.cos(-angle + 2) * r, 235 + Math.sin(-angle + 2) * r * .45, 16, '#9db7ee');
    } else {
      glow(720, 130, 40, '#d9c7ad'); ctx.fillStyle = '#27344d'; ctx.fillRect(0, 340, 960, 200);
      ctx.fillStyle = '#17223a'; ctx.fillRect(320, 215, 320, 250);
      if (sceneIndex > 0) { ctx.fillStyle = sceneIndex > 1 ? '#eabe77' : '#657d9b'; ctx.fillRect(405, 255, 145, 135); ctx.fillStyle = '#17223a'; ctx.fillRect(472, 255, 8, 135); ctx.fillRect(405, 318, 145, 8); }
      if (sceneIndex === 3) { ctx.fillStyle = '#e9d9ba'; ctx.fillRect(428, 354, 12, 15); ctx.fillRect(513, 354, 12, 15); }
    }
    if (filmScene !== sceneIndex) {
      filmScene = sceneIndex; $('film-scene').textContent = film.scenes[sceneIndex].title; $('film-line').textContent = film.scenes[sceneIndex].line;
      if (!film.reading) audio.note(frequencies[sceneIndex], .8);
    }
    $('film-progress').value = Math.min(filmTime, 24);
  }
  function act() {
    if (!canWalk()) return;
    nearest = getObjects(state).filter(o => Math.hypot(o.x - state.x, o.z - state.z) <= o.radius).sort((a,b) => Math.hypot(a.x-state.x,a.z-state.z)-Math.hypot(b.x-state.x,b.z-state.z))[0];
    if (!nearest) return;
    clear(); const event = interactJourney(state, nearest.id); save(); updateInterface();
    if (event.type === 'discovery') read(event.id);
    else if (event.type === 'orbit') orbit(event.index);
    else if (event.type === 'instrument') instrument();
    else if (event.type === 'film') programme();
    else { toast(event.message); if (event.tone !== undefined) { tone = event.tone; toneUntil = elapsed + .8; audio.note(frequencies[tone], .65); } else if (['shard', 'constellation'].includes(event.type)) audio.note(523.25, 1); }
  }
  function updateInterface() {
    if (!active) return;
    const objective = journeyObjective(state);
    const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };
    text('journey-location', REGIONS.find(r => r.id === state.region).title);
    text('journey-objective', objective.title); text('journey-hint', objective.hint);
    if ($('journey-era').hidden !== (state.region !== 'chronos')) $('journey-era').hidden = state.region !== 'chronos';
    document.querySelectorAll('[data-era]').forEach(b => { const pressed = String(Number(b.dataset.era) === state.era); if (b.getAttribute('aria-pressed') !== pressed) b.setAttribute('aria-pressed', pressed); });
    nearest = getObjects(state).filter(o => Math.hypot(o.x - state.x, o.z - state.z) <= o.radius).sort((a,b) => Math.hypot(a.x-state.x,a.z-state.z)-Math.hypot(b.x-state.x,b.z-state.z))[0];
    if ($('journey-interact').hidden !== !nearest) $('journey-interact').hidden = !nearest;
    text('journey-action-label', nearest ? `${nearest.action} · ${nearest.label}` : '');
  }
  content.addEventListener('input', event => {
    const control = event.target;
    if (control.matches('[data-orbit]')) { const outcome = setOrbit(state, Number(control.dataset.orbit), Number(control.value) - 1); $('orbit-value').textContent = `${control.value} / 8`; $('orbit-status').textContent = outcome.message; save(); updateInterface(); }
    if (control.id === 'loop-tempo') { setTempo(state, Number(control.value)); tempoDirty = true; $('tempo-value').textContent = `${state.tempo} BPM`; save(); }
  });
  content.addEventListener('click', async event => {
    const b = event.target.closest('button'); if (!b) return;
    if (b.dataset.travel) enter(b.dataset.travel);
    else if (b.hasAttribute('data-home')) home();
    else if (b.dataset.walk) { const object = getObjects(state).find(o => o.id === b.dataset.walk); if (object && walkTo(object.x, object.z, object)) { dialog.close(); toast(`Walking to ${object.label}. Press E when you arrive.`); } }
    else if (b.dataset.read) read(b.dataset.read);
    else if (b.hasAttribute('data-atlas')) atlas();
    else if (b.hasAttribute('data-ideas')) ideas();
    else if (b.hasAttribute('data-close')) dialog.close();
    else if (b.hasAttribute('data-sound')) { await audio.toggle(); syncSound(); }
    else if (b.hasAttribute('data-detail')) { $('quality-toggle').click(); b.textContent = `Detail: ${low ? 'simple' : 'full'}`; }
    else if (b.hasAttribute('data-profile')) { nextAfterClose = () => window.dispatchEvent(new CustomEvent('portfolio:open', { detail: { id: 'profile' } })); dialog.close(); }
    else if (b.dataset.step) { const [row, col] = b.dataset.step.split(',').map(Number); const outcome = setStep(state, row, col); patternDirty = true; b.setAttribute('aria-pressed', String(outcome.active)); save(); if (outcome.active && !loop) audio.note(frequencies[row], .15); }
    else if (b.hasAttribute('data-loop')) { if (!loop && !audio.enabled()) { await audio.toggle(); syncSound(); } loop = !loop; beat = 0; beatTime = 0; b.textContent = loop ? 'Stop your loop' : 'Play your loop'; b.setAttribute('aria-pressed', String(loop)); $('loop-status').textContent = loop ? 'Playing your saved pattern.' : 'Stopped. Your pattern is kept.'; }
    else if (b.dataset.film) playFilm(b.dataset.film);
    else if (b.hasAttribute('data-programme')) programme();
    else if (b.hasAttribute('data-film-pause')) { filmPaused = !filmPaused; b.textContent = filmPaused ? 'Resume film' : 'Pause film'; b.setAttribute('aria-pressed', String(filmPaused)); }
    else if (b.hasAttribute('data-film-reading')) { film.reading = true; b.hidden = true; content.querySelector('[data-film-pause]').hidden = true; content.querySelector('[data-film-next]').hidden = false; $('film-status').textContent = 'Reading mode · Take as long as you need.'; drawFilm(); }
    else if (b.hasAttribute('data-film-next')) { filmTime = (Math.floor(filmTime / 6) + 1) * 6; if (filmTime >= 24) finishFilm(); else { drawFilm(); b.textContent = filmTime >= 18 ? 'Keep this reel' : 'Next frame'; } }
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !canWalk()) return;
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera); if (ray.ray.intersectPlane(plane, hit)) { const object = getObjects(state).find(o => Math.hypot(hit.x - o.x, hit.z - o.z) < 1); walkTo(hit.x, hit.z, object); canvas.focus({ preventScroll: true }); }
  });
  const codes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  document.addEventListener('keydown', event => {
    if (!canWalk() || event.target !== canvas) return;
    if (codes.has(event.code)) { event.preventDefault(); keys.add(event.code); path = []; }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); act(); }
  });
  document.addEventListener('keyup', e => keys.delete(e.code));
  for (const b of document.querySelectorAll('[data-journey-move]')) {
    b.addEventListener('pointerdown', event => { if (!canWalk()) return; event.preventDefault(); b.setPointerCapture(event.pointerId); touch.add(b.dataset.journeyMove); path = []; });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(type, () => touch.delete(b.dataset.journeyMove));
    b.addEventListener('click', event => { if (event.detail !== 0 || !canWalk()) return; const [x,z] = { up: [-.548,-.837], down: [.548,.837], left: [-.837,.548], right: [.837,-.548] }[b.dataset.journeyMove]; moveJourney(state, x*.55,z*.55); updateInterface(); save(); });
  }
  $('journey-entry').addEventListener('click', atlas); $('journey-map-toggle').addEventListener('click', atlas); $('journey-atlas').addEventListener('click', atlas);
  $('journey-home').addEventListener('click', home); $('journey-interact').addEventListener('click', act);
  $('journey-pause').addEventListener('click', () => { paused = !paused; clear(); $('journey-pause').textContent = paused ? 'Resume' : 'Pause'; $('journey-pause').setAttribute('aria-pressed', String(paused)); });
  $('journey-hint-toggle').addEventListener('click', () => { const show = $('journey-hint').hidden; $('journey-hint').hidden = !show; $('journey-hint-toggle').setAttribute('aria-expanded', String(show)); });
  document.querySelectorAll('[data-era]').forEach(b => b.addEventListener('click', () => { if (!canWalk()) return; clear(); const outcome = setEra(state, Number(b.dataset.era)); toast(outcome.message); updateInterface(); save(); }));
  window.addEventListener('portfolio:visibility', e => { journalOpen = e.detail.open; clear(); stopMedia(); });
  window.addEventListener('blur', clear); window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { clear(); if (document.hidden) save(); }); window.addEventListener('pagehide', save);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey || !event.newValue) return;
    try { mergeStored(JSON.parse(event.newValue)); } catch { return; }
    updateInterface();
    if (dialog.open && currentScreen === 'instrument') {
      content.querySelectorAll('[data-step]').forEach(b => { const [row, col] = b.dataset.step.split(',').map(Number); b.setAttribute('aria-pressed', String(state.pattern[row][col])); });
      $('loop-tempo').value = state.tempo; $('tempo-value').textContent = `${state.tempo} BPM`;
    }
  });
  media.addEventListener('change', () => { clear(); if (film && !film.complete && media.matches) { film.reading = true; content.querySelector('[data-film-reading]').hidden = true; content.querySelector('[data-film-pause]').hidden = true; content.querySelector('[data-film-next]').hidden = false; drawFilm(); } });
  $('journey-entry').disabled = false;
  function tick(now, dt) {
    if (!active || journalOpen || document.hidden) return;
    elapsed += dt;
    if (dialog.open && loop && currentScreen === 'instrument') {
      beatTime -= dt;
      if (beatTime <= 0) {
        for (let row = 0; row < 4; row++) if (state.pattern[row][beat]) audio.note(frequencies[row], row === 0 ? .12 : .24, row === 0 ? 'triangle' : 'sine');
        content.querySelectorAll('[data-step]').forEach(b => b.dataset.current = String(!media.matches && Number(b.dataset.step.split(',')[1]) === beat));
        beat = (beat + 1) % 8; beatTime += 60 / state.tempo / 2;
      }
    }
    if (dialog.open && film && !filmPaused && !film.reading) { filmTime += dt; if (filmTime >= film.duration) finishFilm(); else drawFilm(); }
    // The opaque atlas can run its instrument and film without drawing hidden scenery.
    if (dialog.open) return;
    if (paused) return;
    let moved = 0;
    if (canWalk()) {
      const left = keys.has('KeyA') || keys.has('ArrowLeft') || touch.has('left'), right = keys.has('KeyD') || keys.has('ArrowRight') || touch.has('right');
      const up = keys.has('KeyW') || keys.has('ArrowUp') || touch.has('up'), down = keys.has('KeyS') || keys.has('ArrowDown') || touch.has('down');
      let dx = (Number(right)-Number(left))*.837+(Number(down)-Number(up))*.548, dz = (Number(left)-Number(right))*.548+(Number(down)-Number(up))*.837;
      if (path.length && !dx && !dz) { const next = path[0], distance = Math.hypot(next.x-state.x,next.z-state.z); if (distance < .12) path.shift(); else { dx = (next.x-state.x)/distance; dz = (next.z-state.z)/distance; } }
      const length = Math.hypot(dx,dz);
      if (length) { moved = moveJourney(state,dx/length*3.5*dt,dz/length*3.5*dt).moved; if (moved > .001) world.character.rotation.y = Math.atan2(dx,dz); else path = []; }
      saveTime += dt; if (saveTime > 2) { saveTime = 0; save(); } updateInterface();
    }
    stride += moved * 5; world.character.position.set(state.x,0,state.z);
    if (media.matches && !moved && now-lastDraw < 100) return;
    lastDraw = now;
    world.update(state,dt,elapsed,{ moving: moved > .001, step: stride, reduced: media.matches, tone: elapsed < toneUntil ? tone : -1 });
    renderer.render(scene,camera);
  }
  return { get active() { return active; }, get modalOpen() { return dialog.open; }, tick, resize, setQuality, contextLost() { clear(); stopMedia(); save(); active = false; disposeScene(); $('journey-hud').hidden = true; $('journey-controls').hidden = true; if (dialog.open) dialog.close(); document.body.classList.remove('journey-active'); } };
}
