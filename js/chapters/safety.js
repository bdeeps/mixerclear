// Chapter 6: safety, shaking and noise. A small lump on a blade spinning 250 times a second makes a
// big rotating force, F = m·e·ω². Suction feet, the lid, the fill line and the lid interlock.
//
// Numbers: base + jar ≈ 3.5 kg (typical 750 W mixers weigh 3 to 4 kg), so its weight is ≈ 34 N.
// Grip before it slides = μ × (weight + suction), μ ≈ 0.5 for rubber on a stone counter; four
// suction cups add ≈ 15 N each when they seal (assumed). A lump sits at the blade tip, e = 3.5 cm.
// Noise: sound power from spinning parts grows roughly as speed⁵ (the fan laws: 50·log10 of the
// speed ratio), from about 85 dB at 20,000 rpm up close, plus extra from shaking and rattling.
// Typical Indian mixer grinders measure about 85–95 dB up close (e.g. everythingbetter.in's tests: 88–90 dB).
import { THREE, M, box, canvasTexture, swarm, approach, clamp } from '../kit.js';
import { TAU, SLOW, JARS, BASE, makeMixer, steadySpeed, foodTorque, rpmOf, blurFor, rng } from '../mixer.js';

const MASS = 3.5, MU = 0.5, CUP = 15, G = 9.81;
const E = JARS.dry.rb;                               // lump radius, m

export function shake(s, w) {
  const F = (s.lump / 1000) * E * w * w;
  const grip = MU * (MASS * G + (s.feet === 'suction' ? 4 * CUP : 0));
  const rpm = rpmOf(w);
  const noise = w > 1 ? clamp(85 + 50 * Math.log10(rpm / 20000) + (s.fill === 'empty' ? 0 : 3) + 5 * Math.log10(1 + (F / 30) ** 2), 40, 110) : 0;
  return { F, grip, noise, walks: F > grip };
}

