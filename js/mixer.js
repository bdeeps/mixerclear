// Mixer grinder models shared by MixerClear's chapters: the universal motor's physics,
// the three jars and their blades, the base unit with its motor, fan, switch and coupler,
// the grinding and heating models, and a few drawing helpers.
//
// Scale: 1 scene unit = 5 cm. A 750 W Indian mixer grinder's base is about 27 × 23 × 18 cm.
import { THREE, M, box, beam, torus, tube, spring, swarm, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const UNIT = 0.05;                          // metres per scene unit

// ---------------------------------------------------------------- the universal motor
// A series-wound universal motor on 230 V, 50 Hz mains. The same current flows through the
// field coils and (via the brushes) the armature, so when the mains flips both flip together
// and the torque, which goes as field × armature current, keeps its direction.
//
// Model (RMS quantities, steady state at each speed):
//   field flux  Φ(I) = PHI_S · tanh(f·I / I_S)       (iron saturates at high current)
//   back EMF    E = Φ·ω,   torque  T = Φ·I
//   mains       V² = (I·R + Φ·ω)² + (I·X)²          (R: copper + brush contact, X: coil reactance)
//   losses      friction + the cooling fan's drag: T_loss = T_C + C_W·ω²
// f is the field-tap factor: speed 1 uses the whole field winding (more turns, more flux, so it
// runs slower), speed 3 the fewest turns. Constants are tuned so that on speed 3 the motor runs
// at about 20,000 rpm with no load (maker specs: 18,000 to 22,000 rpm) and draws its rated
// 750 W at about 12,000 rpm and 3.3 A, with a peak efficiency near 65–70% (universal motors of
// this size: roughly 50 to 70%). Sources: Hughes & Drury, "Electric Motors and Drives", ch. 3
// (series DC and universal motors); Bajaj, Preethi and Philips 750 W mixer spec sheets.
export const MAINS = { V: 230, HZ: 50 };
export const MOTOR = { PHI_S: 0.15, I_S: 2.0, RA: 9, RF: 6, X: 10, T_C: 0.02, C_W: 2.2e-8, J: 1.2e-4 };
export const TAPS = [0, 2.4, 1.55, 1.0];           // field-tap factor for speeds 1, 2, 3
export const rpmOf = (w) => (w * 60) / TAU;
export const wOf = (rpm) => (rpm * TAU) / 60;

const phi = (n, I) => MOTOR.PHI_S * Math.tanh((TAPS[n] * I) / MOTOR.I_S);
const resist = (n) => MOTOR.RA + MOTOR.RF * TAPS[n];
const react = (n) => MOTOR.X * (0.6 + 0.4 * TAPS[n] * TAPS[n]);
// Current drawn at shaft speed w (rad/s) on speed setting n (1–3).
export function motorCurrent(n, w) {
  if (!n) return 0;
  let lo = 0, hi = 40;
  for (let k = 0; k < 44; k++) { const I = (lo + hi) / 2; (Math.hypot(I * resist(n) + phi(n, I) * w, I * react(n)) > MAINS.V ? (hi = I) : (lo = I)); }
  return lo;
}
export const lossTorque = (w) => (w > 0 ? MOTOR.T_C + MOTOR.C_W * w * w : 0);
// Everything about the motor at speed w with a food torque t.
export function motorState(n, w, tFood = 0) {
  const I = motorCurrent(n, w), Φ = n ? phi(n, I) : 0, T = Φ * I;
  const pIn = n ? I * I * resist(n) + T * w : 0;
  const pOut = tFood * w, pCopper = n ? I * I * resist(n) : 0;
  return { I, T, pIn, pOut, pCopper, pLoss: lossTorque(w) * w, eff: pIn > 1 ? pOut / pIn : 0, rpm: rpmOf(w), pf: n ? (I * resist(n) + Φ * w) / MAINS.V * 1 : 0 };
}
// Steady speed where the motor's torque balances losses plus a food torque tf(w).
export function steadySpeed(n, tf = () => 0) {
  if (!n) return 0;
  let lo = 0, hi = 3200;
  for (let k = 0; k < 40; k++) { const w = (lo + hi) / 2; (motorState(n, w).T - lossTorque(w) - tf(w) > 0 ? (lo = w) : (hi = w)); }
  return lo;
}
// One time step of the spinning parts (J: armature + fan + blades, kg·m²).
export function spinStep(n, w, tf, dt) {
  dt = Math.max(0, dt);
  const sub = Math.max(1, Math.ceil(dt / 0.004)), h = dt / sub;
  for (let k = 0; k < sub; k++) {
    const T = n ? motorState(n, w).T : 0;
    w = Math.max(0, w + ((T - lossTorque(w) - tf(w)) / MOTOR.J) * h);
  }
  return w;
}

// ---------------------------------------------------------------- jars and food
// Three jars, as sold with most Indian 750 W mixers. Blade radii are typical (3 to 4 cm).
export const JARS = {
  dry: { name: 'Dry grinding jar', short: 'Dry jar', litres: 1.0, blade: 'dry', rb: 0.035, R: 1.2, H: 2.6, clear: false, ribs: 0 },
  chutney: { name: 'Chutney jar', short: 'Chutney jar', litres: 0.4, blade: 'wet', rb: 0.03, R: 0.95, H: 1.8, clear: false, ribs: 0 },
  liquid: { name: 'Liquidiser jar', short: 'Liquidiser', litres: 1.5, blade: 'four', rb: 0.04, R: 1.3, H: 3.3, clear: true, ribs: 4 },
};
// Food drag on the blades: T = kd·ω² (a turbulent-drag law), tuned per load so that 100 g of
// dry spice takes about 0.12 N·m at 17,000 rpm (≈ 220 W into the food) and a full jar of
// idli batter about 0.36 N·m at 12,800 rpm, drawing about 700 W, near the motor's 750 W rating.
export const FOODS = {
  empty: { name: 'Nothing (empty)', kd: 0, mass: 0, c: 0, d0: 0 },
  spice: { name: '100 g cumin (dry)', kd: 3.8e-8, mass: 0.1, c: 1800, d0: 3 },
  chutney: { name: 'Coconut chutney', kd: 1.1e-7, mass: 0.25, c: 3200, d0: 6 },
  batter: { name: 'Soaked rice for batter', kd: 2.0e-7, mass: 0.8, c: 3500, d0: 5 },
  overload: { name: 'Too much dry rice', kd: 6.5e-7, mass: 0.5, c: 1600, d0: 5 },
};
export const foodTorque = (key) => { const kd = FOODS[key]?.kd || 0; return (w) => kd * w * w; };

// Grinding: Rittinger's law (1867), the classic rule for fine grinding: the energy per kilogram
// needed goes as E = C_R·(1/d − 1/d0). Only the work done on the food counts. C_R is chosen so that
// 100 g of cumin on speed 3 reaches a fine powder (about 0.2 mm) in about a minute, as recipes say.
// Blade fit: how much of the work breaks particles rather than just stirring (an assumption:
// flat dry blades suit dry grinding, the upturned wet blade suits wet loads, and the liquidiser's
// four-wing blade mostly mixes).
export const RITTINGER = 27;          // kJ·mm per kg
export const FIT = { dry: { spice: 1, chutney: 0.55, batter: 0.5, overload: 0.7 }, wet: { spice: 0.6, chutney: 1, batter: 1, overload: 0.6 }, four: { spice: 0.35, chutney: 0.6, batter: 0.55, overload: 0.3 } };
export function particleSize(d0, energyJ, mass, fit = 1) {
  if (!mass) return d0;
  const inv = 1 / d0 + (fit * energyJ / 1000 / mass) / RITTINGER;
  return Math.max(0.03, 1 / inv);
}

// ---------------------------------------------------------------- geometry helpers
export function vrod(y0, y1, r0, r1 = r0, mat, seg = 40, open = false) {
  const g = new THREE.CylinderGeometry(r1, r0, Math.abs(y1 - y0), seg, 1, open);
  const m = new THREE.Mesh(g, mat); m.position.y = (y0 + y1) / 2; m.castShadow = m.receiveShadow = true; return m;
}
export function latheY(profile, mat, seg = 64, phiStart = 0, phiLength = TAU) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg, phiStart, phiLength);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function roundedBlock(w, d, h, r, mat, bevel = 0.12) {
  const s = new THREE.Shape();
  const x0 = -w / 2 + r, x1 = w / 2 - r, z0 = -d / 2 + r, z1 = d / 2 - r;
  s.moveTo(x0, -d / 2); s.lineTo(x1, -d / 2); s.absarc(x1, z0, r, -Math.PI / 2, 0); s.lineTo(w / 2, z1); s.absarc(x1, z1, r, 0, Math.PI / 2);
  s.lineTo(x0, d / 2); s.absarc(x0, z1, r, Math.PI / 2, Math.PI); s.lineTo(-w / 2, z0); s.absarc(x0, z0, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 20 });
  g.rotateX(Math.PI / 2); g.translate(0, h - bevel, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- blades
// A blade assembly, axis +Y, turning anticlockwise seen from above (as most mixers do).
// type 'dry': two flat wings with sharp bevelled edges, for chopping and milling dry spices.
// type 'wet': two wings with the tips bent up, to lift and churn wet loads.
// type 'four': four wings, two tipped up and two tipped down, to mix a whole jar of liquid.
export function makeBlade(type, R, mat = M.metal(0xdfe4ec, { roughness: 0.2 })) {
  const g = new THREE.Group();
  const w = R * 0.24, th = 0.04;
  const wing = (angle, tip, lenIn = 0.62) => {
    const holder = new THREE.Group(); holder.rotation.y = angle; g.add(holder);
    const inner = box(R * lenIn, th, w, mat); inner.position.x = (R * lenIn) / 2; holder.add(inner);
    const outerLen = R * (1 - lenIn) / Math.cos(tip);
    const joint = new THREE.Group(); joint.position.x = R * lenIn; joint.rotation.z = tip; holder.add(joint);
    const outer = box(outerLen, th, w * 0.85, mat); outer.position.x = outerLen / 2; joint.add(outer);
    // A thin bevel strip on the leading edge (it faces the way the blade turns: -Z at +X).
    const edge = box(R * lenIn + outerLen * 0.9, th * 0.5, w * 0.18, M.metal(0xffffff, { roughness: 0.1 }));
    edge.position.set((R * lenIn) / 2, th * 0.3, -w * 0.45); holder.add(edge);
    return holder;
  };
  if (type === 'dry') { wing(0, 0, 0.9); wing(Math.PI, -0.12, 0.8); }
  else if (type === 'wet') { wing(0, 0.6, 0.55); wing(Math.PI, 0.6, 0.55); }
  else { wing(0, 0.55, 0.55); wing(Math.PI, 0.55, 0.55); wing(Math.PI / 2, -0.4, 0.5); wing(-Math.PI / 2, -0.4, 0.5); }
  const nut = vrod(-0.02, 0.1, 0.1, 0.08, M.metal(0xc0c6d0)); g.add(nut);
  return g;
}

// ---------------------------------------------------------------- a jar
// Built with its base at y = 0. Parts: collar (the black plastic foot that locks onto the base),
// body, blade assembly (shaft, bushing and seal in the floor), lid with gasket, handle,
// and the jar's half of the coupler under the collar.
export function makeJar(key, { ghost = false } = {}) {
  const J = JARS[key];
  const g = new THREE.Group();
  const floor = 0.4;                                  // top of the collar = jar floor
  const bodyMat = J.clear
    ? M.clear(0xd8ecff, 0.2, { roughness: 0.05 })
    : M.metal(0xd9dee6, { roughness: 0.22, metalness: 0.85, transparent: true, opacity: 1, side: THREE.DoubleSide });
  const dark = M.plastic(0x23262e, { roughness: 0.5 });
  const collar = new THREE.Group(); g.add(collar);
  collar.add(latheY([[0, 0], [J.R + 0.18, 0], [J.R + 0.2, 0.05], [J.R + 0.2, floor - 0.02], [J.R + 0.05, floor], [0, floor]], dark));
  for (let i = 0; i < 3; i++) { const lug = box(0.36, 0.14, 0.2, dark); const a = (i / 3) * TAU; lug.position.set(Math.cos(a) * (J.R + 0.26), 0.12, Math.sin(a) * (J.R + 0.26)); lug.rotation.y = -a; collar.add(lug); }
  // The jar's coupler: a nylon star under the collar that meshes with the motor's rubber coupler.
  const jarCoupler = new THREE.Group(); jarCoupler.position.y = -0.02; g.add(jarCoupler);
  jarCoupler.add(vrod(-0.26, 0.02, 0.2, 0.2, M.plastic(0xf0f0ea, { roughness: 0.6 }), 24));
  for (let i = 0; i < 3; i++) { const t = box(0.46, 0.2, 0.09, M.plastic(0xf0f0ea, { roughness: 0.6 })); t.position.y = -0.2; t.rotation.y = (i / 3) * Math.PI; jarCoupler.add(t); }
  // Body: a slightly flared cup with a rolled rim.
  const R = J.R, H = J.H;
  const profile = [[0, floor], [R - 0.05, floor], [R, floor + 0.08], [R + 0.04, floor + H * 0.5], [R + 0.1, floor + H], [R + 0.13, floor + H + 0.03], [R + 0.08, floor + H + 0.02], [R + 0.03, floor + H * 0.5], [R - 0.04, floor + 0.1], [0, floor + 0.04]];
  const body = latheY(profile, bodyMat, 72); g.add(body);
  // Flow breakers: vertical ribs on the inside wall (the liquidiser has them; steel jars have small ones pressed in).
  const ribs = new THREE.Group(); g.add(ribs);
  const nr = J.ribs || 4, ribH = H * (J.ribs ? 0.9 : 0.7);
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * TAU + Math.PI / 4;
    const rib = box(0.16, ribH, 0.09, J.clear ? M.clear(0xcfe6ff, 0.45) : bodyMat);
    rib.position.set(Math.cos(a) * (R - 0.06), floor + 0.1 + ribH / 2, Math.sin(a) * (R - 0.06)); rib.rotation.y = -a; ribs.add(rib);
  }
  // Blade assembly: blades on a short shaft through a bushing and seal in the floor.
  const bladeY = floor + (J.blade === 'four' ? 0.34 : 0.28);
  const bladeR = J.rb / UNIT;
  const assembly = new THREE.Group(); g.add(assembly);
  const bush = vrod(floor - 0.3, floor + 0.12, 0.2, 0.16, M.metal(0xa9b0bb, { roughness: 0.35 })); assembly.add(bush);
  const seal = torus(0.15, 0.035, M.plastic(0x2b2f38), 24); seal.rotation.x = Math.PI / 2; seal.position.y = floor + 0.12; assembly.add(seal);
  const spin = new THREE.Group(); spin.position.y = bladeY; assembly.add(spin);
  spin.add(vrod(-bladeY + floor - 0.3, 0.12, 0.05, 0.05, M.metal(0xdfe4ec)));
  const blade = makeBlade(J.blade, bladeR); spin.add(blade);
  // Blur disc: shows the blur of a blade turning hundreds of times a second.
  const blurMat = M.ghost(0xcfe8ff, 0, { depthWrite: false });
  const blur = new THREE.Mesh(new THREE.RingGeometry(0.1, bladeR * 1.02, 48), blurMat); blur.rotation.x = -Math.PI / 2; blur.position.y = bladeY + 0.03; assembly.add(blur);
  // Lid and gasket.
  const lid = new THREE.Group(); lid.position.y = floor + H + 0.02; g.add(lid);
  const lidMat = M.plastic(0x2b3040, { roughness: 0.35, transparent: true, opacity: J.clear ? 0.9 : 1 });
  lid.add(latheY([[0, 0.28], [0.3, 0.28], [R * 0.95, 0.16], [R + 0.18, 0.1], [R + 0.2, 0.0], [R + 0.16, -0.04], [0, -0.04]], lidMat));
  lid.add(vrod(0.26, 0.42, 0.16, 0.2, M.plastic(0x16181f)));
  const gasket = torus(R + 0.04, 0.05, M.plastic(0xf2efe6, { roughness: 0.8 }), 64); gasket.rotation.x = Math.PI / 2; gasket.position.y = -0.03; lid.add(gasket);
  // Handle on the +X side.
  const handle = new THREE.Group(); g.add(handle);
  const hy0 = floor + H * 0.2, hy1 = floor + H * 0.85;
  handle.add(tube([[R + 0.05, hy1, 0], [R + 0.55, hy1 + 0.05, 0], [R + 0.72, (hy0 + hy1) / 2, 0], [R + 0.55, hy0 - 0.02, 0], [R + 0.08, hy0, 0]], 0.1, dark, false, 60));
  if (ghost) body.visible = false;
  return { group: g, key, J, collar, body, bodyMat, ribs, assembly, spin, blade, blur, blurMat, lid, gasket, handle, jarCoupler, floor, bladeY, bladeR, top: floor + H };
}

