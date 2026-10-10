// Rules for the fictional Afterlight worlds. All portfolio content is independent
// of these milestones. The renderer, audio and browser storage are optional users.
export const REGIONS = Object.freeze([
  { id: 'observatory', title: 'The Observatory', subtitle: 'SPACE', description: 'Tune three orbital rings. Find a signal in the silence.', spawn: { x: 0, z: 5 } },
  { id: 'chronos', title: 'The Time Garden', subtitle: 'TIME', description: 'One place. Two moments. Some paths only exist in yesterday.', spawn: { x: -6, z: 4 } },
  { id: 'resonance', title: 'The Resonance Room', subtitle: 'SOUND', description: 'Leave a melody where there used to be silence.', spawn: { x: 0, z: 5 } },
  { id: 'cinema', title: 'The Last Picture House', subtitle: 'STORIES', description: 'Three tiny films. An open sky. A seat with your name on it.', spawn: { x: 0, z: 5 } },
]);
export const ORBIT_TARGET = Object.freeze([2, 5, 1]);
export const CHIME_PATTERN = Object.freeze([0, 2, 1, 3]);
export const FILMS = Object.freeze(['signal', 'orbit', 'home']);

const DISCOVERIES = Object.freeze([
  { region: 'observatory', name: 'The light that arrived late', text: 'A note pinned to the telescope: “A star does not know who is looking. It shines anyway.”', title: 'A light in transit' },
  { region: 'observatory', name: 'The smallest possible audience', text: 'An empty chair faces the sky. Beside it, a cup has been carefully kept warm.', title: 'Reserved for you' },
  { region: 'observatory', name: 'An unfinished map', text: 'The final constellation is unnamed. There is room on the map for things no one has discovered yet.', title: 'Beyond the edge' },
  { region: 'chronos', name: 'Tomorrow’s postcard', text: 'The stamp is dated tomorrow. The message says: “You made it. Take the scenic route back.”', title: 'A letter ahead of time' },
  { region: 'chronos', name: 'The stubborn little seed', text: 'In one moment, a seed. In another, a tree. Neither is waiting for permission to become the other.', title: 'Still becoming' },
  { region: 'chronos', name: 'A minute with no hands', text: 'This clock has lost its hands. Someone has written underneath: “Stay for as long as you need.”', title: 'Time off' },
  { region: 'resonance', name: 'The unheard track', text: 'The sleeve has no artist and no title. Just a handwritten instruction: “Play this when the world is too loud.”', title: 'Side B' },
  { region: 'resonance', name: 'A good kind of repetition', text: 'Four little lights keep the beat. The next note is yours.', title: 'Begin again' },
  { region: 'resonance', name: 'The silence between', text: 'A score with a single rest in the middle. Sometimes the empty space is what lets the music breathe.', title: 'Room to listen' },
  { region: 'cinema', name: 'The almost-ending', text: 'A discarded script ends with “And then—”. Someone has circled it and written: “Keep this version.”', title: 'To be continued' },
  { region: 'cinema', name: 'The empty seat', text: 'One ticket. No expiry date. It is valid for the film you have not made yet.', title: 'Admit one' },
  { region: 'cinema', name: 'A frame from home', text: 'A small house. A bright window. No matter how far a story travels, it always remembers a light somewhere.', title: 'After the credits' },
].map((item, index) => ({ ...item, id: `${item.region}-${index % 3 + 1}`, ...[{ x: -7, z: 3 }, { x: 7, z: 4 }, { x: 4, z: 5 }][index % 3] })));

const REGION_OBJECTS = {
  observatory: [
    { id: 'orbit0', x: -5, z: -2, label: 'Inner orbit', action: 'Tune the inner orbit', type: 'orbit', index: 0, solid: .4 },
    { id: 'orbit1', x: 0, z: -3, label: 'Middle orbit', action: 'Tune the middle orbit', type: 'orbit', index: 1, solid: .4 },
    { id: 'orbit2', x: 5, z: -2, label: 'Outer orbit', action: 'Tune the outer orbit', type: 'orbit', index: 2, solid: .4 },
    { id: 'telescope', x: 0, z: -5.5, label: 'The listening telescope', action: 'Look into the sky', type: 'telescope', solid: .6 },
  ],
  chronos: [{ id: 'shard', x: 6, z: -3, label: 'A piece of tomorrow', action: 'Collect the time shard', type: 'shard' }],
  resonance: [
    ...[-5, -1.7, 1.7, 5].map((x, index) => ({ id: `tone${index}`, x, z: -2, label: ['Moon chime', 'Star chime', 'Wave chime', 'Sun chime'][index], action: 'Play the chime', type: 'tone', index })),
    { id: 'instrument', x: 0, z: 3, label: 'The pocket orchestra', action: 'Make a little music', type: 'instrument', solid: .55 },
  ],
  cinema: [{ id: 'projector', x: 0, z: -2, label: 'The midnight projector', action: 'Choose a tiny film', type: 'film', solid: .65 }],
};

