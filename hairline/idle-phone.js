/**
 * Idle phone: an empty state for "no calls". A desk phone on a rounded base,
 * its keypad a grid of dots, its handset seated in the cradle. Bring the
 * pointer near and the handset lifts, the earpiece end first, as if to
 * answer; the line says it holds nothing. The slider is how far away it
 * notices the pointer.
 *
 * The pattern: a field, on one spring. The pointer is read on the base's
 * resting top plane, which never moves, so the lifting handset cannot flip
 * what it reacts to.
 */
const { Cam, clamp, facing, fit, proj, rings, prism, put, solid, mk, place, pointer, reflect, register, spring, stepS, disposer, unproj } = HL;

const BX = 74, BY = 46, RH = 9, CX = 37, CY = 22; // base footprint, its height, its centre
// handset parts, left to right: [x0, x1, y0, y1, height seated, how much of the lift they take]
const PARTS = [[-2, 17, 5, 19, 10, 1], [17, 53, 8.5, 15.5, 6, 0.75], [53, 74, 5.5, 18.5, 8, 0.4]];
const LIFT = 10;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 2.6);
  fit(C, [[-4, -2, 0], [BX + 4, BY + 2, 0], [-3, 4, RH + 14 + LIFT], [75, 4, RH + 12 + LIFT], [-4, BY, 0], [BX, -2, RH + 14]], 200, 172);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [ring, inner] = rings(0, 0, BX, BY, 7, 1.8);
  reflect(svg, g, P, front, ring, 0, 12);
  put(solid(g), prism(P, front, ring, inner, 0, RH));
  // the cradle: two low shoulders the handset rests on
  for (const x of [1, BX - 15]) {
    const [r, i] = rings(x, 3, x + 14, 20, 3, 1);
    put(solid(g), prism(P, front, r, i, RH, RH + 4));
  }

  // the handset: an earpiece, a grip and a mouthpiece, each its own solid
  const parts = PARTS.map(([x0, x1, y0, y1, h, take]) => {
    const [r, i] = rings(x0, y0, x1, y1, Math.min(4, (y1 - y0) / 2 - 0.5), 1.2);
    const sol = solid(g);
    sol.sil.classList.add("hi");
    return { r, i, h, take, sol };
  });
  const lift = spring(0);
  let last = NaN;
  const drawHandset = (l) => parts.forEach(({ r, i, h, take, sol }) => put(sol, prism(P, front, r, i, RH + 4 + l * take, RH + 4 + h + l * take)));
  drawHandset(0);

  // the keypad: a 3 × 4 grid of dots on the base's front half, and the line light
  for (let k = 0; k < 12; k++) {
    const dot = mk("circle", { r: 1.6, class: "dot m" }, g);
    place(dot, P(21 + (k % 3) * 9.5, 27 + Math.floor(k / 3) * 4.6, RH));
  }
  place(mk("circle", { r: 2, class: "dot off" }, g), P(BX - 9, BY - 7, RH));

  const B = register(stage, (dt) => {
    const moving = stepS(lift, dt), l = clamp(lift.x, 0, 1) * LIFT;
    if (l !== last) { last = l; drawHandset(l); }
    return moving;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: ([sx, sy]) => {
      const [x, y] = unproj(C, sx, sy, RH);
      const near = clamp(1 - (Math.hypot(x - CX, y - CY) - 14) / reach, 0, 1);
      lift.t = near;
      read.textContent = near > 0.02 ? "line · 0" : "rest";
      B.wake();
    },
    leave: () => { lift.t = 0; read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { reach = v; }, destroy: bag.dispose };
}

hairline({
  name: "idle-phone",
  means: "A desk phone with its handset seated: bring the pointer close and the handset lifts, and the line is empty.",
  rules: [1, 3, 5, 8, 10],
  range: [30, 55, 90],
  tour: [[110, 230], [200, 190], [260, 150], null],
  mount,
});
