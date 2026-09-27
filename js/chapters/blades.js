// Chapter 3: blades. Tip speed v = ωr, three blade shapes, and how the bits get smaller over time.
import { THREE, M, arrow, canvasTexture, approach, clamp } from '../kit.js';
import { TAU, SLOW, JARS, FOODS, FIT, makeBlade, cutawayJar, jarFlow, dispose, steadySpeed, foodTorque, particleSize, rpmOf, vrod, blurFor } from '../mixer.js';

const SCALE = 1.7;             // the jar is drawn 1.7 times bigger than in the other chapters
const TIME_X = 6;              // one second on screen is six seconds of grinding
const TMAX = 90;               // chart: 90 s of grinding
const FOOD_FOR = { dry: 'spice', chutney: 'chutney', liquid: 'batter' };
const FOOD_COL = { spice: 0xb8783a, chutney: 0xeae3cf, batter: 0xf2eee2 };

export default {
  id: 'blades',
  short: 'The blades',
  title: 'Blades at 200 km/h',
  subtitle: 'Small blades, huge tip speed, and bits that get smaller every second.',
  view: { pos: [1.0, 8.0, 13.6], target: [1.0, 3.7, 0] },
  learn: `<p>Mixer blades are only 6 to 8 cm across, but they spin about 300 times a second. The speed of a blade's tip is <b>v = ω × r</b>: how fast it turns times how far the tip is from the centre. At 18,000 rpm a tip 3 cm out moves at about <b>57 m/s, roughly 200 km/h</b>, as fast as a racing car.</p>
    <p>At that speed the blade doesn't really slice. It <b>smashes</b> bits of food and <b>shears</b> them between the edge and the rest of the load. Each hit breaks bits into smaller bits, so the size falls quickly at first and then more and more slowly. Engineers describe this with <b>Rittinger's law</b>: making bits twice as fine needs about twice the energy again.</p>
    <p>Each jar has its own blade. The <b>dry jar</b> has flat, sharp blades that mill spices and dal into powder. The <b>chutney jar</b> has tips bent up, to churn wet food and throw it up the wall. The <b>liquidiser</b> has four wings, two up and two down, to stir a whole jar of liquid.</p>
    <p class="tip"><b>Try it:</b> grind on speed 1, then start again on speed 3 and compare the curves. Then try the wrong blade for the job.</p>`,
  terms: [
    { t: 'Tip speed', d: 'How fast the very end of a blade moves: v = ω × r, where ω is the turning speed and r the blade’s radius.' },
    { t: 'Shear', d: 'Cutting by sliding one layer of food past another, like scissors.' },
    { t: 'Impact', d: 'Breaking something by hitting it hard and fast.' },
    { t: 'Rittinger’s law', d: 'A rule for fine grinding from 1867: the energy needed grows with how much new surface you make.' },
  ],
  defaults: { jar: 'dry', food: 'spice', speed: 3 },
  onChange(s, key) { if (key === 'jar') s.food = FOOD_FOR[s.jar]; },
  controls: [
    { key: 'jar', type: 'seg', label: 'Jar and blade', options: Object.entries(JARS).map(([v, j]) => ({ v, label: j.short })), fmt: (v) => ({ dry: 'flat blades', chutney: 'tips bent up', liquid: 'four wings' })[v] },
    { key: 'food', type: 'seg', label: 'In the jar', options: [{ v: 'spice', label: 'Cumin' }, { v: 'chutney', label: 'Chutney' }, { v: 'batter', label: 'Batter' }], fmt: (v) => FOODS[v].name },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] },
    { key: 'go', type: 'buttons', label: 'Grinding', items: [{ label: 'Start again', act: (s, inst) => inst.restart() }, { label: 'Skip 30 s', act: (s, inst) => inst.skip(30) }] },
  ],
  quiz: [
    { q: 'A blade tip 3 cm from the centre turns at 18,000 rpm. Roughly how fast is the tip moving?', options: ['About 6 km/h', 'About 60 km/h', 'About 200 km/h', 'About 2,000 km/h'], answer: 2, why: 'v = ωr = (18,000 × 2π / 60) × 0.03 ≈ 57 m/s, which is about 200 km/h.' },
    { q: 'Why does grinding slow down as the powder gets finer?', options: ['The blade gets blunt', 'Each halving of size needs more energy than the last', 'The motor gets tired', 'Powder is heavier'], answer: 1, why: 'Finer bits mean far more new surface to break, so each step costs more energy.' },
    { q: 'Why does the chutney jar’s blade have its tips bent up?', options: ['To look nice', 'To lift and churn wet food so it keeps circulating', 'To stop it touching the floor', 'It’s a mistake'], answer: 1, why: 'Upturned tips fling the wet load up the wall, so it falls back into the blades again.' },
  ],
  reel: [
    { ms: 5200, caption: 'The blade tip is only 3.5 cm from the centre, but at 17,000 rpm it moves at over 220 km/h.', set: { jar: 'dry', food: 'spice', speed: 3 }, act: (s, inst) => inst.restart(), view: { pos: [-0.4, 7.0, 10.8], target: [-0.6, 2.9, 0] }, spin: 0 },
    { ms: 5200, caption: 'Each hit breaks bits smaller: fast at first, then slower, as every step needs more energy.', set: { jar: 'dry', food: 'spice', speed: 3 }, act: (s, inst) => inst.skip(10), view: { pos: [1.0, 8.0, 13.6], target: [1.0, 3.7, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(-1.6, 0, 0); root.scale.setScalar(SCALE); stage.root.add(root);
    // A plinth (the top of the base), the jar cut in half, and the blade.
    const plinth = vrod(0, 0.3, 1.75, 1.85, M.plastic(0x2a2f3a)); root.add(plinth);
    let cut = null, flow = null, jarKey = null, blurMat = null, spin = null;
    const holder = new THREE.Group(); root.add(holder);
    const tipArrow = arrow(0xff7a59, 1.1, 0.25, 0.035); root.add(tipArrow);
    const lTip = stage.label('', [0, 0, 0], tipArrow, 'hot');
    const lBlade = stage.label('', [0, 0, 0], root);
    const lFood = stage.label('', [0, 0, 0], root);
    const build = (key) => {
      holder.children.slice().forEach((o) => { holder.remove(o); dispose(o); });
      const J = JARS[key];
      cut = cutawayJar(key, J.clear ? M.clear(0xd8ecff, 0.28, { roughness: 0.05 }) : null); cut.group.position.y = 0.3; holder.add(cut.group);
      const yb = 0.3 + cut.floor + (J.blade === 'four' ? 0.34 : 0.28), R = J.rb / 0.05;
      spin = new THREE.Group(); spin.position.y = yb; holder.add(spin);
      spin.add(makeBlade(J.blade, R));
      spin.add(vrod(-0.4, 0.1, 0.05, 0.05, M.metal(0xdfe4ec)));
      holder.add(vrod(0.3 + cut.floor - 0.05, 0.3 + cut.floor + 0.1, 0.2, 0.16, M.metal(0xa9b0bb)));
      const tipRing = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 8, 96), M.glow(0xff7a59, { transparent: true, opacity: 0.6 })); tipRing.rotation.x = Math.PI / 2; tipRing.position.y = yb; holder.add(tipRing);
      blurMat = M.ghost(0xcfe8ff, 0); const blur = new THREE.Mesh(new THREE.RingGeometry(0.1, R, 48), blurMat); blur.rotation.x = -Math.PI / 2; blur.position.y = yb + 0.02; holder.add(blur);
      flow = jarFlow(260, J.R - 0.08, yb, 0xd9a45a, 0.05, 41); holder.add(flow.mesh);
      // Tip arrow: tangent to the tip at the front (+Z side), pointing the way it moves (anticlockwise from above: +X at the front).
      tipArrow.position.set(0, yb + 0.02, R); tipArrow.rotation.set(0, 0, -Math.PI / 2);
      lTip.position.set(0, 1.15, 0);
      lBlade.position.set(-J.R - 0.4, yb, 0.4);
      lBlade.element.textContent = { dry: 'Flat dry-grinding blade', wet: 'Wet blade: tips bent up', four: 'Four-wing liquidiser blade' }[J.blade];
      lFood.position.set(J.R * 0.4, 0.3 + cut.floor + J.H * 0.72, 0);
      jarKey = key;
      return { yb, R, J };
    };
    let geo = build('dry');

    // The size chart.
    const sim = { t: 0, E: 0, d: 3, trace: [] };
    const st = { food: 'spice', blade: 'dry', speed: 3, fit: 1, mass: 0.1, d0: 3 };
    const Ylog = (d, y0, y1) => y1 + ((Math.log10(10) - Math.log10(clamp(d, 0.03, 10))) / (Math.log10(10) - Math.log10(0.03))) * (y0 - y1);
    const chart = canvasTexture(900, 620, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8eef8'; g.font = 'bold 32px sans-serif'; g.fillText('How big are the bits?', 24, 46);
      g.font = '22px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(`${FOODS[st.food].name}, speed ${st.speed}`, 24, 80);
      const x0 = 100, x1 = W - 30, y0 = H - 60, y1 = 110;
      const X = (t) => x0 + (t / TMAX) * (x1 - x0), Y = (d) => Ylog(d, y0, y1);
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
      for (const d of [10, 3, 1, 0.3, 0.1, 0.03]) { g.beginPath(); g.moveTo(x0, Y(d)); g.lineTo(x1, Y(d)); g.stroke(); g.fillText(d + ' mm', 14, Y(d) + 7); }
      for (let t = 0; t <= TMAX; t += 15) g.fillText(t + ' s', X(t) - 14, y0 + 32);
      // Bands: coarse, fine powder.
      g.fillStyle = 'rgba(92,225,169,.12)'; g.fillRect(x0, Y(0.3), x1 - x0, Y(0.03) - Y(0.3));
      g.fillStyle = 'rgba(92,225,169,.8)'; g.font = 'bold 20px sans-serif'; g.fillText(st.food === 'spice' ? 'fine powder' : 'smooth paste', x1 - 170, Y(0.1) + 6);
      // What this jar would reach on the right blade, for comparison.
      if (st.fit < 1) {
        g.setLineDash([8, 8]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath();
        for (let k = 0; k <= 60; k++) { const t = (k / 60) * TMAX, d = particleSize(st.d0, st.P * t, st.mass, 1); k ? g.lineTo(X(t), Y(d)) : g.moveTo(X(t), Y(d)); }
        g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '19px sans-serif'; g.fillText('with the right blade', X(TMAX * 0.55), Y(particleSize(st.d0, st.P * TMAX * 0.55, st.mass, 1)) - 12);
      }
      g.strokeStyle = '#ffb547'; g.lineWidth = 5; g.beginPath();
      sim.trace.forEach(([t, d], k) => (k ? g.lineTo(X(t), Y(d)) : g.moveTo(X(t), Y(d)))); g.stroke();
      const last = sim.trace.at(-1); if (last) { g.fillStyle = '#ffb547'; g.beginPath(); g.arc(X(last[0]), Y(last[1]), 9, 0, TAU); g.fill(); }
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 4.27), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(4.3, 4.5, -1.2); stage.root.add(board);

    let rpm = 0, ang = 0, redraw = 0;
    const stepSim = (s, dts) => {
      const w = steadySpeed(s.speed, foodTorque(s.food));
      const P = FOODS[s.food].kd * w ** 3;
      for (let left = dts; left > 1e-9;) {
        const h = Math.min(0.5, left); left -= h;
        if (sim.t >= TMAX) break;
        sim.t += h; sim.E += P * h;
        sim.d = particleSize(FOODS[s.food].d0, sim.E, FOODS[s.food].mass, FIT[JARS[s.jar].blade][s.food]);
        const lastT = sim.trace.at(-1)?.[0] ?? -1;
        if (sim.t - lastT >= 0.5) sim.trace.push([sim.t, sim.d]);
      }
      Object.assign(st, { food: s.food, blade: JARS[s.jar].blade, speed: s.speed, fit: FIT[JARS[s.jar].blade][s.food], mass: FOODS[s.food].mass, d0: FOODS[s.food].d0, P });
    };
    let cur = { jar: 'dry', food: 'spice', speed: 3 };
    const api = {
      restart() { sim.t = 0; sim.E = 0; sim.d = FOODS[cur.food].d0; sim.trace = [[0, sim.d]]; chart.redraw(); },
      skip(sec) { stepSim(cur, sec); chart.redraw(); },
    };
    api.restart();
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.jar !== jarKey) geo = build(s.jar);
        if (s.food !== cur.food || s.speed !== cur.speed || s.jar !== cur.jar) { cur = { jar: s.jar, food: s.food, speed: s.speed }; api.restart(); }
        stepSim(s, dt * TIME_X);
        const target = sim.t < TMAX ? rpmOf(steadySpeed(s.speed, foodTorque(s.food))) : 0;
        rpm = approach(rpm, target, 3, dt);
        ang += (rpm / SLOW) * TAU * dt;
        spin.rotation.y = ang;
        blurMat.opacity = blurFor(rpm);
        const v = (rpm * TAU / 60) * geo.J.rb;
        tipArrow.set(0.3 + v / 60); tipArrow.visible = rpm > 100;
        lTip.element.innerHTML = `tip: ${Math.round(v)} m/s = ${Math.round(v * 3.6)} km/h`;
        lTip.visible = rpm > 100;
        // Bits: drawn many times too big so you can see them shrink.
        const d = sim.d, sz = clamp(0.25 + 0.3 * d, 0.22, 2.2);
        flow.mesh.material.color.set(FOOD_COL[s.food]);
        const wet = s.food !== 'spice';
        const top = 0.3 + cut.floor + geo.J.H * (wet ? 0.45 : 0.28);
        flow.update(dt, { loop: rpm > 100 ? 0.35 + 0.15 * (rpm / 20000) : 0, swirl: rpm > 100 ? 1.2 : 0, top, rim: top + 0.25, size: sz });
        lFood.element.textContent = `bits: ${d >= 1 ? d.toFixed(1) : d.toFixed(2)} mm`;
        lFood.position.y = top + 0.35;
        redraw += dt; if (redraw > 0.1) { chart.redraw(); redraw = 0; }
      },
      readout: (s) => {
        const w = steadySpeed(s.speed, foodTorque(s.food)), J = JARS[s.jar], v = w * J.rb;
        const fit = FIT[J.blade][s.food];
        return `<div class="big">Tip speed ${Math.round(v)} m/s</div>
          <div class="row"><span>Motor, loaded</span><b>${Math.round(rpmOf(w) / 100) * 100} rpm</b></div>
          <div class="row"><span>Blade radius</span><b>${(J.rb * 100).toFixed(1)} cm</b></div>
          <div class="row"><span>v = ω × r</span><b>${Math.round(v * 3.6)} km/h</b></div>
          <div class="row"><span>Ground for</span><b>${Math.round(sim.t)} s</b></div>
          <div class="row"><span>Bits now</span><b>${sim.d >= 1 ? sim.d.toFixed(1) : sim.d.toFixed(2)} mm</b></div>
          ${fit < 0.8 ? `<div class="no">This blade suits another job: only about ${Math.round(fit * 100)}% of the effort breaks bits.</div>` : ''}`;
      },
    };
  },
};