const DEFAULT_PATTERN = [
  [true, false, false, false, true, false, false, false],
  [false, false, true, false, false, false, true, false],
  [true, false, true, false, true, false, true, false],
  [true, false, false, true, false, false, true, false],
];
const regionById = id => REGIONS.find(region => region.id === id);
const uniqueKnown = (input, allowed) => Array.isArray(input) ? [...new Set(input.filter(item => allowed.includes(item)))] : [];
const result = (type, message, extra = {}) => ({ type, message, ...extra });
const matchesOrbit = state => state.orbit.every((value, index) => value === ORBIT_TARGET[index]);

export function createJourney() {
  return { region: 'observatory', ...REGIONS[0].spawn, orbit: [0, 1, 3], starsAligned: false,
    telescopeSeen: false, era: 1, timeShard: false, resonance: false, chimeInput: [],
    pattern: DEFAULT_PATTERN.map(row => [...row]), filmSeen: [], discoveries: [] };
}

export function getObjects(state) {
  const props = (REGION_OBJECTS[state.region] ?? []).filter(object => object.id !== 'shard' || !state.timeShard);
  const discoveries = DISCOVERIES.filter(item => item.region === state.region && !state.discoveries.includes(item.id))
    .map(item => ({ ...item, label: item.name, action: 'Read the fragment', type: 'discovery' }));
  return [...props, ...discoveries].map(object => ({ radius: 1.65, ...object }));
}

export function isJourneyWalkable(x, z, state, radius = .28) {
  if (![x, z, radius].every(Number.isFinite) || radius < 0 || !regionById(state.region)) return false;
  if (x < -9 + radius || x > 9 - radius || z < -7 + radius || z > 7 - radius) return false;
  if (state.region === 'chronos') {
    const onBank = x <= -2 - radius || x >= 2 + radius;
    const onBridge = state.era === 0 && Math.abs(z) <= 1 - radius;
    if (!onBank && !onBridge) return false;
  }
  return !(REGION_OBJECTS[state.region] ?? []).some(object => object.solid && Math.hypot(x - object.x, z - object.z) < object.solid + radius);
}

export function moveJourney(state, dx, dz) {
  if (![dx, dz].every(Number.isFinite)) return { moved: 0 };
  const length = Math.hypot(dx, dz);
  // Limit malformed external input and divide real movement into collision steps.
  if (length === 0 || length > 50) return { moved: 0 };
  const start = { x: state.x, z: state.z }, steps = Math.ceil(length / .1);
  for (let step = 0; step < steps; step++) {
    if (isJourneyWalkable(state.x + dx / steps, state.z, state)) state.x += dx / steps;
    if (isJourneyWalkable(state.x, state.z + dz / steps, state)) state.z += dz / steps;
  }
  return { moved: Math.hypot(state.x - start.x, state.z - start.z) };
}

function segmentIsClear(state, from, to) {
  const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .05));
  for (let index = 0; index <= count; index++) {
    if (!isJourneyWalkable(from.x + (to.x - from.x) * index / count, from.z + (to.z - from.z) * index / count, state)) return false;
  }
  return true;
}

