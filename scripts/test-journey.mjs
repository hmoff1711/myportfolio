import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from '../vendor/three/three.module.js';
import { createUniverseWorld } from '../js/universe-world.js';
import { DISCOVERIES } from '../js/afterlight-content.js';
import {
  REGIONS, ORBIT_TARGET, CHIME_PATTERN, FILMS, createJourney, getObjects,
  isJourneyWalkable, moveJourney, findJourneyPath, travelJourney, setEra,
  setOrbit, setStep, setTempo, recordFilm, interactJourney, journeyObjective,
  saveJourney, restoreJourney, mergeJourneyProgress,
} from '../js/journey-state.mjs';

// Reach every waypoint through the actual movement function. A passing graph
// search alone would not establish that the controller can follow its route.
function walkTo(state, x, z) {
  const path = findJourneyPath(state, x, z);
  assert.ok(path.length || Math.hypot(state.x - x, state.z - z) < .001, `No route to ${x}, ${z} in ${state.region}`);
  for (const point of path) {
    let iterations = 0;
    while (Math.hypot(state.x - point.x, state.z - point.z) > .001 && iterations++ < 600) {
      const distance = Math.hypot(state.x - point.x, state.z - point.z);
      const step = Math.min(.07, distance);
      assert.ok(moveJourney(state, (point.x - state.x) / distance * step, (point.z - state.z) / distance * step).moved > 0, 'Movement became blocked along a generated path');
      assert.ok(isJourneyWalkable(state.x, state.z, state), 'Movement left safe ground');
    }
    assert.ok(Math.hypot(state.x - point.x, state.z - point.z) < .001, 'Waypoint was not reached');
  }
  assert.ok(Math.hypot(state.x - x, state.z - z) < .001, 'Exact destination was not reached');
}

function approach(state, id) {
  const object = getObjects(state).find(item => item.id === id);
  assert.ok(object, `Missing object ${id}`);
  walkTo(state, object.x, object.z + 1);
}

test('Every world is freely available, has a safe spawn and exactly three unique discoveries', () => {
  const state = createJourney(), ids = [];
  for (const region of REGIONS) {
    assert.equal(travelJourney(state, region.id).type, 'travel');
    assert.ok(isJourneyWalkable(state.x, state.z, state));
    assert.deepEqual({ x: state.x, z: state.z }, region.spawn);
    const found = getObjects(state).filter(item => item.type === 'discovery');
    assert.equal(found.length, 3);
    assert.deepEqual(found.map(item => item.id), [1, 2, 3].map(number => `${region.id}-${number}`));
    for (const item of found) {
      assert.equal(item.title, DISCOVERIES[item.id].title, 'A discovery should use the archive story title');
      assert.equal(item.label, item.title);
      assert.equal(item.text, DISCOVERIES[item.id].text.join('\n\n'), 'The archive and world should tell the same story');
    }
    ids.push(...found.map(item => item.id));
    assert.equal(journeyObjective(state).region, region.id);
  }
  assert.equal(new Set(ids).size, 12);
  const previous = saveJourney(state);
  assert.equal(travelJourney(state, '__proto__').type, 'invalid');
  assert.deepEqual(saveJourney(state), previous);
});

test('Interactions are local, unknown objects cannot act and collectibles can only be collected once', () => {
  const state = createJourney();
  const before = saveJourney(state);
  assert.equal(interactJourney(state, 'telescope').type, 'distant');
  assert.equal(interactJourney(state, 'unknown').type, 'invalid');
  assert.deepEqual(saveJourney(state), before);
  approach(state, 'observatory-1');
  const found = interactJourney(state, 'observatory-1');
  assert.equal(found.type, 'discovery');
  assert.equal(found.title, DISCOVERIES[found.id].title);
  assert.equal(found.message, DISCOVERIES[found.id].text.join('\n\n'));
  assert.equal(interactJourney(state, 'observatory-1').type, 'invalid');
  assert.deepEqual(state.discoveries, ['observatory-1']);
  assert.equal(getObjects(state).filter(item => item.type === 'discovery').length, 2);
});

