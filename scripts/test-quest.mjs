import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  START, createState, findPath, interact, isWalkable, movePlayer,
  nearestObject, objective, refreshLight, restoreState, saveState,
} from '../js/quest-state.mjs';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Exercise the same continuous movement used by the controller, rather than
// teleporting between A* nodes. Every intermediate position must be safe.
function walkTo(state, x, z) {
  const path = findPath(state, x, z);
  assert.ok(path.length || distance(state, { x, z }) < .36, `No route to ${x}, ${z}`);
  for (const point of path) {
    let steps = 0;
    while (distance(state, point) > .001 && steps++ < 30) {
      const remaining = distance(state, point);
      const step = Math.min(.08, remaining);
      const movement = movePlayer(state, (point.x - state.x) / remaining * step, (point.z - state.z) / remaining * step);
      assert.ok(movement.moved > 0, `Route blocked at ${state.x}, ${state.z}, heading to ${point.x}, ${point.z}`);
      assert.ok(isWalkable(state.x, state.z, state), 'Movement left walkable ground');
    }
    assert.ok(distance(state, point) < .001, 'Route waypoint was not reached');
  }
  assert.ok(distance(state, { x, z }) < .36, 'Route ended far from its target');
}

function alignReflectors(state) {
  walkTo(state, -12, 1);
  assert.equal(interact(state, 'mirrorA').type, 'turn');
  walkTo(state, -12, -4);
  assert.equal(interact(state, 'mirrorB').type, 'turn');
  assert.equal(interact(state, 'mirrorB').type, 'signal');
}

function lowerBridge(state) {
  walkTo(state, 2.5, 2);
  let opened = false;
  for (let step = 0; step < 100; step++) opened = movePlayer(state, .08, 0).opened || opened;
  assert.equal(state.crateX, 6, 'Counterweight did not reach its plate');
  assert.equal(state.bridge, true, 'Counterweight did not latch the bridge');
  assert.equal(opened, true, 'Movement did not report the bridge opening');
}

test('A new shift starts safely with the light broken and the quest incomplete', () => {
  const state = createState();
  assert.equal(state.x, START.x);
  assert.equal(state.z, START.z);
  assert.ok(isWalkable(state.x, state.z, state));
  assert.equal(state.signal, false);
  assert.equal(state.bridge, false);
  assert.equal(state.carrying, false);
  assert.equal(state.complete, false);
  assert.equal(state.beams.length, 2);
  assert.equal(state.beams.at(-1).hit, false);
  assert.match(objective(state).title, /broken light/i);
});

test('Distant and unknown interactions cannot alter quest state', () => {
  const state = createState();
  const before = structuredClone(state);
  for (const id of ['mirrorA', 'mirrorB', 'lens', 'beacon', 'missing']) {
    assert.equal(interact(state, id).type, 'out-of-reach');
  }
  assert.deepEqual(state, before);
});

test('Walking to both reflectors and turning them connects the actual beam path', () => {
  const state = createState();
  alignReflectors(state);
  assert.equal(state.mirrorA, 1);
  assert.equal(state.mirrorB, 1);
  assert.equal(state.signal, true);
  assert.equal(state.beams.length, 3);
  assert.ok(state.beams.every(beam => beam.hit));
  assert.deepEqual(state.beams.at(-1).to, { x: -9, z: -4 });
  assert.match(objective(state).title, /weight/i);
  assert.equal(interact(state, 'mirrorB').type, 'turn');
  assert.equal(state.signal, false, 'Misaligning a reflector must visibly break the signal');
});

test('All reflector orientations obey the reflection puzzle, without false completion', () => {
  const state = createState();
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    state.mirrorA = a;
    state.mirrorB = b;
    refreshLight(state);
    assert.equal(state.signal, a === 1 && b === 1, `Unexpected connection at ${a}, ${b}`);
    for (const beam of state.beams) {
      for (const point of [beam.from, beam.to]) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.z));
    }
  }
});

test('The eastern island is unreachable before the physical drawbridge opens', () => {
  const state = createState();
  assert.deepEqual(findPath(state, 14, -1), []);
  assert.equal(isWalkable(9, 0, state), false);
  assert.equal(isWalkable(9, 0, { ...state, bridge: true }), true);
  walkTo(state, 7, 0);
  movePlayer(state, 30, 0);
  assert.ok(state.x < 8, 'A large movement tunneled across the water');
  assert.equal(state.bridge, false);
  assert.equal(interact(state, 'lens').type, 'out-of-reach');
});

test('Walking against the counterweight opens the bridge and cannot move the latched weight', () => {
  const state = createState();
  lowerBridge(state);
  assert.ok(findPath(state, 14, -1).length, 'Opening the bridge did not create a route');
  walkTo(state, 7, 2);
  movePlayer(state, -3, 0);
  assert.equal(state.crateX, 6);
  assert.equal(state.bridge, true);
  assert.ok(state.x > state.crateX, 'Player passed through the latched counterweight');
});