// Pointer travel follows the same collision rules as walking. Joining the grid
// from a non-grid position is checked explicitly, including both bridge edges.
export function findJourneyPath(state, x, z) {
  const destination = { x, z };
  if (!isJourneyWalkable(x, z, state, .3) || !isJourneyWalkable(state.x, state.z, state)) return [];
  if (segmentIsClear(state, state, destination)) return [{ ...destination }];
  const step = .5, keyOf = point => `${point.x},${point.z}`;
  const nearbyNodes = position => {
    const center = { x: Math.round(position.x / step), z: Math.round(position.z / step) }, nodes = [];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const node = { x: center.x + dx, z: center.z + dz };
      const world = { x: node.x * step, z: node.z * step };
      if (isJourneyWalkable(world.x, world.z, state, .3) && segmentIsClear(state, position, world)) nodes.push({ ...node, distance: Math.hypot(position.x - world.x, position.z - world.z) });
    }
    return nodes.sort((a, b) => a.distance - b.distance);
  };
  const starts = nearbyNodes(state), goals = nearbyNodes(destination);
  if (!starts.length || !goals.length) return [];
  const goalKeys = new Set(goals.map(keyOf));
  const heuristic = node => Math.min(...goals.map(goal => Math.abs(node.x - goal.x) + Math.abs(node.z - goal.z)));
  const open = starts.map(node => ({ ...node, g: node.distance / step, f: node.distance / step + heuristic(node) }));
  const scores = new Map(open.map(node => [keyOf(node), node.g])), parents = new Map(), closed = new Set();
  while (open.length && closed.size < 2000) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift(), key = keyOf(current);
    if (closed.has(key)) continue;
    if (goalKeys.has(key)) {
      const path = [], seen = new Set();
      let at = key;
      while (at) {
        if (seen.has(at)) return [];
        seen.add(at);
        const [px, pz] = at.split(',').map(Number);
        path.push({ x: px * step, z: pz * step });
        at = parents.get(at);
      }
      path.reverse();
      if (Math.hypot(path[0].x - state.x, path[0].z - state.z) < .001) path.shift();
      const last = path.at(-1) ?? state;
      if (Math.hypot(last.x - x, last.z - z) > .001) path.push(destination);
      return path;
    }
    closed.add(key);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, z: current.z + dz }, nextKey = keyOf(next);
      if (closed.has(nextKey) || !isJourneyWalkable(next.x * step, next.z * step, state, .3)) continue;
      if (!segmentIsClear(state, { x: current.x * step, z: current.z * step }, { x: next.x * step, z: next.z * step })) continue;
      const g = current.g + 1;
      if (g >= (scores.get(nextKey) ?? Infinity)) continue;
      scores.set(nextKey, g); parents.set(nextKey, key);
      open.push({ ...next, g, f: g + heuristic(next) });
    }
  }
  return [];
}

export function travelJourney(state, regionId) {
  const region = regionById(regionId);
  if (!region) return result('invalid', 'That destination is not on this map.');
  state.region = region.id;
  Object.assign(state, region.spawn);
  state.chimeInput = [];
  return result('travel', region.description, { region: region.id });
}

export function setEra(state, era) {
  if (state.region !== 'chronos' || (era !== 0 && era !== 1)) return result('invalid', 'The Time Garden is where moments can change.');
  if (state.era === era) return result('unchanged', era === 0 ? 'You are in yesterday.' : 'You are in today.');
  if (!isJourneyWalkable(state.x, state.z, { ...state, era })) return result('blocked', 'Reach either bank before changing time. This bridge only exists in yesterday.');
  state.era = era;
  return result('era', era === 0 ? 'Yesterday returns. The old bridge remembers the way.' : 'Today returns. Look for what time left behind.', { era });
}

export function setOrbit(state, index, value) {
  if (state.region !== 'observatory' || !Number.isInteger(index) || index < 0 || index > 2 || !Number.isInteger(value) || value < 0 || value > 7) return result('invalid', 'Each of the three rings has eight positions.');
  state.orbit[index] = value;
  if (matchesOrbit(state) && !state.starsAligned) {
    state.starsAligned = true;
    return result('aligned', 'Three rings. One constellation. The sky has been listening.', { index, value });
  }
  return result('orbit', `Orbit ${index + 1}: position ${value + 1} of 8.`, { index, value });
}

export function setStep(state, track, step) {
  if (state.region !== 'resonance' || !Number.isInteger(track) || track < 0 || track > 3 || !Number.isInteger(step) || step < 0 || step > 7) return result('invalid', 'Choose a note inside the four-track, eight-step instrument.');
  state.pattern[track][step] = !state.pattern[track][step];
  return result('step', state.pattern[track][step] ? 'Note added.' : 'A little space between the notes.', { track, step, active: state.pattern[track][step] });
}

export function recordFilm(state, id) {
  if (state.region !== 'cinema' || !FILMS.includes(id)) return result('invalid', 'That film is not on tonight’s programme.');
  const first = !state.filmSeen.includes(id);
  if (first) state.filmSeen.push(id);
  return result('film-seen', first ? 'Another story to take with you.' : 'Some stories are worth returning to.', { id, first, complete: state.filmSeen.length === FILMS.length });
}