test('The telescope gives the clue, alignment requires all rings, and a completed constellation stays discovered', () => {
  const state = createJourney();
  approach(state, 'telescope');
  assert.equal(interactJourney(state, 'telescope').type, 'clue');
  assert.equal(state.telescopeSeen, false);
  for (let index = 0; index < ORBIT_TARGET.length; index++) {
    approach(state, `orbit${index}`);
    assert.equal(interactJourney(state, `orbit${index}`).index, index);
    assert.equal(setOrbit(state, index, ORBIT_TARGET[index]).type, index === 2 ? 'aligned' : 'orbit');
    assert.equal(state.starsAligned, index === 2);
    assert.equal(journeyObjective(state).complete, false, 'Alignment must not complete the world before looking through the telescope');
  }
  assert.match(journeyObjective(state).hint, /telescope/i);
  const aligned = restoreJourney(saveJourney(state));
  assert.equal(aligned.starsAligned, true);
  assert.equal(aligned.telescopeSeen, false);
  assert.equal(journeyObjective(aligned).complete, false, 'An unfinished telescope visit must remain unfinished after reload');
  approach(state, 'telescope');
  assert.equal(interactJourney(state, 'telescope').type, 'constellation');
  assert.equal(state.telescopeSeen, true);
  assert.equal(journeyObjective(state).complete, true);
  setOrbit(state, 0, 7);
  assert.equal(state.starsAligned, true);
  assert.equal(restoreJourney(saveJourney(state)).starsAligned, true);
  assert.equal(journeyObjective(restoreJourney(saveJourney(state))).complete, true);
});

test('A chime gives local visible feedback without persisting a tone or requiring sound', () => {
  const state = createJourney();
  travelJourney(state, 'resonance');
  const before = saveJourney(state), scene = new THREE.Scene();
  const world = createUniverseWorld(scene, state.region);
  try {
    const halos = [0, 1, 2, 3].map(index => scene.getObjectByName(`Chime feedback ${index}`));
    const ripples = [0, 1, 2].map(index => scene.getObjectByName(`Sound ripple ${index}`));
    assert.ok([...halos, ...ripples].every(Boolean), 'The authored instrument should provide visible sound feedback');
    for (const tone of [0, 2, 1, 3]) {
      world.update(state, .016, 1, { tone, reduced: true });
      assert.ok(halos[tone].scale.x > 1, 'The played chime should remain visibly selected with reduced motion');
      assert.ok(halos.every((halo, index) => index === tone || halo.scale.x === 1), 'Other chimes must not claim to be the played note');
      assert.ok(ripples.every(ripple => ripple.visible));
    }
    for (const tone of [-1, undefined, NaN, 4, '0']) {
      world.update(state, .016, 2, { tone, reduced: true });
      assert.ok(halos.every(halo => halo.scale.x === 1), 'Expired or invalid feedback must clear the previous chime');
      assert.ok(ripples.every(ripple => !ripple.visible));
    }
    assert.deepEqual(saveJourney(state), before, 'Visual feedback must not change saved progress');
  } finally {
    world.dispose();
  }
  assert.equal(scene.children.length, 0, 'Travelling to another room must remove the previous scenery');
});

test('The Time Garden cannot be crossed today, can be crossed yesterday, and cannot remove the bridge under the player', () => {
  const state = createJourney();
  travelJourney(state, 'chronos');
  walkTo(state, -3, 0);
  assert.equal(state.era, 1);
  assert.deepEqual(findJourneyPath(state, 6, -2), []);
  moveJourney(state, 10, 0);
  assert.ok(state.x <= -2.28, 'A large movement tunneled through the missing bridge');
  assert.equal(setEra(state, 0).type, 'era');
  walkTo(state, 0, 0);
  assert.equal(setEra(state, 1).type, 'blocked');
  assert.equal(state.era, 0);
  approach(state, 'shard');
  assert.equal(interactJourney(state, 'shard').type, 'clue');
  assert.equal(state.timeShard, false);
  assert.equal(setEra(state, 1).type, 'era');
  assert.equal(interactJourney(state, 'shard').type, 'shard');
  assert.equal(state.timeShard, true);
  assert.equal(getObjects(state).some(item => item.id === 'shard'), false);
  assert.deepEqual(findJourneyPath(state, -6, 4), []);
  setEra(state, 0);
  walkTo(state, -6, 4);
  setEra(state, 1);
  assert.equal(journeyObjective(state).complete, true);
});

