// Chapter 4: flow in the jar. A spinning blade sets the whole load swirling; ribs on the wall
// (flow breakers) stop the swirl and turn it into an up-and-down loop that keeps feeding the blades.
//
// Model (simple, stated):
//  - The blade drives the load's swirl; the wall drags it back. Angular momentum balance gives
//    the load's swirl ω_f = ω_b · 1/(1 + D), with wall drag ratio D = 20 for a smooth wall and
//    150 with ribs (assumed; ribs act like baffles in a stirred tank, which cut swirl several-fold).
//  - A swirling liquid's surface is a paraboloid: it rises ω_f²R²/4g at the wall and dips the
//    same at the centre (Newton's bucket). If the dip reaches the blades they spin in an air
//    pocket (a common complaint with smooth jars and thick loads).
//  - Turnover: how many times a second the whole load passes through the blades. It grows with
//    tip speed, needs the blades covered, needs ribs to turn swirl into up-and-down flow, and
//    falls when the load is too thick (little water). Scaled so a ribbed jar of runny chutney
//    turns over about 3 times a second at full speed (an estimate).
import { THREE, M, canvasTexture, approach, clamp, smooth } from '../kit.js';
import { TAU, SLOW, JARS, makeJar, jarFlow, steadySpeed, rpmOf, blurFor, vrod } from '../mixer.js';

const J = JARS.liquid, RM = J.R * 0.05;       // jar radius in metres (6.5 cm)
const G = 9.81;
const SHOW_SWIRL = 0.12;                       // swirl shown 8 times slower than real

export function vortexModel(s, wb, since = 99) {
  const D = s.ribs ? 150 : 20;
  const wf = wb / (1 + D);
  const rise = (wf * wf * RM * RM) / (4 * G);                        // metres, at the wall (and the dip at the centre)
  const visc = clamp((s.water - 0.05) / 0.3, 0.08, 1);
  const pulseBoost = s.pulse ? Math.exp(-since / 0.35) : 0;           // after each stop the load slumps back onto the blades
  return { D, wf, rise, visc: Math.max(visc, pulseBoost), pulseBoost };
}