test('A* walks around the weight without moving it or solving its puzzle', () => {
  const state = createState();
  walkTo(state, 6, 3);
  assert.equal(state.crateX, 3.5);
  assert.equal(state.bridge, false);
  assert.deepEqual(findPath(state, 30, 30), []);
  assert.deepEqual(findPath(state, 0, -3.5), [], 'The lighthouse cannot be a walking destination');
});

test('Pointer navigation escapes a valid non-grid position next to a reflector', () => {
  const state = createState();
  state.x = -13.6;
  state.z = .8;
  assert.ok(isWalkable(state.x, state.z, state));
  walkTo(state, -12, 1);
});

test('The complete quest is reachable through walking, interaction and physical pushing', () => {
  const state = createState();
  alignReflectors(state);
  lowerBridge(state);
  walkTo(state, 14, -1);
  assert.equal(nearestObject(state)?.id, 'lens');
  assert.equal(interact(state, 'lens').type, 'lens');
  assert.equal(state.carrying, true);
  assert.notEqual(nearestObject(state)?.id, 'lens');
  assert.match(objective(state).title, /last light/i);
  walkTo(state, 0, -1);
  assert.equal(interact(state, 'beacon').type, 'complete');
  assert.equal(state.complete, true);
  assert.equal(state.delivered, true);
  assert.equal(state.carrying, false);
  assert.match(objective(state).title, /morning/i);
  assert.equal(interact(state, 'beacon').type, 'message', 'Completion must be idempotent');
  walkTo(state, -12, 1);
  assert.equal(interact(state, 'mirrorA').type, 'message');
  assert.equal(state.signal, true, 'Completed light should remain connected');
  assert.deepEqual(restoreState(saveState(state)), state, 'Completed progress did not survive a reload');
});

test('The lighthouse rejects each missing quest prerequisite', () => {
  for (const missing of ['carrying', 'signal', 'bridge']) {
    const state = { ...createState(), x: 0, z: -1, carrying: true, signal: true, bridge: true, [missing]: false };
    assert.equal(interact(state, 'beacon').type, 'message', `Accepted missing ${missing}`);
    assert.equal(state.complete, false);
    assert.equal(state.delivered, false);
  }
});

test('Field notes remain optional, record once and open the documented portfolio section', () => {
  const state = createState();
  walkTo(state, -4, 3.5);
  assert.deepEqual(interact(state, 'journal'), { type: 'note', section: 'case-onefs' });
  interact(state, 'journal');
  assert.deepEqual(state.notes, ['journal']);
  assert.equal(state.signal, false);
  assert.equal(state.complete, false);
});

test('Restoration sanitizes malformed versions, impossible flags, coordinates and note IDs', () => {
  assert.deepEqual(restoreState(null), createState());
  assert.deepEqual(restoreState({ version: 2, complete: true }), createState());
  const restored = restoreState({ version: 1, mirrorA: -1, mirrorB: 4, crateX: Infinity,
    bridge: 'true', carrying: true, complete: true, delivered: true, x: NaN, z: 5,
    notes: ['journal', 'journal', 'mirrorA', 'postcard', 'logbook', '<script>'] });
  assert.equal(restored.mirrorA, 0);
  assert.equal(restored.mirrorB, 3);
  assert.equal(restored.bridge, false);
  assert.equal(restored.carrying, false);
  assert.equal(restored.complete, false);
  assert.equal(restored.delivered, false);
  assert.equal(restored.crateX, 3.5);
  assert.deepEqual({ x: restored.x, z: restored.z }, START);
  assert.deepEqual(restored.notes, ['journal', 'postcard', 'logbook']);
  for (const [x, z] of [[1000, 1000], [0, -3.5], [3.5, 2]]) {
    const state = restoreState({ ...saveState(createState()), x, z });
    assert.deepEqual({ x: state.x, z: state.z }, START, `Unsafe restored spawn ${x}, ${z}`);
  }
});

test('Partial progress survives reload with derived lighting recomputed', () => {
  const state = createState();
  alignReflectors(state);
  walkTo(state, 2.5, 2);
  movePlayer(state, .8, 0);
  const data = JSON.parse(JSON.stringify(saveState(state)));
  assert.ok(!('signal' in data) && !('beams' in data), 'Derived rendering state should not be persisted');
  assert.deepEqual(restoreState(data), state);
});

test('An inconsistent saved position cannot strand the keeper behind the closed bridge', () => {
  const state = restoreState({ ...saveState(createState()), x: 14, z: -1 });
  assert.deepEqual({ x: state.x, z: state.z }, START);
  assert.equal(interact(state, 'lens').type, 'out-of-reach');
});
