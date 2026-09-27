// Chapter 1: take a mixer grinder apart. A base with a fast motor, a coupler, and a jar with blades.
import { THREE, M, exploder, approach } from '../kit.js';
import { makeMixer, JARS, BASE, SLOW, blurFor, steadySpeed, motorState, rpmOf } from '../mixer.js';

const SPEEDS = { 0: 0, 1: 1, 2: 2, 3: 3, P: 3 };   // switch position → field tap (keys are strings)

export default {
  id: 'anatomy',
  short: 'Inside a mixie',
  title: 'Inside a mixer grinder',
  subtitle: 'A very fast motor in the base, a jar with blades on top, and a rubber coupler between them.',
  view: { pos: [7.4, 6.6, 10.4], target: [-0.6, 3.7, 0] },
  learn: `<p>A <b>mixer grinder</b>, the "mixie" in most Indian kitchens, has two halves. The heavy <b>base</b> holds an electric motor standing on its end. The <b>jar</b> sits on top, with the <b>blades</b> fixed in its floor.</p>
    <p>The motor is a <b>universal motor</b>: copper <b>field coils</b> on the outside, a spinning <b>armature</b> in the middle, and two <b>carbon brushes</b> that rub on a ring of copper bars called the <b>commutator</b>. A <b>cooling fan</b> on the bottom of the shaft pulls air through the base.</p>
    <p>The top of the shaft ends in a rubber <b>coupler</b>. The jar has a matching coupler under it, so the blades lock onto the motor when you set the jar down. A <b>bushing</b> and <b>seal</b> let the blade shaft turn without the jar leaking.</p>
    <p>The <b>speed switch</b> has 1, 2, 3 and <b>P</b> for pulse. A <b>thermal overload protector</b> cuts the power if the motor gets too hot, and <b>vacuum feet</b> grip the counter.</p>
    <p class="tip"><b>Try it:</b> take it apart with X-ray on, then swap jars and watch how the blade changes.</p>`,
  terms: [
    { t: 'Universal motor', d: 'A motor with brushes and a commutator that runs on AC or DC. It is small, light and very fast.' },
    { t: 'Armature', d: 'The spinning part of the motor: an iron core wound with copper coils.' },
    { t: 'Carbon brushes', d: 'Two sprung blocks of carbon that carry current into the spinning armature.' },
    { t: 'Coupler', d: 'The toothed rubber or nylon pieces that join the motor’s shaft to the jar’s blade shaft.' },
    { t: 'Overload protector', d: 'A heat-sensitive switch that cuts the power when the motor gets too hot. You press a reset button to restart.' },
  ],
  defaults: { explode: 0, xray: false, speed: '2', jar: 'dry' },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the base and jar' },
    { key: 'speed', type: 'seg', label: 'Speed switch', options: ['0', '1', '2', '3', 'P'].map((v) => ({ v, label: v })), fmt: (v) => (v === 'P' ? 'Pulse: full speed in bursts' : v !== '0' ? `Speed ${v}` : 'Off') },
    { key: 'jar', type: 'seg', label: 'Jar', options: Object.entries(JARS).map(([v, j]) => ({ v, label: j.short })), fmt: (v) => `${JARS[v].litres} L` },
  ],
  quiz: [
    { q: 'How do the blades get turned by the motor?', options: ['A long belt', 'The jar’s coupler locks onto a coupler on the motor shaft', 'Magnets through the jar floor', 'Gears in the lid'], answer: 1, why: 'The rubber coupler on the motor shaft meshes with the nylon one under the jar, so the blades turn with the motor.' },
    { q: 'What do the carbon brushes do?', options: ['Clean the jar', 'Carry current into the spinning armature', 'Cool the motor', 'Hold the jar down'], answer: 1, why: 'They press on the commutator and pass current to the coils that are spinning.' },
    { q: 'What happens when the overload protector trips?', options: ['The blades reverse', 'The power is cut until the motor cools and you press reset', 'The speed doubles', 'The lid locks'], answer: 1, why: 'It is a heat-sensitive switch that protects the windings from burning.' },
  ],
  reel: [
    { ms: 5600, caption: 'A mixer grinder is a very fast motor in the base, and a jar of blades on top.', set: { xray: true, speed: '2', jar: 'dry' }, anim: { explode: [0, 1] }, view: { pos: [9.6, 8.0, 13.2], target: [0.8, 4.5, 0] }, spin: 0.4 },
  ],

  build({ stage }) {
    const mx = makeMixer('dry');
    stage.root.add(mx.group);
    const b = mx.base;
    const tag = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
    const armTag = tag(b.inner, [0, 0, 0]);
    let setExplode = () => {}, jarKey = null, jarLabels = [];
    const L = (text, obj, pos, cls) => stage.label(text, pos, obj, cls);
    L('Speed switch', b.knob, [0.9, 0.7, 0.4]);
    L('Vacuum feet', b.group, [-2.5, 0.05, -1.4]);
    const inner = [
      L('Field coils', b.stator, [-1.4, 2.5, 0.4]),
      L('Armature', armTag, [0.95, 1.9, 0.6], 'hot'),
      L('Commutator', armTag, [0.9, 0.85, 0.5]),
      L('Cooling fan', armTag, [1.2, 0.3, 1.0]),
      L('Drive coupler', armTag, [0.9, BASE.H + 0.25, 0.3]),
      L('Carbon brushes', b.brushes[1], [0.6, -0.35, 0.2]),
      L('Overload protector and reset', b.protector, [-0.2, -0.45, 0.5]),
    ];
    const buildJar = (key) => {
      setExplode(0);
      const j = mx.setJar(key);
      jarLabels.forEach((l) => l.parent?.remove(l) || l.element.remove());
      const bladeTag = tag(j.assembly, [0, 0, 0]);
      jarLabels = [
        L('Lid and gasket', j.lid, [j.J.R + 0.5, 0.35, 0]),
        L(`Blades: ${key === 'dry' ? 'flat, for dry grinding' : key === 'chutney' ? 'tips bent up, for wet grinding' : 'four wings, for liquids'}`, bladeTag, [-j.J.R - 0.3, j.bladeY + 0.15, 0.5], 'hot'),
        L('Bushing and seal', bladeTag, [0.9, j.floor - 0.35, 0.8]),
        L(`${j.J.name}`, j.body, [-j.J.R - 0.4, j.top - 0.3, 0]),
      ];
      setExplode = exploder([
        { obj: j.lid, off: [0, 3.0, 0] },
        { obj: j.group, off: [0, 2.1, 0] },
        { obj: j.assembly, off: [0, -1.5, 0] },
        { obj: b.rotor, off: [3.7, 0, 0.9] },
        { obj: armTag, off: [3.7, 0, 0.9] },
        { obj: b.brushes[0], off: [-0.8, 0, 1.9] },
        { obj: b.brushes[1], off: [0.8, 0, 1.9] },
        { obj: b.protector, off: [-3.2, -0.1, 0.2] },
      ]);
      jarKey = key;
    };
    buildJar('dry');

    let rpm = 0, spin = 0, t = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        if (s.jar !== jarKey) buildJar(s.jar);
        setExplode(s.explode);
        const see = s.xray || s.explode > 0.05;
        b.setXray(see);
        inner.forEach((l) => { l.visible = see; });
        const j = mx.jar;
        if (!j.J.clear) { j.bodyMat.opacity = see ? 0.22 : 1; j.bodyMat.depthWrite = !see; }
        b.setKnob(s.speed);
        const n = SPEEDS[s.speed] ?? 0;
        const on = s.speed === 'P' ? (t % 1.6) < 0.8 : n > 0;
        const target = on ? rpmOf(steadySpeed(n)) : 0;
        rpm = approach(rpm, target, on ? 4 : 1.6, dt);
        spin += (rpm / SLOW) * Math.PI * 2 * dt;
        mx.setSpin(spin);
        j.blurMat.opacity = blurFor(rpm);
      },
      readout: (s) => {
        const n = SPEEDS[s.speed] ?? 0, J = JARS[s.jar];
        if (!n) return '<div class="big">Switched off</div>Turn the switch to 1, 2, 3 or P.';
        const w = steadySpeed(n), m = motorState(n, w), tip = w * J.rb;
        return `<div class="big">${Math.round(m.rpm / 100) * 100} rpm, no load</div>
          <div class="row"><span>Blade tips (${(J.rb * 100).toFixed(1)} cm radius)</span><b>${Math.round(tip)} m/s, ${Math.round(tip * 3.6)} km/h</b></div>
          <div class="row"><span>Power, running empty</span><b>about ${Math.round(m.pIn / 10) * 10} W</b></div>
          <div class="row"><span>Rated power</span><b>750 W</b></div>
          ${s.speed === 'P' ? '<small>Pulse: full speed while you hold the switch, then off. Shown as bursts.</small>' : '<small>Spin shown about 5,000 times slower.</small>'}`;
      },
    };
  },
};
