// Chapter 5: heat. Motor losses warm the windings; the work done on the food warms the food.
// A bimetal overload switch cuts the power if the windings get too hot.
//
// Thermal model (lumped, tuned to behave like a 750 W mixer's short-time rating):
//  Windings: C = 400 J/K. Heat in: copper loss I²R + 30% of friction and fan losses.
//            Heat out: G·(T − 30 °C), G = 0.7 W/K standing still + 1.0 W/K × (speed / 20,000 rpm)
//            from the cooling fan. Kitchen at 30 °C.
//  Overload: a bimetal switch opens at 120 °C (below the 130 °C limit of class B insulation,
//            IEC 60085) and can be reset once it has cooled below 85 °C.
//  Food + jar: all the work done on the food ends up as heat, Q = P·t. Heat capacity = food
//            (cumin ≈ 1.8 kJ/kg·K, wet batter ≈ 3.0) + 0.45 kg steel jar (0.5 kJ/kg·K) + blades.
// With these numbers: dry spices never trip it; a full jar of batter trips it after about
// 6 to 7 minutes non-stop but not when run 30 s on, 60 s off; an overloaded jar trips in about 2 minutes.
import { THREE, M, box, canvasTexture, approach, clamp } from '../kit.js';
import { TAU, SLOW, FOODS, makeMixer, steadySpeed, motorState, lossTorque, foodTorque, rpmOf, heatColor, blurFor } from '../mixer.js';

const TH = { C: 400, G0: 0.7, G1: 1.0, TRIP: 120, RESET: 85, AMB: 30, GJ: 0.8 };
const TIME_X = 10;            // one second on screen = ten seconds in the kitchen
const WINDOW = 480;           // chart: the last 8 minutes
const LOADS = { spice: { jar: 'dry', food: 'spice' }, batter: { jar: 'liquid', food: 'batter' }, overload: { jar: 'dry', food: 'overload' } };

function makeSim(load, mode, speed) {
  const L = LOADS[load], F = FOODS[L.food];
  const tf = foodTorque(L.food), w = steadySpeed(speed, tf), m = motorState(speed, w, 0);
  const pFood = F.kd * w ** 3, pWind = m.pCopper + 0.3 * lossTorque(w) * w;
  const Cf = F.mass * F.c + 0.45 * 500 + 60;
  const sim = { t: 0, Tw: TH.AMB, Tf: TH.AMB, tripped: false, trips: 0, on: true, Q: 0, w, I: m.I, pIn: m.pIn, pFood, pWind, Cf, hist: [], mode, load, speed, wet: L.food !== 'spice' && L.food !== 'overload' };
  sim.step = () => {
    const want = mode === 'duty' ? (sim.t % 90) < 30 : true;
    sim.on = want && !sim.tripped;
    const heat = sim.on ? pWind : 0, G = TH.G0 + (sim.on ? TH.G1 * w / 2094 : 0);
    sim.Tw += (heat - G * (sim.Tw - TH.AMB)) / TH.C;
    const q = sim.on ? pFood : 0; sim.Q += q;
    sim.Tf += (q - TH.GJ * (sim.Tf - TH.AMB)) / Cf;
    if (sim.wet) sim.Tf = Math.min(sim.Tf, 99);
    if (sim.Tw >= TH.TRIP && !sim.tripped) { sim.tripped = true; sim.trips++; }
    sim.t++;
    if (sim.t % 2 === 0) { sim.hist.push([sim.t, sim.Tw, sim.Tf, sim.on]); if (sim.hist.length > WINDOW / 2 + 2) sim.hist.shift(); }
  };
  return sim;
}

