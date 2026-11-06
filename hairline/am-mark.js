/**
 * AM mark: the Arul Motors monogram built as two upright plates on a plinth,
 * the A in front and the M behind it, overlapping as in the logo. The pointer
 * scrubs how far the M slides out from behind the A (and the A eases the
 * other way); at rest they sit slightly parted. The slider is the widest gap.
 *
 * The pattern: scrub. One spring for the gap, driven by where the pointer is
 * across the stage, never by what is drawn under it.
 */
const { Cam, clamp, facing, fillet, fit, poly, proj, rings, prism, put, solid, mk, pointer, reflect, register, spring, stepS, disposer, lerp, r2 } = HL;

const K = 0.34, T = 3, TK = 2.8, DEPTH = 6;
// The mark's two letters, from the logo: SVG points → plate coordinates (u across, v up).
const plate = (pts) => pts.map(([x, y]) => [(x - 96) * K, (368 - y) * K]);
const A = plate([[96, 368], [184, 136], [240, 136], [312, 368], [264, 368], [250, 322], [162, 322], [148, 368]]);
const COUNTER = plate([[176, 280], [238, 280], [208, 190]]);
const M = plate([[262, 368], [262, 136], [314, 136], [350, 236], [386, 136], [424, 136], [424, 368], [380, 368], [380, 230], [350, 310], [320, 230], [320, 368]]);
const OUTER = fillet(A, A.map(() => 0.8)), OUTER_M = fillet(M, M.map(() => 0.8)), HOLE = fillet(COUNTER, COUNTER.map(() => 0.6));
// The M stands DEPTH behind the A, which shifts it up and right on screen; MX takes that back so the two overlap as in the logo.
// (the M's points already start at its own offset in the mark, so it only needs that shift)
const AX = 0, MX = -DEPTH, MW = (424 - 96) * K, AW = (312 - 96) * K, REST_S = 0.12;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gmax = value;
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[-12, -14, 0], [AX + AW, 14, T + 79], [MX + MW + 44, -14, T + 79], [MX + MW + 44, 26, 0], [-12, 26, 0]], 200, 168);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [ring, inner] = rings(-12, -16, MX + MW + 20, 24, 5, 1.6);
  reflect(svg, g, P, front, ring, 0, 12);
  put(solid(g), prism(P, front, ring, inner, 0, T));

  /** One upright plate standing at x0 on the plinth: back outline, face outline, and the counter if it has one. */
  function plateEl(shape, y, cls, hole) {
    const grp = mk("g", {}, g);
    return {
      back: mk("path", { class: "lo" }, grp), face: mk("path", { class: cls }, grp),
      hole: hole && mk("path", { class: "nf hi" }, grp), holeBack: hole && mk("path", { class: "nf lo" }, grp), shape, y, hole2: hole,
    };
  }
  const m = plateEl(OUTER_M, 0, "sil", false); // behind: painted first
  const a = plateEl(OUTER, DEPTH, "sil", true);

  function draw(el, x0, hole) {
    const w = (p, y = el.y) => P(x0 + p[0], y, T + p[1]), wb = (p) => w(p, el.y - TK);
    el.back.setAttribute("d", poly(el.shape.map(wb)));
    el.face.setAttribute("d", poly(el.shape.map((p) => w(p))));
    if (hole) { el.hole.setAttribute("d", poly(HOLE.map((p) => w(p)))); el.holeBack.setAttribute("d", poly(HOLE.map(wb))); }
  }

  const s = spring(REST_S);
  let last = NaN;
  const B = register(stage, (dt) => {
    const moving = stepS(s, dt), gap = clamp(s.x, 0, 1) * gmax;
    if (gap !== last) { last = gap; draw(a, AX - gap * 0.25, true); draw(m, MX + gap, false); }
    return moving;
  });
  bag.add(B.unregister);

  const lit = (on) => { a.hole.classList.toggle("hi", !on); m.face.classList.toggle("hi", on); };
  bag.add(pointer(stage, {
    move: ([x]) => { s.t = clamp((x - 70) / 260, 0, 1); lit(s.t > 0.3); read.textContent = `gap ${Math.round(s.t * gmax)}`; B.wake(); },
    leave: () => { s.t = REST_S; lit(false); read.textContent = "rest"; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());
  draw(a, AX - REST_S * gmax * 0.25, true); draw(m, MX + REST_S * gmax, false);

  return { set: (v) => { gmax = v; last = NaN; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "am-mark",
  means: "The AM monogram as two plates on a plinth: the pointer slides the M out from behind the A.",
  rules: [1, 5, 8, 10],
  range: [18, 30, 44],
  tour: [[110, 170], [200, 170], [300, 170], null],
  mount,
});