// ---------------------------------------------------------------- the base unit
// Base with the motor standing upright inside. From the bottom: suction feet, cooling fan,
// commutator and brushes, armature inside the stator with its two field coils, top bearing,
// then the shaft comes out through the top into the rubber drive coupler.
export const BASE = { W: 4.8, D: 4.3, H: 3.4 };
export function makeBase({ body = 0xeef1f5, accent = 0xff7a59 } = {}) {
  const g = new THREE.Group();
  const shellMat = M.plastic(body, { roughness: 0.3, transparent: true, opacity: 1 });
  const plateMat = M.plastic(0x2a2f3a, { roughness: 0.4, transparent: true, opacity: 1 });
  const shell = roundedBlock(BASE.W, BASE.D, BASE.H - 0.25, 0.9, shellMat, 0.18); shell.position.y = 0.25; g.add(shell);
  const plate = roundedBlock(BASE.W - 0.5, BASE.D - 0.5, 0.12, 0.7, plateMat, 0.04); plate.position.y = BASE.H - 0.06; g.add(plate);
  const topRing = latheY([[1.45, BASE.H + 0.04], [1.6, BASE.H + 0.06], [1.62, BASE.H + 0.12], [1.5, BASE.H + 0.12]], M.metal(0xc9ced8), 48); g.add(topRing);
  const band = box(BASE.W - 0.5, 0.1, 0.05, M.glow(accent)); band.position.set(0, 0.55, BASE.D / 2 + 0.01); g.add(band);
  // Suction ("vacuum") feet.
  const feet = [];
  const footMat = M.plastic(0x2a2d35, { roughness: 0.9 });
  for (const [x, z] of [[-1.7, -1.45], [1.7, -1.45], [-1.7, 1.45], [1.7, 1.45]]) {
    const f = latheY([[0, 0], [0.42, 0], [0.36, 0.08], [0.22, 0.2], [0.2, 0.3], [0, 0.3]], footMat, 32); f.position.set(x, 0, z); g.add(f); feet.push(f);
  }
  // Speed switch: a rotary knob on the front face, turning 0, 1, 2, 3, and P (pulse, sprung back).
  const knob = new THREE.Group(); knob.position.set(0, 1.75, BASE.D / 2 + 0.02); g.add(knob);
  const kd = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.3, 40), M.metal(0xc9ced8, { roughness: 0.25 })); kd.rotation.x = Math.PI / 2; kd.position.z = 0.15; kd.castShadow = true; knob.add(kd);
  const grip = box(0.18, 0.86, 0.22, M.plastic(0x3b4252)); grip.position.z = 0.38; knob.add(grip);
  const pointer = box(0.06, 0.3, 0.05, M.glow(accent)); pointer.position.set(0, 0.26, 0.5); knob.add(pointer);
  const dial = new THREE.Group(); dial.position.copy(knob.position); dial.position.z += 0.005; g.add(dial);
  const marks = [];
  // Positions: P at -45°, 0 at 0°, 1, 2, 3 at 45° steps clockwise (seen from the front).
  const KNOB_ANG = { P: 45, 0: 0, 1: -45, 2: -90, 3: -135 };
  for (const [k, deg] of Object.entries(KNOB_ANG)) {
    const a = (deg + 90) * Math.PI / 180;
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), M.glow(k === 'P' ? accent : 0x9aa3b2)); d.position.set(Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0); dial.add(d); marks.push(d);
  }
  // Inside: the motor.
  const inner = new THREE.Group(); g.add(inner);
  const iron = M.metal(0x6c7484, { roughness: 0.5, metalness: 0.6 });
  const copper = M.metal(0xd08a4a, { roughness: 0.35, metalness: 0.8, emissive: new THREE.Color(0), emissiveIntensity: 1 });
  // Stator: a laminated iron frame around the armature, with two field coils (left and right).
  const stator = new THREE.Group(); inner.add(stator);
  const yokeShape = new THREE.Shape(); yokeShape.moveTo(-1.25, -0.95); yokeShape.lineTo(1.25, -0.95); yokeShape.lineTo(1.25, 0.95); yokeShape.lineTo(-1.25, 0.95); yokeShape.lineTo(-1.25, -0.95);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.72, 0, TAU, true); yokeShape.holes.push(hole);
  const yg = new THREE.ExtrudeGeometry(yokeShape, { depth: 1.2, bevelEnabled: false, curveSegments: 40 }); yg.rotateX(-Math.PI / 2); yg.translate(0, 1.1, 0);
  const yoke = new THREE.Mesh(yg, iron); yoke.castShadow = true; stator.add(yoke);
  const fieldCoils = [];
  for (const sx of [-1, 1]) {
    const c = torus(0.5, 0.15, copper.clone(), 32); c.rotation.y = Math.PI / 2; c.scale.set(1, 1.5, 1); c.position.set(sx * 0.98, 1.7, 0);
    c.material.emissive = new THREE.Color(0); stator.add(c); fieldCoils.push(c);
  }
  // Rotor: armature + windings, commutator, fan, shaft and the motor's rubber coupler.
  const rotor = new THREE.Group(); inner.add(rotor);
  rotor.add(vrod(0.25, BASE.H + 0.3, 0.07, 0.07, M.metal(0xdfe4ec), 16));
  const arm = vrod(1.15, 2.25, 0.64, 0.64, M.metal(0x4a505c, { roughness: 0.45 }), 36); rotor.add(arm);
  const armCopper = copper.clone();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const w = box(0.1, 1.3, 0.1, armCopper); w.position.set(Math.cos(a) * 0.62, 1.7, Math.sin(a) * 0.62); rotor.add(w); }
  for (const y of [1.08, 2.32]) { const e = torus(0.5, 0.08, armCopper, 36); e.rotation.x = Math.PI / 2; e.position.y = y; rotor.add(e); }
  const comm = new THREE.Group(); rotor.add(comm);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const seg = box(0.12, 0.4, 0.035, M.metal(i % 2 ? 0xe0a06a : 0xc8844e, { roughness: 0.3 })); seg.position.set(Math.cos(a) * 0.3, 0.82, Math.sin(a) * 0.3); seg.rotation.y = -a + Math.PI / 2; comm.add(seg); }
  comm.add(vrod(0.6, 1.04, 0.27, 0.27, M.plastic(0x2a2d35)));
  const fan = new THREE.Group(); rotor.add(fan);
  fan.add(vrod(0.34, 0.4, 1.1, 1.1, M.plastic(0x3a3f4b), 48));
  for (let i = 0; i < 10; i++) { const v = box(0.9, 0.2, 0.05, M.plastic(0x3a3f4b)); const a = (i / 10) * TAU; v.position.set(Math.cos(a) * 0.62, 0.48, Math.sin(a) * 0.62); v.rotation.y = -a + 0.3; fan.add(v); }
  const coupler = new THREE.Group(); coupler.position.y = BASE.H + 0.08; rotor.add(coupler);
  coupler.add(vrod(-0.12, 0.12, 0.34, 0.34, M.plastic(0x1d1f25, { roughness: 0.9 }), 6));
  for (let i = 0; i < 3; i++) { const t = box(0.62, 0.18, 0.1, M.plastic(0x1d1f25, { roughness: 0.9 })); t.position.y = 0.16; t.rotation.y = (i / 3) * Math.PI + Math.PI / 6; coupler.add(t); }
  // Brushes: carbon blocks pressed on the commutator by springs, in brass holders.
  const brushes = [];
  for (const sx of [-1, 1]) {
    const b = new THREE.Group(); b.position.set(sx * 0.3, 0.82, 0); inner.add(b);
    const carbon = box(0.36, 0.2, 0.2, M.matte(0x1b1c20)); carbon.position.x = sx * 0.2; b.add(carbon);
    const holderB = box(0.5, 0.28, 0.28, M.metal(0xc9a45a, { roughness: 0.4, transparent: true, opacity: 0.55 })); holderB.position.x = sx * 0.42; b.add(holderB);
    const sp = spring(sx * 0.4, sx * 0.72, 0.07, 0.015, 6, M.metal(0xdfe4ec)); b.add(sp);
    brushes.push(b);
  }
  // Top bearing bracket.
  const bracket = box(2.6, 0.12, 0.5, M.metal(0x9aa3b2, { roughness: 0.4 })); bracket.position.y = 2.55; inner.add(bracket);
  // Thermal overload protector, with its red reset button poking out under the base.
  const protector = new THREE.Group(); protector.position.set(1.7, 0.55, 1.1); inner.add(protector);
  protector.add(box(0.5, 0.3, 0.36, M.plastic(0x2f5bff)));
  const reset = vrod(-0.45, -0.12, 0.1, 0.1, M.plastic(0xff4a4a)); protector.add(reset);
  // Switch block behind the knob, and the mains cord out of the back.
  const switchBox = box(1.0, 0.7, 0.5, M.plastic(0x3b4252)); switchBox.position.set(0, 1.75, 1.8); inner.add(switchBox);
  const cord = tube([[-1.2, 0.5, -BASE.D / 2 + 0.2], [-1.3, 0.45, -BASE.D / 2 - 0.4], [-1.6, 0.1, -BASE.D / 2 - 1.2], [-2.4, 0.06, -BASE.D / 2 - 1.8]], 0.07, M.plastic(0x1d1f25)); g.add(cord);
  // Wires from the switch to the field coils (for the X-ray view).
  const wireMat = M.plastic(0xff5a5a, { roughness: 0.5 });
  inner.add(tube([[0, 1.75, 1.55], [0.6, 1.9, 1.0], [0.95, 2.2, 0.3]], 0.03, wireMat, false, 30));
  inner.add(tube([[0, 1.6, 1.55], [-0.6, 1.3, 0.8], [-0.95, 1.2, 0.3]], 0.03, M.plastic(0x5b8cff), false, 30));
  return {
    group: g, shell, shellMat, feet, knob, dial, marks, KNOB_ANG, inner, stator, fieldCoils, rotor, arm, armCopper, comm, fan, coupler, brushes, protector, reset, switchBox, bracket, topRing, cord,
    setKnob(v) { knob.rotation.z = (KNOB_ANG[v] ?? 0) * Math.PI / 180; },
    setXray(on) { shellMat.opacity = on ? 0.16 : 1; shellMat.depthWrite = !on; plateMat.opacity = on ? 0.3 : 1; plateMat.depthWrite = !on; inner.visible = on; },
  };
}