export default {
  id: 'heat',
  short: 'Heat & overload',
  title: 'Heat, and the overload switch',
  subtitle: 'Where the power goes, why spices get hot, and what the red button under the base is for.',
  view: { pos: [2.2, 7.0, 15.6], target: [2.0, 4.3, 0] },
  learn: `<p>Every watt a mixer draws ends up as <b>heat</b>. Some warms the motor: current through the copper windings heats them, just like a heater. The rest does work on the food, and that work turns into heat in the food. So <b>Q = P × t</b>: 200 W into a jar of spices for one minute is 12,000 joules, enough to make 100 g of cumin and its steel jar almost 30 °C hotter.</p>
    <p>That's why <b>dry grinding in short bursts</b> keeps spices tasting fresh: their flavour lives in oils that escape when they get hot. It's also why batter warms up in a mixie.</p>
    <p>A heavy load slows the motor and makes it draw more current, and the heat in the windings grows with <b>current squared</b>. Mixers are made for <b>short runs</b>: manuals say to grind in bursts and let the motor rest, and many say never more than a few minutes at a time. Here we try 30 seconds on, one minute off. Run one too long and the windings could burn, so a <b>thermal overload switch</b> sits against them. Inside is a <b>bimetal strip</b>: two metals that expand by different amounts, so it bends as it warms and snaps a contact open. Once it cools, you press the <b>reset button</b> under the base.</p>
    <p class="tip"><b>Try it:</b> grind batter non-stop and watch the windings heat up until the switch trips. Then try 30 s on, 60 s off.</p>`,
  terms: [
    { t: 'Q = P × t', d: 'Heat in joules equals power in watts times time in seconds.' },
    { t: 'Copper loss', d: 'Heat made by current flowing through a wire’s resistance. It grows with the current squared.' },
    { t: 'Duty cycle', d: 'How long a machine may run before it must rest, like 30 seconds on, 1 minute off.' },
    { t: 'Bimetal strip', d: 'Two metals bonded together that expand differently, so the strip bends when it warms.' },
  ],
  defaults: { load: 'batter', mode: 'continuous', speed: 3 },
  controls: [
    { key: 'load', type: 'seg', label: 'In the jar', options: [{ v: 'spice', label: '100 g cumin' }, { v: 'batter', label: 'Batter' }, { v: 'overload', label: 'Too much rice' }], fmt: (v) => ({ spice: 'dry jar, light load', batter: '1.5 L jar, full load', overload: 'dry jar, overloaded' })[v] },
    { key: 'mode', type: 'seg', label: 'How you run it', options: [{ v: 'continuous', label: 'Non-stop' }, { v: 'duty', label: '30 s on, 60 s off' }] },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }] },
    { key: 'go', type: 'buttons', label: 'Kitchen', items: [{ label: 'Press reset', act: (s, inst) => inst.reset() }, { label: 'Start again', act: (s, inst) => inst.restart(s, 0) }, { label: 'Skip a minute', act: (s, inst) => inst.skip(60) }] },
  ],
  quiz: [
    { q: 'You grind spices for one minute at 200 W into the food. How much heat goes into the jar?', options: ['200 J', '1,200 J', '12,000 J', '120,000 J'], answer: 2, why: 'Q = P × t = 200 W × 60 s = 12,000 J.' },
    { q: 'Why does an overloaded mixer’s motor get hot so fast?', options: ['The blades rub the jar', 'It slows down and draws more current, and heating grows with current squared', 'The fan stops completely', 'The food is hot'], answer: 1, why: 'More current, and heat ∝ I², plus a slower fan cools it less.' },
    { q: 'How does the overload switch know the motor is too hot?', options: ['A computer chip', 'A bimetal strip bends as it warms and opens a contact', 'It counts the minutes', 'It measures the noise'], answer: 1, why: 'The two metals expand by different amounts, so the strip curls and snaps the contact open.' },
  ],
  reel: [
    { ms: 5600, caption: 'Overload the jar and the windings overheat, until a bimetal switch snaps open and cuts the power.', set: { load: 'overload', mode: 'continuous', speed: 3 }, act: (s, inst) => inst.restart(s, 72), view: { pos: [2.2, 6.4, 13.2], target: [2.3, 4.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); root.position.set(-0.9, 0, 0); stage.root.add(root);
    let mx = makeMixer('liquid'); root.add(mx.group);
    const b = mx.base;
    b.setXray(true);
    b.setKnob('3');
    const wind = [...b.fieldCoils.map((c) => c.material), b.armCopper];
    wind.forEach((m) => { m.emissive = new THREE.Color(0); });
    stage.label('Windings', [-1.35, 2.2, 0.5], b.inner, 'hot');
    stage.label('Overload switch', [0.3, 0.1, 0.4], b.protector);
    const lJar = stage.label('', [0, 0, 0], root);

    // An enlarged bimetal switch beside the mixer: a strip of brass bonded to steel, fixed at the left,
    // with a contact at its free end pressing on a fixed contact. It curls up as it warms.
    const bm = new THREE.Group(); bm.position.set(3.4, 1.0, 1.2); bm.scale.setScalar(1.3); root.add(bm);
    bm.add(box(0.3, 0.8, 0.5, M.plastic(0x3b4252)));                        // the post it's fixed to
    const segs = [], NS = 14, SL = 0.17;
    let parent = new THREE.Group(); parent.position.set(0.15, 0.3, 0); bm.add(parent);
    for (let i = 0; i < NS; i++) {
      const g = new THREE.Group(); g.position.x = i ? SL : 0; parent.add(g);
      const brass = box(SL + 0.005, 0.045, 0.34, M.metal(0xe0b050, { roughness: 0.35 })); brass.position.set(SL / 2, -0.024, 0); g.add(brass);
      const steel = box(SL + 0.005, 0.045, 0.34, M.metal(0x9aa3b2, { roughness: 0.35 })); steel.position.set(SL / 2, 0.022, 0); g.add(steel);
      segs.push(g); parent = g;
    }
    const tip = new THREE.Group(); tip.position.x = SL; parent.add(tip);
    const cMove = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), M.metal(0xd8dde6)); cMove.position.set(-0.05, -0.08, 0); tip.add(cMove);
    const fixedY = 0.3 - 0.13;
    const cFix = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16), M.metal(0xd8dde6)); cFix.position.set(0.15 + NS * SL - 0.05, fixedY - 0.08, 0); bm.add(cFix);
    bm.add(box(0.2, 0.62, 0.3, M.plastic(0x3b4252))).position.set(0.15 + NS * SL - 0.05, fixedY - 0.45, 0);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), M.glow(0xfff1a8, { transparent: true, opacity: 0 })); spark.position.set(0.15 + NS * SL - 0.05, fixedY, 0); bm.add(spark);
    const lBm = stage.label('', [1.2, 1.05, 0], bm, 'hot');
    stage.label('Bimetal strip (enlarged): brass on steel', [1.2, -0.75, 0], bm);

    // Temperature chart.
    let sim = makeSim('batter', 'continuous', 3);
    const chart = canvasTexture(1000, 560, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8eef8'; g.font = 'bold 32px sans-serif'; g.fillText('Temperatures, last 8 minutes', 24, 46);
      const x0 = 80, x1 = W - 30, y0 = H - 50, y1 = 80, T0 = 20, T1 = 140;
      const tNow = sim.t, X = (t) => x0 + ((t - (tNow - WINDOW)) / WINDOW) * (x1 - x0), Y = (T) => y0 - ((clamp(T, T0, T1) - T0) / (T1 - T0)) * (y0 - y1);
      // Motor on: shaded.
      g.fillStyle = 'rgba(92,225,169,.08)';
      sim.hist.forEach(([t, , , on], k) => { if (on && k) g.fillRect(X(sim.hist[k - 1][0]), y1, X(t) - X(sim.hist[k - 1][0]) + 1, y0 - y1); });
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.font = '20px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)';
      for (let T = 20; T <= 140; T += 20) { g.beginPath(); g.moveTo(x0, Y(T)); g.lineTo(x1, Y(T)); g.stroke(); g.fillText(T + '°', 22, Y(T) + 7); }
      g.setLineDash([10, 8]); g.strokeStyle = '#ff5a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, Y(TH.TRIP)); g.lineTo(x1, Y(TH.TRIP)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ff8a8a'; g.font = 'bold 20px sans-serif'; g.fillText('switch trips at 120 °C', x0 + 10, Y(TH.TRIP) - 10);
      const line = (k, col) => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); let started = false; for (const h of sim.hist) { const x = X(h[0]); if (x < x0) continue; started ? g.lineTo(x, Y(h[k])) : g.moveTo(x, Y(h[k])); started = true; } g.stroke(); };
      line(1, '#ff7a59'); line(2, '#8ef0ff');
      g.font = 'bold 22px sans-serif'; g.fillStyle = '#ff7a59'; g.fillText('motor windings', x1 - 390, 46); g.fillStyle = '#8ef0ff'; g.fillText('food', x1 - 190, 46);
      g.fillStyle = 'rgba(92,225,169,.8)'; g.fillText('■ motor on', x1 - 120, 46);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.36), new THREE.MeshBasicMaterial({ map: chart.tex, transparent: true, toneMapped: false }));
    board.position.set(5.2, 6.6, -1.4); stage.root.add(board);

    let acc = 0, rpm = 0, ang = 0, redraw = 0, key = '', spark_t = 0, lastTrips = 0;
    const hot = new THREE.Color(), cool = new THREE.Color(0x000000);
    const api = {
      restart(s, seconds = 0) {
        sim = makeSim(s.load, s.mode, s.speed); key = `${s.load}|${s.mode}|${s.speed}`;
        const jk = LOADS[s.load].jar; if (mx.jar.key !== jk) mx.setJar(jk);
        for (let i = 0; i < seconds; i++) sim.step();
        lastTrips = sim.trips; chart.redraw();
      },
      reset() { if (sim.tripped && sim.Tw < TH.RESET) { sim.tripped = false; } },
      skip(sec) { for (let i = 0; i < sec; i++) sim.step(); chart.redraw(); },
    };
    return {
      ...api,
      update(dt, s) {
        dt = Math.max(0, dt);
        if (`${s.load}|${s.mode}|${s.speed}` !== key) api.restart(s, 0);
        acc += dt * TIME_X; let n = 0;
        while (acc >= 1 && n < 200) { sim.step(); acc -= 1; n++; }
        if (sim.trips > lastTrips) { spark_t = 0.6; lastTrips = sim.trips; }
        // Spin.
        rpm = approach(rpm, sim.on ? rpmOf(sim.w) : 0, sim.on ? 4 : 1.5, dt);
        ang += (rpm / SLOW) * TAU * dt; mx.setSpin(ang);
        mx.jar.blurMat.opacity = blurFor(rpm);
        // Glow: windings by their temperature; the jar tinted by the food's.
        const kW = clamp((sim.Tw - 40) / 80, 0, 1);
        wind.forEach((m) => m.emissive.copy(heatColor(sim.Tw, hot)).multiplyScalar(kW * 0.9));
        const jm = mx.jar.bodyMat; if (!jm.emissive) jm.emissive = new THREE.Color();
        jm.emissive.copy(heatColor(sim.Tf, hot)).multiplyScalar(clamp((sim.Tf - 35) / 70, 0, 1) * 0.5);
        if (!mx.jar.J.clear) { jm.opacity = 0.55; jm.depthWrite = false; }
        lJar.position.set(0.3, 3.46 + mx.jar.top + 0.9, 0);
        lJar.element.textContent = `Food: ${Math.round(sim.Tf)} °C`;
        // Bimetal: curls upward with temperature (brass expands more, and it's on the bottom).
        const bend = clamp((sim.Tw - TH.AMB) / (TH.TRIP - TH.AMB), 0, 1.15);
        const open = sim.tripped;
        // Closed: it creeps a little; at 120 °C it snaps over and lifts its contact away.
        const per = open ? 0.035 + bend * 0.01 : bend * 0.004;
        segs.forEach((g, i) => { g.rotation.z = i ? per : 0; });
        spark_t = Math.max(0, spark_t - dt); spark.material.opacity = spark_t > 0 ? spark_t / 0.6 : 0;
        lBm.element.textContent = open ? 'Tripped: contact open' : `Closed, ${Math.round(sim.Tw)} °C`;
        redraw += dt; if (redraw > 0.12 || n > 20) { chart.redraw(); redraw = 0; }
      },
      readout: (s) => {
        const state = sim.tripped ? (sim.Tw < TH.RESET ? '<span class="no">Tripped: cool enough, press reset</span>' : '<span class="no">Tripped: cooling down</span>') : sim.on ? 'Running' : 'Resting';
        return `<div class="big">${state}</div>
          <div class="row"><span>Kitchen time</span><b>${Math.floor(sim.t / 60)} min ${sim.t % 60} s</b></div>
          <div class="row"><span>Motor windings</span><b>${Math.round(sim.Tw)} °C</b></div>
          <div class="row"><span>Food</span><b>${Math.round(sim.Tf)} °C</b></div>
          <div class="row"><span>Current, heat in windings</span><b>${sim.I.toFixed(1)} A, ${Math.round(sim.pWind)} W</b></div>
          <div class="row"><span>Into the food: Q = P × t</span><b>${Math.round(sim.pFood)} W → ${(sim.Q / 1000).toFixed(0)} kJ</b></div>
`;
      },
    };
  },
};
