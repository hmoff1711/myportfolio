// The fictional coast and its deterministic game rules. No portfolio facts
// depend on this state, and no network request is made by the adventure.
export const START = Object.freeze({ x: 0, z: 5 });
export const OBJECTS = Object.freeze([
  { id: 'mirrorA', x: -13, z: 1, radius: 1.85, label: 'Turn the first reflector', action: 'Turn reflector' },
  { id: 'mirrorB', x: -13, z: -4, radius: 1.85, label: 'Turn the second reflector', action: 'Turn reflector' },
  { id: 'lens', x: 14, z: -2, radius: 1.9, label: 'Pick up the lighthouse lens', action: 'Carry the lens' },
  { id: 'beacon', x: 0, z: -1, radius: 1.85, label: 'Return light to the lighthouse', action: 'Light the lighthouse' },
  { id: 'journal', x: -4, z: 3.4, radius: 1.6, label: 'A note from the keeper', action: 'Read the field note', section: 'case-onefs' },
  { id: 'logbook', x: 3.8, z: -3.8, radius: 1.6, label: 'The keeper’s logbook', action: 'Open the logbook', section: 'experience' },
  { id: 'postcard', x: 15.5, z: .8, radius: 1.6, label: 'A postcard from the coast', action: 'Read the postcard', section: 'contact' },
]);

export function createState() {
  const state = { x: START.x, z: START.z, mirrorA: 0, mirrorB: 3, signal: false,
    crateX: 3.5, bridge: false, carrying: false, delivered: false, complete: false,
    notes: [], beams: [] };
  refreshLight(state);
  return state;
}

function reflected(dx, dz, angle) {
  const nx = Math.cos(angle), nz = Math.sin(angle);
  const dot = dx * nx + dz * nz;
  return { x: Math.round((dx - 2 * dot * nx) * 1000) / 1000, z: Math.round((dz - 2 * dot * nz) * 1000) / 1000 };
}

export function refreshLight(state) {
  const a = { x: -13, z: 1 }, b = { x: -13, z: -4 };
  const first = reflected(1, 0, state.mirrorA * Math.PI / 4);
  state.beams = [{ from: { x: -16, z: 1 }, to: a, hit: true }];
  const reachesB = first.z === -1;
  state.beams.push({ from: a, to: reachesB ? b : { x: a.x + first.x * 3.2, z: a.z + first.z * 3.2 }, hit: reachesB });
  let connected = false;
  if (reachesB) {
    const second = reflected(0, -1, state.mirrorB * Math.PI / 4);
    connected = second.x === 1;
    state.beams.push({ from: b, to: connected ? { x: -9, z: -4 } : { x: b.x + second.x * 3.2, z: b.z + second.z * 3.2 }, hit: connected });
  }
  state.signal = connected;
}

export function isWalkable(x, z, state, radius = .28) {
  // Shapes mirror the modeled island tops and bridges. Edges are safe bounds,
  // not falling hazards. The rounded main island is an inset rectangle.
  const main = x > -8 + radius && x < 8 - radius && z > -6 + radius && z < 7 - radius
    && Math.hypot(Math.max(Math.abs(x) - 6.4, 0), Math.max(Math.abs(z - .5) - 4.9, 0)) < 1.6 - radius;
  const west = Math.hypot(x + 13, z + 2) < 5 - radius;
  const east = Math.hypot(x - 14, z + 1) < 4.5 - radius;
  const westBridge = x > -10 && x < -6.4 && Math.abs(z) < .9 - radius;
  const eastBridge = state.bridge && x > 7.4 && x < 11.7 && Math.abs(z) < 1 - radius;
  const landing = Math.abs(x) < .9 - radius && z > 5.4 && z < 8.64 - radius;
  if (!(main || west || east || westBridge || eastBridge || landing)) return false;
  // Landmark collision volumes; decorative planting stays along island edges.
  if (x > -5.35 - radius && x < -2.65 + radius && z > -5.25 - radius && z < -2.95 + radius) return false;
  if (x > 4.5 - radius && x < 6.1 + radius && z > -5.1 - radius && z < -3.7 + radius) return false;
  if (Math.hypot(x, z + 3.5) < 1.6 + radius) return false;
  if (Math.hypot(x + 16, z - 1) < .43 + radius) return false;
  if (Math.hypot(x + 13, z - 1) < .35 + radius) return false;
  if (Math.hypot(x + 13, z + 4) < .35 + radius) return false;
  if (Math.hypot(x - 14, z + 2) < .37 + radius) return false;
  return true;
}

