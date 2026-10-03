function fld(k, q) {
  const v = S[k],
    t = q[1],
    o = q[2],
    c = CH[k];
  let h;
  if (t === "s" && /^f\d_fuse$/.test(k) && forced())
    h = `<select data-k="${k}" disabled><option selected>${esc(forced())}</option></select><div class="was" style="color:var(--mu)">🔒 follows “Who will use the house?”</div>`;
  else if (t === "s")
    h = `<select data-k="${k}">${o.map((x) => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>`;
  else if (t === "c" && k === "stage")
    h = `<div class="chk">${o
      .map((x) => {
        const L = MAND.includes(x);
        return `<label${L ? ' style="display:none"' : ""}><input type="checkbox" data-k="${k}" value="${esc(x)}"${L || (v || []).includes(x) ? " checked" : ""}${L ? " disabled" : ""}>${L ? "🔒 " : ""}${esc(x)} <small class="nt" style="color:var(--mu)">${L ? "(required)" : ""}</small></label>`;
      })
      .join("")}</div>`;
  else if (t === "c")
    h = `<div class="chk">${o.map((x) => `<label><input type="checkbox" data-k="${k}" value="${esc(x)}"${(v || []).includes(x) ? " checked" : ""}>${esc(x)}</label>`).join("")}</div>`;
  else if (t === "a") h = `<textarea data-k="${k}">${esc(v)}</textarea>`;
  else
    h = `<input data-k="${k}" type="${t === "n" ? "number" : "text"}" ${t === "n" ? (k === "plinth" ? 'step="any" ' : INTK.test(k) ? 'min="0" step="1" ' : 'min="0" step="any" ') : ""}value="${esc(v)}">`;
  return `<div class="f${t === "c" || t === "a" ? " wd" : ""}${c ? " chg" : ""}"><label>${q[0]}</label>${h}<div class="vm" data-vm="${k}"></div>${c ? `<div class="was">✨ auto-filled · was: ${esc(fmt(c.old, 80))}</div>` : ""}</div>`;
}
function render() {
  const fl = +S.floors || 1;
  document.getElementById("form").innerHTML = SEC.map(
    ([t, ks]) =>
      `<section class="card"><h2>${t}</h2>${t[0] === "9" ? '<div id="dw" style="color:var(--er);font-size:13px;margin-bottom:6px">' + dwarn() + "</div>" : ""}${
        ks === "F"
          ? '<div id="uw" style="color:var(--er);font-size:13px;margin-bottom:6px">' +
            warn() +
            "</div>" +
            [...Array(fl).keys()]
              .map(
                (i) =>
                  `<div class="fl"><h3>${FN[i]} floor</h3><div class="g">${Object.keys(
                    FQ,
                  )
                    .map((k) => fld("f" + i + "_" + k, FQ[k]))
                    .join("")}</div></div>`,
              )
              .join("")
          : `<div class="g">${ks.map((k) => fld(k, Q[k])).join("")}</div>`
      }</section>`,
  ).join("");
  syncStage();
}
function syncStage() {
  const bx = [...document.querySelectorAll('input[data-k="stage"]')];
  if (!bx.length) return;
  const by = (i) => bx.find((b) => b.value === STAGES[i]),
    nt = (b, t) => {
      const e = b && b.parentNode.querySelector(".nt");
      if (e) e.textContent = t;
    },
    im = by(ST.img),
    sv = by(ST.svg),
    va = by(ST.vastu);
  bx.forEach((b) => {
    if (MAND.includes(b.value)) b.checked = true;
  });
  if (sv && im) {
    if (im.checked) sv.checked = true;
    sv.disabled = im.checked;
    nt(sv, im.checked ? "(needed for the image prompts)" : "");
  }
  if (va) {
    const off = S.vastu === "Not required";
    va.disabled = off;
    nt(
      va,
      off
        ? va.checked
          ? "(kept, but left out of the prompt while Vastu is “Not required”; it applies again when Vastu is on)"
          : "(off: Vastu is “Not required” in section 7)"
        : "",
    );
  }
  bx.forEach((b) => {
    b.parentNode.style.display = b.disabled && b !== va ? "none" : "";
    b.parentNode.style.opacity = b === va && b.disabled ? ".55" : "";
  });
  S.stage = bx.filter((b) => b.checked).map((b) => b.value);
}
function dwarn() {
  const SG = stg(),
    h = (i) => SG.includes(STAGES[i]),
    w = [];
  if ((S.stage || []).includes(STAGES[ST.vastu]) && S.vastu === "Not required")
    w.push(
      "⚠ Vastu report is ticked but Vastu is “Not required” (section 7), so the report is left out of the prompt. The tick is kept and applies again when Vastu is on.",
    );
  if (h(ST.cost) && !String(S.budget || "").trim())
    w.push(
      "⚠ Cost estimate is ticked but the budget is empty, so there is nothing to compare with.",
    );
  tsw().forEach((x) => w.push(x.t));
  if (![...Array(+S.floors || 1).keys()].some((i) => ni("f" + i + "_fun") > 0))
    w.push(
      "⚠ Every floor has 0 independent units, so no rooms will be planned.",
    );
  return w.join(" ");
}

