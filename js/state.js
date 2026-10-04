let S = dflt(),
  enh = null,
  base = null,
  ctl = null,
  sample = { autofill: null, checker: null, enhance: null },
  CH = {};
try {
  if (!lsG("homeplan-clean-v4")) {
    [
      "homeplan-prompt-v1",
      "homeplan-prompt-v2",
      "homeplan-prompt-v3",
      "homeplan-req-v1",
    ].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    lsS("homeplan-clean-v4", "1");
  }
} catch (e) {}
try {
  const o = lsG(KEY);
  if (o) {
    const j = JSON.parse(o);
    if (!Array.isArray(j.stage) || j.stage.some((x) => !STAGES.includes(x)))
      delete j.stage;
    if (!MODES.includes(j.mode)) delete j.mode;
    Object.assign(S, j);
  }
} catch (e) {}
// drop fields that were removed from the form and any saved tick that is no longer an option (old saved answers must not leak into the prompt)
["dup", "time", "ppl", "kid", "fut", "wfh", "bikes"].forEach((k) => {
  delete S[k];
});
for (const k in Q)
  if (Q[k][1] === "c" && Array.isArray(S[k]))
    S[k] = S[k].filter((x) => Q[k][2].includes(x));
for (let i = 0; i < 4; i++) {
  const k = "f" + i + "_frm";
  if (Array.isArray(S[k])) S[k] = S[k].filter((x) => FQ.frm[2].includes(x));
}
// ---- "Who will use the house?" (use) drives every floor's "Use of this floor" (fN_fuse) ----

const forced = () => (S.use === UP ? FU.own : S.use === UR ? FU.ren : null);
function derive() {
  const fl = +S.floors || 1;
  let o = 0,
    r = 0;
  for (let i = 0; i < fl; i++) {
    if (!ni("f" + i + "_fun")) continue;
    const v = S[fuK(i)];
    if (v === FU.own || v === FU.both) o = 1;
    if (v === FU.ren || v === FU.both) r = 1;
  }
  return o && r ? UM : r ? UR : UP;
}
function enforce(set) {
  const f = forced();
  if (!f) return;
  for (let i = 0; i < 4; i++) if (S[fuK(i)] !== f) set(fuK(i), f);
}
function toMixed(set) {
  const fl = +S.floors || 1;
  for (let i = 0; i < 4; i++) {
    const v = i === 0 ? (fl === 1 ? FU.both : FU.own) : FU.ren;
    if (S[fuK(i)] !== v) set(fuK(i), v);
  }
}
function warn() {
  const d = derive();
  return S.use === UM && d !== UM
    ? `⚠ “Who will use the house?” says “${UM}”, but the floors below are all ${d === UR ? "rental" : "own family"}. The prompt will treat this as “${d}”. Make at least one floor rental and one floor own family, or change that answer.`
    : "";
}
function updWarn() {
  const e = document.getElementById("uw");
  if (e) e.textContent = warn();
}
function clrCH(k) {
  if (!CH[k]) return;
  delete CH[k];
  lastApplied = lastApplied.filter((x) => x.key !== k);
  const rv = document.querySelector('#af-res [data-rv="' + k + '"]'),
    rl = rv && rv.closest("li");
  if (rl) rl.remove();
  if (!lastApplied.length) afu.style.display = "none";
}
enforce((k, v) => {
  S[k] = v;
});