export default {
  id: 'safety',
  short: 'Shaking & safety',
  title: 'Shaking, noise and safety',
  subtitle: 'A lump of a gram shakes the whole machine. Suction feet, lids and fill lines keep it in check.',
  view: { pos: [1.6, 7.6, 15.8], target: [1.3, 3.9, 0] },
  learn: `<p>A spinning blade has to be <b>balanced</b>. Stick a lump on one wing and, as it whirls round, it pulls the whole machine towards itself, 300 times a second. The force is <b>F = m × r × ω²</b>. Because ω is squared, speed makes it huge: just <b>1 gram</b> at the blade tip at 17,000 rpm pulls with about 110 newtons, more than three times the mixer's own weight.</p>
    <p>That shaking makes the mixer <b>walk</b> across the counter. Its <b>vacuum feet</b> are soft rubber cups: press the mixer down and they suck onto a smooth counter, adding grip.</p>
    <p>Mixers are loud, often <b>85 to 95 dB</b> up close, louder than a busy road. The noise climbs steeply with speed, and a shaking jar rattles louder still.</p>
    <p>Some rules: keep the <b>lid on</b> (some mixers have a <b>lid interlock</b> that won't start without it). Don't fill past the <b>max line</b>: the load climbs the wall when it spins and pushes the lid. And don't run it <b>empty</b>: the motor races to top speed with nothing to cushion the blades, which wears the bushing and coupler.</p>
    <p class="tip"><b>Try it:</b> add a 1 g lump, then swap the suction feet for worn rubber.</p>`,
  terms: [
    { t: 'Unbalance', d: 'Mass that isn’t spread evenly round a spinning part, so it tugs the machine round in a circle.' },
    { t: 'F = m r ω²', d: 'The pull needed to keep a mass m going round in a circle of radius r at angular speed ω.' },
    { t: 'Vacuum feet', d: 'Rubber suction cups under the base that grip a smooth counter.' },
    { t: 'Lid interlock', d: 'A safety switch that only lets the motor run when the lid (or jar) is locked in place.' },
    { t: 'Decibel (dB)', d: 'The scale for loudness. Every 10 dB more sounds about twice as loud.' },
  ],
  defaults: { lump: 0, feet: 'suction', fill: 'normal', lid: true, interlock: false, speed: 3 },
  controls: [
    { key: 'lump', type: 'range', label: 'Lump stuck on one blade', min: 0, max: 2, step: 0.05, ends: ['none', '2 g'], fmt: (v) => v.toFixed(2) + ' g' },
    { key: 'feet', type: 'seg', label: 'Feet', options: [{ v: 'suction', label: 'Suction cups' }, { v: 'rubber', label: 'Worn rubber' }] },
    { key: 'fill', type: 'seg', label: 'How full', options: [{ v: 'empty', label: 'Empty' }, { v: 'normal', label: 'Normal' }, { v: 'over', label: 'Past max' }] },
    { key: 'lid', type: 'toggle', label: 'Lid on' },
    { key: 'interlock', type: 'toggle', label: 'Lid interlock fitted', hint: 'Some models have one. It won’t start without the lid.' },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] },
    { key: 'go', type: 'buttons', label: 'Counter', items: [{ label: 'Put it back', act: (s, inst) => inst.home() }] },
  ],
  quiz: [
    { q: 'A 1 g lump sits 3.5 cm from the centre at 17,000 rpm (1,780 rad/s). About how hard does it pull?', options: ['About 1 N', 'About 10 N', 'About 110 N', 'About 10,000 N'], answer: 2, why: 'F = m r ω² = 0.001 × 0.035 × 1,780² ≈ 110 N.' },
    { q: 'Why should you not fill a jar past the max line?', options: ['The motor can’t lift it', 'The spinning load climbs the wall and pushes out past the lid', 'The blades get blunt', 'It gets too cold'], answer: 1, why: 'A swirling load rises at the wall. Too full, and it forces its way out.' },
    { q: 'What do the vacuum feet do?', options: ['Cool the motor', 'Suck onto the counter so the mixer doesn’t walk', 'Measure the weight', 'Cut the noise to zero'], answer: 1, why: 'The rubber cups seal to a smooth counter and add grip against the shaking.' },
  ],
  reel: [
    { ms: 5400, caption: 'A lump of one gram on a blade tugs the whole mixer round hundreds of times a second, so it walks.', set: { feet: 'rubber', fill: 'normal', lid: true, interlock: false, speed: 3 }, anim: { lump: [0, 1.5] }, act: (s, inst) => inst.home(), spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(-1.6, 0.3, 0); stage.root.add(root);
    const counter = box(11, 0.5, 6, M.matte(0x3a3d46, { roughness: 0.6 })); counter.position.set(1.2, -0.25, 0); root.add(counter);
    const home = new THREE.Group(); root.add(home);
    const mx = makeMixer('dry'); home.add(mx.group);
    mx.base.setKnob('3');
    const feetMatS = mx.base.feet[0].material, feetCol = { suction: 0x2a2d35, rubber: 0x7a6a58 };
    // Food in the jar: a level you can see through the open top when the lid is off, and spill drops.
    const drops = swarm(70, new THREE.SphereGeometry(0.07, 8, 6), M.plastic(0xf1ecd8, { roughness: 0.3 }));
    root.add(drops);
    const rnd = rng(5150), D = Array.from({ length: 70 }, () => ({ a: rnd() * TAU, u: rnd(), v: 0.6 + rnd() * 0.8 }));
    // Sound rings.
    const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 80), M.glow(0x8ef0ff, { transparent: true, opacity: 0 })); m.rotation.x = Math.PI / 2; root.add(m); return m; });
    const lForce = stage.label('', [0, 0, 0], root, 'hot');
    const lFeet = stage.label('', [-2.4, 0.1, 1.6], home);

    // Force vs grip, and a noise meter.
    const st = { F: 0, grip: 0, noise: 0, walks: false, running: false };
    const card = canvasTexture(900, 520, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8eef8'; g.font = 'bold 32px sans-serif'; g.fillText('Shaking force vs grip', 24, 48);
      const x0 = 190, x1 = W - 40, maxF = 200, X = (f) => x0 + (clamp(f, 0, maxF) / maxF) * (x1 - x0);
      g.font = '26px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('Shaking', 24, 118); g.fillText('Grip', 24, 188);
      g.fillStyle = st.walks ? '#ff7a59' : '#ffb547'; g.fillRect(x0, 92, X(st.F) - x0, 36);
      g.fillStyle = '#5ce1a9'; g.fillRect(x0, 162, X(st.grip) - x0, 36);
      g.font = 'bold 26px sans-serif'; g.fillStyle = '#e8eef8';
      g.fillText(`${Math.round(st.F)} N`, Math.min(X(st.F) + 10, x1 - 90), 120); g.fillText(`${Math.round(st.grip)} N`, Math.min(X(st.grip) + 10, x1 - 90), 190);
      g.font = 'bold 28px sans-serif'; g.fillStyle = st.walks ? '#ff7a59' : '#5ce1a9';
      g.fillText(!st.running ? 'Not running' : st.walks ? 'It walks across the counter!' : 'Stays put', 24, 262);
      // Noise meter.
      g.fillStyle = '#e8eef8'; g.font = 'bold 32px sans-serif'; g.fillText('Noise up close', 24, 340);
      const n0 = 40, n1 = 110, NX = (d) => 24 + ((clamp(d, n0, n1) - n0) / (n1 - n0)) * (W - 64);
      const grad = g.createLinearGradient(24, 0, W - 40, 0); grad.addColorStop(0, '#5ce1a9'); grad.addColorStop(0.6, '#ffb547'); grad.addColorStop(1, '#ff5a5a');
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(24, 370, W - 64, 40); g.fillStyle = grad; g.fillRect(24, 370, NX(st.noise) - 24, 40);
      g.font = '22px sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)';
      [[40, 'quiet room'], [60, 'talking'], [85, 'busy road'], [100, 'motorbike']].forEach(([d, t]) => { g.fillRect(NX(d) - 1, 414, 2, 14); g.fillText(`${d} ${t}`, Math.min(NX(d) - 10, W - 180), 452); });
      g.font = 'bold 30px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText(st.noise ? `${Math.round(st.noise)} dB` : '', W - 150, 340);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.89), new THREE.MeshBasicMaterial({ map: card.tex, transparent: true, toneMapped: false }));
    board.position.set(4.3, 6.2, -1.8); stage.root.add(board);

    let rpm = 0, ang = 0, drift = new THREE.Vector3(), yaw = 0, t = 0, redraw = 0, spill = 0;
    const out = { w: 0, blocked: false };
    const api = { home() { drift.set(0, 0, 0); yaw = 0; } };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const blocked = s.interlock && !s.lid;
        const food = s.fill === 'empty' ? 'empty' : 'chutney';
        const target = blocked ? 0 : rpmOf(steadySpeed(s.speed, foodTorque(food)));
        rpm = approach(rpm, target, 3, dt);
        const w = (rpm * TAU) / 60;
        out.w = w; out.blocked = blocked;
        ang += (rpm / SLOW) * TAU * dt; mx.setSpin(ang);
        mx.jar.blurMat.opacity = blurFor(rpm);
        mx.jar.lid.visible = s.lid;
        feetMatS.color.set(feetCol[s.feet]);
        lFeet.element.textContent = s.feet === 'suction' ? 'Suction feet: gripping' : 'Worn rubber feet: slippy';
        const sh = shake(s, w);
        // Shaking: the base is pulled round towards the lump (drawn about 1,000 times bigger).
        const amp = clamp(sh.F / 150, 0, 1.2) * 0.07;
        const pa = ang * 3;                       // shown as a quick wobble
        home.position.set(drift.x + Math.cos(pa) * amp, 0, drift.z + Math.sin(pa) * amp);
        home.rotation.y = yaw;
        // Walking: creeps while the force beats the grip.
        if (sh.walks && rpm > 500) { const k = (sh.F - sh.grip) / sh.grip; drift.x += dt * 0.12 * Math.min(k, 2); drift.z += dt * 0.06 * Math.min(k, 2) * Math.sin(t * 0.7); yaw += dt * 0.08 * Math.min(k, 2); }
        drift.x = clamp(drift.x, -0.3, 1.6); drift.z = clamp(drift.z, -0.6, 0.6); yaw = clamp(yaw, -0.6, 0.6);
        // Sound rings expand from the mixer, brighter when louder.
        rings.forEach((r, i) => {
          const ph = ((t * 0.9 + i / 3) % 1);
          r.position.set(home.position.x, 4.0 + i * 0.1, home.position.z);
          r.scale.setScalar(2.2 + ph * 4);
          r.material.opacity = sh.noise > 1 ? (1 - ph) * clamp((sh.noise - 60) / 40, 0, 1) * 0.7 : 0;
        });
        // Spills: lid off (and running), or overfilled so the climbing load forces out past the lid.
        const top = BASE.H + 0.06 + mx.jar.top;
        const spray = rpm > 800 && s.fill !== 'empty' && (!s.lid || s.fill === 'over');
        spill = approach(spill, spray ? 1 : 0, 3, dt);
        D.forEach((d, i) => {
          d.u = (d.u + dt * d.v * 0.9) % 1;
          const r = mx.jar.J.R + (s.lid ? 0.15 : 0) + d.u * (s.lid ? 1.0 : 2.4) * spill;
          const y = top + (s.lid ? 0.1 : 0.2) + (s.lid ? -d.u * 1.6 : d.u * 2.2 - d.u * d.u * 3.2) * spill;
          drops.place(i, [home.position.x + Math.cos(d.a + t * 0.3) * r, y, home.position.z + Math.sin(d.a + t * 0.3) * r], null, spill > 0.05 ? 1 : 0.001);
        });
        drops.done();
        lForce.position.set(home.position.x + 2.2, 5.2, home.position.z);
        lForce.element.textContent = s.lump > 0.01 && rpm > 300 ? `Pull from the lump: ${Math.round(sh.F)} N` : '';
        lForce.visible = s.lump > 0.01 && rpm > 300;
        redraw += dt; if (redraw > 0.12) { Object.assign(st, sh, { running: rpm > 300 }); card.redraw(); redraw = 0; }
      },
      readout: (s) => {
        if (out.blocked) return '<div class="big">Won’t start</div>The lid interlock keeps the motor off until the lid is locked on.';
        const sh = shake(s, out.w), weight = MASS * G;
        const warn = s.fill === 'empty' ? '<div class="no">Running empty: it races at top speed with nothing to cushion the blades.</div>'
          : s.fill === 'over' ? '<div class="no">Past the max line: the spinning load climbs the wall and forces its way out.</div>'
          : !s.lid ? '<div class="no">Lid off: food sprays out.</div>' : '';
        return `<div class="big">${sh.walks ? '<span class="no">Walking!</span>' : Math.round(rpmOf(out.w) / 100) * 100 + ' rpm'}</div>
          <div class="row"><span>Pull from the lump, F = m r ω²</span><b>${Math.round(sh.F)} N</b></div>
          <div class="row"><span>Mixer’s weight</span><b>${Math.round(weight)} N</b></div>
          <div class="row"><span>Grip of the feet</span><b>${Math.round(sh.grip)} N</b></div>
          <div class="row"><span>Noise up close</span><b>about ${Math.round(sh.noise)} dB</b></div>${warn}`;
      },
    };
  },
};
