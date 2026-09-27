// Chapter 2: the universal motor. Field coils and armature in series, so on AC both currents
// flip together and the push never changes direction. Speed falls as the load grows.
import { THREE, M, box, torus, tube, arrow, canvasTexture, swarm, clamp, approach } from '../kit.js';
import { TAU, SLOW, MAINS, steadySpeed, motorState, rpmOf } from '../mixer.js';

const AC_SHOWN = 0.35;          // the mains is shown flipping 0.35 times a second (really 50)
const TMAX = 1.2;               // chart's torque axis, N·m

export default {
  id: 'motor',
  short: 'The motor',
  title: 'The universal motor',
  subtitle: 'Why a motor with brushes runs on AC, and why it slows down when the jar is full.',
  view: { pos: [0.9, 4.6, 12.4], target: [0.5, 4.35, 0] },
  learn: `<p>A mixer needs a motor that is small, light and <b>very fast</b>: around 18,000 to 22,000 rpm with nothing in the jar. That is the job of the <b>universal motor</b>.</p>
    <p>Current flows through the <b>field coils</b>, which turn the iron into a magnet. Then it flows through a <b>carbon brush</b>, into the <b>armature</b> coils, and out through the other brush. The magnet pushes on the current in the armature wires, and the armature turns. As it turns, the <b>commutator</b> keeps swapping which coils are connected, so the push always goes the same way round.</p>
    <p>Here is the clever part. Mains electricity flips direction 100 times a second. But the field coils and the armature are wired in a line, in <b>series</b>, so the same current flows through both. When it flips, <b>both</b> the magnet and the armature current flip, and two flips cancel out. The push stays the same way. That's why it's called universal: it runs on AC or DC.</p>
    <p>Load it up and it <b>slows down</b>. A slower armature makes less <b>back-voltage</b>, so more current flows, giving more push, but also more heat.</p>
    <p class="tip"><b>Try it:</b> add load and watch the speed fall and the current climb. Then swap the field coils for a permanent magnet.</p>`,
  terms: [
    { t: 'Series-wound', d: 'The field coils and armature are connected one after the other, so the same current flows through both.' },
    { t: 'Commutator', d: 'A ring of copper bars on the shaft. As it turns, the brushes touch different bars, switching the armature coils.' },
    { t: 'Back-voltage', d: 'A spinning armature acts like a generator and pushes back against the mains. The faster it spins, the less current can flow.' },
    { t: 'Torque', d: 'Turning force, measured in newton metres (N·m).' },
    { t: 'rpm', d: 'Revolutions per minute: how many whole turns the shaft makes each minute.' },
  ],
  defaults: { speed: 3, load: 0.2, wiring: 'series' },
  controls: [
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }], fmt: (v) => ['', 'all the field turns', 'fewer field turns', 'fewest field turns'][v] },
    { key: 'load', type: 'range', label: 'Load on the blades', min: 0, max: 1, step: 0.01, ends: ['empty jar', 'jammed'], fmt: (v) => v.toFixed(2) + ' N·m' },
    { key: 'wiring', type: 'seg', label: 'Field magnet', options: [{ v: 'series', label: 'Series coils' }, { v: 'magnet', label: 'Permanent magnet' }], fmt: (v) => (v === 'series' ? 'flips with the mains' : 'never flips') },
  ],
  quiz: [
    { q: 'Why does a universal motor keep turning the same way on AC?', options: ['The brushes turn the AC into DC', 'The field and armature currents flip together, so the push keeps its direction', 'It only uses half of each wave', 'The fan keeps it going'], answer: 1, why: 'In series, one current flows through both. Flip it and both magnets flip, and the push stays the same way.' },
    { q: 'You put a heavy load in the jar. What happens to the motor?', options: ['It speeds up', 'It slows down and draws more current', 'Nothing changes', 'It draws less current'], answer: 1, why: 'Slower spinning means less back-voltage, so more current flows. More current gives more push, and more heat.' },
    { q: 'Speed 1 uses more turns of the field coil than speed 3. Why is it slower?', options: ['More turns make a stronger magnet, so a lower speed makes enough back-voltage', 'More turns block the current', 'It uses a gearbox', 'Speed 1 uses a smaller blade'], answer: 0, why: 'A stronger field means the armature makes the same back-voltage at a lower speed, so it settles slower.' },
  ],
  reel: [
    { ms: 5400, caption: 'On AC the current flips 100 times a second, in the magnet and the armature together, so the push never changes direction.', set: { speed: 3, load: 0.15, wiring: 'series' }, act: (s, inst) => inst.reset(), spin: 0 },
    { ms: 5000, caption: 'Load the blades and the motor slows down, draws more current and gets hotter.', set: { speed: 3, wiring: 'series' }, anim: { load: [0.05, 0.75] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(-2.3, 3.5, 0); stage.root.add(root);
    const iron = M.metal(0x6c7484, { roughness: 0.5, metalness: 0.6 });

    // Stator frame with two poles (left and right). Axis of the motor along Z (towards you).
    const frame = new THREE.Shape(); frame.moveTo(-2.7, -2.1); frame.lineTo(2.7, -2.1); frame.lineTo(2.7, 2.1); frame.lineTo(-2.7, 2.1); frame.lineTo(-2.7, -2.1);
    const inner = new THREE.Path(); inner.moveTo(-2.25, -1.7); inner.lineTo(-2.25, 1.7); inner.lineTo(2.25, 1.7); inner.lineTo(2.25, -1.7); inner.lineTo(-2.25, -1.7); frame.holes.push(inner);
    const fg = new THREE.ExtrudeGeometry(frame, { depth: 1.8, bevelEnabled: false }); fg.translate(0, 0, -0.9);
    const yoke = new THREE.Mesh(fg, iron); yoke.castShadow = true; root.add(yoke);
    const coilMats = [];
    for (const sx of [-1, 1]) {
      const pole = box(0.75, 1.3, 1.8, iron); pole.position.x = sx * 1.9; root.add(pole);
      const shoe = new THREE.Shape(); const a0 = sx < 0 ? Math.PI - 0.95 : -0.95, a1 = sx < 0 ? Math.PI + 0.95 : 0.95;
      shoe.absarc(0, 0, 1.62, a0, a1, false); shoe.absarc(0, 0, 1.42, a1, a0, true);
      const sg = new THREE.ExtrudeGeometry(shoe, { depth: 1.8, bevelEnabled: false, curveSegments: 24 }); sg.translate(0, 0, -0.9);
      root.add(new THREE.Mesh(sg, iron));
      const mat = M.metal(0xd08a4a, { roughness: 0.4, metalness: 0.7, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const c = torus(0.95, 0.17, mat, 40); c.rotation.y = Math.PI / 2; c.scale.set(1.08, 0.82, 1); c.position.x = sx * 1.92; root.add(c);
      coilMats.push(mat);
    }
    // Armature: a laminated drum with conductors in slots; the commutator and shaft in front.
    const rotor = new THREE.Group(); root.add(rotor);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.9, 48), M.metal(0x3f4550, { roughness: 0.5 })); drum.rotation.x = Math.PI / 2; rotor.add(drum);
    const N = 16, conds = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU, m = M.metal(0xd08a4a, { roughness: 0.4, emissive: new THREE.Color(0), emissiveIntensity: 1 });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.05, 12), m); c.rotation.x = Math.PI / 2; c.position.set(Math.cos(a) * 1.17, Math.sin(a) * 1.17, 0); rotor.add(c);
      conds.push({ m, a });
    }
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 16), M.metal(0xdfe4ec)); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.6; rotor.add(shaft);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, seg = box(0.26, 0.1, 0.7, M.metal(i % 2 ? 0xe0a06a : 0xc8844e, { roughness: 0.3 }));
      seg.position.set(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 1.55); seg.rotation.z = a + Math.PI / 2; rotor.add(seg);
    }
    // Brushes on the commutator, top and bottom, with springs pushing them in.
    const brushMat = M.matte(0x1b1c20);
    for (const sy of [1, -1]) {
      const b = box(0.3, 0.42, 0.4, brushMat); b.position.set(0, sy * 0.84, 1.55); root.add(b);
      const holder = box(0.44, 0.5, 0.52, M.metal(0xc9a45a, { transparent: true, opacity: 0.5 })); holder.position.set(0, sy * 1.25, 1.55); root.add(holder);
    }
    // The series circuit: mains → left field coil → top brush → armature → bottom brush → right field coil → mains.
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    const path = new THREE.CatmullRomCurve3([
      P(-0.35, -3.25, 1.3), P(-2.0, -3.25, 1.3), P(-2.05, -2.2, 1.25), P(-1.92, -1.05, 1.15), P(-1.92, 0, 1.2), P(-1.92, 1.05, 1.15), P(-1.4, 2.35, 1.4), P(-0.35, 2.35, 1.6), P(0, 1.75, 1.7), P(0, 1.06, 1.6),
      P(0, 0.62, 1.7), P(0, 0, 1.95), P(0, -0.62, 1.7),
      P(0, -1.06, 1.6), P(0.35, -1.9, 1.6), P(1.4, -2.3, 1.4), P(1.92, -1.05, 1.15), P(1.92, 0, 1.2), P(1.92, 1.05, 1.15), P(2.3, 2.35, 1.3), P(2.95, 2.3, 1.3), P(2.95, -3.25, 1.3), P(0.35, -3.25, 1.3),
    ], false, 'catmullrom', 0.2);
    const wires = [[0, 0.36], [0.47, 1]].map(([u0, u1]) => { const pts = []; for (let k = 0; k <= 40; k++) pts.push(path.getPointAt(u0 + (u1 - u0) * (k / 40))); return tube(pts, 0.04, M.plastic(0xffb547, { roughness: 0.5 }), false, 80); });
    wires.forEach((w) => root.add(w));
    const plug = box(0.6, 0.5, 0.4, M.plastic(0x2a2f3a)); plug.position.set(0, -3.25, 1.3); root.add(plug);
    const dots = swarm(60, new THREE.SphereGeometry(0.075, 10, 8), M.glow(0xfff1a8));
    root.add(dots);
    // Field arrow across the gap, and the curved torque arrow on the armature.
    const fArrow = arrow(0x8ef0ff, 3, 0.4, 0.07); fArrow.position.z = 1.15; root.add(fArrow);
    const torqueArc = new THREE.Group(); torqueArc.position.z = 1.25; root.add(torqueArc);
    const arcMat = M.glow(0xff7a59, { transparent: true, opacity: 1 });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 10, 48, Math.PI * 0.9), arcMat); arc.rotation.z = Math.PI * 0.55; torqueArc.add(arc);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), arcMat); torqueArc.add(head);
    { const a = Math.PI * 0.55 + Math.PI * 0.9; head.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0); head.rotation.z = a; }
    const magnet = new THREE.Group(); magnet.visible = false; root.add(magnet);
    for (const [sx, col] of [[-1, 0xff6b6b], [1, 0x5b8cff]]) { const m = box(0.8, 1.35, 1.85, M.plastic(col, { roughness: 0.35 })); m.position.x = sx * 1.9; magnet.add(m); }
    const lN = stage.label('N', [-1.9, 0, 1.1], magnet, 'hot'), lS = stage.label('S', [1.9, 0, 1.1], magnet);
    const lField = stage.label('Field coil', [-2.0, 1.55, 1.1], root);
    stage.label('Carbon brush', [0.9, 1.3, 1.6], root);
    stage.label('Commutator', [1.15, -0.6, 1.9], root);
    stage.label('Armature', [0.8, -1.55, 1.1], root, 'hot');
    stage.label('230 V AC', [0, -3.7, 1.3], root);
    const lB = stage.label('', [0, 0.45, 1.25], fArrow);
    const lT = stage.label('', [-1.35, -1.5, 0.3], torqueArc, 'hot');

    // Chart board: the mains current and the push over time, and the speed–torque curve.
    const hist = new Float32Array(240).map((_, k) => -(240 - k) * (1 / 60) * AC_SHOWN * TAU); let histI = 0;
    const st = { n: 3, w: 0, load: 0.2, wiring: 'series', phase: 0 }, curves = {};
    const chart = canvasTexture(1000, 820, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, W, H);
      g.font = 'bold 32px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText('The mains current and the push', 24, 44);
      // Top chart: current i (yellow) and torque (orange), slowed down.
      const x0 = 60, x1 = W - 30, yc = 190, amp = 110;
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, yc); g.lineTo(x1, yc); g.stroke();
      g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('+', 30, yc - amp + 8); g.fillText('0', 30, yc + 6); g.fillText('−', 30, yc + amp + 4);
      const plot = (fn, col) => { g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); for (let k = 0; k < hist.length; k++) { const v = fn(hist[(histI + k) % hist.length]); const x = x0 + (k / (hist.length - 1)) * (x1 - x0), y = yc - v * amp; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
      plot((p) => Math.sin(p), '#ffd84a');
      plot((p) => (st.wiring === 'series' ? Math.sin(p) ** 2 : Math.sin(p)) * 0.95, '#ff7a59');
      g.font = 'bold 24px sans-serif'; g.fillStyle = '#ffd84a'; g.fillText('current', x0, 336); g.fillStyle = '#ff7a59';
      g.fillText(st.wiring === 'series' ? 'push = field × current: never negative' : 'push with a magnet: flips too', x0 + 120, 336);
      // Bottom chart: speed and current against load torque.
      const bx0 = 90, bx1 = W - 40, by0 = H - 60, by1 = 400;
      const X = (t) => bx0 + (t / TMAX) * (bx1 - bx0), Y = (rpm) => by0 - (rpm / 25000) * (by0 - by1), YI = (I) => by0 - (I / 8) * (by0 - by1);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText(`Speed ${st.n}: more load, slower, more current`, 24, by1 - 20);
      g.font = '21px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
      for (let r = 0; r <= 25000; r += 5000) { g.beginPath(); g.moveTo(bx0, Y(r)); g.lineTo(bx1, Y(r)); g.stroke(); g.fillText(r / 1000 + 'k', 40, Y(r) + 6); }
      for (let t = 0; t <= TMAX + 1e-6; t += 0.2) g.fillText(t.toFixed(1), X(t) - 12, by0 + 24);
      g.fillText('load, N·m', bx1 - 100, by0 + 50); g.fillText('rpm', 36, by1 + 30);
      const curve = (curves[st.n] ||= Array.from({ length: 49 }, (_, k) => { const t = (k / 48) * TMAX, w = steadySpeed(st.n, () => t); return [t, rpmOf(w), motorState(st.n, w).I]; }));
      g.lineWidth = 4; g.strokeStyle = '#8ef0ff'; g.beginPath(); curve.forEach(([t, r], k) => (k ? g.lineTo(X(t), Y(r)) : g.moveTo(X(t), Y(r)))); g.stroke();
      g.strokeStyle = '#ffd84a'; g.setLineDash([10, 8]); g.beginPath(); curve.forEach(([t, , I], k) => (k ? g.lineTo(X(t), YI(I)) : g.moveTo(X(t), YI(I)))); g.stroke(); g.setLineDash([]);
      g.font = 'bold 26px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText('speed', X(0.05), Y(curve[2][1]) - 14); g.fillStyle = '#ffd84a'; g.fillText('current (0 to 8 A)', X(0.6), YI(curve[24][2]) - 20);
      if (st.wiring === 'series') {
        const w = steadySpeed(st.n, () => st.load), r = rpmOf(w);
        g.fillStyle = '#ff7a59'; g.beginPath(); g.arc(X(st.load), Y(r), 11, 0, TAU); g.fill();
        g.beginPath(); g.arc(X(st.load), YI(motorState(st.n, w).I), 8, 0, TAU); g.fill();
      }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 4.92), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(4.1, 4.0, -0.6); stage.root.add(board);

    let rpm = 0, rotA = 0, phase = 0, jiggle = 0, redrawT = 0, lastKey = '';
    const hot = new THREE.Color(0xff5a3c), cold = new THREE.Color(0x3c8cff);
    const api = { reset() { rpm = 0; } };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        const series = s.wiring === 'series';
        magnet.visible = lN.visible = lS.visible = !series;
        coilMats.forEach((m) => { m.visible = series; });
        lField.visible = series;
        phase += dt * AC_SHOWN * TAU;
        const i = Math.sin(phase);
        // Series: the average push is steady, so the rotor settles at the speed where it balances the load.
        // A permanent magnet on AC: the push reverses every half cycle and averages to zero, so it only buzzes.
        const target = series ? rpmOf(steadySpeed(s.speed, () => s.load)) : 0;
        rpm = approach(rpm, target, 2.2, dt);
        if (!series) jiggle = 0.12 * Math.sin(phase); else jiggle = approach(jiggle, 0, 4, dt);
        rotA += (rpm / SLOW) * TAU * dt * 0.25;
        rotor.rotation.z = rotA + jiggle;
        // Colours: field coils glow red or blue with the current's direction.
        coilMats.forEach((m) => m.emissive.copy(i >= 0 ? hot : cold).multiplyScalar(Math.abs(i) * 0.9));
        // Field: across the gap, left to right when i > 0 (series); fixed for a magnet.
        const B = series ? i : 1;
        fArrow.rotation.z = B >= 0 ? -Math.PI / 2 : Math.PI / 2;
        fArrow.position.x = B >= 0 ? -1.5 : 1.5;
        fArrow.set(0.4 + 2.6 * Math.abs(B)); fArrow.visible = Math.abs(B) > 0.08;
        lB.element.textContent = 'Magnetic field'; lB.visible = fArrow.visible;
        // Armature conductors: current out of the screen under one pole, into it under the other
        // (the commutator keeps this pattern fixed in space while the drum turns).
        for (const c of conds) {
          const wa = c.a + rotor.rotation.z, x = Math.cos(wa);
          const dir = (x < 0 ? -1 : 1) * i;          // + = out of the screen; F = I L × B turns the drum anticlockwise
          c.m.emissive.copy(dir >= 0 ? hot : cold).multiplyScalar(Math.abs(dir) * Math.min(1, Math.abs(x) * 2.5) * 0.9);
        }
        // Push: field × current. Series: i² ≥ 0 always. Magnet: i, flipping.
        const push = series ? i * i : i;
        torqueArc.scale.set(push >= 0 ? 1 : -1, 1, 1);
        arcMat.opacity = 0.25 + 0.75 * Math.abs(push);
        lT.element.textContent = series ? 'Push: always this way' : (push >= 0 ? 'Push: this way…' : '…then that way');
        // Current dots run round the circuit, reversing with the mains.
        dots.userData.u = (dots.userData.u || 0) + i * dt * 0.16;
        for (let k = 0; k < 60; k++) {
          const u = (((k / 60 + dots.userData.u) % 1) + 1) % 1;
          dots.place(k, path.getPointAt(u).toArray(), null, 0.4 + 0.8 * Math.abs(i));
        }
        dots.done();
        // Chart.
        hist[histI] = phase; histI = (histI + 1) % hist.length;
        redrawT += dt;
        const key = `${s.speed}|${s.load.toFixed(2)}|${s.wiring}`;
        if (redrawT > 0.05 || key !== lastKey) { st.n = s.speed; st.load = s.load; st.wiring = s.wiring; chart.redraw(); redrawT = 0; lastKey = key; }
      },
      readout: (s) => {
        if (s.wiring !== 'series') return `<div class="big no">Buzzing, not turning</div>A magnet that never flips, with a current that flips 100 times a second, pushes forwards then backwards. On average: no push.<br><small>That is why the field of a mixer's motor is a coil in series, not a magnet.</small>`;
        const w = steadySpeed(s.speed, () => s.load), m = motorState(s.speed, w, s.load);
        const stall = w < 50;
        return `<div class="big${stall ? ' no' : ''}">${stall ? 'Stalled!' : Math.round(m.rpm / 100) * 100 + ' rpm'}</div>
          <div class="row"><span>Current at ${MAINS.V} V</span><b>${m.I.toFixed(1)} A</b></div>
          <div class="row"><span>Power in</span><b>${Math.round(m.pIn)} W</b></div>
          <div class="row"><span>Power to the blades</span><b>${Math.round(m.pOut)} W</b></div>
          <div class="row"><span>Efficiency</span><b>${Math.round(m.eff * 100)}%</b></div>`;
      },
    };
  },
};
