const lsG = (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  lsS = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  };
const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
  );
// ---- shared helpers: ONE place for number formatting, parsing and effective values (used by the prompt AND the on-screen messages) ----
const r2 = (x) => Math.round(x * 100) / 100,
  r4 = (x) => Math.round(x * 10000) / 10000;
const nn = (k) => +S[k] || 0;
const ni = (k) => {
  const v = Math.floor(+S[k]);
  return Number.isFinite(v) && v > 0 ? v : 0;
};
const isNum = (k) => {
  const t = String(S[k] == null ? "" : S[k]).trim();
  return t !== "" && Number.isFinite(+t);
};
const isInt0 = (k) => isNum(k) && Number.isInteger(+S[k]) && +S[k] >= 0;
const INTK = /^(cars|ideas|f\d_(fun|fbed|fatt|fcom))$/;
const half = (x) => Math.abs(x * 24 - Math.round(x * 24)) < 0.01; // x in feet: x*12 inches is a multiple of 0.5 in
const lvl = (x) => {
  const i = r2(x * 12);
  return i > 0
    ? `+${i} in above road`
    : i < 0
      ? `${-i} in below road`
      : "same as road";
};
const unk = (v) => {
  const t = String(v == null ? "" : v).trim();
  return (
    !t ||
    /^0+(?:\.0+)?\s*(?:%|ft|sq\.?\s*ft)?$/i.test(t) ||
    /\b(?:unknown|not\s+sure|don'?t\s+know|zero|nil|n\/?a|none|tbd)\b/i.test(t)
  );
};
function parseSbk(str) {
  const s = String(str == null ? "" : str)
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/''/g, '"')
    .trim();
  let tk = s
    .split(/[\/,;|\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (tk.length !== 4 && !/['"]|\b(?:ft|feet|foot|in|inch|inches)\b/i.test(s)) {
    const w = s.split(/\s+/).filter(Boolean);
    if (w.length === 4) tk = w;
  }
  const N = "(\\d+(?:\\.\\d+)?)",
    reFI = new RegExp(
      "^" +
        N +
        "\\s*(?:'|ft|feet|foot)\\s*-?\\s*(?:" +
        N +
        '\\s*(?:"|in|inch|inches)?)?$',
      "i",
    ),
    reI = new RegExp("^" + N + '\\s*(?:"|in|inch|inches)$', "i"),
    reF = new RegExp("^" + N + "\\s*(?:ft|feet)?$", "i"),
    nums = [],
    bad = [];
  for (const t of tk) {
    let m,
      v = null;
    if ((m = reFI.exec(t))) {
      const inch = m[2] == null ? 0 : +m[2];
      if (inch < 12) v = +m[1] + inch / 12;
    } else if ((m = reI.exec(t))) {
      v = +m[1] / 12;
    } else if ((m = reF.exec(t))) {
      v = +m[1];
    }
    if (v == null || !Number.isFinite(v)) bad.push(t);
    else nums.push(r4(v));
  }
  return { nums, bad, count: tk.length };
}
function sbInfo() {
  const P = parseSbk(S.sbk),
    road = S.road,
    REAR = { North: "South", South: "North", East: "West", West: "East" }[road],
    LR = {
      North: ["East", "West"],
      South: ["West", "East"],
      East: ["South", "North"],
      West: ["North", "South"],
    }[road],
    ok = P.count === 4 && !P.bad.length && nums4(P),
    sbm = {};
  if (ok) {
    sbm[road] = P.nums[0];
    sbm[REAR] = P.nums[1];
    sbm[LR[0]] = P.nums[2];
    sbm[LR[1]] = P.nums[3];
  }
  return { P, ok, sbm, road, REAR, LR };
}
const nums4 = (P) => P.nums.length === 4;
function geo() {
  const road = S.road,
    ns_ = road === "East" || road === "West",
    ew = ns_ ? nn("pd") : nn("pw"),
    ns = ns_ ? nn("pw") : nn("pd"),
    sb = sbInfo();
  let eW = null,
    eN = null;
  if (sb.ok) {
    eW = r4(ew - sb.sbm.East - sb.sbm.West);
    eN = r4(ns - sb.sbm.North - sb.sbm.South);
  }
  return { ns_, ew, ns, sb, eW, eN };
}
const effP = () => {
  const c = ni("cars"),
    on = c > 0 && S.park !== "No parking";
  return { cars: on ? c : 0, park: on ? S.park : "No parking", on };
};
// terrace / services consistency (shown under the fields AND in the section-9 warning box)
function tsw() {
  const h = (k, x) => (S[k] || []).includes(x),
    mum = h("terr", "Mumty (stair cabin)"),
    tank = h("terr", "Overhead water tank"),
    sump = h("svc", "Underground sump"),
    sep = h("svc", "Septic tank / sewer connection"),
    ev = h("svc", "EV charging point"),
    o = [];
  const items = [
    "Overhead water tank",
    "Solar panels",
    "Open terrace use",
    "Terrace garden",
  ].filter((x) => h("terr", x));
  if (!mum && items.length)
    o.push({
      k: "terr",
      t: `⚠ ${items.join(", ")} ticked but Mumty (stair cabin) is not: the stair ends at the top floor, so how the terrace is reached is not defined. The prompt lists terrace access as [CONFIRM].`,
    });
  if (!tank)
    o.push({
      k: "terr",
      t: sump
        ? "⚠ Underground sump is ticked but there is no overhead tank: how water reaches the floors is not stated. The prompt lists the water supply method as [CONFIRM]."
        : "⚠ No overhead tank and no underground sump: the water storage / supply method is not stated. The prompt lists it as [CONFIRM].",
    });
  if (!sep)
    o.push({
      k: "svc",
      t: "⚠ Septic tank / sewer connection is not ticked: wastewater disposal is not stated. The prompt lists it under OPEN ITEMS as [CONFIRM] and gives no septic position.",
    });
  if (ev && !effP().on)
    o.push({
      k: "svc",
      t: "⚠ EV charging point is ticked but there is no parking (0 cars or Parking type “No parking”): its position is listed as [CONFIRM].",
    });
  return o;
}

// [label, type(t text|n number|s select|c checks|a textarea), options, default]

// --- IndexedDB Wrapper ---
const idb = {
  db: null,
  init() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);
      const req = indexedDB.open('homeplan_db', 1);
      req.onupgradeneeded = e => {
        e.target.result.createObjectStore('kv');
      };
      req.onsuccess = e => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  },
  async get(k) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(k);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async set(k, v) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      const req = tx.objectStore('kv').put(v, k);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  async del(k) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      const req = tx.objectStore('kv').delete(k);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};

// --- Idle Timeout for Fetch Streams ---
function createIdleController(timeoutMs = 120000, parentSignal = null) {
  const controller = new AbortController();
  let timeoutId = null;

  const reset = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (!controller.signal.aborted) {
      timeoutId = setTimeout(() => {
        controller.abort(new Error('Idle timeout exceeded'));
      }, timeoutMs);
    }
  };

  const clear = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener('abort', () => {
        clear();
        controller.abort(parentSignal.reason);
      }, { once: true });
    }
  }

  reset();

  return { signal: controller.signal, reset, clear, controller };
}