export function interactJourney(state, id) {
  const object = getObjects(state).find(candidate => candidate.id === id);
  if (!object) return result('invalid', 'There is nothing here to interact with.');
  if (Math.hypot(state.x - object.x, state.z - object.z) > object.radius) return result('distant', 'Walk a little closer.');
  if (object.type === 'discovery') {
    state.discoveries.push(object.id);
    return result('discovery', object.text, { id: object.id, title: object.title, label: object.name });
  }
  if (object.type === 'orbit') return result('orbit', 'Match the three orbit markers to the glowing constellation.', { index: object.index, value: state.orbit[object.index] });
  if (object.type === 'telescope') {
    if (!state.starsAligned) return result('clue', 'Follow the three luminous marks: inner 3, middle 6, outer 2. Each ring has eight positions.');
    state.telescopeSeen = true;
    return result('constellation', 'For a moment, the whole sky seems close enough to touch.');
  }
  if (object.type === 'shard') {
    if (state.era !== 1) return result('clue', 'Something will grow here. Find this place again in today.');
    state.timeShard = true;
    return result('shard', 'A little piece of tomorrow. Yesterday gave you the path; today held the answer.');
  }
  if (object.type === 'tone') {
    // Keep the longest prefix of the melody when an out-of-order note is played.
    // A new first note can start again immediately; no failure screen is needed.
    const played = [...state.chimeInput, object.index];
    let prefix = Math.min(played.length, CHIME_PATTERN.length);
    while (prefix && !played.slice(-prefix).every((tone, index) => tone === CHIME_PATTERN[index])) prefix--;
    state.chimeInput = prefix ? played.slice(-prefix) : [];
    if (prefix === CHIME_PATTERN.length) {
      const first = !state.resonance;
      state.resonance = true;
      state.chimeInput = [];
      return result('resonance', 'Moon. Wave. Star. Sun. A room full of light, made from four notes.', { tone: object.index, index: object.index, first, entered: CHIME_PATTERN.length });
    }
    return result('tone', prefix ? `${prefix} of 4 notes found. Keep listening.` : 'Let it ring. Try moon, wave, star, sun.', { tone: object.index, index: object.index, entered: prefix });
  }
  if (object.type === 'instrument') return result('instrument', 'Make something that did not exist a moment ago.');
  if (object.type === 'film') return result('film', 'The projector is ready. Choose a story.');
  return result('invalid', 'There is nothing here to interact with.');
}

export function journeyObjective(state) {
  const region = regionById(state.region) ?? REGIONS[0];
  const objectives = {
    observatory: state.starsAligned
      ? { title: 'A signal, found.', hint: 'Look through the telescope. Or stay a while and watch the sky.', complete: true }
      : { title: 'Put the stars in reach.', hint: 'Visit the three dials. Align inner 3, middle 6, outer 2 with the luminous marks.', complete: false },
    chronos: state.timeShard
      ? { title: 'Tomorrow, in your pocket.', hint: 'The bridge returns in yesterday. Both moments are still yours to explore.', complete: true }
      : { title: 'Take the long way through time.', hint: 'Cross the old bridge in yesterday. On the far bank, return to today to find the shard.', complete: false },
    resonance: state.resonance
      ? { title: 'You made the room sing.', hint: 'The pocket orchestra is yours. Build a loop, change a note, and listen.', complete: true }
      : { title: 'Four notes to wake a world.', hint: 'Play moon, wave, star, sun: first, third, second, fourth chime. The pocket orchestra is a separate instrument.', complete: false },
    cinema: state.filmSeen.length === FILMS.length
      ? { title: 'Stay through the credits.', hint: 'The best stories leave a door open. Take another seat whenever you like.', complete: true }
      : { title: 'A story under the stars.', hint: 'Walk to the projector. Three original miniature films are waiting.', complete: false },
  };
  return { region: region.id, ...objectives[region.id], discoveries: state.discoveries.filter(id => id.startsWith(`${region.id}-`)).length };
}

export function saveJourney(state) {
  return { version: 1, region: state.region, x: state.x, z: state.z, orbit: [...state.orbit],
    starsAligned: state.starsAligned, telescopeSeen: state.telescopeSeen, era: state.era,
    timeShard: state.timeShard, resonance: state.resonance, pattern: state.pattern.map(row => [...row]),
    filmSeen: [...state.filmSeen], discoveries: [...state.discoveries] };
}

export function restoreJourney(data) {
  const state = createJourney();
  if (!data || typeof data !== 'object' || data.version !== 1) return state;
  const region = regionById(data.region);
  if (region) { state.region = region.id; Object.assign(state, region.spawn); }
  if (Array.isArray(data.orbit) && data.orbit.length === 3 && data.orbit.every(value => Number.isInteger(value) && value >= 0 && value < 8)) state.orbit = [...data.orbit];
  state.starsAligned = data.starsAligned === true || matchesOrbit(state);
  state.telescopeSeen = state.starsAligned && data.telescopeSeen === true;
  state.era = data.era === 0 ? 0 : 1;
  state.timeShard = data.timeShard === true;
  state.resonance = data.resonance === true;
  if (Array.isArray(data.pattern) && data.pattern.length === 4 && data.pattern.every(row => Array.isArray(row) && row.length === 8 && row.every(value => typeof value === 'boolean'))) state.pattern = data.pattern.map(row => [...row]);
  state.filmSeen = uniqueKnown(data.filmSeen, FILMS);
  state.discoveries = uniqueKnown(data.discoveries, DISCOVERIES.map(item => item.id));
  if (isJourneyWalkable(data.x, data.z, state)) { state.x = data.x; state.z = data.z; }
  return state;
}