test('A wrong chime sequence does not complete the puzzle and repeated opening notes recover without resetting the world', () => {
  const state = createJourney();
  travelJourney(state, 'resonance');
  for (const index of [0, 1, 2, 3]) { approach(state, `tone${index}`); interactJourney(state, `tone${index}`); }
  assert.equal(state.resonance, false);
  approach(state, 'tone0');
  interactJourney(state, 'tone0');
  interactJourney(state, 'tone0');
  assert.deepEqual(state.chimeInput, [0]);
  for (const index of CHIME_PATTERN.slice(1)) { approach(state, `tone${index}`); interactJourney(state, `tone${index}`); }
  assert.equal(state.resonance, true);
  assert.deepEqual(state.chimeInput, []);
  assert.equal(journeyObjective(state).complete, true);
});

test('The four-track instrument toggles independent steps and stores independent rows', () => {
  const state = createJourney();
  travelJourney(state, 'resonance');
  approach(state, 'instrument');
  assert.equal(interactJourney(state, 'instrument').type, 'instrument');
  const before = state.pattern.map(row => [...row]);
  const changed = setStep(state, 2, 3);
  assert.equal(changed.active, !before[2][3]);
  assert.equal(state.pattern[2][3], !before[2][3]);
  setStep(state, 2, 3);
  assert.deepEqual(state.pattern, before);
  state.pattern[0][0] = !state.pattern[0][0];
  assert.deepEqual(state.pattern[1], before[1]);
  assert.equal(createJourney().pattern[0][0], before[0][0]);
});

test('A composed loop keeps its tempo across travel and reload, and older saves use the original tempo', () => {
  const state = createJourney();
  assert.equal(setTempo(state, 110).type, 'invalid', 'The pocket orchestra owns the tempo control');
  assert.equal(state.tempo, 96);
  travelJourney(state, 'resonance');
  assert.equal(setTempo(state, 117).type, 'tempo');
  setStep(state, 1, 1);
  const composed = state.pattern.map(row => [...row]);
  travelJourney(state, 'cinema');
  const restored = restoreJourney(saveJourney(state));
  assert.equal(restored.tempo, 117);
  assert.deepEqual(restored.pattern, composed);
  travelJourney(restored, 'resonance');
  const before = saveJourney(restored);
  for (const value of [59, 151, 96.5, NaN, Infinity, '120', null]) {
    assert.equal(setTempo(restored, value).type, 'invalid');
    assert.deepEqual(saveJourney(restored), before, 'Malformed tempo must not change a saved composition');
    assert.equal(restoreJourney({ ...before, tempo: value }).tempo, 96);
  }
  for (const value of [60, 150]) {
    assert.equal(setTempo(restored, value).type, 'tempo');
    assert.equal(restoreJourney(saveJourney(restored)).tempo, value);
  }
  const legacy = { ...before };
  delete legacy.tempo;
  const compatible = restoreJourney(legacy);
  assert.equal(compatible.tempo, 96);
  assert.deepEqual(compatible.pattern, composed);
  assert.equal(compatible.region, 'resonance');
});

test('The cinema accepts only its three films and counts repeat screenings once', () => {
  const state = createJourney();
  assert.equal(recordFilm(state, 'signal').type, 'invalid');
  travelJourney(state, 'cinema');
  approach(state, 'projector');
  assert.equal(interactJourney(state, 'projector').type, 'film');
  assert.equal(recordFilm(state, 'unknown').type, 'invalid');
  for (const film of FILMS) {
    assert.equal(recordFilm(state, film).first, true);
    assert.equal(recordFilm(state, film).first, false);
  }
  assert.deepEqual(state.filmSeen, FILMS);
  assert.equal(journeyObjective(state).complete, true);
});

