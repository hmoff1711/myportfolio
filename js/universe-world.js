import * as THREE from '../vendor/three/three.module.js';

// Authored scenery for AFTERLIGHT. The controller owns physics, camera and light.
// Every walking surface is at Y = 0; every visual resource is owned and disposed here.
export function createUniverseWorld(scene, region = 'observatory') {
  if (!['observatory', 'chronos', 'resonance', 'cinema'].includes(region)) throw new Error(`Unknown region: ${region}`);
  const root = new THREE.Group();
  root.name = `AFTERLIGHT / ${region}`;
  scene.add(root);
  const staticRoot = new THREE.Group();
  root.add(staticRoot);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  let lowQuality = false, disposed = false, lastEra = -1, lastFilmCount = -1;
  let seed = 607 + ['observatory', 'chronos', 'resonance', 'cinema'].indexOf(region) * 137;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const geo = (g) => { geometries.add(g); return g; };
  const standard = (color, options = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: .63, metalness: .12, flatShading: true, ...options });
    materials.add(m); return m;
  };
  const basic = (color, options = {}) => {
    const m = new THREE.MeshBasicMaterial({ color, ...options }); materials.add(m); return m;
  };
  const paint = {
    stone: standard('#303a52'), dark: standard('#141d33'), cliff: standard('#202a42'), edge: standard('#52647a'),
    ivory: standard('#ede3c9'), bronze: standard('#ac7c4b', { metalness: .67, roughness: .34 }),
    brass: standard('#e4b86b', { metalness: .7, roughness: .29 }), copper: standard('#c97758'),
    violet: standard('#7f68a4'), blue: standard('#537fa1'), teal: standard('#55ada4'), grass: standard('#668c8c'),
    yellow: standard('#ffb53d', { roughness: .72 }), suit: standard('#eedeca'), boot: standard('#39414d'),
    glass: standard('#182940', { metalness: .65, roughness: .13 }),
    light: basic('#ffe0a0'), mint: basic('#8dfbe3'), pink: basic('#efa8dc'), lilac: basic('#b4b0ff'),
    ink: basic('#070d23'),
  };
  const shapes = {
    box: geo(new THREE.BoxGeometry(1, 1, 1)), cylinder: geo(new THREE.CylinderGeometry(1, 1, 1, 16)),
    column: geo(new THREE.CylinderGeometry(1, 1, 1, 8)), sphere: geo(new THREE.SphereGeometry(1, 18, 12)),
    rock: geo(new THREE.IcosahedronGeometry(1)), cone: geo(new THREE.ConeGeometry(1, 1, 8)), plane: geo(new THREE.PlaneGeometry(1, 1)),
  };
  const yAxis = new THREE.Vector3(0, 1, 0);
  const startVector = new THREE.Vector3(), direction = new THREE.Vector3();
  function mesh(shape, finish, parent = staticRoot, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const m = new THREE.Mesh(shape, finish); m.position.set(...position); m.scale.set(...scale); m.rotation.set(...rotation);
    m.castShadow = !finish.isMeshBasicMaterial; m.receiveShadow = !finish.isMeshBasicMaterial; parent.add(m); return m;
  }
  function group(parent = staticRoot, position = [0, 0, 0]) { const g = new THREE.Group(); g.position.set(...position); parent.add(g); return g; }
  const box = (m, p, pos, scale, rot) => mesh(shapes.box, m, p, pos, scale, rot);
  const cylinder = (m, p, pos, scale, rot) => mesh(shapes.cylinder, m, p, pos, scale, rot);
  const sphere = (m, p, pos, scale, rot) => mesh(shapes.sphere, m, p, pos, scale, rot);
  function ring(radius, thickness, finish, parent = staticRoot, position = [0, 0, 0], rotation = [Math.PI / 2, 0, 0], segments = 64) {
    return mesh(geo(new THREE.TorusGeometry(radius, thickness, 6, segments)), finish, parent, position, [1, 1, 1], rotation);
  }
  function rod(from, to, radius, finish, parent = staticRoot) {
    startVector.set(...from); direction.set(...to).sub(startVector);
    const m = mesh(shapes.column, finish, parent);
    m.position.copy(startVector).addScaledVector(direction, .5); m.scale.set(radius, direction.length(), radius);
    m.quaternion.setFromUnitVectors(yAxis, direction.normalize()); return m;
  }
  function textureCanvas(width, height, draw) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); if (!ctx) return null;
    draw(ctx, width, height);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.add(t); return t;
  }

  // The sky is procedural: no downloaded textures, imagery or remote dependencies.
  const starPositions = [], starColors = [];
  const tempColor = new THREE.Color();
  for (let i = 0; i < 950; i++) {
    const angle = random() * Math.PI * 2, elevation = (random() - .25) * 1.8, distance = 45 + random() * 85;
    starPositions.push(Math.cos(angle) * distance, 6 + Math.sin(elevation) * distance, Math.sin(angle) * distance);
    tempColor.set(['#ebe6ff', '#f9cd9a', '#95d4f6'][i % 3]); tempColor.multiplyScalar(.5 + random() * .5);
    starColors.push(tempColor.r, tempColor.g, tempColor.b);
  }
  const starsGeo = geo(new THREE.BufferGeometry());
  starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starsMat = new THREE.PointsMaterial({ size: .11, vertexColors: true, transparent: true, opacity: .9, depthWrite: false, sizeAttenuation: true }); materials.add(starsMat);
  const stars = new THREE.Points(starsGeo, starsMat); root.add(stars);
  const mistTexture = textureCanvas(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(211,189,255,.3)'); g.addColorStop(.3, 'rgba(130,108,221,.14)'); g.addColorStop(1, 'rgba(60,30,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  if (mistTexture) {
    const mistMat = new THREE.SpriteMaterial({ map: mistTexture, color: region === 'chronos' ? '#ed91cb' : '#739fe8', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .85 });
    materials.add(mistMat);
    const mist = new THREE.Sprite(mistMat); mist.position.set(-12, 13, -32); mist.scale.set(92, 43, 1); root.add(mist);
  }

  // A real, shaded ringed planet is the horizon rather than a wallpaper.
  const planet = group(root, [-22, 12, -28]); planet.rotation.z = -.3;
  const planetGeo = geo(new THREE.SphereGeometry(8.2, 48, 32));
  const p = planetGeo.attributes.position, colors = new Float32Array(p.count * 3);
  const palettes = region === 'chronos' ? ['#a094c8', '#645e94', '#c1a1bd', '#807fb5'] : ['#be8979', '#d9b39b', '#867589', '#ead0a7'];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), band = Math.sin(y * 2.7) * .35 + Math.sin(y * 8) * .12;
    tempColor.set(palettes[Math.floor((y + 8.3) * .73) % palettes.length]); tempColor.multiplyScalar(.92 + band * .15);
    tempColor.toArray(colors, i * 3);
  }
  planetGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const planetMat = standard('#ffffff', { vertexColors: true, flatShading: false, roughness: .95 });
  const planetBody = mesh(planetGeo, planetMat, planet); planetBody.castShadow = planetBody.receiveShadow = false;
  const planetRings = group(planet); planetRings.rotation.x = Math.PI / 2 - .2; planetRings.rotation.y = -.2;
  for (let i = 0; i < 4; i++) {
    const ringMat = basic(['#c9b8b6', '#c19986', '#dcd0b9', '#9686a1'][i], { side: THREE.DoubleSide, transparent: true, opacity: [.43, .22, .5, .27][i], depthWrite: false });
    mesh(geo(new THREE.RingGeometry(10 + i * .95, 10.65 + i * .95, 100)), ringMat, planetRings);
  }
  const moon = sphere(paint.ivory, root, [24, 15, -30], [2.8, 2.8, 2.8]); moon.castShadow = false;
  const outerDebris = group(root);
  for (let i = 0; i < 27; i++) {
    const a = i / 27 * Math.PI * 2, radius = 15 + random() * 12, size = .25 + random() * 1.1;
    mesh(shapes.rock, i % 3 ? paint.cliff : paint.violet, outerDebris, [Math.cos(a) * radius, -5 - random() * 9, Math.sin(a) * radius], [size * 1.8, size, size * 1.4], [random(), random() * 5, random()]);
  }

  function platform(cx, width, depth = 14) {
    box(paint.stone, staticRoot, [cx, -.22, 0], [width, .44, depth]);
    box(paint.bronze, staticRoot, [cx, -.51, 0], [width + .07, .12, depth + .07]);
    box(paint.cliff, staticRoot, [cx, -.99, 0], [width - .36, .88, depth - .28]);
    box(paint.dark, staticRoot, [cx, -1.61, 0], [width - 1.1, .4, depth - .94]);
    for (let i = 0; i < 15; i++) {
      const x = cx + (random() - .5) * (width - 1), z = (random() - .5) * (depth - 1);
      const h = 1 + random() * 1.8;
      mesh(shapes.rock, i % 4 ? paint.cliff : paint.edge, staticRoot, [x, -1.9, z], [1.1 + random(), h, 1.1 + random()], [0, random() * 4, 0]);
    }
    // Fine brass inlays make the floor read as an observatory instrument.
    for (const z of [-6.64, 6.64]) box(paint.bronze, staticRoot, [cx, .011, z], [width - .65, .02, .035]);
    for (const x of [cx - width / 2 + .35, cx + width / 2 - .35]) box(paint.bronze, staticRoot, [x, .011, 0], [.035, .02, depth - .7]);
    for (let z = -5; z <= 5; z += 2) box(paint.edge, staticRoot, [cx, .006, z], [width - .8, .012, .014]);
    for (let x = cx - width / 2 + 2; x < cx + width / 2 - 1; x += 2) box(paint.edge, staticRoot, [x, .006, 0], [.014, .012, depth - .8]);
    for (const z of [-6.5, 6.5]) for (const x of [cx - width / 2 + .55, cx + width / 2 - .55]) {
      cylinder(paint.bronze, staticRoot, [x, .15, z], [.14, .3, .14]);
      cylinder(paint.light, staticRoot, [x, .34, z], [.08, .12, .08]);
    }
  }
  if (region === 'chronos') { platform(-5.5, 7); platform(5.5, 7); }
  else platform(0, 18);
  // Substructure visible when crossing the edge: suspended architectural roots.
  const underCrystal = mesh(shapes.rock, paint.mint, root, [0, -4.3, 0], [.7, 1.5, .7]);
  if (region === 'chronos') underCrystal.position.x = -5.5;
  for (const x of region === 'chronos' ? [-5.5, 5.5] : [-5, 5]) {
    rod([x - 2, -1.5, -4], [x, -4, 0], .085, paint.bronze);
    rod([x + 2, -1.5, 4], [x, -4, 0], .085, paint.bronze);
  }
  if (region !== 'chronos') {
    ring(5.8, .019, paint.bronze, staticRoot, [0, .025, 0]);
    ring(5.55, .008, paint.bronze, staticRoot, [0, .025, 0]);
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      box(i % 4 ? paint.edge : paint.brass, staticRoot, [Math.cos(a) * 5.69, .035, Math.sin(a) * 5.69], [i % 4 ? .1 : .2, .02, .025], [0, -a, 0]);
    }
  }
  // Long glowing horizon gate behind each stage provides a unifying silhouette.
  const arc = group(staticRoot, [0, 0, -6.4]);
  ring(6.8, .105, paint.bronze, arc, [0, 1, 0], [0, 0, 0]);
  ring(6.55, .025, paint.light, arc, [0, 1, 0], [0, 0, 0]);
  for (const x of [-6.5, 6.5]) {
    cylinder(paint.bronze, staticRoot, [x, .4, -6.1], [.36, .8, .36]);
    mesh(shapes.rock, paint.ivory, staticRoot, [x, .93, -6.1], [.25, .4, .25]);
  }

  const orbitRings = [], orbitPlanets = [], dialPointers = [], towerHalos = [];
  let clockHand = null, timeBridge = null, pastGarden = null, futureGarden = null, timeShard = null;
  let filmSurface = null, filmTexture = null, filmContext = null;
  const ripples = [];
  const constellation = group(root, [0, 6.2, -4.5]);
  constellation.visible = false;
  const lineGeo = geo(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3, .1, 0), new THREE.Vector3(-1.2, 1.2, .1), new THREE.Vector3(.3, .15, 0),
    new THREE.Vector3(2, 2.2, 0), new THREE.Vector3(3, .7, 0), new THREE.Vector3(.3, .15, 0),
  ]));
  const lineMat = new THREE.LineBasicMaterial({ color: '#c8fff3', transparent: true, opacity: .8 }); materials.add(lineMat);
  constellation.add(new THREE.Line(lineGeo, lineMat));
  for (const p of [[-3, .1, 0], [-1.2, 1.2, .1], [.3, .15, 0], [2, 2.2, 0], [3, .7, 0]]) sphere(paint.mint, constellation, p, [.08, .08, .08]);

  function pedestal(x, z, color = paint.brass, size = .56) {
    cylinder(paint.dark, staticRoot, [x, .08, z], [size * 1.23, .16, size * 1.23]);
    cylinder(paint.bronze, staticRoot, [x, .45, z], [size * .64, .8, size * .64]);
    cylinder(color, staticRoot, [x, .88, z], [size, .1, size]);
    ring(size * .82, .022, paint.light, staticRoot, [x, .94, z]);
  }
  if (region === 'observatory') {
    const orrery = group(root, [0, 4, -4]);
    sphere(paint.light, orrery, [0, 0, 0], [.62, .62, .62]);
    const haloMaterial = basic('#ffbe73', { transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    sphere(haloMaterial, orrery, [0, 0, 0], [1.05, 1.05, 1.05]);
    for (let i = 0; i < 3; i++) {
      const g = group(orrery); g.rotation.z = [.32, -.65, .8][i]; g.rotation.x = [.35, .4, -.2][i];
      ring(1.2 + i * .61, .043, paint.brass, g);
      ring(1.16 + i * .61, .009, [paint.mint, paint.pink, paint.lilac][i], g);
      const orb = sphere([paint.teal, paint.copper, paint.violet][i], g, [1.2 + i * .61, 0, 0], [.19 + i * .065, .19 + i * .065, .19 + i * .065]);
      orbitRings.push(g); orbitPlanets.push(orb);
      const x = [-5, 0, 5][i], z = [-2, -3, -2][i]; pedestal(x, z);
      for (let tick = 0; tick < 8; tick++) {
        const a = tick / 8 * Math.PI * 2;
        box(tick === [2, 5, 1][i] ? paint.light : paint.dark, staticRoot, [x + Math.sin(a) * .4, .95, z + Math.cos(a) * .4], [.07, .025, .1], [0, a, 0]);
      }
      const needle = group(root, [x, .97, z]);
      box([paint.mint, paint.pink, paint.lilac][i], needle, [0, 0, .19], [.07, .025, .42]); dialPointers.push(needle);
      // Low luminous cables connect each tactile dial with the floating model.
      rod([x, .03, z - .65], [x * .35, .03, -4.9], .022, paint.bronze);
      sphere([paint.mint, paint.pink, paint.lilac][i], staticRoot, [x * .35, .08, -4.9], [.1, .1, .1]);
    }
    // Telescope, brass optics, mechanical tripod, eyepiece.
    const telescope = group(staticRoot, [0, 0, -5.5]);
    rod([0, .85, 0], [-.5, .03, .3], .065, paint.brass, telescope);
    rod([0, .85, 0], [.5, .03, .3], .065, paint.brass, telescope);
    rod([0, .85, 0], [0, .03, -.5], .065, paint.brass, telescope);
    const optics = group(telescope, [0, 1.2, 0]); optics.rotation.x = -.9;
    cylinder(paint.ivory, optics, [0, .1, 0], [.2, 1.25, .2]);
    cylinder(paint.brass, optics, [0, .72, 0], [.24, .16, .24]);
    cylinder(paint.glass, optics, [0, .815, 0], [.185, .02, .185]);
    cylinder(paint.dark, optics, [0, -.6, 0], [.09, .3, .09]);
  }

  if (region === 'chronos') {
    timeBridge = group(root);
    box(paint.bronze, timeBridge, [0, -.18, 0], [4.65, .36, 2]);
    for (let x = -2.15; x < 2.3; x += .42) box(paint.ivory, timeBridge, [x, .015, 0], [.38, .05, 1.83]);
    for (const z of [-.94, .94]) { rod([-2.3, .12, z], [2.3, .12, z], .04, paint.light, timeBridge); }
    const ghostMat = basic('#b79dfa', { transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false });
    box(ghostMat, root, [0, -.25, 0], [4.6, .05, 2]);
    const clock = group(staticRoot, [0, 4.6, -3.8]);
    ring(2.15, .16, paint.bronze, clock, [0, 0, 0], [0, 0, 0]);
    ring(1.93, .027, paint.light, clock, [0, 0, .03], [0, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      box(paint.ivory, clock, [Math.sin(a) * 1.74, Math.cos(a) * 1.74, .05], [.055, i % 3 ? .17 : .31, .09], [0, 0, -a]);
    }
    clockHand = group(root, [0, 4.6, -3.65]);
    box(paint.brass, clockHand, [0, .68, 0], [.09, 1.36, .08]);
    box(paint.light, clockHand, [.42, 0, 0], [.84, .06, .09]); sphere(paint.light, clockHand, [0, 0, .07], [.12, .12, .12]);
    pastGarden = group(root); futureGarden = group(root);
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      const x = side * (3 + random() * 5), z = -5.7 + random() * .8;
      rod([x, 0, z], [x, 1.3 + random() * 1.1, z], .09, paint.bronze, pastGarden);
      for (let j = 0; j < 3; j++) mesh(shapes.rock, paint.grass, pastGarden, [x + (random() - .5) * .6, 1.6 + j * .32, z], [.4, .65, .35], [0, j, .3]);
      mesh(shapes.rock, paint.violet, futureGarden, [x, .7 + random(), z], [.35, 1.1, .33], [0, i, .3]);
      rod([x, 0, z], [x + .4, .8, z], .085, paint.dark, futureGarden);
    }
    for (const x of [-7.6, 7.6]) {
      box(paint.ivory, pastGarden, [x, .42, -4.5], [1.25, .12, .46]);
      box(paint.bronze, pastGarden, [x - .42, .18, -4.5], [.12, .36, .3]);
      box(paint.bronze, pastGarden, [x + .42, .18, -4.5], [.12, .36, .3]);
      box(paint.cliff, futureGarden, [x, .2, -4.5], [1.25, .12, .46], [.2, 0, -.15]);
    }
    pedestal(6, -3, paint.lilac);
    timeShard = group(root, [6, 1.3, -3]);
    mesh(shapes.rock, paint.lilac, timeShard, [0, 0, 0], [.2, .45, .2]);
    ring(.37, .018, paint.light, timeShard, [0, 0, 0], [Math.PI / 3, .4, 0]);
    pedestal(-5, -1, paint.brass);
    ring(.42, .045, paint.light, staticRoot, [-5, 1.3, -1], [Math.PI / 2.6, 0, 0]);
  }

  const musicColors = [paint.mint, paint.pink, paint.light, paint.lilac];
  if (region === 'resonance') {
    for (let i = 0; i < 4; i++) {
      const x = [-5, -1.7, 1.7, 5][i]; pedestal(x, -2, paint.bronze, .74);
      const tone = group(staticRoot, [x, 1, -2]);
      if (i === 0) for (let k = 0; k < 4; k++) cylinder(paint.teal, tone, [(k - 1.5) * .19, .5, 0], [.066, .6 + k * .27, .066]);
      if (i === 1) { ring(.51, .07, paint.copper, tone, [0, .47, 0], [0, 0, 0]); sphere(paint.pink, tone, [0, .47, 0], [.08, .08, .08]); }
      if (i === 2) { mesh(shapes.cone, paint.brass, tone, [0, .42, 0], [.5, .7, .5], [Math.PI, 0, 0]); sphere(paint.light, tone, [0, .05, 0], [.13, .13, .13]); }
      if (i === 3) for (let k = 0; k < 3; k++) box(paint.violet, tone, [0, .3 + k * .28, 0], [.9 - k * .15, .1, .45], [0, k * .35, 0]);
      const halo = ring(.84, .018, musicColors[i], root, [x, 1.45, -2], [0, 0, 0]);
      halo.name = `Chime feedback ${i}`; towerHalos.push(halo);
      rod([x, .025, -1.1], [x * .25, .025, 1.8], .025, paint.bronze);
    }
    box(paint.dark, staticRoot, [0, .48, 3], [3.7, .96, 1.25]);
    box(paint.bronze, staticRoot, [0, .96, 3], [3.8, .1, 1.32]);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      box(paint.ivory, staticRoot, [(col - 3.5) * .42, 1.025, 3 + (row - 1.5) * .26], [.33, .04, .19]);
    }
    // The instrument itself is the architecture: eight suspended strings.
    for (let i = 0; i < 8; i++) {
      const x = (i - 3.5) * 1.25;
      rod([x, .2, -5.5], [x, 4.5 - Math.abs(x) * .22, -5.5], .025, i % 2 ? paint.bronze : paint.brass);
      sphere(musicColors[i % 4], staticRoot, [x, 4.5 - Math.abs(x) * .22, -5.5], [.13, .13, .13]);
    }
    for (let i = 0; i < 3; i++) {
      const mat = basic(['#8dfbe3', '#efa8dc', '#b4b0ff'][i], { transparent: true, opacity: .25, depthWrite: false });
      const ripple = ring(1, .018, mat, root, [0, .07, -2]);
      ripple.name = `Sound ripple ${i}`; ripples.push(ripple);
    }
  }

  if (region === 'cinema') {
    // A small cinema built for nobody and for anyone: original procedural projection.
    box(paint.bronze, staticRoot, [0, 2.9, -5.6], [9.2, 5.1, .2]);
    box(paint.dark, staticRoot, [0, 2.9, -5.43], [8.92, 4.85, .18]);
    filmTexture = textureCanvas(640, 360, () => {});
    if (filmTexture) filmContext = filmTexture.image.getContext('2d');
    const filmMat = basic('#ffffff', { map: filmTexture });
    filmSurface = mesh(shapes.plane, filmMat, root, [0, 2.9, -5.3], [8.5, 4.5, 1]);
    for (const x of [-4.2, 4.2]) cylinder(paint.bronze, staticRoot, [x, .55, -5.6], [.09, 1.1, .09]);
    pedestal(0, -2, paint.bronze, .7);
    box(paint.dark, staticRoot, [0, 1.1, -2], [.65, .45, .8]);
    cylinder(paint.brass, staticRoot, [0, 1.16, -2.52], [.18, .4, .18], [Math.PI / 2, 0, 0]);
    cylinder(paint.light, staticRoot, [0, 1.16, -2.74], [.13, .02, .13], [Math.PI / 2, 0, 0]);
    for (const x of [-.26, .26]) ring(.25, .055, paint.edge, staticRoot, [x, 1.5, -2], [0, Math.PI / 2, 0]);
    const projection = basic('#c4c8ff', { transparent: true, opacity: .055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const cone = mesh(geo(new THREE.ConeGeometry(2.9, 4, 4, 1, true)), projection, root, [0, 2.03, -3.95], [1, 1, .56]);
    cone.rotation.x = -Math.PI / 2 - .34; cone.rotation.y = Math.PI / 4;
    for (const x of [-6.6, 6.6]) for (const z of [-2, 0, 2]) {
      box(paint.copper, staticRoot, [x, .46, z], [.85, .18, .8]);
      box(paint.copper, staticRoot, [x, .85, z + .3], [.85, .75, .15], [-.12, 0, 0]);
      for (const dx of [-.32, .32]) rod([x + dx, 0, z], [x + dx, .4, z], .05, paint.bronze);
    }
  }

  const treasures = [];
  [[-7, 3], [7, 4], [4, 5]].forEach(([x, z], i) => {
    const g = group(root, [x, .9, z]);
    cylinder(paint.bronze, staticRoot, [x, .09, z], [.32, .18, .32]);
    ring(.4, .017, [paint.mint, paint.pink, paint.light][i], staticRoot, [x, .05, z]);
    if (i === 0) {
      mesh(shapes.rock, paint.mint, g, [0, 0, 0], [.2, .34, .2]);
      ring(.33, .013, paint.light, g, [0, 0, 0], [.8, .4, .2]);
    } else if (i === 1) {
      for (const y of [-.2, .2]) cylinder(paint.brass, g, [0, y, 0], [.21, .035, .21]);
      mesh(shapes.cone, paint.pink, g, [0, .08, 0], [.15, .2, .15], [Math.PI, 0, 0]);
      mesh(shapes.cone, paint.pink, g, [0, -.08, 0], [.15, .2, .15]);
      for (const x of [-.17, .17]) rod([x, -.2, 0], [x, .2, 0], .015, paint.brass, g);
    } else {
      box(paint.ivory, g, [0, 0, 0], [.47, .31, .12]);
      for (const x of [-.115, .115]) ring(.067, .018, paint.dark, g, [x, .02, .07], [0, 0, 0], 16);
      box(paint.copper, g, [0, -.075, .073], [.21, .055, .012]);
    }
    treasures.push({ object: g, id: `${region}-${i + 1}`, phase: i * 1.9 });
  });

  const character = group(root); character.name = 'The traveller';
  const body = group(character);
  sphere(paint.yellow, body, [0, .62, 0], [.26, .32, .21]);
  box(paint.yellow, body, [0, .44, 0], [.45, .17, .35]);
  sphere(paint.suit, body, [0, 1.06, 0], [.3, .29, .29]);
  sphere(paint.glass, body, [0, 1.08, .155], [.246, .2, .16]);
  sphere(paint.ivory, body, [-.13, 1.16, .271], [.046, .026, .009]);
  ring(.23, .027, paint.bronze, body, [0, .856, 0]);
  box(paint.ivory, body, [0, .62, -.25], [.34, .4, .18]);
  cylinder(paint.bronze, body, [-.19, .67, -.28], [.056, .34, .056]);
  cylinder(paint.bronze, body, [.19, .67, -.28], [.056, .34, .056]);
  box(paint.dark, body, [0, .69, .212], [.17, .13, .025]);
  sphere(paint.mint, body, [.05, .7, .234], [.023, .023, .015]);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = group(character, [side * .12, .36, 0]);
    cylinder(paint.suit, leg, [0, -.13, 0], [.085, .27, .085]);
    box(paint.boot, leg, [0, -.29, .035], [.17, .12, .24]); legs.push(leg);
    const arm = group(character, [side * .25, .73, 0]);
    cylinder(paint.yellow, arm, [side * .025, -.13, 0], [.088, .27, .088], [0, 0, side * .12]);
    sphere(paint.suit, arm, [side * .045, -.29, 0], [.084, .095, .084]); arms.push(arm);
  }
  const footHalo = basic('#d6cbeb', { transparent: true, opacity: .13, depthWrite: false });
  mesh(geo(new THREE.CircleGeometry(.38, 24)), footHalo, character, [0, .016, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  const comet = group(root, [-18, 12, -8]);
  sphere(paint.light, comet, [0, 0, 0], [.12, .12, .12]);
  const tailMaterial = basic('#b4b7ff', { transparent: true, opacity: .33, depthWrite: false });
  mesh(shapes.cone, tailMaterial, comet, [-1.4, 0, 0], [.09, 2.8, .09], [0, 0, -Math.PI / 2]);

  // Static detail is baked by material. Small moving assemblies are baked locally.
  function bake(container, destination = root) {
    root.updateMatrixWorld(true); destination.updateMatrixWorld(true);
    const inverse = destination.matrixWorld.clone().invert(), transform = new THREE.Matrix4(), batches = new Map();
    const transparent = [];
    container.traverse((m) => {
      if (!m.isMesh) return;
      if (m.material.transparent || m.material.map || m.geometry.attributes.color) { transparent.push(m); return; }
      if (!batches.has(m.material)) batches.set(m.material, []);
      batches.get(m.material).push(m);
    });
    for (const [finish, list] of batches) {
      const chunks = []; let count = 0;
      for (const item of list) {
        let g = item.geometry.clone();
        if (g.index) { const indexed = g; g = indexed.toNonIndexed(); indexed.dispose(); }
        transform.multiplyMatrices(inverse, item.matrixWorld); g.applyMatrix4(transform);
        count += g.attributes.position.array.length; chunks.push(g);
      }
      const positions = new Float32Array(count), normals = new Float32Array(count); let offset = 0;
      for (const g of chunks) { positions.set(g.attributes.position.array, offset); normals.set(g.attributes.normal.array, offset); offset += g.attributes.position.array.length; g.dispose(); }
      const combined = geo(new THREE.BufferGeometry());
      combined.setAttribute('position', new THREE.BufferAttribute(positions, 3)); combined.setAttribute('normal', new THREE.BufferAttribute(normals, 3)); combined.computeBoundingSphere();
      mesh(combined, finish, destination).name = 'Authored scenery batch';
      for (const item of list) item.removeFromParent();
    }
    if (container !== destination) { for (const m of transparent) destination.attach(m); container.removeFromParent(); }
  }
  bake(staticRoot);
  bake(outerDebris, outerDebris); bake(body, body);
  for (const g of [...legs, ...arms, ...dialPointers, ...treasures.map(t => t.object)]) bake(g, g);
  if (timeBridge) bake(timeBridge, timeBridge);
  if (pastGarden) bake(pastGarden, pastGarden);
  if (futureGarden) bake(futureGarden, futureGarden);
  if (clockHand) bake(clockHand, clockHand);

  const shadowSettings = new WeakMap();
  root.traverse(object => { if (object.isMesh) shadowSettings.set(object, object.castShadow); });
  let frame = 0;
  function drawFilm(elapsed, count) {
    if (!filmContext) return;
    const ctx = filmContext, w = 640, h = 360, t = elapsed * .16;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#100f2d'); sky.addColorStop(.65, count ? '#775383' : '#244f70'); sky.addColorStop(1, '#efae8e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 65; i++) { const x = (i * 193.7) % w, y = (i * 83.3) % 230; ctx.fillStyle = `rgba(241,230,216,${.35 + Math.sin(i + t) * .25})`; ctx.fillRect(x, y, i % 7 ? 1 : 2, i % 7 ? 1 : 2); }
    ctx.fillStyle = '#e7cbaa'; ctx.beginPath(); ctx.arc(410 + Math.sin(t) * 20, 120, 42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ecd6bc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(410 + Math.sin(t) * 20, 120, 76, 12, -.3, 0, Math.PI * 2); ctx.stroke();
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#444866', '#292d49', '#131c34'][layer]; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, 250 + layer * 28 + Math.sin(x * .009 + layer + t * .15) * 26 + Math.sin(x * .025 + layer * 4) * 13);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#f4dfc3'; ctx.textAlign = 'center'; ctx.font = '11px monospace'; ctx.fillText('SOMEWHERE, THE LIGHT IS STILL TRAVELLING.', w / 2, 330);
    filmTexture.needsUpdate = true;
  }
  function update(state, dt, elapsed, motion = {}) {
    if (disposed) return;
    const t = motion.reduced ? 0 : elapsed;
    const stride = motion.moving && !motion.reduced ? Math.sin((motion.step ?? elapsed * 8) * 1.8) * .48 : 0;
    legs[0].rotation.x = stride; legs[1].rotation.x = -stride; arms[0].rotation.x = -stride * .7; arms[1].rotation.x = stride * .7;
    body.position.y = motion.moving && !motion.reduced ? Math.abs(Math.sin((motion.step ?? elapsed * 8) * 1.8)) * .025 : 0;
    underCrystal.rotation.y = t * .2;
    planet.rotation.y = t * .009; outerDebris.rotation.y = t * .007;
    stars.rotation.y = t * .002;
    for (let i = 0; i < treasures.length; i++) {
      const item = treasures[i]; item.object.visible = !(state.discoveries || []).includes(item.id);
      item.object.position.y = .9 + Math.sin(t * 1.5 + item.phase) * .1; item.object.rotation.y = t * .5 + item.phase;
    }
    const orbit = state.orbit || [0, 0, 0];
    for (let i = 0; i < orbitRings.length; i++) {
      const angle = orbit[i] * Math.PI / 4;
      orbitRings[i].rotation.y += (angle - orbitRings[i].rotation.y) * (motion.reduced ? 1 : 1 - Math.exp(-dt * 5));
      dialPointers[i].rotation.y = angle;
      orbitPlanets[i].rotation.y = t * .4;
    }
    constellation.visible = region === 'observatory' && Boolean(state.starsAligned);
    if (clockHand) clockHand.rotation.z = state.era === 0 ? -.65 + Math.sin(t * .4) * .035 : 1.5 + Math.sin(t) * .012;
    if (pastGarden && lastEra !== state.era) {
      pastGarden.visible = state.era === 0; futureGarden.visible = state.era !== 0; timeBridge.visible = state.era === 0; lastEra = state.era;
    }
    if (timeShard) { timeShard.visible = !state.timeShard && state.era === 1; timeShard.position.y = 1.3 + Math.sin(t * 1.6) * .12; timeShard.rotation.y = t * .55; }
    // The controller owns this brief feedback. It clears motion.tone to -1
    // after a chime; neither saved progress nor audio permission controls it.
    const tone = Number.isInteger(motion.tone) && motion.tone >= 0 && motion.tone < 4 ? motion.tone : -1;
    for (let i = 0; i < towerHalos.length; i++) {
      const active = tone === i;
      towerHalos[i].rotation.y = t * .28 + i * .5;
      towerHalos[i].scale.setScalar(active ? 1.18 + Math.sin(t * 5) * .06 : 1);
    }
    for (let i = 0; i < ripples.length; i++) {
      const phase = (t * .25 + i / 3) % 1;
      ripples[i].visible = Boolean(state.resonance) || tone !== -1;
      ripples[i].scale.setScalar(1 + phase * 5); ripples[i].material.opacity = (1 - phase) * .22;
    }
    if (filmSurface && ((!lowQuality && frame % 4 === 0 && !motion.reduced) || frame === 0 || lastFilmCount !== state.filmSeen?.length)) {
      drawFilm(t, state.filmSeen?.length || 0); lastFilmCount = state.filmSeen?.length;
    }
    const cometPhase = (t % 19) / 19;
    comet.visible = !motion.reduced && !lowQuality && cometPhase < .2;
    comet.position.set(-23 + cometPhase * 190, 13 - cometPhase * 17, -13);
    frame++;
  }
  function setQuality(low) {
    lowQuality = Boolean(low); starsGeo.setDrawRange(0, low ? 380 : 950); outerDebris.visible = !low;
    root.traverse((object) => { if (object.isMesh) object.castShadow = !low && shadowSettings.get(object); });
  }
  function dispose() {
    if (disposed) return; disposed = true; root.removeFromParent();
    for (const value of geometries) value.dispose(); for (const value of materials) value.dispose(); for (const value of textures) value.dispose();
    geometries.clear(); materials.clear(); textures.clear();
  }
  return { character, update, setQuality, dispose };
}