export function nearestObject(state) {
  return OBJECTS.filter(object => !(object.id === 'lens' && (state.carrying || state.delivered)))
    .map(object => ({ ...object, distance: Math.hypot(state.x - object.x, state.z - object.z) }))
    .filter(object => object.distance <= object.radius)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

export function interact(state, id) {
  const object = OBJECTS.find(item => item.id === id);
  if (!object || Math.hypot(state.x - object.x, state.z - object.z) > object.radius) return { type: 'out-of-reach' };
  if (object.section) {
    if (!state.notes.includes(id)) state.notes.push(id);
    return { type: 'note', section: object.section };
  }
  if (id === 'mirrorA' || id === 'mirrorB') {
    if (state.complete) return { type: 'message', message: 'The coast is bright. Let the light keep travelling.' };
    const wasConnected = state.signal;
    state[id] = (state[id] + 1) % 4;
    refreshLight(state);
    return { type: state.signal && !wasConnected ? 'signal' : 'turn' };
  }
  if (id === 'lens' && !state.carrying && !state.delivered) {
    state.carrying = true;
    return { type: 'lens' };
  }
  if (id === 'beacon') {
    if (state.complete) return { type: 'message', message: 'The light is yours. Stay a while.' };
    if (!state.carrying) return { type: 'message', message: 'An empty lantern. There is a lens among the old columns across the bridge.' };
    if (!state.signal) return { type: 'message', message: 'The lens is ready. Align the two reflectors on the western island first.' };
    if (!state.bridge) return { type: 'message', message: 'The counterweight must latch the bridge before the coast is ready.' };
    state.delivered = true;
    state.carrying = false;
    state.complete = true;
    return { type: 'complete' };
  }
  return { type: 'none' };
}

function blockedByCrate(x, z, state) {
  return Math.abs(x - state.crateX) < .84 && Math.abs(z - 2) < .83;
}

export function movePlayer(state, dx, dz) {
  const oldX = state.x, oldZ = state.z;
  let opened = false;
  // Splitting large displacements prevents tunnelling through water or props.
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .12));
  for (let i = 0; i < count; i++) {
    const sx = dx / count, sz = dz / count;
    const nx = state.x + sx;
    if (blockedByCrate(nx, state.z, state) && Math.abs(state.z - 2) < .68 && !state.bridge) {
      const pushingFromLeft = state.x < state.crateX && sx > 0;
      const pushingFromRight = state.x > state.crateX && sx < 0;
      if (pushingFromLeft || pushingFromRight) {
        state.crateX = Math.max(3.1, Math.min(6, state.crateX + sx));
        if (state.crateX >= 5.97) { state.crateX = 6; state.bridge = true; opened = true; }
      }
    }
    if (isWalkable(nx, state.z, state) && !blockedByCrate(nx, state.z, state)) state.x = nx;
    const nz = state.z + sz;
    if (isWalkable(state.x, nz, state) && !blockedByCrate(state.x, nz, state)) state.z = nz;
  }
  return { moved: Math.hypot(state.x - oldX, state.z - oldZ), opened };
}

export function objective(state) {
  if (state.complete) return { title: 'Morning, kept.', text: 'The coast is awake. Stay and explore, or meet the person behind this place.' };
  if (!state.signal) return { title: 'Follow the broken light.', text: 'Walk to the western island. Turn the two reflectors until the light reaches the little receiver.' };
  if (!state.bridge) return { title: 'A little weight. A new way.', text: 'Push the wooden counterweight along its rail onto the brass plate. Walk into it from the left.' };
  if (!state.carrying) return { title: 'Bring the light home.', text: 'Cross the lowered bridge. Pick up the lens among the old columns.' };
  return { title: 'One last light.', text: 'Carry the lens back to the foot of the lighthouse, then press E to light the coast.' };
}

export function saveState(state) {
  const { x, z, mirrorA, mirrorB, crateX, bridge, carrying, delivered, complete, notes } = state;
  return { version: 1, x, z, mirrorA, mirrorB, crateX, bridge, carrying, delivered, complete, notes };
}

