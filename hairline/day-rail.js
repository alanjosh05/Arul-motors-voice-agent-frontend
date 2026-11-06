/**
 * Day rail: an empty state for "no bookings". A desk rail with five day slots
 * and a low back lip; only today's card stands in it, blank but for one dot.
 * The pointer picks a day: its slot lights and a dashed ghost of a card
 * rises from it, the booking that is not there. The read-out counts it as
 * zero. The slider is the stagger the other ghosts sink with.
 *
 * The pattern: one of many, on tweens, with the hit test on the rail's
 * resting top plane (it never moves), so a rising ghost cannot flip the pick.
 */
const { Cam, clamp, facing, fillet, fit, open, poly, proj, rad, rings, ringAt, rrect, prism, put, solid, tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register, unproj } = HL;

const N = 5, PITCH = 25, CW = 19, CH = 38, TODAY = 2, LEAN = -11, TK = 1.8, RH = 9, LIP = 20;
const X0 = -8, X1 = N * PITCH + 2, Y0 = -11, Y1 = 17, SY = 2, SD = 5; // rail footprint; slot's y and depth

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 2.3);
  fit(C, [[X0, Y0, 0], [X1, Y1, 0], [X1, Y0, RH + CH + 4], [X0, Y1, 0], [X0, Y0, RH + LIP + 2]], 200, 170);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  const [ring, inner] = rings(X0, Y0, X1, Y1, 5, 1.6);
  reflect(svg, g, P, front, ring, 0, 12);
  put(solid(g), prism(P, front, ring, inner, 0, RH));
  const [lipRing, lipInner] = rings(X0 + 1, Y0, X1 - 1, Y0 + 5, 2, 1);
  put(solid(g), prism(P, front, lipRing, lipInner, RH, RH + LIP));

  // the seven slots, cut into the rail's top
  const slots = [];
  for (let i = 0; i < N; i++) {
    const x = i * PITCH + 3;
    slots.push(mk("path", { d: poly(ringAt(P, rrect(x, SY, x + CW, SY + SD, 1.4, 4), RH)), class: "nf lo" }, g));
  }

  const shape = fillet([[0, 0], [CW, 0], [CW, CH], [0, CH]], [1, 1, 4, 4]);
  const pose = (i, k, thick) => {
    const s = Math.sin(rad(LEAN)), c = Math.cos(rad(LEAN)), yb = SY + SD / 2 - (thick ? TK * c : 0);
    return shape.map(([u, v]) => P(i * PITCH + 3 + u, yb + v * k * s, RH + v * k * c + (thick ? TK * s : 0)));
  };

  // today's card: blank, with one dot punched at its head
  const back = mk("path", { d: poly(pose(TODAY, 1, true)), class: "lo" }, g);
  const face = mk("path", { d: poly(pose(TODAY, 1, false)), class: "sil" }, g);
  // two binder holes at its head: the left one is the rest mark
  const at = (u, v) => P(TODAY * PITCH + 3 + u, SY + SD / 2 + v * Math.sin(rad(LEAN)), RH + v * Math.cos(rad(LEAN)));
  const dot = mk("circle", { r: 1.5, class: "dot" }, g), dot2 = mk("circle", { r: 1.5, class: "dot off" }, g);
  place(dot, at(CW / 2 - 4, CH - 7));
  place(dot2, at(CW / 2 + 4, CH - 7));

  // ghosts: a dashed card that rises out of the slot under the pointer
  const ghosts = [];
  for (let i = 0; i < N; i++) ghosts.push({ el: mk("path", { class: "nf hi" }, g), edge: mk("path", { class: "nf lo" }, g), t: tween(0), last: -1 });

  const B = register(stage, (_dt, now) => {
    let moving = false;
    ghosts.forEach((gh, i) => {
      const t = tval(gh.t, now);
      if (t !== gh.last) {
        gh.last = t;
        gh.el.setAttribute("d", t < 0.02 ? "" : poly(pose(i, t, false)));
        gh.edge.setAttribute("d", t < 0.02 ? "" : poly(pose(i, t, true)));
      }
      if (!tdone(gh.t, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  // hit: the slot's column on the rail's resting top plane
  const hit = ([sx, sy]) => {
    const [x, y] = unproj(C, sx, sy, RH);
    return y < Y0 - 1 || y > Y1 + 16 || x < X0 || x > X1 ? -1 : clamp(Math.floor((x - X0 + 1) / PITCH), 0, N - 1);
  };
  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    ghosts.forEach((gh, i) => tset(gh.t, i === a && i !== TODAY ? 1 : 0, now, i === a ? 0 : Math.abs(i - from) * stag));
    slots.forEach((s, i) => s.classList.toggle("hi", i === a && i !== TODAY));
    face.classList.toggle("hi", a === TODAY);
    dot.setAttribute("class", a >= 0 ? "dot m" : "dot");
    read.textContent = a < 0 ? "rest" : `day ${a + 1} · 0`;
    B.wake();
  }
  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "day-rail",
  means: "A rail of five day slots with only today's card in it: the day under the pointer shows a ghost card, and holds none.",
  rules: [1, 2, 5, 8, 10],
  range: [0, 40, 90],
  tour: [[110, 190], [200, 175], [290, 150], null],
  mount,
});
