import * as THREE from '../vendor/three/three.module.js';

// An authored miniature: metres, Y up, with all traversable surfaces at Y = 0.
// Gameplay and lighting belong to the controller; this module owns the scenery.
export function createWorld(scene) {
  const root = new THREE.Group();
  root.name = 'The Night Shift — coast';
  scene.add(root);
  const landscape = new THREE.Group();
  root.add(landscape);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const up = new THREE.Vector3(0, 1, 0);
  const dummy = new THREE.Object3D();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  let lowQuality = false;
  let disposed = false;
  let completionTime = null;

  const geometry = (value) => { geometries.add(value); return value; };
  const material = (color, extras = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .84, flatShading: true, ...extras });
    materials.add(value);
    return value;
  };
  const basic = (color, extras = {}) => {
    const value = new THREE.MeshBasicMaterial({ color, ...extras });
    materials.add(value);
    return value;
  };
  const paint = {
    sand: material('#e6d7b0'),
    path: material('#f0e2c2'),
    stone: material('#b9b4a0'),
    cliff: material('#a0a9a4'),
    cliffDark: material('#798f91'),
    chalk: material('#f0e5ca'),
    cream: material('#fff0ca'),
    teal: material('#315f62'),
    roof: material('#345c65'),
    roofLight: material('#46747a'),
    coral: material('#d77859'),
    coralDark: material('#a35242'),
    wood: material('#ad8260'),
    woodLight: material('#ca9f70'),
    woodDark: material('#725c4e'),
    brass: material('#bf9959', { metalness: .48, roughness: .43 }),
    steel: material('#697c7a', { metalness: .62, roughness: .5 }),
    dark: material('#283f43'),
    grass: material('#809572'),
    grassLight: material('#a1ad7c'),
    pine: material('#467569'),
    pineDark: material('#365f5b'),
    rope: material('#d7c39b'),
    white: material('#fff6dc'),
    yellow: material('#f2b84d'),
    jacket: material('#e89d38'),
    skin: material('#eec19b'),
    black: material('#23343a'),
    glass: material('#9bd9d1', { metalness: .2, roughness: .22 }),
    window: material('#efbc70', { emissive: '#b77830', emissiveIntensity: .16 }),
    water: material('#548e9e', { metalness: .18, roughness: .43, flatShading: false }),
    foam: basic('#b1d7d7', { transparent: true, opacity: .35, depthWrite: false }),
  };
  const unit = {
    box: geometry(new THREE.BoxGeometry(1, 1, 1)),
    cylinder: geometry(new THREE.CylinderGeometry(1, 1, 1, 12)),
    cylinder8: geometry(new THREE.CylinderGeometry(1, 1, 1, 8)),
    cone: geometry(new THREE.ConeGeometry(1, 1, 7)),
    sphere: geometry(new THREE.SphereGeometry(1, 10, 7)),
    rock: geometry(new THREE.DodecahedronGeometry(1, 0)),
    ico: geometry(new THREE.IcosahedronGeometry(1, 0)),
    plane: geometry(new THREE.PlaneGeometry(1, 1)),
  };

  function mesh(shape, finish, parent = landscape, position = [0, 0, 0], scale = [1, 1, 1], rotation) {
    const object = new THREE.Mesh(shape, finish);
    object.position.set(...position);
    object.scale.set(...scale);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (finish, parent, position, scale, rotation) => mesh(unit.box, finish, parent, position, scale, rotation);
  const cylinder = (finish, parent, position, scale, rotation) => mesh(unit.cylinder, finish, parent, position, scale, rotation);
  const sphere = (finish, parent, position, scale, rotation) => mesh(unit.sphere, finish, parent, position, scale, rotation);
  function group(parent = landscape, position = [0, 0, 0], rotation = 0) {
    const object = new THREE.Group();
    object.position.set(...position);
    object.rotation.y = rotation;
    parent.add(object);
    return object;
  }
  function rod(start, end, radius, finish, parent = landscape) {
    const object = mesh(unit.cylinder8, finish, parent);
    setRod(object, start, end, radius);
    return object;
  }
  function setRod(object, start, end, radius) {
    v1.set(...start);
    v2.set(...end).sub(v1);
    object.position.copy(v1).addScaledVector(v2, .5);
    object.scale.set(radius, v2.length(), radius);
    object.quaternion.setFromUnitVectors(up, v2.normalize());
  }
  function ring(radius, tube, finish, parent, position, rotation = [Math.PI / 2, 0, 0]) {
    return mesh(geometry(new THREE.TorusGeometry(radius, tube, 5, 32)), finish, parent, position, [1, 1, 1], rotation);
  }
  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
  const rand = random(17011994);

  // Wide, softly rippled water continues past the camera's horizon.
  const seaGeometry = geometry(new THREE.PlaneGeometry(240, 240, 70, 70));
  const sea = mesh(seaGeometry, paint.water, root, [0, -2.18, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  sea.castShadow = false;
  const duskWater = paint.water.color.clone();
  const sunriseWater = new THREE.Color('#9cae9d');
  let sunriseProgress = 0;
  let sunriseInitialized = false;
  const waterTime = { value: 0 };
  paint.water.onBeforeCompile = (shader) => {
    shader.uniforms.coastTime = waterTime;
    shader.vertexShader = `uniform float coastTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.z += sin(position.x * 0.35 + coastTime * 0.42) * cos(position.y * 0.23 + coastTime * 0.31) * 0.09;',
    );
  };
  paint.water.customProgramCacheKey = () => 'coast-water-v1';

  function roundedOutline(cx, cz, width, depth, radius, segments = 7) {
    const points = [];
    const corners = [
      [cx + width / 2 - radius, cz + depth / 2 - radius, 0],
      [cx - width / 2 + radius, cz + depth / 2 - radius, Math.PI / 2],
      [cx - width / 2 + radius, cz - depth / 2 + radius, Math.PI],
      [cx + width / 2 - radius, cz - depth / 2 + radius, Math.PI * 1.5],
    ];
    for (const [x, z, angle] of corners) {
      for (let i = 0; i <= segments; i++) {
        const a = angle + i / segments * Math.PI / 2;
        points.push(new THREE.Vector2(x + Math.cos(a) * radius, z + Math.sin(a) * radius));
      }
    }
    return points;
  }
  function island(points, cx, cz) {
    const topShape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.y)));
    const top = mesh(geometry(new THREE.ShapeGeometry(topShape)), paint.sand, landscape, [0, -.005, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
    top.castShadow = false;
    const levels = [
      { y: -.03, scale: 1 }, { y: -.35, scale: 1.005 },
      { y: -1.3, scale: .965 }, { y: -3.1, scale: .81 },
    ];
    for (let level = 0; level < levels.length - 1; level++) {
      const vertices = [];
      const a = levels[level];
      const b = levels[level + 1];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const q = points[(i + 1) % points.length];
        const A = [cx + (p.x - cx) * a.scale, a.y, cz + (p.y - cz) * a.scale];
        const B = [cx + (q.x - cx) * a.scale, a.y, cz + (q.y - cz) * a.scale];
        const C = [cx + (q.x - cx) * b.scale, b.y, cz + (q.y - cz) * b.scale];
        const D = [cx + (p.x - cx) * b.scale, b.y, cz + (p.y - cz) * b.scale];
        vertices.push(...A, ...B, ...C, ...A, ...C, ...D);
      }
      const side = geometry(new THREE.BufferGeometry());
      side.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      side.computeVertexNormals();
      mesh(side, [paint.chalk, paint.cliff, paint.cliffDark][level]);
    }
    // Foam follows the rock silhouette rather than an arbitrary round halo.
    const foamVertices = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const A = [cx + (a.x - cx) * .9, -2.075, cz + (a.y - cz) * .9];
      const B = [cx + (b.x - cx) * .9, -2.075, cz + (b.y - cz) * .9];
      const C = [cx + (b.x - cx) * 1.02, -2.075, cz + (b.y - cz) * 1.02];
      const D = [cx + (a.x - cx) * 1.02, -2.075, cz + (a.y - cz) * 1.02];
      foamVertices.push(...A, ...B, ...C, ...A, ...C, ...D);
    }
    const foam = geometry(new THREE.BufferGeometry());
    foam.setAttribute('position', new THREE.Float32BufferAttribute(foamVertices, 3));
    foam.computeVertexNormals();
    const skirt = mesh(foam, paint.foam, root);
    skirt.castShadow = skirt.receiveShadow = false;
  }
  function circleOutline(cx, cz, radius) {
    return Array.from({ length: 40 }, (_, i) => {
      const angle = i / 40 * Math.PI * 2;
      return new THREE.Vector2(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius);
    });
  }
  island(roundedOutline(0, .5, 16, 13, 1.6), 0, .5);
  island(circleOutline(-13, -2, 5), -13, -2);
  island(circleOutline(14, -1, 4.5), 14, -1);

  function patch(x, z, sx, sz, finish = paint.grass) {
    const object = mesh(unit.cylinder, finish, landscape, [x, .017, z], [sx, .025, sz]);
    object.castShadow = false;
  }
  patch(-5.1, -3.55, 2.2, 1.8);
  patch(4.8, -3.6, 2.25, 1.85);
  patch(-4.8, 4.5, 2.05, 1.35, paint.grassLight);
  patch(4.6, 5.2, 1.8, 1.0, paint.grassLight);
  patch(-15.6, -3.1, 1.2, 2.1);
  patch(-11.2, -5.2, 1.65, .8, paint.grassLight);
  patch(15.9, 1.1, 1.1, 1.45);
  patch(15.1, -3.8, 1.4, .7, paint.grassLight);

  function pathStone(x, z, size = .45, rotation = 0) {
    const stone = mesh(unit.cylinder8, paint.path, landscape, [x, .035, z], [size, .07, size * .73], [0, rotation, 0]);
    stone.castShadow = false;
  }
  for (let i = 0; i < 7; i++) pathStone((i % 2 ? .14 : -.13), 4.65 - i * .75, .36 + (i % 3) * .025, i * .9);
  for (let i = 0; i < 8; i++) pathStone(-1.4 - i * .67, .06 + Math.sin(i) * .09, .33, i);
  for (let i = 0; i < 7; i++) pathStone(1.4 + i * .73, -.04 + Math.sin(i * 2) * .08, .35, i);
  for (let i = 0; i < 4; i++) pathStone(11.4 + i * .62, -.1 - i * .31, .3, i);

  function rock(x, z, size, y = -.08, finish = paint.stone) {
    return mesh(unit.rock, finish, landscape, [x, y, z], [size * (1 + rand() * .4), size, size * .8], [rand(), rand() * 5, rand() * .4]);
  }
  // A deliberate coastline leaves the actual puzzle paths completely open.
  const coastRocks = [
    [-6.4, 4.4, .7], [-5.8, 5.5, .48], [-7.15, 2.9, .44], [6.4, 4.1, .6], [5.7, 5.5, .42],
    [7, -2.6, .53], [6.6, -4.0, .8], [-6.9, -3.8, .6], [-4.2, -5.4, .48], [3.4, -5.25, .47],
    [-17.0, -2.7, .58], [-16.3, -5.0, .63], [-13.4, -6.5, .46], [-11.0, 2.2, .47], [-15.6, 2.0, .37],
    [17.2, -.9, .54], [16.4, 1.75, .47], [13.1, 2.6, .55], [11.1, -3.4, .48], [15.8, -4.6, .53],
  ];
  coastRocks.forEach(([x, z, s]) => rock(x, z, s));
  for (const [x, z, s] of [[-6.5, 7.4, 1.1], [6.9, 6.7, .9], [-19.1, -1.7, 1.2], [19, 1.5, .8], [16.2, 5.2, 1], [-1.7, -8, 1]]) {
    rock(x, z, s, -1.95, paint.cliffDark);
    rock(x + .4, z + .25, s * .53, -1.55, paint.cliff);
  }

  function grass(x, z, scale = 1) {
    const tuft = group(landscape, [x, .035, z], rand() * Math.PI);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const h = (.22 + rand() * .26) * scale;
      mesh(unit.cone, i % 2 ? paint.grass : paint.grassLight, tuft,
        [Math.sin(a) * .065, h / 2, Math.cos(a) * .065], [.038 * scale, h, .028 * scale],
        [Math.cos(a) * .25, 0, Math.sin(a) * .25]);
    }
  }
  for (const [cx, cz, spreadX, spreadZ, count] of [
    [-5, 4.5, 1.5, .7, 12], [4.9, 5, 1.2, .55, 10], [-5.1, -4.3, 1.3, .9, 10],
    [5.7, -3.4, .8, 1.2, 10], [-15.8, -3, .7, 1.5, 13], [15.9, 1, .75, 1, 9],
    [-11.4, -5.7, 1.2, .35, 7], [15.2, -4.4, 1.2, .3, 7],
  ]) for (let i = 0; i < count; i++) grass(cx + (rand() * 2 - 1) * spreadX, cz + (rand() * 2 - 1) * spreadZ, .65 + rand() * .6);

  function pine(x, z, scale = 1) {
    const tree = group(landscape, [x, 0, z], rand() * 4);
    cylinder(paint.woodDark, tree, [0, .7 * scale, 0], [.12 * scale, 1.4 * scale, .12 * scale]);
    for (let i = 0; i < 3; i++) mesh(unit.cone, i % 2 ? paint.pine : paint.pineDark, tree,
      [0, (1.05 + i * .46) * scale, 0], [(.72 - i * .17) * scale, 1.22 * scale, (.72 - i * .17) * scale]);
  }
  pine(-5.9, -2.4, .86); pine(-5.9, 4.1, .79); pine(-4.2, 5.2, .61);
  pine(5.7, -4.9, .78); pine(6.45, -3.1, .66);
  pine(-16.3, -3.5, .66); pine(-15.2, -5.4, .58);
  pine(16.5, .6, .69); pine(15.8, 2.0, .56);

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-.5, 0); roofShape.lineTo(0, .45); roofShape.lineTo(.5, 0); roofShape.closePath();
  const roofGeometry = geometry(new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false }));
  roofGeometry.translate(0, 0, -.5);
  function cottage(x, z, scale = 1, turn = 0) {
    const house = group(landscape, [x, 0, z], turn);
    house.scale.setScalar(scale);
    box(paint.stone, house, [0, .12, 0], [2.28, .24, 1.78]);
    box(paint.cream, house, [0, .88, 0], [2.08, 1.5, 1.65]);
    mesh(roofGeometry, paint.roof, house, [0, 1.62, 0], [2.5, 1.65, 2.05]);
    box(paint.roofLight, house, [0, 2.375, 0], [.1, .1, 2.1]);
    box(paint.dark, house, [.42, .67, .84], [.43, 1.04, .06]);
    box(paint.coral, house, [.42, .65, .88], [.33, .98, .055]);
    sphere(paint.brass, house, [.52, .67, .92], [.035, .035, .03]);
    box(paint.chalk, house, [.42, .11, 1.05], [.65, .13, .45]);
    for (const px of [-.6, .68]) {
      if (px === .68) continue;
      box(paint.teal, house, [px, 1.0, .854], [.58, .6, .08]);
      box(paint.window, house, [px, 1, .91], [.43, .44, .025]);
      box(paint.chalk, house, [px, 1, .935], [.035, .46, .04]);
      box(paint.chalk, house, [px, 1, .935], [.47, .035, .04]);
      box(paint.woodLight, house, [px, .67, .93], [.66, .1, .2]);
    }
    box(paint.coralDark, house, [-.61, 2.03, -.36], [.31, .91, .35]);
    box(paint.chalk, house, [-.61, 2.5, -.36], [.43, .12, .47]);
    for (let i = 0; i < 4; i++) box(paint.roofLight, house, [0, 1.73 + i * .16, .003], [2.2 - i * .5, .026, 2.07]);
    // A small service box and a coil of hose make the building a place to work.
    box(paint.teal, house, [-1.1, .51, -.37], [.16, .53, .42]);
    ring(.18, .035, paint.woodDark, house, [1.09, .66, .1], [0, Math.PI / 2, 0]);
  }
  cottage(-4.0, -4.1, 1.04, .05);
  cottage(5.3, -4.4, .65, -.16);

  function fence(a, b, height = .57) {
    rod([a[0], height, a[1]], [b[0], height, b[1]], .038, paint.rope);
    rod([a[0], height * .48, a[1]], [b[0], height * .48, b[1]], .026, paint.rope);
    for (const p of [a, b]) cylinder(paint.wood, landscape, [p[0], height / 2, p[1]], [.065, height + .14, .065]);
  }
  fence([-7.15, 1.65], [-6.75, 3.1]); fence([-6.75, 3.1], [-5.7, 4.0]);
  fence([2.6, 5.8], [4.0, 5.8]); fence([4.0, 5.8], [5.4, 5.2]);
  fence([-12, 2.25], [-10.65, 1.6]);

  // Arrival jetty: weathered planks and orange lifesaving equipment.
  const jetty = group(landscape, [0, -.04, 5.55]);
  for (let i = 0; i < 12; i++) box(i % 3 ? paint.woodLight : paint.wood, jetty, [0, 0, i * .27], [1.8, .15, .245]);
  for (const x of [-.77, .77]) {
    box(paint.woodDark, jetty, [x, -.15, 1.43], [.13, .17, 3.25]);
    for (const z of [.2, 1.5, 2.9]) cylinder(paint.woodDark, jetty, [x, -.93, z], [.105, 2.85, .105]);
  }
  ring(.3, .084, paint.coral, jetty, [-.89, .36, 1.55], [0, Math.PI / 2, 0]);
  ring(.18, .035, paint.rope, jetty, [.45, .1, 2.27]);
  cylinder(paint.brass, jetty, [.45, .16, 2.27], [.055, .25, .055]);

  const westBridge = group(landscape, [-8, -.025, 0]);
  for (let i = 0; i < 13; i++) box(i % 3 ? paint.woodLight : paint.wood, westBridge, [-1.5 + i * .25, 0, 0], [.22, .14, 1.68]);
  for (const z of [-.76, .76]) {
    box(paint.woodDark, westBridge, [0, -.2, z], [3.4, .25, .14]);
    for (const x of [-1.4, 0, 1.4]) cylinder(paint.woodDark, westBridge, [x, .26, z], [.065, .9, .065]);
    rod([-1.4, .6, z], [0, .48, z], .035, paint.rope, westBridge);
    rod([0, .48, z], [1.4, .6, z], .035, paint.rope, westBridge);
  }

  // Lighthouse: limestone taper, glazed lantern, balcony, and a copper cap.
  const lighthouse = group(landscape, [0, 0, -3.5]);
  cylinder(paint.stone, lighthouse, [0, .09, 0], [1.45, .18, 1.45]);
  cylinder(paint.chalk, lighthouse, [0, .25, 0], [1.26, .32, 1.26]);
  mesh(geometry(new THREE.CylinderGeometry(.86, 1.12, 4.27, 24)), paint.cream, lighthouse, [0, 2.39, 0]);
  mesh(geometry(new THREE.CylinderGeometry(.994, 1.023, .45, 24)), paint.coral, lighthouse, [0, 1.94, 0]);
  mesh(geometry(new THREE.CylinderGeometry(.885, .914, .45, 24)), paint.coral, lighthouse, [0, 3.73, 0]);
  cylinder(paint.chalk, lighthouse, [0, 4.55, 0], [1.05, .2, 1.05]);
  cylinder(paint.teal, lighthouse, [0, 4.73, 0], [1.55, .17, 1.55]);
  cylinder(paint.chalk, lighthouse, [0, 4.83, 0], [1.39, .085, 1.39]);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2;
    cylinder(paint.teal, lighthouse, [Math.cos(a) * 1.36, 5.07, Math.sin(a) * 1.36], [.025, .51, .025]);
  }
  ring(1.36, .035, paint.teal, lighthouse, [0, 5.33, 0]);
  const glazing = material('#9fc7bc', { transparent: true, opacity: .26, roughness: .15, metalness: .15, depthWrite: false, side: THREE.DoubleSide });
  mesh(geometry(new THREE.CylinderGeometry(.87, .87, 1.35, 8, 1, true)), glazing, lighthouse, [0, 5.55, 0]);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    cylinder(paint.teal, lighthouse, [Math.cos(a) * .88, 5.52, Math.sin(a) * .88], [.042, 1.47, .042]);
  }
  cylinder(paint.teal, lighthouse, [0, 6.24, 0], [1.02, .13, 1.02]);
  mesh(geometry(new THREE.ConeGeometry(1.22, .67, 16)), paint.roof, lighthouse, [0, 6.6, 0]);
  sphere(paint.brass, lighthouse, [0, 6.95, 0], [.13, .14, .13]);
  cylinder(paint.brass, lighthouse, [0, 7.23, 0], [.035, .54, .035]);
  box(paint.coral, lighthouse, [.24, 7.37, 0], [.47, .16, .045]);
  box(paint.dark, lighthouse, [0, .7, 1.08], [.63, 1.12, .12]);
  box(paint.teal, lighthouse, [0, .68, 1.155], [.46, 1.00, .08]);
  sphere(paint.brass, lighthouse, [.15, .68, 1.22], [.035, .035, .035]);
  for (const [x, y, z, turn] of [[0, 2.85, 1, 0], [0, 4.12, .92, 0], [1, 1.15, 0, Math.PI / 2]]) {
    const window = group(lighthouse, [x, y, z], turn);
    box(paint.teal, window, [0, 0, 0], [.35, .6, .09]);
    box(paint.glass, window, [0, 0, .052], [.22, .43, .025]);
  }
  const lampMaterial = material('#d1d5b4', { emissive: '#ffcb70', emissiveIntensity: 0, roughness: .2 });
  const lamp = sphere(lampMaterial, root, [0, 5.54, -3.5], [.42, .55, .42]);
  const lensBands = group(root, [0, 5.54, -3.5]);
  for (let i = 0; i < 5; i++) ring(.5 - Math.abs(2 - i) * .035, .026, paint.brass, lensBands, [0, (i - 2) * .16, 0]);
  const lampLight = new THREE.PointLight('#ffd589', 0, 14, 2);
  lampLight.position.set(0, 5.5, -3.5);
  root.add(lampLight);
  const beacon = group(root, [0, 5.55, -3.5]);
  beacon.visible = false;
  const coneGeo = geometry(new THREE.ConeGeometry(4.7, 28, 32, 1, true));
  coneGeo.translate(0, -14, 0);
  const beaconMaterial = basic('#ffe5a4', { transparent: true, opacity: .055, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beamCone = mesh(coneGeo, beaconMaterial, beacon, [0, 0, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  beamCone.castShadow = beamCone.receiveShadow = false;
  const secondCone = mesh(coneGeo, beaconMaterial, beacon, [0, 0, 0], [.74, .64, .74], [Math.PI / 2, 0, 0]);
  secondCone.castShadow = secondCone.receiveShadow = false;

  // The receiving pedestal is kept in front of the lighthouse, within reach.
  const delivery = group(landscape, [0, 0, -1]);
  cylinder(paint.stone, delivery, [0, .09, 0], [.64, .18, .64]);
  cylinder(paint.teal, delivery, [0, .39, 0], [.31, .48, .31]);
  cylinder(paint.brass, delivery, [0, .68, 0], [.44, .12, .44]);
  ring(.27, .025, paint.dark, delivery, [0, .75, 0]);
  const deliveredLens = group(root, [0, 1.0, -1]);
  const prismMaterial = material('#b4eee0', { emissive: '#67c5b7', emissiveIntensity: .12, metalness: .42, roughness: .12 });
  const prismGeometry = geometry(new THREE.OctahedronGeometry(.34, 0));
  mesh(prismGeometry, prismMaterial, deliveredLens, [0, 0, 0], [.85, 1.35, .85]);
  ring(.36, .025, paint.brass, deliveredLens, [0, 0, 0], [.6, 0, .2]);
  deliveredLens.visible = false;

  function instrumentBase(x, z) {
    const stand = group(landscape, [x, 0, z]);
    cylinder(paint.stone, stand, [0, .085, 0], [.64, .17, .64]);
    cylinder(paint.teal, stand, [0, .38, 0], [.13, .57, .13]);
    cylinder(paint.brass, stand, [0, .7, 0], [.28, .1, .28]);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 2 * i;
      box(paint.brass, stand, [Math.cos(a) * .45, .18, Math.sin(a) * .45], [.11, .035, .11], [0, a, 0]);
    }
    return stand;
  }
  const mirrorMaterial = material('#b7e1df', { metalness: .88, roughness: .16, side: THREE.DoubleSide });
  function mirror(x, z) {
    instrumentBase(x, z);
    const pivot = group(root, [x, 0, z]);
    box(paint.teal, pivot, [0, 1.17, -.045], [.92, .95, .1]);
    box(mirrorMaterial, pivot, [0, 1.2, .023], [.75, .78, .045]);
    for (const px of [-.45, .45]) box(paint.brass, pivot, [px, 1.2, .033], [.075, .99, .1]);
    for (const py of [.72, 1.68]) box(paint.brass, pivot, [0, py, .033], [.94, .065, .1]);
    box(paint.white, pivot, [-.18, 1.26, .052], [.035, .62, .009], [0, 0, -.33]);
    box(paint.white, pivot, [.19, 1.15, .052], [.018, .45, .009], [0, 0, -.33]);
    cylinder(paint.brass, pivot, [.56, .7, 0], [.1, .18, .1], [0, 0, Math.PI / 2]);
    ring(.15, .032, paint.woodDark, pivot, [.66, .7, 0], [0, Math.PI / 2, 0]);
    return pivot;
  }
  const mirrorA = mirror(-13, 1);
  const mirrorB = mirror(-13, -4);
  instrumentBase(-16, 1);
  const emitter = group(landscape, [-16, 1.2, 1], Math.PI / 2);
  cylinder(paint.teal, emitter, [0, 0, -.16], [.39, .56, .39], [Math.PI / 2, 0, 0]);
  ring(.32, .06, paint.brass, emitter, [0, 0, .15], [0, 0, 0]);
  cylinder(paint.glass, emitter, [0, 0, .16], [.29, .05, .29], [Math.PI / 2, 0, 0]);
  cylinder(paint.brass, emitter, [0, .48, -.08], [.095, .15, .095]);
  const signalMaterial = material('#b29d64', { emissive: '#ffd477', emissiveIntensity: .05 });
  const receiver = group(landscape, [-9, 0, -4]);
  cylinder(paint.stone, receiver, [0, .08, 0], [.5, .16, .5]);
  box(paint.teal, receiver, [0, .72, 0], [.7, 1.22, .55]);
  cylinder(paint.brass, receiver, [-.4, 1.2, 0], [.3, .12, .3], [0, 0, Math.PI / 2]);
  const receiverEye = sphere(signalMaterial, root, [-9.48, 1.2, -4], [.08, .21, .21]);
  box(paint.brass, receiver, [.1, 1.46, 0], [.8, .12, .65]);
  box(paint.dark, receiver, [.04, .69, .285], [.43, .26, .025]);
  for (let i = 0; i < 3; i++) box(paint.brass, receiver, [-.11 + i * .14, .69, .31], [.04, .14, .035]);
  // A physical copper line ties the receiver to the lighthouse's relay.
  const cablePoints = [[-9, .07, -3.8], [-9, .07, -1.6], [-8.5, .07, -.5], [-7, .07, -.5], [-6.1, .07, -.7], [-3.5, .07, -.7], [-1, .07, -1.6]];
  for (let i = 0; i < cablePoints.length - 1; i++) rod(cablePoints[i], cablePoints[i + 1], .027, paint.coralDark);
  const rayMaterial = basic('#fff0b0', { transparent: true, opacity: .92, depthWrite: false });
  const rayHalo = basic('#ffd27a', { transparent: true, opacity: .10, depthWrite: false, blending: THREE.AdditiveBlending });
  const rays = Array.from({ length: 5 }, () => {
    const core = mesh(unit.cylinder8, rayMaterial, root);
    const halo = mesh(unit.cylinder8, rayHalo, root);
    const end = sphere(rayMaterial, root, [0, 0, 0], [.07, .07, .07]);
    for (const object of [core, halo, end]) { object.visible = false; object.castShadow = object.receiveShadow = false; }
    return { core, halo, end };
  });

  // Counterweight trolley: three visible wheels, timber braces, two iron rails.
  for (const z of [1.59, 2.41]) {
    box(paint.steel, landscape, [4.7, .075, z], [3.6, .1, .085]);
    for (let i = 0; i < 8; i++) box(paint.woodDark, landscape, [3.12 + i * .45, .024, 2], [.14, .045, 1.06]);
  }
  const plate = cylinder(paint.brass, root, [6, .095, 2], [.7, .12, .7]);
  ring(.74, .04, paint.teal, landscape, [6, .12, 2]);
  const crate = group(root, [3.5, 0, 2]);
  box(paint.wood, crate, [0, .7, 0], [.94, 1.02, .86]);
  for (const z of [-.465, .465]) {
    for (let i = 0; i < 5; i++) box(i % 2 ? paint.woodLight : paint.wood, crate, [-.4 + i * .2, .71, z], [.18, .96, .055]);
    for (const x of [-.43, .43]) box(paint.woodDark, crate, [x, .7, z * 1.08], [.11, 1.13, .09]);
    for (const y of [.2, 1.2]) box(paint.woodDark, crate, [0, y, z * 1.08], [1.0, .105, .09]);
    rod([-.36, .3, z * 1.17], [.36, 1.12, z * 1.17], .055, paint.woodLight, crate);
  }
  for (const x of [-.36, .36]) for (const z of [-.43, .43]) cylinder(paint.dark, crate, [x, .15, z], [.14, .085, .14], [Math.PI / 2, 0, 0]);
  for (const x of [-.3, .3]) box(paint.steel, crate, [x, 1.233, 0], [.07, .045, .95]);
  ring(.12, .03, paint.brass, crate, [0, 1.29, 0], [0, 0, 0]);
  box(paint.chalk, crate, [0, .79, .52], [.34, .3, .015]);
  box(paint.coral, crate, [0, .78, .535], [.14, .17, .018]);

  // Drawbridge is raised until the counterweight has seated on the pressure plate.
  const bridge = group(root, [7.5, -.015, 0]);
  bridge.rotation.z = Math.PI / 2;
  for (let i = 0; i < 17; i++) box(i % 3 ? paint.woodLight : paint.wood, bridge, [.1 + i * .24, 0, 0], [.215, .15, 1.82]);
  for (const z of [-.82, .82]) {
    box(paint.woodDark, bridge, [2, -.15, z], [4.1, .22, .12]);
    box(paint.steel, bridge, [2, .09, z], [4.08, .05, .09]);
  }
  cylinder(paint.steel, landscape, [7.49, .05, 0], [.12, 2.15, .12], [Math.PI / 2, 0, 0]);
  for (const z of [-1.13, 1.13]) {
    box(paint.stone, landscape, [7.26, .12, z], [.43, .24, .43]);
    box(paint.teal, landscape, [7.26, 1.8, z], [.16, 3.4, .16]);
    cylinder(paint.brass, landscape, [7.27, 3.37, z], [.18, .1, .18], [Math.PI / 2, 0, 0]);
  }
  box(paint.teal, landscape, [7.26, 3.5, 0], [.2, .2, 2.46]);
  const bridgeRopes = [-.91, .91].map((z) => rod([7.26, 3.35, z], [7.6, 3.88, z], .033, paint.rope, root));
  const bridgeEnd = new THREE.Vector3();
  // The drive cable and winch connect the trolley to the gate mechanically.
  rod([6, .11, 2], [7.17, .11, 1.18], .035, paint.woodDark);
  cylinder(paint.teal, landscape, [6.96, .56, 1.5], [.3, .18, .3], [Math.PI / 2, 0, 0]);
  ring(.36, .045, paint.brass, landscape, [6.96, .56, 1.63], [0, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    rod([6.96, .56, 1.65], [6.96 + Math.cos(a) * .31, .56 + Math.sin(a) * .31, 1.65], .025, paint.brass);
  }

  // The east island is an old lens garden, with fragments of a prior lantern.
  const shrine = group(landscape, [14, 0, -2]);
  cylinder(paint.stone, shrine, [0, .08, 0], [.86, .16, .86]);
  cylinder(paint.chalk, shrine, [0, .34, 0], [.49, .49, .49]);
  cylinder(paint.teal, shrine, [0, .64, 0], [.61, .13, .61]);
  ring(.4, .04, paint.brass, shrine, [0, .74, 0]);
  const gardenLens = group(root, [14, 1.09, -2]);
  mesh(prismGeometry, prismMaterial, gardenLens, [0, 0, 0], [1.25, 1.7, 1.25]);
  ring(.49, .04, paint.brass, gardenLens, [0, 0, 0], [.5, 0, -.15]);
  for (const [x, z, h] of [[12.7, -3.5, 1.4], [15.4, -3.5, 2.2], [16.0, -2.7, .95]]) {
    cylinder(paint.stone, landscape, [x, .1, z], [.38, .2, .38]);
    cylinder(paint.chalk, landscape, [x, h / 2, z], [.22, h, .22]);
    cylinder(paint.stone, landscape, [x, h, z], [.34, .15, .34]);
  }
  box(paint.chalk, landscape, [14.48, .4, -4.08], [2.1, .8, .39]);
  box(paint.stone, landscape, [14.4, .87, -4.08], [2.18, .15, .48]);
  rock(12.8, -3.85, .3, .09, paint.chalk);
  rock(15.7, -2.95, .32, .05, paint.chalk);
  const bench = group(landscape, [15.6, .05, .13], -.58);
  for (const x of [-.55, .55]) box(paint.teal, bench, [x, .22, 0], [.1, .44, .49]);
  for (const z of [-.18, 0, .18]) box(paint.woodLight, bench, [0, .48, z], [1.45, .09, .14]);
  box(paint.wood, bench, [0, .86, -.21], [1.45, .27, .09]);

  const fieldNotes = [];
  function fieldNote(id, x, z, turn) {
    const desk = group(landscape, [x, 0, z], turn);
    cylinder(paint.stone, desk, [0, .07, 0], [.4, .14, .4]);
    box(paint.woodDark, desk, [0, .4, 0], [.13, .76, .13]);
    const top = group(desk, [0, .79, 0]);
    top.rotation.x = -.14;
    box(paint.wood, top, [0, 0, 0], [.88, .09, .63]);
    box(paint.teal, top, [0, .067, 0], [.71, .04, .49]);
    const pages = material('#fff0ca', { emissive: '#edc16c', emissiveIntensity: .16 });
    box(pages, top, [-.165, .112, 0], [.32, .035, .43], [0, 0, -.065]);
    box(pages, top, [.165, .112, 0], [.32, .035, .43], [0, 0, .065]);
    box(paint.coral, top, [.19, .142, .18], [.047, .018, .18]);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      box(paint.woodLight, top, [side * .17, .14, -.1 + i * .065], [.21, .01, .015]);
    }
    box(paint.coral, desk, [0, .59, .15], [.29, .3, .035]);
    box(paint.cream, desk, [0, .61, .174], [.13, .025, .012]);
    fieldNotes.push({ id, pages });
  }
  fieldNote('journal', -4, 3.4, .35);
  fieldNote('logbook', 3.8, -3.8, -.22);
  fieldNote('postcard', 15.5, .8, -.6);

  // Warm practical lamps activate when the optical link closes.
  const lanternMaterial = material('#cbb785', { emissive: '#ffcc76', emissiveIntensity: .15 });
  const lanterns = [];
  function lantern(x, z, height = 1.5) {
    const post = group(landscape, [x, 0, z]);
    cylinder(paint.teal, post, [0, height / 2, 0], [.045, height, .045]);
    rod([0, height, 0], [.24, height, 0], .038, paint.teal, post);
    box(paint.teal, post, [.24, height - .35, 0], [.25, .045, .25]);
    box(paint.teal, post, [.24, height - .07, 0], [.27, .045, .27]);
    for (const dx of [-.105, .105]) for (const dz of [-.105, .105]) box(paint.teal, post, [.24 + dx, height - .21, dz], [.024, .3, .024]);
    const glow = box(lanternMaterial, post, [.24, height - .21, 0], [.17, .22, .17]);
    lanterns.push(glow);
    mesh(unit.cone, paint.roof, post, [.24, height + .01, 0], [.21, .13, .21]);
  }
  lantern(-1.35, 4.7); lantern(1.45, -1.6); lantern(-6.5, -1.35, 1.65); lantern(6.6, -.97, 1.65); lantern(12.0, .8);

  // Tiny working-coast details, all placed outside the useful walking corridor.
  function barrel(x, z, scale = 1) {
    const item = group(landscape, [x, 0, z]);
    cylinder(paint.wood, item, [0, .3 * scale, 0], [.25 * scale, .58 * scale, .25 * scale]);
    for (const y of [.13, .47]) cylinder(paint.steel, item, [0, y * scale, 0], [.265 * scale, .05 * scale, .265 * scale]);
    cylinder(paint.woodLight, item, [0, .597 * scale, 0], [.23 * scale, .018, .23 * scale]);
  }
  barrel(-2.65, -3.65); barrel(-2.6, -4.27, .8); barrel(5.7, -4.3, .8);
  const sign = group(landscape, [-1.25, 3.3], -.2);
  box(paint.woodDark, sign, [0, .52, 0], [.085, 1.04, .085]);
  box(paint.teal, sign, [0, .94, 0], [.68, .26, .09]);
  // Painted physical arrow toward the lighthouse, not a screen-space label.
  box(paint.cream, sign, [0, .95, .054], [.3, .04, .01]);
  box(paint.cream, sign, [-.14, .982, .054], [.15, .035, .01], [0, 0, -.5]);
  box(paint.cream, sign, [-.14, .918, .054], [.15, .035, .01], [0, 0, .5]);
  const telescope = group(landscape, [3.1, 0, -5.0], .7);
  for (const [x, z] of [[-.3, .22], [.3, .22], [0, -.32]]) rod([0, 1.1, 0], [x, .05, z], .035, paint.woodDark, telescope);
  cylinder(paint.brass, telescope, [0, 1.26, 0], [.11, .63, .11], [Math.PI / 2 + .12, 0, 0]);

  // Raincoat keeper. The root is controlled externally; all animation is local.
  const character = group(root);
  character.name = 'Keeper';
  const torso = group(character);
  const leftLeg = group(character, [-.17, .63, 0]);
  const rightLeg = group(character, [.17, .63, 0]);
  for (const leg of [leftLeg, rightLeg]) {
    cylinder(paint.teal, leg, [0, -.14, 0], [.115, .34, .115]);
    box(paint.black, leg, [0, -.37, .07], [.24, .22, .37]);
    box(paint.woodDark, leg, [0, -.475, .07], [.245, .035, .375]);
  }
  mesh(geometry(new THREE.CylinderGeometry(.29, .4, .67, 10)), paint.jacket, torso, [0, .98, 0], [1, 1, .84]);
  cylinder(paint.yellow, torso, [0, .67, 0], [.4, .065, .335]);
  box(paint.woodDark, torso, [0, .99, .287], [.025, .56, .026]);
  for (const x of [-.2, .2]) box(paint.yellow, torso, [x, .86, .29], [.15, .16, .025]);
  sphere(paint.jacket, torso, [0, 1.49, -.025], [.32, .34, .28]);
  sphere(paint.skin, torso, [0, 1.47, .166], [.229, .24, .21]);
  for (const x of [-.072, .072]) sphere(paint.black, torso, [x, 1.5, .355], [.024, .031, .017]);
  sphere(paint.skin, torso, [0, 1.43, .38], [.039, .05, .046]);
  cylinder(paint.yellow, torso, [0, 1.69, .015], [.41, .055, .34]);
  mesh(geometry(new THREE.CylinderGeometry(.2, .31, .18, 10)), paint.jacket, torso, [0, 1.79, 0], [1, 1, .9]);
  box(paint.coral, torso, [0, 1.275, .24], [.34, .12, .13]);
  box(paint.coral, torso, [.13, 1.13, .32], [.11, .3, .055], [0, 0, .08]);
  box(paint.teal, torso, [0, 1.02, -.31], [.49, .56, .22]);
  box(paint.roofLight, torso, [0, 1.29, -.32], [.5, .1, .26]);
  for (const x of [-.18, .18]) box(paint.woodDark, torso, [x, 1.11, .217], [.045, .39, .045]);
  const leftArm = group(torso, [-.36, 1.23, 0]);
  const rightArm = group(torso, [.36, 1.23, 0]);
  for (const arm of [leftArm, rightArm]) {
    cylinder(paint.jacket, arm, [0, -.16, 0], [.13, .4, .13]);
    sphere(paint.skin, arm, [0, -.39, .015], [.1, .1, .1]);
  }
  const handLantern = group(leftArm, [0, -.59, .025]);
  ring(.095, .018, paint.dark, handLantern, [0, .16, 0], [0, 0, 0]);
  const handGlow = material('#ffce78', { emissive: '#ffbc53', emissiveIntensity: .7 });
  box(handGlow, handLantern, [0, 0, 0], [.15, .2, .15]);
  for (const y of [-.12, .12]) box(paint.dark, handLantern, [0, y, 0], [.22, .045, .22]);
  for (const x of [-.087, .087]) for (const z of [-.087, .087]) box(paint.dark, handLantern, [x, 0, z], [.018, .23, .018]);
  const carriedLens = group(torso, [0, 1.02, .53]);
  mesh(prismGeometry, prismMaterial, carriedLens, [0, 0, 0], [.8, 1.15, .8]);
  ring(.3, .025, paint.brass, carriedLens, [0, 0, 0], [.4, 0, 0]);
  carriedLens.visible = false;

  const buoys = [];
  for (const [x, z, scale] of [[-10, 7, .8], [11, 7.3, 1], [-20, -6, .7], [20, -4, .8]]) {
    const buoy = group(root, [x, -1.91, z]);
    buoy.scale.setScalar(scale);
    cylinder(paint.coral, buoy, [0, .07, 0], [.31, .22, .31]);
    mesh(unit.cone, paint.cream, buoy, [0, .31, 0], [.2, .42, .2]);
    cylinder(paint.teal, buoy, [0, .6, 0], [.025, .32, .025]);
    sphere(paint.coral, buoy, [0, .78, 0], [.07, .07, .07]);
    ring(.6, .024, paint.foam, buoy, [0, -.09, 0]);
    buoys.push(buoy);
  }

  const waterLines = group(root);
  const waveGeometry = geometry(new THREE.PlaneGeometry(1, 1));
  const waveCount = 145;
  const waveInstances = new THREE.InstancedMesh(waveGeometry, paint.foam, waveCount);
  waveInstances.name = 'Small wave crests';
  const waves = [];
  for (let i = 0; i < waveCount; i++) {
    const x = (rand() - .5) * 76;
    const z = (rand() - .5) * 59;
    waves.push({ x, z, width: .25 + rand() * 1.5, phase: rand() * Math.PI * 2 });
    dummy.position.set(x, -2.06, z);
    dummy.rotation.set(-Math.PI / 2, 0, -.2);
    dummy.scale.set(waves[i].width, .028, 1);
    dummy.updateMatrix();
    waveInstances.setMatrixAt(i, dummy.matrix);
  }
  waveInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waterLines.add(waveInstances);

  const gullGeometry = geometry(new THREE.BufferGeometry());
  gullGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .5, .03, -.08, .34, 0, .1], 3));
  gullGeometry.computeVertexNormals();
  const gullMaterial = material('#f8eee0', { side: THREE.DoubleSide });
  const gulls = Array.from({ length: 4 }, (_, i) => {
    const bird = group(root);
    const body = sphere(paint.white, bird, [0, 0, 0], [.08, .07, .19]);
    body.castShadow = false;
    const left = mesh(gullGeometry, gullMaterial, bird, [0, 0, 0], [-1, 1, 1]);
    const right = mesh(gullGeometry, gullMaterial, bird);
    left.castShadow = right.castShadow = false;
    mesh(unit.cone, paint.yellow, bird, [0, -.01, .22], [.035, .13, .035], [Math.PI / 2, 0, 0]);
    return { bird, left, right, phase: i * 1.68, radius: 8 + i * 3.3, height: 6.3 + i * .55 };
  });

  // A small mail boat answers the completed beacon; it never precedes success.
  const boat = group(root, [-26, -2.01, 12]);
  boat.visible = false;
  const hullGeometry = geometry(new THREE.BufferGeometry());
  const hullPoints = [
    [-1.6, .32, -.58], [1.1, .32, -.58], [1.8, .32, 0], [1.1, .32, .58], [-1.6, .32, .58],
    [-1.36, -.16, -.35], [.9, -.16, -.35], [1.35, -.16, 0], [.9, -.16, .35], [-1.36, -.16, .35],
  ];
  const hullVertices = [];
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5;
    hullVertices.push(...hullPoints[i], ...hullPoints[j], ...hullPoints[j + 5], ...hullPoints[i], ...hullPoints[j + 5], ...hullPoints[i + 5]);
  }
  hullVertices.push(...hullPoints[0], ...hullPoints[4], ...hullPoints[3], ...hullPoints[0], ...hullPoints[3], ...hullPoints[1], ...hullPoints[1], ...hullPoints[3], ...hullPoints[2]);
  hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hullVertices, 3));
  hullGeometry.computeVertexNormals();
  mesh(hullGeometry, paint.coral, boat);
  box(paint.cream, boat, [-.35, .69, 0], [1.4, .8, .89]);
  box(paint.roof, boat, [-.35, 1.13, 0], [1.58, .12, 1.06]);
  for (const z of [-.455, .455]) for (const x of [-.71, -.07]) box(paint.glass, boat, [x, .81, z], [.4, .3, .025]);
  box(paint.glass, boat, [.366, .81, 0], [.025, .3, .66]);
  cylinder(paint.teal, boat, [-.71, 1.31, 0], [.12, .32, .12]);
  cylinder(paint.teal, boat, [.68, 1.03, 0], [.03, 1.38, .03]);
  box(paint.coral, boat, [.47, 1.56, 0], [.39, .2, .018]);
  for (const z of [-.55, .55]) {
    rod([-1.45, .55, z], [1.02, .55, z], .019, paint.cream, boat);
    for (const x of [-1.45, .4, 1.02]) cylinder(paint.cream, boat, [x, .42, z], [.019, .26, .019]);
  }
  ring(.2, .045, paint.cream, boat, [-.9, .38, .6], [0, 0, 0]);
  for (const z of [-.3, .3]) {
    const wake = box(paint.foam, boat, [-2.6, -.025, z * 2.7], [3.0, .015, .06], [0, z * .5, 0]);
    wake.castShadow = wake.receiveShadow = false;
  }

  // Static meshes are baked by material, so rich detail costs tens of draw calls.
  // Dynamic props and transparent glazing are preserved separately.
  function bakeScenery(container = landscape, destination = root) {
    container.updateMatrixWorld(true);
    destination.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(destination.matrixWorld).invert();
    const transform = new THREE.Matrix4();
    const batches = new Map();
    const transparent = [];
    container.traverse((object) => {
      if (!object.isMesh) return;
      if (object.material.transparent) { transparent.push(object); return; }
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material).push(object);
    });
    for (const [finish, objects] of batches) {
      let count = 0;
      const transformed = objects.map((object) => {
        let shape = object.geometry.clone();
        if (shape.index) {
          const indexed = shape;
          shape = indexed.toNonIndexed();
          indexed.dispose();
        }
        transform.multiplyMatrices(inverse, object.matrixWorld);
        shape.applyMatrix4(transform);
        count += shape.attributes.position.count;
        return shape;
      });
      const positions = new Float32Array(count * 3);
      const normals = new Float32Array(count * 3);
      let offset = 0;
      for (const shape of transformed) {
        positions.set(shape.attributes.position.array, offset);
        normals.set(shape.attributes.normal.array, offset);
        offset += shape.attributes.position.array.length;
        shape.dispose();
      }
      const combined = geometry(new THREE.BufferGeometry());
      combined.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      combined.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      combined.computeBoundingSphere();
      const object = mesh(combined, finish, destination);
      object.name = 'Scenery batch';
      for (const original of objects) original.removeFromParent();
    }
    if (container !== destination) {
      for (const object of transparent) destination.attach(object);
      container.removeFromParent();
    }
  }
  bakeScenery();
  for (const assembly of [bridge, crate, mirrorA, mirrorB, boat, leftLeg, rightLeg]) bakeScenery(assembly, assembly);

  const smoothAngle = (current, target, speed, dt) => {
    const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + delta * (1 - Math.exp(-speed * dt));
  };
  function update(state, dt, elapsed, motion = {}) {
    if (disposed) return;
    const delta = Math.min(Math.max(dt || 0, 0), .1);
    const time = Number.isFinite(elapsed) ? elapsed : 0;
    const animate = motion.reduced !== true && motion.reducedMotion !== true;
    waterTime.value = animate ? time : 0;
    const sunriseTarget = state.complete ? 1 : 0;
    if (!sunriseInitialized || !animate) {
      sunriseProgress = sunriseTarget;
      sunriseInitialized = true;
    } else {
      sunriseProgress += Math.sign(sunriseTarget - sunriseProgress)
        * Math.min(Math.abs(sunriseTarget - sunriseProgress), delta / 5);
    }
    const sunriseBlend = sunriseProgress * sunriseProgress * (3 - 2 * sunriseProgress);
    paint.water.color.copy(duskWater).lerp(sunriseWater, sunriseBlend);
    // Local +Z is the mirror normal; gameplay defines its X/Z normal as
    // (cos(angle), sin(angle)), so the model's Y rotation is pi/2 - angle.
    mirrorA.rotation.y = smoothAngle(mirrorA.rotation.y, Math.PI / 2 - (state.mirrorA || 0) * Math.PI / 4, 12, delta);
    mirrorB.rotation.y = smoothAngle(mirrorB.rotation.y, Math.PI / 2 - (state.mirrorB || 0) * Math.PI / 4, 12, delta);
    signalMaterial.emissiveIntensity = state.signal ? 1.8 : .05;
    lanternMaterial.emissiveIntensity = state.signal ? 1.2 : .15;
    paint.window.emissiveIntensity = state.signal ? .55 : .16;
    for (const note of fieldNotes) note.pages.emissiveIntensity = state.notes?.includes(note.id) ? 0 : .16;
    crate.position.x = Number.isFinite(state.crateX) ? state.crateX : 3.5;
    plate.position.y = state.bridge ? .052 : .095;
    const bridgeTarget = state.bridge ? 0 : Math.PI / 2;
    bridge.rotation.z = animate ? THREE.MathUtils.damp(bridge.rotation.z, bridgeTarget, 3.1, delta) : bridgeTarget;
    bridge.updateMatrixWorld(true);
    for (let i = 0; i < bridgeRopes.length; i++) {
      const z = i ? .91 : -.91;
      bridgeEnd.set(3.96, .06, z).applyMatrix4(bridge.matrixWorld);
      setRod(bridgeRopes[i], [7.26, 3.35, z], [bridgeEnd.x, bridgeEnd.y, bridgeEnd.z], .033);
    }
    const segments = Array.isArray(state.beams) ? state.beams : [];
    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i];
      const segment = segments[i];
      const visible = Boolean(segment && segment.from && segment.to);
      ray.core.visible = ray.halo.visible = visible;
      ray.end.visible = visible && segment.hit === true;
      if (!visible) continue;
      const start = [segment.from.x, 1.2, segment.from.z];
      const end = [segment.to.x, 1.2, segment.to.z];
      setRod(ray.core, start, end, .019);
      setRod(ray.halo, start, end, .065);
      ray.end.position.set(...end);
    }
    gardenLens.visible = !state.carrying && !state.delivered;
    carriedLens.visible = Boolean(state.carrying && !state.delivered);
    deliveredLens.visible = Boolean(state.delivered);
    if (animate) {
      gardenLens.rotation.y = time * .43;
      gardenLens.position.y = 1.09 + Math.sin(time * 1.4) * .055;
      carriedLens.rotation.y = time * .4;
      deliveredLens.rotation.y = time * .23;
    }
    const moving = Boolean(motion.moving);
    const step = Number.isFinite(motion.step) ? motion.step : time * 9;
    const stride = moving && animate ? Math.sin(step) : 0;
    leftLeg.rotation.x = stride * .57;
    rightLeg.rotation.x = -stride * .57;
    torso.position.y = moving && animate ? Math.abs(Math.sin(step)) * .055 : 0;
    leftArm.rotation.x = state.carrying ? -.62 : -stride * .27;
    rightArm.rotation.x = state.carrying ? -.88 : stride * .34;
    leftArm.rotation.z = state.carrying ? -.17 : -.07;
    rightArm.rotation.z = state.carrying ? .17 : .07;
    handLantern.rotation.z = animate ? Math.sin(time * 3) * .04 + stride * .06 : 0;
    beacon.visible = Boolean(state.complete);
    lampMaterial.emissiveIntensity = state.complete ? 3.8 : state.delivered ? .38 : 0;
    lampLight.intensity = state.complete ? (lowQuality ? 0 : 12) : 0;
    if (state.complete) {
      if (completionTime === null) completionTime = time;
      beacon.rotation.y = animate ? (time - completionTime) * .23 : .55;
      boat.visible = true;
      boat.position.x = animate ? -26 + ((time - completionTime) * .96) % 60 : 9;
      boat.position.y = -2.03 + (animate ? Math.sin(time * 1.35) * .06 : 0);
      boat.rotation.x = animate ? Math.sin(time * 1.1) * .025 : 0;
      boat.rotation.z = animate ? Math.sin(time * .9) * .025 : 0;
    } else {
      completionTime = null;
      boat.visible = false;
    }
    buoys.forEach((buoy, index) => {
      buoy.position.y = -1.91 + (animate ? Math.sin(time * 1.1 + index * 2) * .095 : 0);
      buoy.rotation.z = animate ? Math.sin(time * .95 + index) * .07 : 0;
    });
    gulls.forEach(({ bird, left, right, phase, radius, height }, index) => {
      bird.visible = !lowQuality || index < 2;
      const angle = (animate ? time * .065 : 0) + phase;
      bird.position.set(Math.cos(angle) * radius, height + Math.sin(angle * 2) * .45, Math.sin(angle) * radius * .6 - 3);
      bird.rotation.y = -angle;
      const flap = animate ? Math.sin(time * 3.7 + phase) * .18 : .11;
      left.rotation.z = -flap;
      right.rotation.z = flap;
    });
    if (animate && !lowQuality) {
      for (let i = 0; i < waves.length; i++) {
        const wave = waves[i];
        dummy.position.set(wave.x + Math.sin(time * .12 + wave.phase) * .17, -2.055 + Math.sin(time * .4 + wave.phase) * .015, wave.z);
        dummy.rotation.set(-Math.PI / 2, 0, -.2);
        dummy.scale.set(wave.width * (.82 + Math.sin(time * .55 + wave.phase) * .18), .028, 1);
        dummy.updateMatrix();
        waveInstances.setMatrixAt(i, dummy.matrix);
      }
      waveInstances.instanceMatrix.needsUpdate = true;
    }
  }
  function setQuality(low) {
    lowQuality = Boolean(low);
    waveInstances.count = lowQuality ? 55 : waveCount;
    // Low quality keeps authored geometry and game information intact.
    secondCone.visible = !lowQuality;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
    for (const value of textures) value.dispose();
    waveInstances.dispose();
    lampLight.dispose();
  }
  return { character, update, setQuality, dispose };
}