test('Invalid controls and non-finite movement leave state unchanged', () => {
  const state = createJourney(), before = saveJourney(state);
  for (const [index, value] of [[-1, 2], [3, 2], [0, 8], [0, NaN], [.5, 3]]) assert.equal(setOrbit(state, index, value).type, 'invalid');
  assert.equal(setEra(state, 0).type, 'invalid');
  assert.equal(setStep(state, 0, 0).type, 'invalid');
  for (const [x, z] of [[NaN, 0], [0, Infinity], [1e9, 0]]) assert.equal(moveJourney(state, x, z).moved, 0);
  assert.deepEqual(saveJourney(state), before);
  travelJourney(state, 'resonance');
  const pattern = state.pattern.map(row => [...row]);
  for (const [track, step] of [[-1, 0], [4, 0], [0, 8], [0, -.5]]) assert.equal(setStep(state, track, step).type, 'invalid');
  assert.deepEqual(state.pattern, pattern);
});

test('Pointer paths avoid solid props, preserve exact destinations and join from near-boundary non-grid positions', () => {
  const state = createJourney();
  walkTo(state, -5, 0);
  walkTo(state, -5, -4);
  walkTo(state, 2.173, 4.117);
  state.x = 8.715; state.z = 4.131;
  assert.ok(isJourneyWalkable(state.x, state.z, state));
  walkTo(state, -5.213, -4.071);
  assert.deepEqual(findJourneyPath(state, -5, -2), [], 'A solid dial should not be a destination');
  assert.deepEqual(findJourneyPath(state, 30, 0), [], 'Off-island ground should not be a destination');
  assert.deepEqual(findJourneyPath(state, NaN, 0), []);
});

test('Restore validates malformed input and never strands a player above the present-day gap', () => {
  for (const invalid of [null, undefined, [], {}, { version: 2 }, 'bad']) assert.deepEqual(restoreJourney(invalid), createJourney());
  const restored = restoreJourney({ version: 1, region: 'chronos', x: 0, z: 0, era: 1,
    orbit: [0, 1, 90], pattern: [[true]], telescopeSeen: true,
    discoveries: ['chronos-1', 'chronos-1', 'injected', null], filmSeen: ['orbit', 'orbit', 'foreign'] });
  assert.equal(restored.region, 'chronos');
  assert.deepEqual({ x: restored.x, z: restored.z }, REGIONS[1].spawn);
  assert.deepEqual(restored.orbit, [0, 1, 3]);
  assert.deepEqual(restored.pattern, createJourney().pattern);
  assert.equal(restored.telescopeSeen, false);
  assert.deepEqual(restored.discoveries, ['chronos-1']);
  assert.deepEqual(restored.filmSeen, ['orbit']);
  assert.ok(isJourneyWalkable(restored.x, restored.z, restored));
  const past = restoreJourney({ version: 1, region: 'chronos', x: 0, z: .25, era: 0 });
  assert.equal(past.x, 0);
  assert.equal(past.z, .25);
  const invalidPosition = restoreJourney({ version: 1, region: 'observatory', x: 0, z: -3 });
  assert.deepEqual({ x: invalidPosition.x, z: invalidPosition.z }, REGIONS[0].spawn);
});

test('Saved data and restored state do not share mutable arrays with the live journey', () => {
  const state = createJourney(), saved = saveJourney(state), restored = restoreJourney(saved);
  saved.orbit[0] = 7; saved.pattern[0][0] = false; saved.filmSeen.push('home');
  restored.orbit[1] = 6; restored.pattern[1][2] = false;
  assert.deepEqual(state, createJourney());
  assert.equal(restored.orbit[0], 0);
  assert.equal(restored.pattern[0][0], true);
  assert.deepEqual(restored.filmSeen, []);
});