export default {
  id: 'vortex',
  short: 'The vortex',
  title: 'Why jars have ribs',
  subtitle: 'Stop the whole load from spinning, and it keeps falling back into the blades.',
  view: { pos: [1.4, 6.8, 14.2], target: [1.1, 4.5, 0] },
  learn: `<p>Spin a blade in a jar and it drags the food round with it. Soon the <b>whole load is swirling</b>, pressed against the wall, with a dip in the middle: a <b>vortex</b>. The blade just slips through food that is already moving with it, and bits at the top never come down to be cut.</p>
    <p>That's why jars have <b>ribs</b> on the inside wall, called <b>flow breakers</b>. They stop the swirl. The blade flings food outwards, it hits the ribs and climbs the wall, rolls back across the top and <b>falls down the middle into the blades again</b>. Every bit gets many turns at the blades.</p>
    <p>Thick food makes it worse. A dry chutney sticks to the wall and the blades dig an <b>air pocket</b> under it. A splash of <b>water</b> lets it flow back. <b>Pulse</b> mode helps too: each stop lets the load slump back onto the blades.</p>
    <p class="tip"><b>Try it:</b> turn the ribs off and watch the load ride round the wall. Then make it thick, and try pulse.</p>`,
  terms: [
    { t: 'Vortex', d: 'A spinning mass of liquid, with its surface dipping in the middle and rising at the edge.' },
    { t: 'Flow breakers', d: 'Ribs on a jar’s inside wall that stop the load swirling round with the blade.' },
    { t: 'Turnover', d: 'How often the whole load passes through the blades.' },
    { t: 'Pulse', d: 'Short bursts of full speed. Each stop lets the food fall back onto the blades.' },
  ],
  defaults: { ribs: true, water: 0.3, speed: 3, pulse: false },
  controls: [
    { key: 'ribs', type: 'toggle', label: 'Ribs on the jar wall', hint: 'Flow breakers. Turn them off to see the load spin with the blade.' },
    { key: 'water', type: 'range', label: 'Water in the chutney', min: 0, max: 0.6, step: 0.01, ends: ['thick paste', 'runny'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] },
    { key: 'pulse', type: 'toggle', label: 'Pulse (short bursts)' },
  ],
  quiz: [
    { q: 'What do the ribs inside a jar do?', options: ['Make it stronger', 'Stop the load swirling, so it keeps falling back into the blades', 'Measure the level', 'Cool the food'], answer: 1, why: 'Without them the whole load spins with the blade and the blade has little to cut.' },
    { q: 'Your chutney just spins round the wall with an empty hole in the middle. What helps?', options: ['Run it longer on speed 3', 'Add a little water, or use pulse', 'Take the lid off', 'Add more coconut'], answer: 1, why: 'Water lets the paste flow back to the blades, and each pulse lets it slump back down.' },
    { q: 'Why does a swirling liquid’s surface dip in the middle?', options: ['The blade sucks it down', 'Spinning liquid is flung outwards, so it piles up at the wall', 'Air pressure', 'The jar is narrower there'], answer: 1, why: 'Every bit of liquid needs a push towards the centre to go round; the higher level at the wall provides it.' },
  ],
  reel: [
    { ms: 5200, caption: 'Without ribs, the whole load spins with the blade, and a vortex opens down to the blades.', set: { ribs: false, water: 0.3, speed: 3, pulse: false }, view: { pos: [1.4, 6.8, 14.6], target: [1.0, 4.3, 0] }, spin: 0.15 },
    { ms: 5200, caption: 'Ribs break the swirl. Food climbs the wall, rolls back and falls into the blades again and again.', set: { ribs: true, water: 0.3, speed: 3, pulse: false }, view: { pos: [1.4, 6.8, 14.6], target: [1.0, 4.3, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(-0.9, 0, 0); root.scale.setScalar(1.45); stage.root.add(root);
    root.add(vrod(0, 0.3, 1.8, 1.9, M.plastic(0x2a2f3a)));
    const jar = makeJar('liquid'); jar.group.position.y = 0.3; root.add(jar.group);
    jar.lid.visible = true;
    const yFloor = 0.3 + jar.floor, yb = 0.3 + jar.bladeY, R = J.R - 0.02;
    // The liquid: a polar grid for the surface, an open cylinder for the side, both reshaped each frame.
    const NR = 14, NA = 64;
    const surfGeo = new THREE.BufferGeometry();
    const sp = new Float32Array((NR + 1) * (NA + 1) * 3), sidx = [];
    for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; sidx.push(a, b, a + 1, b, b + 1, a + 1); }
    surfGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3)); surfGeo.setIndex(sidx);
    const liquidCol = 0xf1ecd8;
    const surf = new THREE.Mesh(surfGeo, M.plastic(liquidCol, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, roughness: 0.25 })); root.add(surf);
    const sideGeo = new THREE.CylinderGeometry(R, R, 1, NA, 1, true);
    const side = new THREE.Mesh(sideGeo, M.plastic(liquidCol, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })); root.add(side);
    const bits = jarFlow(240, R - 0.06, yb, 0x6bbf59, 0.055, 99); root.add(bits.mesh);
    const blades = jar.spin;
    const lRibs = stage.label('Ribs: flow breakers', [J.R - 0.1, yFloor + 2.4, 0.9], root);
    const lVortex = stage.label('', [0, 0, 0], root, 'hot');
    stage.label('Blades', [-J.R - 0.2, yb, 0.4], root);

    // A small board with the key numbers (also shown in videos, where the readout is hidden).
    const st = { swirl: 0, turn: 0, pocket: false, ribs: true };
    const card = canvasTexture(760, 300, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, W, H);
      g.font = 'bold 34px sans-serif'; g.fillStyle = st.ribs ? '#5ce1a9' : '#ff7a59'; g.fillText(st.ribs ? 'With ribs' : 'No ribs', 28, 52);
      g.font = '28px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
      g.fillText('Load swirls at', 28, 118); g.fillText('Passes through the blades', 28, 178);
      g.font = 'bold 34px sans-serif'; g.fillStyle = '#e8eef8';
      g.fillText(`${Math.round(st.swirl)} rpm`, 470, 118); g.fillText(`${st.turn.toFixed(1)} × a second`, 470, 178);
      g.font = 'bold 28px sans-serif'; g.fillStyle = st.pocket ? '#ff7a59' : '#5ce1a9';
      g.fillText(st.pocket ? 'Air pocket round the blades!' : 'Blades covered, food keeps falling in', 28, 250);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.97), new THREE.MeshBasicMaterial({ map: card.tex, transparent: true, toneMapped: false }));
    board.position.set(4.7, 6.4, -1.0); stage.root.add(board);

    let rpm = 0, ang = 0, since = 0, t = 0, redraw = 0;
    let rise = 0, dipShown = 0;
    const out = { wf: 0, turn: 0, pocket: false, riseM: 0, wb: 0 };
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        jar.ribs.visible = s.ribs; lRibs.visible = s.ribs;
        // Pulse: 0.8 s on, 0.8 s off.
        const on = s.pulse ? (t % 1.6) < 0.8 : true;
        since = on ? since + dt : 0;
        const tf = (w) => (1.2e-7 + 1.4e-7 * (1 - s.water / 0.6)) * w * w;   // thicker load, more drag
        const wbT = on ? steadySpeed(s.speed, tf) : 0;
        rpm = approach(rpm, rpmOf(wbT), on ? 5 : 2.5, dt);
        const wb = (rpm * TAU) / 60;
        const m = vortexModel(s, wb, since);
        // Liquid heights (units): at rest the load stands 1.3 units deep; the paraboloid's dip and rise.
        const rest = yFloor + 1.3;
        rise = approach(rise, m.rise / 0.05, 3, dt);
        const hc = Math.max(yb - 0.05, rest - rise), hr = Math.min(0.3 + jar.top - 0.1, rest + rise);
        dipShown = rest - hc;
        const pocket = hc < yb + 0.25 && rpm > 500;
        // Turnover (per second), see the header.
        const cover = pocket ? 0.12 : 1;
        const turn = rpm < 200 ? 0 : 3.1 * (wb * J.rb / 70) * cover * (s.ribs ? 1 : 0.3) * m.visc;
        Object.assign(out, { wf: m.wf, turn, pocket, riseM: m.rise, wb });
        // Reshape the surface: y = hc + (hr − hc)(r/R)².
        for (let i = 0; i <= NR; i++) {
          const rr = (i / NR) * R, y = hc + (hr - hc) * (rr / R) ** 2;
          for (let j = 0; j <= NA; j++) { const a = (j / NA) * TAU, k = (i * (NA + 1) + j) * 3; sp[k] = Math.cos(a) * rr; sp[k + 1] = y; sp[k + 2] = Math.sin(a) * rr; }
        }
        surfGeo.attributes.position.needsUpdate = true; surfGeo.computeVertexNormals();
        side.scale.y = Math.max(0.01, hr - yFloor); side.position.y = (hr + yFloor) / 2;
        // Blades.
        ang += (rpm / SLOW) * TAU * dt;
        blades.rotation.y = ang; jar.jarCoupler.rotation.y = ang;
        jar.blurMat.opacity = blurFor(rpm);
        // Bits: loop speed ∝ turnover; swirl ∝ the load's swirl; ride the wall when there is no flow back.
        const ride = s.ribs ? (pocket ? 0.5 : 0) : smooth(1 - turn / 1.2);
        bits.update(dt, { loop: turn * 0.22, swirl: (m.wf * SHOW_SWIRL) + (rpm > 200 ? 0.3 : 0), ride, top: hc + 0.05, rim: hr - 0.05, size: 1 });
        lVortex.position.set(0.5, hc + 0.25, 0.6);
        lVortex.element.textContent = pocket ? 'Vortex reaches the blades: air pocket' : dipShown > 0.15 ? 'Vortex' : '';
        lVortex.visible = rpm > 200 && dipShown > 0.15;
        redraw += dt;
        if (redraw > 0.15) { Object.assign(st, { swirl: rpmOf(m.wf), turn, pocket, ribs: s.ribs }); card.redraw(); redraw = 0; }
      },
      readout: (s) => `<div class="big">${out.pocket ? '<span class="no">Air pocket</span>' : `Turnover ${out.turn.toFixed(1)} per second`}</div>
        <div class="row"><span>Blades</span><b>${Math.round(rpmOf(out.wb) / 100) * 100} rpm</b></div>
        <div class="row"><span>Load swirls at</span><b>${Math.round(rpmOf(out.wf))} rpm</b></div>
        <div class="row"><span>Surface dip at the centre</span><b>${out.pocket ? 'down to the blades' : (out.riseM * 100).toFixed(1) + ' cm'}</b></div>
        <div class="row"><span>Water in the load</span><b>${Math.round(s.water * 100)}%</b></div>
        <small>${s.ribs ? 'Ribs turn swirl into an up-and-down loop.' : 'No ribs: the load rides round with the blade.'}${s.water < 0.12 ? ' Too thick: it sticks.' : ''}</small>`,
    };
  },
};
