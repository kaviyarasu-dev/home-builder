// ===== Auto-fill the FORM from typed requirement and/or attached files (the prompt is never edited) =====
const RKEY = "homeplan-req-v1",
  PDFB = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/";
const CONFL = {
  stated: "you said",
  read: "read from file",
  implied: "follows from your requirement",
  assumed: "assumed – please check",
};
const FKEYS = Object.keys(FQ),
  $ = (id) => document.getElementById(id);
const rq = $("rq"),
  go = $("af-go"),
  afu = $("af-undo"),
  afs = $("af-st"),
  afr = $("af-res"),
  dz = $("dz"),
  fi = $("fi"),
  fp = $("fp"),
  fch = $("fch"),
  dzh = $("dzh");
let LIM = null,
  FILES = [],
  afCtl = null,
  fid = 0,
  lastApplied = [],
  pdfP = null;
const afMsg = (t, c) => {
  afs.textContent = t || "";
  afs.className = c || "";
};
const fmt = (v, n = 200) => {
  const s = Array.isArray(v)
    ? v.length
      ? v.join(", ")
      : "none"
    : v === "" || v == null
      ? "empty"
      : String(v);
  return s.length > n ? s.slice(0, n) + "…" : s;
};
const same = (a, b) =>
  Array.isArray(a) || Array.isArray(b)
    ? JSON.stringify([...(a || [])].sort()) ===
      JSON.stringify([...(b || [])].sort())
    : String(a == null ? "" : a) === String(b == null ? "" : b);
const copy = (v) => (Array.isArray(v) ? v.slice() : v);
const withTimeout = (p, ms, m) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(m)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        res(v);
      },
      (e) => {
        clearTimeout(t);
        rej(e);
      },
    );
  });