test('A stale tab merges found stories and completed worlds while keeping its current route and composition', () => {
  const live = createJourney();
  travelJourney(live, 'resonance');
  walkTo(live, 4.173, 4.117);
  setStep(live, 1, 1); setTempo(live, 123);
  live.resonance = true; live.discoveries = ['resonance-1']; live.filmSeen = ['signal'];
  const local = saveJourney(live);
  const newer = saveJourney(createJourney());
  newer.region = 'cinema'; newer.x = -4; newer.z = 1;
  newer.starsAligned = true; newer.telescopeSeen = true; newer.timeShard = true;
  newer.orbit = [7, 7, 7]; newer.pattern = newer.pattern.map(row => row.map(() => false)); newer.tempo = 60;
  newer.discoveries = ['observatory-1', 'resonance-1', 'chronos-3']; newer.filmSeen = ['orbit', 'home', 'signal'];
  const storedBefore = structuredClone(newer);
  mergeJourneyProgress(live, newer);
  assert.equal(live.starsAligned && live.telescopeSeen && live.timeShard && live.resonance, true);
  assert.deepEqual(live.discoveries, ['resonance-1', 'observatory-1', 'chronos-3']);
  assert.deepEqual(live.filmSeen, ['signal', 'orbit', 'home']);
  for (const field of ['region', 'x', 'z', 'orbit', 'pattern', 'tempo']) assert.deepEqual(live[field], local[field], `The live tab must keep ${field}`);
  assert.deepEqual(newer, storedBefore, 'Reading newer progress must not modify it');
  const combined = saveJourney(live);
  mergeJourneyProgress(live, local);
  assert.deepEqual(saveJourney(live), combined, 'An older save cannot undo merged milestones');
  newer.discoveries.push('cinema-2'); newer.filmSeen.length = 0;
  assert.deepEqual(saveJourney(live), combined, 'Merged arrays must not alias browser storage data');
});

test('Malformed concurrent saves cannot inject stories or change the current position', () => {
  const live = createJourney();
  live.discoveries = ['observatory-2'];
  const before = saveJourney(live);
  for (const invalid of [undefined, null, [], {}, 'bad', { version: 2, starsAligned: true, discoveries: ['cinema-1'] }]) {
    mergeJourneyProgress(live, invalid);
    assert.deepEqual(saveJourney(live), before);
  }
  mergeJourneyProgress(live, { version: 1, region: 'chronos', x: 1e9, z: NaN,
    starsAligned: 'yes', telescopeSeen: true, timeShard: 1, resonance: 'true',
    discoveries: ['unknown', 'observatory-2', null, 'cinema-3', 'cinema-3'], filmSeen: ['injected', 'home', 'home'] });
  assert.equal(live.starsAligned || live.telescopeSeen || live.timeShard || live.resonance, false);
  assert.deepEqual(live.discoveries, ['observatory-2', 'cinema-3']);
  assert.deepEqual(live.filmSeen, ['home']);
  assert.equal(live.region, before.region); assert.equal(live.x, before.x); assert.equal(live.z, before.z);
  assert.deepEqual(live.pattern, before.pattern); assert.equal(live.tempo, before.tempo);
});

test('A continuous full journey can complete all four worlds and collect all twelve fragments', () => {
  const state = createJourney();
  for (let index = 0; index < ORBIT_TARGET.length; index++) { approach(state, `orbit${index}`); interactJourney(state, `orbit${index}`); setOrbit(state, index, ORBIT_TARGET[index]); }
  approach(state, 'telescope'); interactJourney(state, 'telescope');
  for (let index = 1; index <= 3; index++) { approach(state, `observatory-${index}`); interactJourney(state, `observatory-${index}`); }
  travelJourney(state, 'chronos');
  approach(state, 'chronos-1'); interactJourney(state, 'chronos-1');
  setEra(state, 0);
  approach(state, 'shard'); setEra(state, 1); interactJourney(state, 'shard');
  for (let index = 2; index <= 3; index++) { approach(state, `chronos-${index}`); interactJourney(state, `chronos-${index}`); }
  travelJourney(state, 'resonance');
  for (const index of CHIME_PATTERN) { approach(state, `tone${index}`); interactJourney(state, `tone${index}`); }
  approach(state, 'instrument'); interactJourney(state, 'instrument'); setStep(state, 1, 1);
  for (let index = 1; index <= 3; index++) { approach(state, `resonance-${index}`); interactJourney(state, `resonance-${index}`); }
  travelJourney(state, 'cinema');
  approach(state, 'projector'); interactJourney(state, 'projector');
  for (const film of FILMS) recordFilm(state, film);
  for (let index = 1; index <= 3; index++) { approach(state, `cinema-${index}`); interactJourney(state, `cinema-${index}`); }
  assert.equal(state.starsAligned && state.telescopeSeen && state.timeShard && state.resonance, true);
  assert.equal(state.filmSeen.length, 3);
  assert.equal(state.discoveries.length, 12);
  assert.deepEqual(restoreJourney(saveJourney(state)), state);
  for (const region of REGIONS) { travelJourney(state, region.id); assert.equal(journeyObjective(state).complete, true); }
});
