/**
 * Dead end: a not-found page. A short road with a dashed centre line runs up
 * to a barrier, a bar across two posts; beside it a signpost, its board
 * turned a little off square. The pointer's position across the page swings
 * the board round to face it, and the read-out says there is no route. The
 * slider is how far the board will turn.
 *
 * The pattern: one number on one spring (the board's turn), driven by where
 * the pointer is across the stage, never by what is drawn under it.
 */
const { Cam, clamp, facing, fillet, fit, lerp, open, poly, proj, rad, rings, prism, put, seg, solid, tdone, mk, pointer, reflect, register, spring, stepS, disposer } = HL;

const RX = 104, RY = 42, RZ = 3;       // road
const BXP = 86, PX = 36, PY = -12;     // barrier's x; signpost's spot, behind the road
const PH = 38, BW = 16, BHT = 13, TK = 2;
const REST = -28;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let amp = value;
  const C = Cam(45, 0.5, 2.25);
  fit(C, [[0, 0, 0], [RX, RY, 0], [RX, 0, RZ + 17], [0, RY, 0], [PX - 16, PY, PH + 4], [PX + 16, PY + 8, PH + 4]], 200, 170);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // the road, which never moves, and the dashed line down its middle
  const [ring, inner] = rings(0, 0, RX, RY, 4, 1.4);
  reflect(svg, g, P, front, ring, 0, 10);
  put(solid(g), prism(P, front, ring, inner, 0, RZ));
  mk("path", { d: open([P(10, RY / 2, RZ), P(BXP - 12, RY / 2, RZ)]), class: "nf dash" }, g);

  // the barrier: two posts and a bar across them, with its warning stripes
  const post = (y0) => { const [r, i] = rings(BXP, y0, BXP + 5.5, y0 + 5, 1.8, 0.8); put(solid(g), prism(P, front, r, i, RZ, RZ + 17)); };
  post(1.5);
  const [br, bi] = rings(BXP + 0.7, 1.5, BXP + 4.8, RY - 1.5, 1.5, 0.6);
  const bar = solid(g);
  put(bar, prism(P, front, br, bi, RZ + 9, RZ + 15));
  const stripes = [];
  for (let k = 0; k < 7; k++) { const y = 5.5 + k * 5; stripes.push(seg(P(BXP + 4.8, y, RZ + 9), P(BXP + 4.8, y + 3.2, RZ + 15))); }
  mk("path", { d: stripes.join(""), class: "nf lo" }, g);
  post(RY - 6.5);
  bar.sil.classList.add("hi"); // the rest mark: the bar that ends the road

  // the signpost: a pole, and a board that turns on it
  const [pr, pi] = rings(PX - 1.5, PY - 1.5, PX + 1.5, PY + 1.5, 1.1, 0.5);
  put(solid(g), prism(P, front, pr, pi, 0, PH));
  const shape = fillet([[-BW, 0], [BW, 0], [BW, BHT], [-BW, BHT]], [2.4, 2.4, 2.4, 2.4]);
  const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g);
  const rule = mk("path", { class: "nf lo" }, g);
  const turn = spring(REST);
  const draw = (deg) => {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg)), z0 = PH - BHT - 2;
    const w = ([u, v], k = 0) => P(PX + u * c - k * -s, PY + u * s - k * c, z0 + v);
    back.setAttribute("d", poly(shape.map((p) => w(p, TK))));
    face.setAttribute("d", poly(shape.map((p) => w(p))));
    rule.setAttribute("d", seg(w([-BW + 5, BHT / 2]), w([BW - 5, BHT / 2])));
  };
  draw(REST);

  let last = NaN;
  const B = register(stage, (dt) => {
    const moving = stepS(turn, dt);
    if (turn.x !== last) { last = turn.x; draw(turn.x); }
    return moving;
  });
  bag.add(B.unregister);

  bag.add(pointer(stage, {
    move: ([x]) => {
      turn.t = lerp(-amp, amp, clamp((x - 60) / 280, 0, 1));
      bar.sil.classList.remove("hi"); face.classList.add("hi");
      read.textContent = "no route";
      B.wake();
    },
    leave: () => { turn.t = REST; face.classList.remove("hi"); bar.sil.classList.add("hi"); read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { amp = v; }, destroy: bag.dispose };
}

hairline({
  name: "dead-end",
  means: "A road that stops at a barrier, with a signpost beside it: the board turns to face the pointer, and there is no way on.",
  rules: [1, 5, 8, 10],
  range: [20, 40, 62],
  tour: [[110, 200], [200, 170], [300, 200], null],
  mount,
});