// A whole mixer: base + one jar seated on it.
export function makeMixer(jarKey = 'dry') {
  const base = makeBase();
  const g = new THREE.Group(); g.add(base.group);
  const seat = new THREE.Group(); seat.position.y = BASE.H + 0.06; g.add(seat);
  let jar = makeJar(jarKey); seat.add(jar.group);
  const api = {
    group: g, base, seat, get jar() { return jar; },
    setJar(key) { if (jar.key === key) return jar; seat.remove(jar.group); dispose(jar.group); jar = makeJar(key); seat.add(jar.group); return jar; },
    // a: rotor angle in radians. Motor, coupler and blades all turn together.
    setSpin(a) { base.rotor.rotation.y = a; jar.spin.rotation.y = a; jar.jarCoupler.rotation.y = a; },
  };
  return api;
}

export function dispose(obj) {
  obj.traverse((o) => { if (o.isCSS2DObject) o.element.remove(); o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose(); }); });
}

// How much a shown spin is slowed: a real blade at 20,000 rpm turns 333 times a second.
// On screen it turns rpm / SLOW turns a second, and a blur disc fades in as it speeds up.
export const SLOW = 5000;
export function blurFor(rpm) { return clamp(rpm / 20000, 0, 1) * 0.35; }

// Colour for a temperature (°C) from cool blue through amber to red.
export function heatColor(T, out = new THREE.Color()) {
  const k = clamp((T - 25) / 100, 0, 1);
  return out.setRGB(0.35 + 0.65 * k, 0.75 - 0.35 * k * k, 1 - 0.85 * k);
}