const out = document.getElementById("out"),
  st = document.getElementById("st"),
  en = document.getElementById("en"),
  un = document.getElementById("un");
let BLK = false;
// on-screen checks: M = messages per field, B = problems that make the prompt unusable (Copy / Enhance are switched off)
function vmsg() {
  const M = {},
    B = [],
    add = (k, t, x, blk) => {
      (M[k] = M[k] || []).push([t, x]);
      if (blk) B.push(x);
    };
  const fl = +S.floors || 1,
    G = geo(),
    EP = effP(),
    road = S.road,
    bl = (S.blk || []).filter((x) => x !== road);
  const plotOK = {};
  for (const [k, lab] of [
    ["pw", "Plot frontage"],
    ["pd", "Plot depth"],
  ]) {
    if (!isNum(k) || +S[k] <= 0) {
      add(
        k,
        "er",
        `${lab} must be a number above 0 ft${isNum(k) && +S[k] < 0 ? " (negative sizes are not possible)" : ""}.`,
        true,
      );
    } else {
      plotOK[k] = 1;
      if (!half(+S[k]))
        add(
          k,
          "wn",
          `${r2(S[k] * 12)} in is not a multiple of 0.5 in, but the prompt asks for every value to be one. Use a size that fits.`,
        );
    }
  }
  const sb = G.sb,
    P = sb.P;
  if (sb.ok) {
    const sm = sb.sbm;
    add(
      "sbk",
      "ok",
      `Parsed as: front ${sm[road]}, rear ${sm[sb.REAR]}, left ${sm[sb.LR[0]]}, right ${sm[sb.LR[1]]} ft (front = ${road} side, rear = ${sb.REAR}, left = ${sb.LR[0]}, right = ${sb.LR[1]}).`,
    );
    const zs = SIDES.filter((d) => sm[d] === 0);
    if (zs.length) {
      add(
        "sbk",
        "wn",
        `Setback is 0 on ${zs.join(", ")}: the building touches the plot line there (normal for a row house). The prompt flags it as a regulatory risk.`,
      );
      const zo = zs.filter((d) => d !== road && !bl.includes(d));
      if (zo.length)
        add(
          "blk",
          "wn",
          `Setback is 0 on ${zo.join(", ")} but ${zo.length > 1 ? "those sides are" : "that side is"} not ticked as neighbour wall, so windows would be allowed on the plot boundary. Tick ${zo.length > 1 ? "them" : "it"} if a neighbour wall is there.`,
        );
    }
    if (SIDES.some((d) => !half(sm[d])))
      add(
        "sbk",
        "wn",
        "A setback is not a multiple of 0.5 in; the prompt asks for every value to be one.",
      );
    if (plotOK.pw && plotOK.pd && (G.eW <= 0 || G.eN <= 0))
      add(
        "sbk",
        "er",
        `The setbacks leave no building area: envelope East–West ${G.eW} ft × North–South ${G.eN} ft. Fix the setbacks or the plot size.`,
        true,
      );
  } else
    add(
      "sbk",
      "er",
      `Cannot read four setback values (front / rear / left / right). ${P.count ? `Found ${P.count} part(s)${P.bad.length ? `; could not read: ${P.bad.map((x) => "“" + x + "”").join(", ")}` : ""}. ` : "The field is empty. "}Write four numbers separated by / or commas, in feet or feet-inches, e.g. 7'9" / 2'6" / 2 / 4 or 7.75 / 2.5 / 2 / 4. Until then the prompt lists the setbacks as not given [CONFIRM] and flags a regulatory risk.`,
    );
  if (unk(S.fsi))
    add(
      "fsi",
      "wn",
      "Coverage / FSI is blank or unknown. The prompt flags it as a regulatory risk.",
    );
  if (!isInt0("cars"))
    add(
      "cars",
      "er",
      `Cars must be a whole number, 0 or more. The prompt will use ${ni("cars")}.`,
    );
  else if (ni("cars") === 0 && S.park !== "No parking")
    add(
      "cars",
      "wn",
      `0 cars: the prompt will say “No parking, 0 cars” and ignore Parking type “${S.park}”.`,
    );
  if (S.park === "No parking" && ni("cars") > 0)
    add(
      "park",
      "wn",
      `Parking type is “No parking”, so the prompt will use 0 cars (you entered ${ni("cars")}).`,
    );
  const fh = +S.fh;
  if (!isNum("fh") || fh <= 0)
    add(
      "fh",
      "er",
      "Floor-to-floor height must be above 0 ft. The prompt derives no level or stair riser from it until it is fixed.",
    );
  else {
    if (fh < 8 || fh > 14)
      add(
        "fh",
        "wn",
        `${fh} ft is unusual for a floor-to-floor height (normally about 8 to 14 ft). The prompt uses it as given and tags it [CONFIRM].`,
      );
    if (!half(fh))
      add(
        "fh",
        "wn",
        `${r2(fh * 12)} in is not a multiple of 0.5 in, but the prompt asks for every value to be one.`,
      );
  }
  if (String(S.plinth == null ? "" : S.plinth).trim() === "")
    add(
      "plinth",
      "wn",
      "Empty: the prompt treats the ground floor as the same level as the road. Enter 0 if that is intended.",
    );
  else if (isNum("plinth")) {
    const pl = +S.plinth;
    if (pl < 0)
      add(
        "plinth",
        "ok",
        `Plot is below the road. The prompt writes it as “${lvl(pl)}”.`,
      );
    if (!half(pl))
      add(
        "plinth",
        "wn",
        `${r2(pl * 12)} in is not a multiple of 0.5 in, but the prompt asks for every value to be one.`,
      );
  }
  for (let i = 0; i < fl; i++) {
    const u = "f" + i + "_fun";
    for (const s of ["fun", "fbed", "fatt", "fcom"]) {
      const k = "f" + i + "_" + s;
      if (!isInt0(k))
        add(k, "er", `Whole number, 0 or more. The prompt will use ${ni(k)}.`);
    }
    if (isInt0(u) && ni(u) === 0) {
      if (i === 0) {
        if (EP.park !== "Inside ground floor (garage / stilt)")
          add(
            u,
            "wn",
            `0 units on the ground floor is normally a stilt / garage floor, but Parking is “${EP.park}”. Check.`,
          );
        else
          add(
            u,
            "ok",
            "No units on this floor (stilt / garage). The prompt plans no rooms here.",
          );
      } else
        add(
          u,
          "wn",
          "0 units on an upper floor means an empty floor with no rooms. Check.",
        );
      for (const s of ["fbed", "fatt", "fcom", "fkit", "frm"])
        add("f" + i + "_" + s, "wn", "Ignored: 0 units on this floor.");
    }
  }
  tsw().forEach((x) => add(x.k, "wn", x.t));
  return { M, B };
}
function fillVm(V) {
  document.querySelectorAll(".vm").forEach((e) => {
    const m = V.M[e.dataset.vm] || [];
    e.innerHTML = m
      .map(([t, x]) => `<div class="${t}">${esc(x)}</div>`)
      .join("");
  });
}
function msg(t, c) {
  st.textContent = t || "";
  st.className = c || "";
}
function show() {
  base = build();
  const dw = document.getElementById("dw");
  if (dw) dw.textContent = dwarn();
  const V = vmsg();
  fillVm(V);
  BLK = V.B.length > 0;
  document.getElementById("blk").textContent = BLK
    ? "Copy and Enhance are off until this is fixed: " + V.B.join(" ")
    : "";
  document.getElementById("cp").disabled = BLK;
  en.disabled = ctl ? false : !sample.enhance || BLK;
  out.textContent = enh ? enh.text : base.text;
  un.style.display = enh ? "" : "none";
  document.getElementById("ch").textContent =
    enh && enh.ch.length
      ? "Changes: " + enh.ch.map((x) => "• " + x).join("  ")
      : "";
  ckStale();
}
function onChg(e) {
  const t = e.target,
    k = t.dataset && t.dataset.k;
  if (!k) return;
  if (CH[k]) {
    delete CH[k];
    lastApplied = lastApplied.filter((x) => x.key !== k);
    const rv = document.querySelector('#af-res [data-rv="' + k + '"]'),
      rl = rv && rv.closest("li");
    if (rl) rl.remove();
    if (!lastApplied.length) afu.style.display = "none";
    const f = t.closest(".f");
    if (f) {
      f.classList.remove("chg");
      const w = f.querySelector(".was");
      if (w) w.remove();
    }
  }
  const pu = S.use;
  S[k] =
    t.type === "checkbox"
      ? [...document.querySelectorAll('[data-k="' + k + '"]:checked')].map(
          (x) => x.value,
        )
      : t.value;
  if (k === "stage" || k === "vastu") syncStage();
  if (k === "use") {
    const sv = (q, v) => {
      clrCH(q);
      S[q] = v;
    };
    if (forced()) enforce(sv);
    else if (pu !== UM && S.use === UM) toMixed(sv);
  }
  lsS(KEY, JSON.stringify(S));
  if (k === "floors" || k === "use") render();
  else if (/^f\d_fuse$/.test(k)) updWarn();
  if (enh) {
    enh = null;
    msg(
      "Form changed: enhanced version cleared. Click Enhance again if needed.",
    );
  }
  show();
}
document.addEventListener("input", onChg);
document.addEventListener("change", onChg);
function resetAll() {
  S = dflt();
  CH = {};
  lsS(KEY, JSON.stringify(S));
  enh = null;
  msg("");
  afClear();
  ckClear();
  render();
  show();
}
document.getElementById("rs").onclick = () => {
  resetAll();
};
(() => {
  const b = document.getElementById("rd"),
    t = document.getElementById("rd-st");
  let tm = 0;
  b.onclick = () => {
    if (!tm) {
      b.textContent = "⚠ Tap again to confirm reset";
      t.textContent = "Every form answer goes back to its default.";
      tm = setTimeout(() => {
        tm = 0;
        b.textContent = "🔄 Reset all to default values";
        t.textContent = "";
      }, 4000);
      return;
    }
    clearTimeout(tm);
    tm = 0;
    resetAll();
    b.textContent = "🔄 Reset all to default values";
    t.textContent = "✓ All values are back to default.";
    setTimeout(() => {
      t.textContent = "";
    }, 2500);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
})();
un.onclick = () => {
  enh = null;
  msg("Original prompt restored.");
  show();
};
async function copyAny(t) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch (e) {}
  try {
    const a = document.createElement("textarea");
    a.value = t;
    a.setAttribute("readonly", "");
    a.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(a);
    a.focus();
    a.select();
    a.setSelectionRange(0, t.length);
    const ok = document.execCommand("copy");
    a.remove();
    return !!ok;
  } catch (e) {
    return false;
  }
}
document.getElementById("cp").onclick = async () => {
  const t = out.textContent,
    b = document.getElementById("cp");
  b.textContent = (await copyAny(t)) ? "✓ Copied" : "Select and copy manually";
  setTimeout(() => (b.textContent = "📋 Copy prompt"), 1800);
};

