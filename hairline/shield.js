/**
 * Shield: an empty state for "no insurance reminders". A shield stands on a
 * plinth, whole and untouched, with thirty dots along the plinth's front: the
 * thirty days a reminder looks ahead, all dim. The pointer picks a day: that
 * dot lights, its neighbours half-light, and the read-out counts it as zero.
 * The slider is how many neighbours half-light, and the shield turns toward the day.
 *
 * The pattern: one of many, with the hit test on the plinth's resting top
 * plane (it never moves). The dots answer by brightness (the stroke fade is
 * its clock); the shield turns a little toward the day on a spring.
 */
const { Cam, clamp, facing, fillet, fit, lerp, poly, proj, rad, rings, prism, put, solid, mk, place, pointer, reflect, register, spring, stepS, disposer, unproj } = HL;

const N = 30, GAP = 2.7, X0 = 3, RH = 9, PY = 2, TK = 2.6, DY = 11.5; // days, spacing, first dot, plinth height, plate y, thickness, dots' y
const SX = 20, SW = 40, SH = 50, SZ = RH;                               // shield: left edge on the plinth, width, height
const OUT = fillet([[0, 50], [SW, 50], [SW, 29], [SW - 6, 14], [SW / 2, 0], [6, 14], [0, 29]], [2.6, 2.6, 2.2, 7, 2.2, 7, 2.2]);
const MID = [SW / 2, 28];
const INNER = OUT.map(([u, v]) => [MID[0] + (u - MID[0]) * 0.74, MID[1] + (v - MID[1]) * 0.74]);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let near = value, spin = 16;
  const C = Cam(45, 0.5, 2.55);
  fit(C, [[-5, -7, 0], [X0 + N * GAP + 3, 18, 0], [SX, PY, SZ + SH + 2], [SX + SW, PY, SZ + SH + 2]], 200, 170);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [ring, inner] = rings(-5, -7, X0 + (N - 1) * GAP + 5, 18, 5, 1.6);
  reflect(svg, g, P, front, ring, 0, 12);
  put(solid(g), prism(P, front, ring, inner, 0, RH));

  // the shield: a plate standing on the plinth, its thickness a second outline, its inset a crease; it turns on its own axis
  const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g);
  const crease = mk("path", { class: "nf hi" }, g);
  const turn = spring(0);
  let lastTurn = NaN;
  const draw = (deg) => {
    const c = Math.cos(rad(deg)), sn = Math.sin(rad(deg));
    const w = ([u, v], k = 0) => P(SX + SW / 2 + (u - SW / 2) * c + k * sn, PY + (u - SW / 2) * sn - k * c, SZ + v);
    back.setAttribute("d", poly(OUT.map((p) => w(p, TK))));
    face.setAttribute("d", poly(OUT.map((p) => w(p))));
    crease.setAttribute("d", poly(INNER.map((p) => w(p))));
  };
  draw(0);
  const B = register(stage, (dt) => {
    const moving = stepS(turn, dt);
    if (turn.x !== lastTurn) { lastTurn = turn.x; draw(turn.x); }
    return moving;
  });
  bag.add(B.unregister);

  // thirty days, all dim
  const dots = [];
  for (let k = 0; k < N; k++) {
    const d = mk("circle", { r: 1.25, class: "dot off" }, g);
    place(d, P(X0 + k * GAP, DY, RH));
    dots.push(d);
  }

  const hit = ([sx, sy]) => {
    const [x, y] = unproj(C, sx, sy, RH);
    return y < -5 || y > 19 || x < X0 - 4 || x > X0 + N * GAP + 2 ? -1 : clamp(Math.round((x - X0) / GAP), 0, N - 1);
  };
  let act = -1;
  function setActive(a) {
    if (a === act) return;
    act = a;
    dots.forEach((d, k) => d.setAttribute("class", "dot" + (k === a ? "" : Math.abs(k - a) <= near && a >= 0 ? " m" : " off")));
    crease.classList.toggle("hi", a < 0);
    turn.t = a < 0 ? 0 : lerp(-spin, spin, a / (N - 1));
    B.wake();
    read.textContent = a < 0 ? "rest" : `day ${a + 1} · 0`;
  }
  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { near = v; const a = act; act = -2; setActive(a); }, destroy: bag.dispose };
}

hairline({
  name: "shield",
  means: "A shield on a plinth with thirty dim day-dots in front: the pointer lights a day, and no reminder falls on it.",
  rules: [1, 2, 5, 10],
  range: [0, 2, 5],
  tour: [[120, 215], [200, 200], [280, 180], null],
  mount,
});