// Food particles: a swarm of small bits inside a jar.
export function foodSwarm(count, color = 0xd9a45a, r = 0.05) {
  return swarm(count, new THREE.IcosahedronGeometry(r, 0), M.plastic(color, { roughness: 0.7 }));
}

// Repeatable random numbers (videos come out the same every time).
export function rng(seed = 1234) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------------------------------------------------------------- flow in a jar
// Tracer bits that circulate in a jar of radius R, blades at height yb, load up to height top.
// The usual loop in a mixer: flung out along the blades, up the wall, back across the top and
// down the middle into the blades again (a "toroidal" loop), while the whole lot also swirls.
// update(dt, { loop, swirl, ride, top, rim, size }):
//   loop  how fast bits go round the loop (loops per second)
//   swirl how fast the load turns round the jar (radians per second, as shown)
//   ride  0 → normal loop; 1 → bits are stuck riding round the wall (no flow back into the blades)
//   top   load height at the centre; rim: load height at the wall (a vortex makes rim > top)
export function jarFlow(count, R, yb, color = 0xd9a45a, radius = 0.06, seed = 777) {
  const mesh = swarm(count, new THREE.IcosahedronGeometry(radius, 0), M.plastic(color, { roughness: 0.7 }));
  const rnd = rng(seed);
  const P = Array.from({ length: count }, () => ({ q: 0.55 + 0.45 * Math.sqrt(rnd()), h: rnd(), u: rnd(), a: rnd() * TAU, s: 0.7 + 0.6 * rnd(), wob: rnd() * TAU }));
  const legs = (p, top, rim) => {
    const r = p.q * R, hy = yb + 0.1 + (0.35 + 0.65 * p.h) * (Math.max(yb + 0.3, rim) - yb - 0.1);
    const hc = yb + 0.1 + (0.35 + 0.65 * p.h) * (Math.max(yb + 0.3, top) - yb - 0.1);
    return [
      { a: [0.12 * R, yb], b: [0.9 * r, yb + 0.12], k: 1.6 },   // flung out along the blades
      { a: [0.9 * r, yb + 0.12], b: [0.9 * r, hy], k: 0.7 },    // up the wall
      { a: [0.9 * r, hy], b: [0.25 * r, hc], k: 0.8 },          // back across the top
      { a: [0.25 * r, hc], b: [0.12 * R, yb], k: 0.9 },         // down the middle, into the blades
    ];
  };
  return {
    mesh,
    update(dt, { loop = 0.5, swirl = 1, ride = 0, top = yb + 1, rim = top, size = 1 } = {}) {
      dt = Math.max(0, dt);
      for (let i = 0; i < count; i++) {
        const p = P[i], L = legs(p, top, rim);
        let tot = 0; for (const l of L) { l.t = Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) / l.k; tot += l.t; }
        p.u = (p.u + (loop * dt * p.s)) % 1;
        let t = p.u * tot, j = 0; while (j < 3 && t > L[j].t) { t -= L[j].t; j++; }
        const l = L[j], k = Math.min(1, t / l.t);
        let r = l.a[0] + (l.b[0] - l.a[0]) * k, y = l.a[1] + (l.b[1] - l.a[1]) * k;
        // Riding the wall: pinned near the wall at the rim height, only swirling.
        const wr = R * (0.86 + 0.08 * p.q), wy = yb + 0.25 + (rim - yb - 0.25) * (0.55 + 0.45 * p.h);
        r += (wr - r) * ride; y += (wy - y) * ride;
        p.a += swirl * dt * (j === 0 ? 1.6 : 1) * (0.8 + 0.4 * p.q);
        const wob = 0.04 * Math.sin(p.wob + p.u * 40);
        mesh.place(i, [Math.cos(p.a) * r, y + wob, Math.sin(p.a) * r], [p.a, p.wob, 0], size * (0.7 + 0.6 * p.s * 0.5));
      }
      mesh.done();
    },
  };
}

// Half of a jar (the back half), so we can see inside: a cutaway.
export function cutawayJar(key, mat) {
  const J = JARS[key], R = J.R, H = J.H, floor = 0.4;
  const g = new THREE.Group();
  const profile = [[0, floor], [R - 0.05, floor], [R, floor + 0.08], [R + 0.04, floor + H * 0.5], [R + 0.1, floor + H], [R + 0.13, floor + H + 0.03], [R + 0.08, floor + H + 0.02], [R + 0.03, floor + H * 0.5], [R - 0.04, floor + 0.1], [0, floor + 0.04]];
  const wall = latheY(profile, mat || M.metal(0xd9dee6, { roughness: 0.25, metalness: 0.8, side: THREE.DoubleSide }), 64, Math.PI / 2, Math.PI);
  g.add(wall);
  const collar = latheY([[0, 0], [R + 0.18, 0], [R + 0.2, 0.05], [R + 0.2, floor - 0.02], [R + 0.05, floor], [0, floor]], M.plastic(0x23262e), 48, Math.PI / 2, Math.PI);
  g.add(collar);
  return { group: g, wall, floor, R, H, J };
}