export function restoreState(data) {
  const state = createState();
  if (!data || data.version !== 1) return state;
  for (const key of ['mirrorA', 'mirrorB']) if (Number.isInteger(data[key]) && data[key] >= 0 && data[key] < 4) state[key] = data[key];
  state.bridge = data.bridge === true;
  state.crateX = state.bridge ? 6 : Number.isFinite(data.crateX) ? Math.max(3.1, Math.min(5.96, data.crateX)) : 3.5;
  state.carrying = state.bridge && data.carrying === true;
  refreshLight(state);
  state.complete = state.bridge && state.signal && data.complete === true && data.delivered === true;
  state.delivered = state.complete;
  if (state.complete) state.carrying = false;
  state.notes = Array.isArray(data.notes) ? [...new Set(data.notes.filter(id => OBJECTS.some(o => o.id === id && o.section)))].slice(0, 3) : [];
  // The eastern island has ground, but cannot be reached before its bridge
  // opens. An inconsistent save must not strand the keeper there.
  const reachable = state.bridge || data.x < 8;
  if (reachable && Number.isFinite(data.x) && Number.isFinite(data.z) && isWalkable(data.x, data.z, state) && !blockedByCrate(data.x, data.z, state)) { state.x = data.x; state.z = data.z; }
  return state;
}

function clearSegment(state, x, z) {
  const length = Math.hypot(x - state.x, z - state.z);
  const count = Math.max(1, Math.ceil(length / .04));
  for (let i = 1; i <= count; i++) {
    const px = state.x + (x - state.x) * i / count;
    const pz = state.z + (z - state.z) * i / count;
    if (!isWalkable(px, pz, state) || blockedByCrate(px, pz, state)) return false;
  }
  return true;
}

// Small A* grid shared by pointer and touch navigation. The goal remains on
// reachable ground; inaccessible islands never teleport the player across gaps.
export function findPath(state, goalX, goalZ) {
  const step = .5;
  const toKey = (x, z) => `${x},${z}`;
  const rounded = { x: Math.round(state.x / step), z: Math.round(state.z / step) };
  const goal = { x: Math.round(goalX / step), z: Math.round(goalZ / step) };
  if (!isWalkable(goal.x * step, goal.z * step, state, .32)) return [];
  // Rounding a safe player position can put the grid origin inside a prop.
  // Join the grid through a nearby safe node and retain that joining segment.
  const candidates = [];
  for (let x = rounded.x - 1; x <= rounded.x + 1; x++) {
    for (let z = rounded.z - 1; z <= rounded.z + 1; z++) {
      if (isWalkable(x * step, z * step, state, .33) && !blockedByCrate(x * step, z * step, state)) {
        candidates.push({ x, z, distance: Math.hypot(x * step - state.x, z * step - state.z) });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const start = candidates.find(node => clearSegment(state, node.x * step, node.z * step));
  if (!start) return [];
  const startKey = toKey(start.x, start.z), goalKey = toKey(goal.x, goal.z);
  const open = [{ ...start, g: 0, f: Math.hypot(start.x - goal.x, start.z - goal.z) }];
  const scores = new Map([[startKey, 0]]), parents = new Map(), closed = new Set();
  while (open.length && closed.size < 5000) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift(), key = toKey(current.x, current.z);
    if (closed.has(key)) continue;
    if (key === goalKey) {
      const path = [];
      let at = goalKey;
      while (at !== startKey) { const [x, z] = at.split(',').map(Number); path.push({ x: x * step, z: z * step }); at = parents.get(at); if (!at) return []; }
      path.reverse();
      if (start.distance > .001) path.unshift({ x: start.x * step, z: start.z * step });
      return path;
    }
    closed.add(key);
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + x, nz = current.z + z, nextKey = toKey(nx, nz);
      if (closed.has(nextKey) || !isWalkable(nx * step, nz * step, state, .33)) continue;
      // Route around a crate rather than silently solving its physical puzzle.
      if (blockedByCrate(nx * step, nz * step, state)) continue;
      const g = current.g + 1;
      if (g >= (scores.get(nextKey) ?? Infinity)) continue;
      scores.set(nextKey, g); parents.set(nextKey, key);
      open.push({ x: nx, z: nz, g, f: g + Math.abs(nx - goal.x) + Math.abs(nz - goal.z) });
    }
  }
  return [];
}
