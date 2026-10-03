// ===== Check values with AI: Claude reads every answer and lists the conflicts in a table under the button (the form is never changed) =====
const ckGo = $("ck-go"),
  ckSt = $("ck-st"),
  ckRes = $("ck-res");
let ckCtl = null,
  ckSig = "";
const ckMsg = (t, c) => {
  ckSt.textContent = t || "";
  ckSt.className = c || "";
};
const shortName = (l) =>
  String(l)
    .split(":")[0]
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
function ckClear() {
  if (ckCtl) ckCtl.abort();
  ckSig = "";
  ckRes.innerHTML = "";
  if (!ckCtl) ckMsg("");
}
function ckStale() {
  if (!ckSig || ckCtl) return;
  if (JSON.stringify(S) !== ckSig)
    ckMsg(
      "You changed the form after this report. Click “Check values with AI” again for a fresh report.",
    );
  else if (ckSt.textContent.startsWith("You changed")) ckMsg("");
}
function ckFields() {
  const fl = +S.floors || 1,
    L = [];
  SEC.forEach(([t, ks]) => {
    L.push("\n" + t);
    if (ks === "F") {
      for (let i = 0; i < fl; i++)
        for (const k of FKEYS)
          L.push(
            `- ${FN[i]} floor – ${shortName(FQ[k][0])}: ${fmt(S["f" + i + "_" + k], 300)}`,
          );
    } else
      for (const k of ks) {
        const q = Q[k],
          nm = shortName(q[0]);
        L.push(
          `- ${nm}: ${fmt(k === "stage" ? stg() : S[k], 2000)}${nm !== q[0] ? `   [full question: ${q[0]}]` : ""}`,
        );
      }
  });
  return L.join("\n");
}
function ckFacts() {
  const G = geo(),
    EP = effP(),
    fl = +S.floors || 1,
    L = [],
    fhI = r2(nn("fh") * 12);
  L.push(
    `Plot: ${nn("pw")} ft frontage × ${nn("pd")} ft depth = ${r2(nn("pw") * nn("pd"))} sq.ft. Road on the ${S.road} side.`,
  );
  if (G.sb.ok) {
    const sm = G.sb.sbm;
    L.push(
      `Setbacks read as (plot line to building, these are minimums): front/road side ${sm[S.road]} ft, rear ${sm[G.sb.REAR]} ft, left ${sm[G.sb.LR[0]]} ft, right ${sm[G.sb.LR[1]]} ft. Maximum building envelope: ${G.eW} ft East–West × ${G.eN} ft North–South = ${r2(G.eW * G.eN)} sq.ft per floor.`,
    );
  } else
    L.push(
      "Setbacks could not be read as four values, so the building envelope is unknown.",
    );
  L.push(`Who uses the house, as the prompt will treat it: ${derive()}.`);
  L.push(
    `Parking the prompt will use: ${EP.on ? EP.cars + " car(s), " + EP.park : "none (0 cars, or type is No parking)"}.`,
  );
  L.push(
    `Floor-to-floor height ${nn("fh")} ft (${fhI} in)${nn("fh") > 0 ? `; the stair needs at least ${Math.ceil(fhI / 7.5)} risers per floor (riser 7.5 in at most)` : " is not valid"}.`,
  );
  for (let i = 0; i < fl; i++) {
    const u = ni("f" + i + "_fun"),
      b = ni("f" + i + "_fbed"),
      a = ni("f" + i + "_fatt"),
      c = ni("f" + i + "_fcom");
    L.push(
      u
        ? `${FN[i]} floor: ${u} unit(s); bedrooms + toilets + kitchen alone need at least ${u * (b * 102 + (a + c) * 30 + 48)} sq.ft clear area (not counting hall, dining, passages, stair core, walls or the other rooms ticked).`
        : `${FN[i]} floor: no independent units.`,
    );
  }
  L.push(
    "Fixed values used by the prompt: boundary wall 9 in, internal wall 4.5 in, stair width 36 in, tread 10 in, riser at most 7.5 in, headroom at least 87 in, bedroom at least 102 sq.ft and 96 in wide, kitchen at least 48 sq.ft, toilet at least 30 sq.ft, passage at least 36 in, one car bay as typed in the form.",
  );
  return L;
}
function ckKnown() {
  const V = vmsg(),
    w = [];
  for (const k in V.M)
    V.M[k].forEach(([t, x]) => {
      if (t !== "ok" && !w.includes(x)) w.push(x);
    });
  const d = dwarn();
  if (d) w.push(d);
  return w;
}
function ckPrompt() {
  const kn = ckKnown();
  return `You are a senior residential architect who checks a client's brief before any drawing is made. A form collects answers; a program turns them into a prompt for an AI that will design a house plan. Your job: find every place where these answers clash with each other, or cannot all be met on this plot, so that creating the plan would fail, give a wrong result, or force the AI to ignore something the owner asked for.

FORM ANSWERS (name: answer)
${ckFields()}

FACTS ALREADY WORKED OUT BY THE PROGRAM (trust these numbers)
${ckFacts()
  .map((x) => "- " + x)
  .join("\n")}

PROBLEMS THE FORM ALREADY SHOWS ON SCREEN (include one only if it is a real clash, in simple words)
${kn.length ? kn.map((x) => "- " + x).join("\n") : "- none"}

WHAT TO LOOK FOR (report only what really applies)
- Plot and area: the building envelope is too small for the rooms asked, with hall, passages and stair core still to fit; a setback of 0 on a side with no neighbour wall ticked; a corner plot whose second road side is also ticked as a neighbour wall. The coverage / FSI text is the owner's own notation and its meaning is NOT defined: never guess its meaning; mention it only if it is blank or unreadable.
- Parking: the parking type does not fit the floors (for example "Covered under the upper floor" with only 1 floor; "Inside ground floor" while the ground floor has units); cars × bay size do not fit the front strip or frontage; entry steps or open parking do not fit the front setback. 0 units on the ground floor is normal when parking is "Inside ground floor (garage / stilt)".
- Use and floors: who will use the house against the use of each floor; a floor with units but 0 bedrooms or kitchen needs; an empty upper floor.
- People: elders or wheelchair / walker needs against the stair type, the entry steps, and whether a ground-floor bedroom exists.
- Stair and levels: stair type and position against the floor height, plinth level and space available; a spiral stair with mobility needs.
- Terrace and services: terrace items without a stair cabin, no way to store or supply water, no septic or sewer, EV charging with no parking.
- Vastu: strict Vastu against the road side, neighbour walls and rooms asked; Vastu notes that contradict other answers (for example an entrance direction that cannot happen on the road side); a Vastu report ticked while Vastu is "Not required".
- Deliverables and settings: a cost estimate ticked with no budget; pause points or number of design ideas that do not match what is ticked.
- Special requests text against the other answers (for example it asks for something another field forbids).
- Budget: raise it only if it is clearly too low or too high for the size and finish level asked. Say it is a rough view and never give a price per sq.ft as a fact.

Reply with ONLY one JSON object, with no other text and no markdown fences:
{"summary":"one short sentence","rows":[{"input":"...","problem":"...","fix":"..."}]}

RULES FOR THE ROWS
- input: the field name exactly as written in FORM ANSWERS (the part before the colon, including the floor name for floor fields). One field per row.
- problem: why this field is wrong or clashes, in very simple English: short sentences, no jargon, so a home owner understands. Use the real numbers from the answers. Name the other field it clashes with.
- fix: what to change, specific: the new value or choice to use (or what to tick or untick), with numbers where possible. Give the easiest fix first. If it depends on local rules, say "confirm with the local authority" and never state a rule value as a fact.
- When two fields clash, write ONE row, on the field that is easiest to change. Never repeat the same clash in two rows.
- Most serious first. At most 25 rows. Do not report style choices, personal taste, or anything that is fine.
- Never invent building-law values, clause numbers or costs.
- If you find nothing wrong, return "rows":[] and a summary saying the values look consistent.`;
}
function ckRender(sum, rows) {
  if (!rows.length) {
    ckRes.innerHTML = `<h3>✅ No conflicts found</h3><p class="sub" style="margin:0">${esc(sum || "The values look consistent with each other.")}</p>`;
    return;
  }
  ckRes.innerHTML = `<h3>${rows.length} conflict${rows.length > 1 ? "s" : ""} found</h3>${sum ? `<p class="sub" style="margin:0 0 8px">${esc(sum)}</p>` : ""}<div style="overflow-x:auto"><table class="ct"><thead><tr><th>S.No</th><th>Input name</th><th>Why this field is wrong</th><th>What to change</th></tr></thead><tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td class="in">${esc(x.input || "(not named)")}</td><td>${esc(x.problem)}</td><td>${esc(x.fix)}</td></tr>`).join("")}</tbody></table></div><p class="sub" style="margin:8px 0 0;font-size:12px">This is an AI opinion to guide you. It does not change your form: edit the fields yourself, then check again.</p>`;
}
async function runCk() {
  if (ckCtl) {
    ckCtl.abort();
    return;
  }
  if (!sample) {
    ckMsg(
      platformSample
        ? "Claude access is not available in this view, so the check cannot run."
        : "This check needs Claude access. Tap the 🔑 Claude API key button at the top and add your key.",
      "er",
    );
    return;
  }
  const c = new AbortController();
  ckCtl = c;
  const sig = JSON.stringify(S);
  ckGo.textContent = "⏹ Stop";
  ckMsg("Claude is checking your values… (up to a minute)");
  try {
    const r = await sample.json(ckPrompt(), {
      modelTier: "default",
      cache: false,
      signal: c.signal,
      onText: ({ text }) =>
        ckMsg("Claude is checking… " + text.length + " characters"),
    });
    const raw = Array.isArray(r)
      ? r
      : r && Array.isArray(r.rows)
        ? r.rows
        : null;
    if (!raw) throw { code: "bad" };
    const rows = raw
      .map((x) => ({
        input: String((x && (x.input || x.field)) || "").trim(),
        problem: String((x && x.problem) || "").trim(),
        fix: String((x && x.fix) || "").trim(),
      }))
      .filter((x) => x.problem && x.fix)
      .slice(0, 25);
    ckRender(
      r && !Array.isArray(r) && typeof r.summary === "string"
        ? r.summary.trim()
        : "",
      rows,
    );
    ckSig = sig;
    ckCtl = null;
    ckMsg(
      rows.length
        ? "Done. Fix the fields in the table, then check again."
        : "Done.",
      "ok",
    );
    ckStale();
  } catch (e) {
    const k = e && e.code;
    if (k === "cancelled") ckMsg("Cancelled.");
    else if (
      [
        "not_granted",
        "sampling_disabled",
        "not_declared",
        "capability_disabled",
        "capability_removed",
      ].includes(k)
    ) {
      sample = null;
      en.disabled = true;
      ckMsg(
        "Claude access was not granted, so this check is off. Reload and allow it.",
        "er",
      );
    } else if (k === "rate_limited")
      ckMsg("Rate limit reached. Try again later.", "er");
    else if (
      k === "invalid_json" ||
      k === "bad" ||
      k === "empty_completion" ||
      k === "refused"
    )
      ckMsg("Claude's reply could not be read. Click again to retry.", "er");
    else
      ckMsg(
        "Check failed (" + ((e && e.message) || k || "unknown") + ").",
        "er",
      );
  }
  ckCtl = null;
  ckGo.textContent = "🔍 Check values with AI";
}
ckGo.onclick = runCk;