// Automation Section Tab Switching (UI only)
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // Remove active class from all tabs
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
    
    // Set clicked tab to active
    btn.classList.add("active");
    // Show corresponding content
    const targetId = btn.dataset.target;
    document.getElementById(targetId).style.display = "block";
  });
});

// Automation UI - UI helpers
const runGoBtn = document.getElementById("run-go");
const runCancelBtn = document.getElementById("run-cancel");
const runSt = document.getElementById("run-st");
const runImgGrid = document.getElementById("run-img-grid");

window.updateRunStatus = function(stepMsg, attempt) {
  runSt.textContent = attempt > 0 ? `${stepMsg} (Retry attempt ${attempt}...)` : stepMsg;
  runSt.style.color = attempt > 0 ? "var(--er)" : "var(--mu)";
};

window.renderRunImage = function(imgId, url, prompt, isError, errorMsg) {
  const ph = runImgGrid.querySelector("div");
  if (ph && ph.style.gridColumn === "1 / -1") ph.remove();

  let card = document.getElementById(`img-card-${imgId}`);
  if (!card) {
    card = document.createElement("div");
    card.id = `img-card-${imgId}`;
    card.style.cssText = "border: 1px solid var(--ln); border-radius: 8px; padding: 10px; background: var(--bg); display: flex; flex-direction: column; gap: 8px;";
    runImgGrid.appendChild(card);
  }

  if (isError) {
    card.innerHTML = `
      <div style="color:var(--er); font-size:12px; font-weight:bold;">❌ Failed to generate</div>
      <div style="font-size:12px; color:var(--mu);">${esc(errorMsg || "Unknown error")}</div>
      <div style="font-size:11px; color:var(--mu); max-height:40px; overflow:hidden;">Prompt: ${esc(prompt)}</div>
      <button class="p" style="font-size:12px; padding:6px;" onclick="retryImage('${imgId}')">🔄 Retry this image</button>
    `;
  } else {
    card.innerHTML = `
      <img src="${url}" style="width: 100%; border-radius: 6px; object-fit: cover;" alt="Generated Plan">
      <div style="font-size:11px; color:var(--mu); max-height: 40px; overflow-y: auto;">${esc(prompt)}</div>
    `;
  }
};

window.showFatalApiError = function(code, message) {
  const errMsg = `Fatal API Error (${code}): ${message}`;
  updateRunStatus(errMsg, 0);
  runSt.style.color = "var(--er)";
  runGoBtn.style.display = "block";
  runCancelBtn.style.display = "none";
  alert(errMsg);
};

window.retryImage = function(imgId) {
  console.log("Retry image", imgId);
  // To be implemented in Part 5
};

// Main Layout Tab Switching
document.querySelectorAll(".main-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".main-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".main-tab-content").forEach(c => c.style.display = "none");
    btn.classList.add("active");
    const targetId = btn.dataset.target;
    document.getElementById(targetId).style.display = "block";
  });
});