function schema(k) {
  if (Q[k]) return Q[k];
  const m = /^f([0-3])_(\w+)$/.exec(k);
  return m && FQ[m[2]]
    ? [FN[+m[1]] + " floor – " + FQ[m[2]][0], FQ[m[2]][1], FQ[m[2]][2]]
    : null;
}
function coerce(k, v) {
  const q = schema(k);
  if (!q) return { err: "not a form field" };
  const t = q[1],
    o = q[2];
  if (v == null) return { err: "empty value" };
  if (t === "s") {
    if (v === true) v = Y;
    if (v === false) v = N;
    const s = String(v).trim(),
      m =
        o.find((x) => x === s) ||
        o.find((x) => x.toLowerCase() === s.toLowerCase());
    return m !== undefined
      ? { v: m }
      : { err: "“" + s.slice(0, 60) + "” is not one of the allowed options" };
  }
  if (t === "n") {
    const n = Number(String(v).replace(/,/g, ""));
    if (INTK.test(k) && Number.isFinite(n) && !Number.isInteger(n))
      return { err: "must be a whole number" };
    return Number.isFinite(n) &&
      (n >= 0 || (k === "plinth" && n >= -100)) &&
      n <= 100000
      ? { v: Math.round(n * 100) / 100 }
      : { err: "not a valid number" };
  }
  if (t === "c") {
    if (!Array.isArray(v)) return { err: "expected a list" };
    const ok = [],
      bad = [];
    for (const x of v) {
      const s = String(x).trim(),
        m = o.find((y) => y.toLowerCase() === s.toLowerCase());
      if (m !== undefined) {
        if (!ok.includes(m)) ok.push(m);
      } else bad.push(s);
    }
    return {
      v: o.filter((x) => ok.includes(x)),
      warn: bad.length
        ? "ignored unknown option(s): " + bad.join(", ").slice(0, 80)
        : "",
    };
  }
  const s = String(v).trim();
  if (!s) return { err: "empty value" };
  return { v: s.slice(0, t === "a" ? 1500 : 300) };
}
function put(rows, key, nv, ev, conf) {
  const q = schema(key),
    old = rows.has(key) ? rows.get(key).old : copy(S[key]);
  S[key] = copy(nv);
  rows.set(key, { key, label: q[0], old, nv: copy(nv), ev, conf });
}
function applyPatch(r) {
  const rows = new Map(),
    rej = [],
    ex = new Set();
  for (const c of Array.isArray(r.changes) ? r.changes : []) {
    if (!c || typeof c.key !== "string") continue;
    const q = schema(c.key);
    if (!q) {
      rej.push({ label: String(c.key).slice(0, 40), why: "not a form field" });
      continue;
    }
    const res = coerce(c.key, c.value);
    if (res.err) {
      rej.push({ label: q[0], why: res.err });
      continue;
    }
    if (res.warn) rej.push({ label: q[0], why: res.warn });
    let nv = res.v;
    if (q[1] === "a") {
      const cur = String(S[c.key] || "").trim();
      if (cur.includes(nv)) continue;
      nv = cur ? cur + "\n" + nv : nv;
    }
    if (/^f\d_fuse$/.test(c.key)) ex.add(c.key);
    if (same(S[c.key], nv)) continue;
    put(
      rows,
      c.key,
      nv,
      String(c.evidence || "").slice(0, 160),
      CONFL[c.confidence] ? c.confidence : "assumed",
    );
  }
  {
    const uC = rows.has("use"),
      fC = ex.size > 0 || [0, 1, 2, 3].some((i) => rows.has(fuK(i))),
      sp = (k, v) =>
        put(
          rows,
          k,
          v,
          "Floor use must match “Who will use the house?”",
          "implied",
        );
    if (fC) {
      const d = derive();
      if (S.use !== d) {
        if (uC)
          rej.push({
            label: "Who will use the house?",
            why: "it disagreed with the per-floor use, so it was set from the floors",
          });
        put(rows, "use", d, "Follows the per-floor use", "implied");
      }
    } else if (uC) {
      const ou = rows.get("use").old;
      if (forced()) enforce(sp);
      else if (ou !== UM) toMixed(sp);
    }
    if (forced()) enforce(sp);
  }
  const list = [...rows.values()].filter((c) => !same(c.old, c.nv));
  for (const c of list) CH[c.key] = { old: c.old, conf: c.conf, ev: c.ev };
  lastApplied = list;
  if (list.length) {
    lsS(KEY, JSON.stringify(S));
    if (enh) {
      enh = null;
      msg(
        "Form changed: enhanced version cleared. Click Enhance again if needed.",
      );
    }
    render();
    show();
  }
  return { list, rej };
}
function revert(cs) {
  for (const c of cs) {
    S[c.key] = copy(c.old);
    delete CH[c.key];
  }
  lastApplied = lastApplied.filter((x) => !cs.includes(x));
  lsS(KEY, JSON.stringify(S));
  if (enh) {
    enh = null;
    msg(
      "Form changed: enhanced version cleared. Click Enhance again if needed.",
    );
  }
  render();
  show();
  afu.style.display = lastApplied.length ? "" : "none";
}
function afClear() {
  CH = {};
  lastApplied = [];
  afr.innerHTML = "";
  afu.style.display = "none";
  afMsg("");
}
afu.onclick = () => {
  revert(lastApplied.slice());
  afr.innerHTML = "";
  afMsg("Auto-fill undone. Your other edits are kept.");
};
afr.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-rv]");
  if (!b) return;
  const c = lastApplied.find((x) => x.key === b.dataset.rv);
  if (!c) return;
  const gr = (k) => k === "use" || /^f\d_fuse$/.test(k),
    cs = gr(c.key) ? lastApplied.filter((x) => gr(x.key)) : [c];
  revert(cs);
  cs.forEach((x) => {
    const el = afr.querySelector('[data-rv="' + x.key + '"]'),
      l = el && el.closest("li");
    if (l) l.remove();
  });
});
function showRes(ap, r) {
  let h = `<h3>${ap.list.length ? ap.list.length + " form field(s) updated – highlighted below in the form" : "No form field needed to change"}</h3>`;
  if (ap.list.length)
    h +=
      `<ul class="cl">` +
      ap.list
        .map(
          (c) =>
            `<li><span class="nm">${esc(c.label)}</span><span class="bd ${c.conf}">${esc(CONFL[c.conf])}</span><div><span class="ar">${esc(fmt(c.old, 80))} → </span><b>${esc(fmt(c.nv))}</b></div>${c.ev ? `<div class="ev">${esc(c.ev)}</div>` : ""}<div style="margin-top:6px"><button data-rv="${esc(c.key)}">↩ Revert this</button></div></li>`,
        )
        .join("") +
      `</ul>`;
  const lst = (a) =>
    (Array.isArray(a) ? a : [])
      .filter((x) => typeof x === "string" && x.trim())
      .slice(0, 8);
  const ns = lst(r.notes).concat(lst(r.questions));
  if (ns.length)
    h += `<h3>ℹ Notes</h3><ul class="nl">${ns.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  if (ap.rej.length)
    h += `<h3>Could not apply</h3><ul class="nl">${ap.rej.map((x) => `<li>${esc(x.label)}: ${esc(x.why)}</li>`).join("")}</ul>`;
  afr.innerHTML = h;
  afu.style.display = ap.list.length ? "" : "none";
}