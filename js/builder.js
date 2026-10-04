function build() {
  const n = (k) => +S[k] || 0,
    fl = +S.floors || 1,
    road = S.road,
    ns_ = road === "East" || road === "West",
    ew = ns_ ? n("pd") : n("pw"),
    ns = ns_ ? n("pw") : n("pd");
  const blk = (S.blk || []).filter((x) => x !== road),
    opn = SIDES.filter((x) => !blk.includes(x)),
    fls = [...Array(fl).keys()];
  const rental = fls.some(
      (i) => ni("f" + i + "_fun") > 0 && /ental/.test(S["f" + i + "_fuse"]),
    ),
    has = (k, x) => (S[k] || []).includes(x),
    mid = S.stairpos;
  const G = geo(),
    EP = effP(),
    mum = has("terr", "Mumty (stair cabin)"),
    tank = has("terr", "Overhead water tank"),
    sump = has("svc", "Underground sump"),
    sep = has("svc", "Septic tank / sewer connection"),
    rwh = has("svc", "Rainwater harvesting"),
    bore = has("svc", "Borewell"),
    ev = has("svc", "EV charging point"),
    un = (i) => ni("f" + i + "_fun"),
    fhOK = n("fh") > 0,
    fhI = r2(n("fh") * 12),
    terrItems = [
      "Overhead water tank",
      "Solar panels",
      "Open terrace use",
      "Terrace garden",
    ].filter((x) => has("terr", x));
  const lock = [
    `- Location / authority: ${S.loc}`,
    `- Plot: ${n("pw")} ft frontage × ${n("pd")} ft depth = ${r2(n("pw") * n("pd"))} sq.ft; road on the ${road} side${S.corner === Y ? " (corner plot; second road side to be confirmed)" : ""}`,
    `- Plot extent: East–West ${ew} ft (${r2(ew * 12)} in), North–South ${ns} ft (${r2(ns * 12)} in)`,
    `- Floors: ${fl} (${FN.slice(0, fl).join(", ")})`,
  ];
  fls.forEach((i) => {
    const p = "f" + i + "_",
      rm = (S[p + "frm"] || []).join(", ") || "none";
    if (!un(i)) {
      lock.push(
        `- ${FN[i]} floor: no independent units on this floor, so no bedrooms, toilets, kitchen or other rooms are planned here; only the stair core, passages, shafts and any parking / stilt use`,
      );
      return;
    }
    lock.push(
      `- ${FN[i]} floor: ${S[p + "fuse"]}; ${ni(p + "fun")} independent unit(s); per unit ${ni(p + "fbed")} bedroom(s), ${ni(p + "fatt")} attached toilet(s), ${ni(p + "fcom")} common toilet(s); kitchen ${S[p + "fkit"]}; other rooms: ${rm}`,
    );
  });
  {
    const sb = G.sb,
      sbm = sb.sbm,
      road = S.road,
      REAR = sb.REAR,
      LR = sb.LR;
    if (sb.ok) {
      const eW = G.eW,
        eN = G.eN;
      lock.push(
        `- Setbacks (minimum, plot line to building): ${SIDES.map((d) => `${d} ${sbm[d]} ft (${d === road ? "front, road side" : d === REAR ? "rear" : d === LR[0] ? "left, seen from the road" : "right, seen from the road"})`).join("; ")} [CONFIRM]`,
        `- Maximum building envelope (plot minus setbacks): East–West ${eW} ft × North–South ${eN} ft = ${r2(eW * eN)} sq.ft. Setbacks are minimums: the building may sit further from any plot line when needed.`,
      );
    } else
      lock.push(
        `- Setbacks (as the owner wrote them, sides not given): ${S.sbk} [CONFIRM]`,
      );
  }
  lock.push(
    `- Parking: ${EP.on ? `${EP.cars} car(s); ${EP.park}` : "No parking, 0 cars"}; gate: ${S.gate}; entry: ${S.steps}`,
  );
  const par = [
    `- Slope: ${S.slope}. Setbacks: see the lock lines above. Coverage / FSI in the owner's own notation: "${S.fsi}" [CONFIRM]. Its meaning is not defined: do not ask me what it means and do not use it to reject the design. Report the plan's computed ground coverage % and FSI (total floor area ÷ plot area) and show how they compare with each number in the notation`,
    `- Work: ${S.newold}. Use: ${derive()}`,
    `- Budget: ${S.budget || "not stated"}; finish level ${S.tier}`,
    `- Family: ${derive() === UR ? "no owner unit (rental only), so owner-family details do not apply; " : ""}elders needing no-stairs bedroom: ${S.eld}; mobility needs: ${S.mob}`,
    `- Levels relative to the road (road = ±0): ground floor ${lvl(n("plinth"))}; ${fhOK ? `each upper floor ${fhI} in above the one below; terrace ${fhI} in above the top floor${n("fh") < 8 || n("fh") > 14 ? " [CONFIRM: unusual floor height]" : ""}` : `the floor-to-floor height is not valid (${String(S.fh).trim() === "" ? "blank" : S.fh}), so no floor level is derived from it [CONFIRM]`}`,
    `- Stair: ${S.stairt}, ${mid}. Flight width 36 in, tread 10 in, riser ≤ 7.5 in, landing ≥ 36 in, headroom ≥ 87 in [SUGGESTED – CONFIRM]. ${S.ver === Y ? "The script" : "The calculation"} derives riser count and core size from the floor height.`,
    `- Outdoor: ${(S.out || []).join(", ") || "none"}. Terrace: ${(S.terr || []).join(", ") || "none"}. Services: ${(S.svc || []).join(", ") || "none stated"}`,
    `- Style: ${S.style}; roof ${S.roof}`,
    `- Walls: boundary 9 in, internal 4.5 in, shaft 4.5 in, stair core 9 in. Column 9 × 15 in inside a 9 in wall. Span ≤ 180 in c/c, cantilever ≤ 40 in (indicative; structural engineer designs)`,
    `- Doors: main 42 in, bedroom 36 in, toilet 30 in, passage ≥ 36 in`,
    `- Room minimums (clear) [CONFIRM]: bedroom ≥ 102 sq.ft and ≥ 96 in wide; kitchen ≥ 48 sq.ft; toilet ≥ 30 sq.ft`,
  ];
  if (S.spec) par.push(`- Special requests: ${S.spec}`);
  const sr = mid.startsWith("Common")
    ? "The core is entered from outside through its own door from the open front area or walkway, never through the owner unit. On the ground floor it does not open into any room of the owner unit. On each upper floor its arrival landing opens directly to the main door of each unit."
    : mid.startsWith("Separate")
      ? "The stair stands outside the envelope with its own entry, and each upper floor gets a landing at its door."
      : "The stair sits inside the owner unit, so state how the rental floors reach it without crossing the owner unit.";
  const SBM = G.sb.sbm,
    zs = G.sb.ok ? SIDES.filter((d) => SBM[d] === 0) : [],
    zOpen = zs.filter((d) => d !== road && !blk.includes(d)),
    rk = [];
  if (!G.sb.ok)
    rk.push("the setbacks are missing or could not be read as four values");
  if (zs.length)
    rk.push(
      `the setback is 0 on the ${zs.join(", ")} side(s)${zOpen.length ? `, and no neighbour wall is stated on ${zOpen.join(", ")}, so whether a window may open on that face is [CONFIRM]` : ""}`,
    );
  if (unk(S.fsi)) rk.push("the coverage / FSI is blank or unknown");
  const RKT = rk.length
    ? `Regulatory risk: ${rk.join("; ")}. Flag this at the start. Do not state what the rule is unless you are certain; otherwise write "confirm with local authority".`
    : `Use the stated setbacks, but still flag that they need confirmation.`;
  const k = Math.max(1, Math.floor(n("ideas"))),
    ver = S.ver === Y,
    R = [
      `Do not ask me any question in any stage. PARAMETERS are final and complete. If a value is missing or its meaning is unclear, do not guess and do not stop: list it under OPEN ITEMS [CONFIRM], carry each possible reading through the checks where it matters, and still deliver the full output of the stage. A reply that ends in questions instead of the deliverable is a failed reply.`,
      `Every number you use comes from PARAMETERS. If you need a new dimension, add it as a named parameter with a one-line reason and tag it [NEW].`,
      `Never invent bye-law values, clause numbers or code behaviour. Items tagged [CONFIRM] are design values pending local authority confirmation. Keep the tag in every output.`,
      ver
        ? `Use the code execution tool for every calculation. Show the script's printed output verbatim. Never type ✓, PASS or FAIL yourself; copy them only from the script's output. If the code tool is not available, start the reply with "CODE TOOL NOT AVAILABLE" and show hand calculations step by step instead, with no typed PASS or FAIL.`
        : `Show every calculation step by step so I can check it. Do not mark anything as verified unless the arithmetic is shown.`,
      `If any check fails, redesign and re-check. Never present a failing plan.`,
      `If a requirement cannot be met, say so with the numbers. Never silently relax it.`,
      ...(k === 1
        ? [
            `Produce exactly ONE design. Do not offer alternatives, variants or options; pick the single best fit for these parameters. I will ask for changes if I want them.`,
          ]
        : []),
      RKT,
    ];
  const site = [
    blk.length
      ? `No windows, ventilators or projections on the ${blk.join(", ")} face(s) on any floor (neighbour wall on boundary). Windows only on: ${opn.join(", ")}.`
      : `No neighbour wall is stated on any boundary, so all four faces (North, South, East, West) may have windows. Do not ask me which sides are blocked.`,
    `No projection beyond any plot line. Any shading must sit inside the envelope.`,
    `Every habitable room (bedroom, hall, dining, kitchen) and every toilet gets either an external window on an open face or a shaft/duct. Name which, per room.`,
    S.shaft === Y
      ? `Shafts/ducts are open to sky, continuous to the terrace at the same position, never a room on any floor, with floor drainage at the lowest level. Habitable-room shaft ≥ 72 × 72 in clear, toilet-only duct ≥ 36 × 36 in [SUGGESTED – CONFIRM].`
      : `No shafts or ducts: every room and toilet must be on an open face.`,
    `Every toilet shares a wall with a shaft/duct or an external wall. Stacks run in shafts. Upper toilets sit directly over lower toilets or shafts; no toilet over the parking.`,
    `Kitchen sinks adjoin a shaft/duct or an external wall.`,
    `Stair core: one fixed box (x1, y1, x2, y2) defined once before any room is placed. Place it where its entry door can be reached from outside without crossing any unit (for a core or external stair: on the building face next to the open front area or its walkway), at one corner or end of the building, never in the middle of a unit, and so that its arrival landing can touch the main door of every upper-floor unit. The identical box, with identical flights, landings and turn direction, appears on every floor${mum ? " and under the terrace cabin" : ""}. The ground-floor UP arrow and each upper-floor DN arrow are the same flights seen from different levels; no floor may move, flip, mirror or resize the core. Print a STAIR LOCK table, one row per level (ground, each upper floor${mum ? ", terrace cabin" : ""}), with x1, y1, x2, y2 in plot inches and the feet-inches value in brackets next to each: | Level | x1 | y1 | x2 | y2 | outer size | entry-door face | flight 1 direction | turn | arrows |. Assert that every row has the same x1, y1, x2, y2, size and turn; a mismatch is a failed check. Every later table, drawing and image prompt copies the numbers from the STAIR LOCK table and never re-derives or re-estimates them. Check headroom at every tread and landing.`,
    `Stair connectivity (table required, one row per floor): core entry door or opening | bottom landing | flight 1 (risers, direction) | mid landing | flight 2 | arrival landing | doors that open from it. ${sr} Every upper-floor unit's main door opens onto the arrival landing or a common lobby (at least 36 in wide) that belongs to the core and not to any unit; no unit hall may contain the stair opening or be the way to another unit. If one core cannot reach all units without crossing a unit, add the lobby and report its area; never solve it by moving the stair on one floor only.`,
    `Vertical stack lock: every shaft and duct uses the identical box on every floor and under the terrace. Every upper-floor toilet sits directly over a lower toilet or a shaft. Print a stack table per cut line; a miss is a failed check, not a note.`,
    `Doors must not swing into the parking, a stair flight or the clear width of a passage.`,
  ];
  if (EP.on)
    site.push(
      `Parking: car bay ${S.bay} ft (width × depth) per car, clear of the gate; bay width never below 9'-0" [SUGGESTED – CONFIRM]. ${EP.park.startsWith("Open") ? "The bay sits in the open front area between the road plot line and the building line. The front setback is only a minimum, so move the building line back as far as the bay needs, and report the resulting front depth and the reduced buildable depth. If the bay still cannot fit, say so with numbers and give the best fit. " : "The parking position is fixed by the Parking line. "}Do not ask me whether parking may go elsewhere. ${S.gate === "Sliding" ? "Reserve 6 in inside the plot line for the sliding gate track [CONFIRM gate size]. " : ""}Walking paths to the entry and stair must not cross the bay.`,
    );
  if (!mum)
    site.push(
      `Terrace access: no stair cabin (mumty) is ticked, so the stair ends at the top floor and how the terrace is reached is [CONFIRM]. Draw no stair cabin and no stair box on the terrace sheet${terrItems.length ? `; the terrace items ticked (${terrItems.join(", ")}) need that access, so list it under OPEN ITEMS [CONFIRM]` : ""}.`,
    );
  site.push(
    S.steps === "Ramp, no steps"
      ? `Entry by ramp; slope ≤ 1:12 [SUGGESTED – CONFIRM], with a landing at the door.`
      : `Entry steps ${S.steps.startsWith("Steps outside") ? "sit outside the building envelope, in the open area, clear of the parking" : "sit inside the porch"}; riser ≤ 6 in, tread ≥ 12 in, top landing ≥ 36 × 48 in.`,
  );
  if (rental)
    site.push(
      `Rental units are fully independent: own main door opening to a common landing or stair, never through another unit or a bedroom, with privacy between units and provision for separate meters.`,
    );
  {
    const RM = FQ.frm[2],
      rl = [],
      off = [],
      V = S.vastu !== "Not required";
    for (const r of RM) {
      const on = fls.filter((i) => un(i) > 0 && has("f" + i + "_frm", r));
      if (!on.length) continue;
      const [vh, ru] = RR[r];
      rl.push(
        `${r} (${on.map((i) => FN[i]).join(", ")}): ${ru}${V && vh ? ` Vastu preference (common guidance, sources differ; a preference only): ${vh}.` : ""}`,
      );
    }
    const nd = fls.filter(
      (i) =>
        un(i) > 0 &&
        has("f" + i + "_frm", "Hall") &&
        !has("f" + i + "_frm", "Separate dining"),
    );
    if (nd.length)
      rl.push(
        `Dining (${nd.map((i) => FN[i]).join(", ")}): no separate dining room; the dining table is a zone inside the hall. Size the hall to hold it and say so.`,
      );
    fls.forEach((i) => {
      if (!un(i)) {
        off.push(`${FN[i]}: no units, so no rooms`);
        return;
      }
      const no = RM.filter((r) => !has("f" + i + "_frm", r));
      off.push(`${FN[i]}: ${no.length ? no.join(", ") : "none"}`);
    });
    site.push(
      `Room program, built from the ticked "other rooms" in PARAMETERS. On each floor, per unit, use only the bedrooms, toilets and kitchen given there, the stair core, passages and the other rooms ticked for that floor. Do not add, rename or merge any other room. NOT ticked, so not drawn: ${off.join("; ")}. If a ticked room cannot fit, say so with the numbers and give the best fit; never drop it silently. Any size you need that is not in PARAMETERS is a named [NEW] parameter.${rl.length ? "\n   Rules for the ticked rooms:\n   - " + rl.join("\n   - ") : ""}`,
    );
  }
  if (S.eld === Y || S.mob !== "None")
    site.push(
      `Provide a ground-floor bedroom and toilet reachable without stairs${S.mob !== "None" ? ", with wheelchair-friendly door and turning clearances" : ""}.`,
    );
  site.push(
    S.vastu === "Not required"
      ? `Vastu is not required.`
      : `Vastu (${S.vastu}): ${S.vnote || "apply standard guidance"}. Treat as preferences. Where Vastu conflicts with a dimension, ventilation or structure rule, say so with the numbers instead of dropping it.`,
  );
  const SG = stg(),
    dx = (i) => SG.includes(STAGES[i]),
    tab = dx(ST.tab),
    des = dx(ST.design) || tab,
    dsvg = dx(ST.svg) || dx(ST.img),
    dimg = dx(ST.img),
    g1 = [],
    g2 = [],
    g3 = [],
    W = [],
    PM = MODES.includes(S.mode) ? S.mode : MODES[1];
  if (dx(ST.feas))
    g1.push(
      `Feasibility check: ${ver ? "run a feasibility script that prints" : "calculate and show"} the internal area budget per floor, the stair derivation, a list of every [CONFIRM] item and the regulatory risk.`,
    );
  if (des)
    g1.push(
      `Design idea: give ${k === 1 ? "exactly ONE design idea (no alternatives)" : k + " design ideas"}, text only. ${k > 1 ? "Every idea has all of D1 to D8. " : ""}Give these numbered parts in this order, each in the format shown:\n   D1 STAIR LOCK table: the box in plot inches with feet-inches in brackets, one row per level.\n   D2 WHY THIS POSITION: one line on why the stair sits here, then one line per unit naming the landing door that unit uses.\n   D3 FRONT STRIP SUM: one line "a + b + c = plot width (${n("pw")} ft)" with every part named. If there is no parking, say so and sum what exists.\n   D4 ACROSS SUMS: for each floor (${FN.slice(0, fl).join(", ")}), one line per East–West line through the building, "a + b + c = envelope width", every part named.\n   D5 ALONG SUMS: for each floor (${FN.slice(0, fl).join(", ")}), one line per North–South line through the building, "a + b + c = envelope depth", every part named.\n   ${S.shaft === Y ? "D6 SHAFT LOCK table: one row per shaft or duct, plot inches with feet-inches in brackets: | Shaft/duct | Serves | x1 | y1 | x2 | y2 | Levels | Drains to at the lowest level |; Levels lists ground, every upper floor and under the terrace, because it is the same box on every floor and under the terrace; the stack-lock rule stays in force." : "D6 SHAFTS: one line stating that no shafts or ducts exist, with no SHAFT LOCK table."}\n   D7 VENTILATION table, one row per toilet on every floor: | Toilet | Floor | Shaft or window | Shared wall |. Shaft or window names the shaft from D6 or the window face; Shared wall names what is on the other side of the toilet's shared wall.\n   D8 MAIN RISKS: each risk with its numbers.\n   An item that cannot be given must say "NOT GIVEN" with the reason; silence is a failed reply. Never end with questions: the design idea is always part of the reply, even when a check is tight (adjust within the allowed flexibility and report the numbers).${k > 1 ? " Every pair of ideas must differ in at least 4 of these axes: stair side, stair orientation, ground-floor room order, hall position, upper-floor unit split, toilet pattern, shaft positions, front-area use. Show the pairwise difference matrix." : ""}`,
    );
  if (tab)
    g2.push(
      `Coordinate, column and beam tables: for ${k > 1 ? (PM === MODES[0] ? "every idea" : "each idea I choose (1–2)") : "the design"} and each floor give a coordinate table | ID | Level | Type | x1 | y1 | x2 | y2 | Clear W × L (ft-in) | with types room, wall, shaft, duct, stair, landing, bay, steps, open, recess (stair and landing rows copy the STAIR LOCK numbers unchanged on every floor${mum ? " and under the terrace cabin" : ""}${S.shaft === Y ? "; shaft and duct rows copy the SHAFT LOCK numbers unchanged on every floor and under the terrace" : ""}); plus column and beam tables (span c/c, cantilever). ${ver ? "One Python script holds all data and asserts: no overlaps and areas summing to the envelope, stack sums printed in full for every cut line, room/door/passage minimums, identical stair box, flight direction and landings on every floor, identical shaft boxes on every floor, every upper toilet over a toilet or shaft, one shared outline and grid for all floors, column and span limits, every room and toilet has a window or shaft, no opening on blocked faces." : "Show the stack sums and checks in full."}`,
    );
  if (dx(ST.chk))
    g2.push(
      `Independent checker prompt: end the tables with one self-contained prompt in a code block, which I will paste into a FRESH chat together with the coordinate tables as JSON (that chat cannot see this prompt). It must list the rules to test with the actual numbers from PARAMETERS (no overlaps, areas sum to the envelope, stack sums, room/door/passage minimums, identical stair and shaft boxes on every floor, every upper toilet over a toilet or shaft, column and span limits, every room and toilet has a window or shaft, no opening on blocked faces) and tell that chat to write a new, independent checker without reusing any code from this chat and print a full pass/fail list.`,
    );
  const EX = [];
  if (dx(ST.dw))
    EX.push(
      `Door and window schedule: one table per floor | ID | Room | Wall / face | Width × Height (ft-in) | Sill height | Type | Opens into |. Use only the verified coordinates; no window on a blocked face; door swings must obey the door rule.`,
    );
  if (dx(ST.area))
    EX.push(
      `Area statement: carpet area per room and floor, built-up area per floor, total built-up area, ground coverage % = ground-floor footprint ÷ plot area, and FSI = total built-up ÷ plot area. Compare with the coverage / FSI in PARAMETERS and say clearly if the plan is over the limit, with numbers. Do not state the legal limit yourself.`,
    );
  if (dx(ST.sec))
    EX.push(
      `Section drawing through the stair: one section along the stair's long direction (cut line named on the plan) and, when shafts exist, one section through the main shaft. Show every floor level and the terrace level from the Levels line in PARAMETERS (ground floor ${lvl(n("plinth"))}, each upper floor ${fhOK ? fhI + " in above the one below" : "height not valid [CONFIRM]"}), the floor height, every riser and tread of each flight, the landings, the headroom at every tread and landing copied from the headroom check, ${mum ? "the terrace stair cabin, " : "the top of the stair at the top floor (no stair cabin is ticked), "}and slab and beam depths tagged [SUGGESTED – CONFIRM]. Draw it as one SVG at the same scale as the plan sheets (1 ft = 12 px), every level and dimension in feet-inches computed from the verified data${ver ? " by the script, with no hand-typed numbers" : ""}. If a riser or headroom check fails, say so with the numbers.`,
    );
  if (dx(ST.str))
    EX.push(
      `Structural layout notes (indicative, for my structural engineer to design; no member sizes, bar sizes or concrete grades unless tagged [SUGGESTED – CONFIRM]): column positions copied from the column table, footing type options to discuss with the reason for each, plinth beam and tie beam lines, support of the stair flights and landings, positions that add load${[tank && "overhead tank", mum && "terrace stair cabin"].filter(Boolean).length ? " (" + [tank && "overhead tank", mum && "terrace stair cabin"].filter(Boolean).join(", ") + ")" : " (no overhead tank or stair cabin is ticked)"}, every cantilever and long span from the beam table that needs attention, and the soil-test and slope items that are [CONFIRM].`,
    );
  if (dx(ST.mep))
    EX.push(
      `Plumbing and electrical notes (indicative, for my engineer to confirm): toilet and kitchen stack positions inside the verified shafts, ${[sump && "sump", sep && "septic", bore && "borewell"].filter(Boolean).length ? [sump && "sump", sep && "septic", bore && "borewell"].filter(Boolean).join(" / ") + " positions as per Services" : "no sump, septic tank or borewell is ticked in Services"}${tank ? ", overhead tank position" : ""}, meter location for each unit, main panel and DB position, and the points per room (light, fan, 5A, 15A, AC, geyser)${ev ? (EP.on ? ", plus the EV charging point near the parking" : ", plus an EV charging point whose position is [CONFIRM] because no parking is provided") : ""}. ${tank ? "" : "No overhead tank is ticked: the water supply method is [CONFIRM], so list it under OPEN ITEMS and give no overhead tank position or load. "}${rwh ? "Also give the rainwater harvesting storage / recharge position (whether it is required is [CONFIRM] with the local authority). " : "Rainwater harvesting is not ticked: draw no position for it, but list it under OPEN ITEMS because whether it is required is [CONFIRM] with the local authority. "}${sep ? "Also give the septic tank and soak pit positions. " : "Septic tank / sewer connection is not ticked: the wastewater disposal method is not stated, so list it under OPEN ITEMS as [CONFIRM] and give no septic tank or soak pit position. "}No pipe sizes or cable ratings unless tagged [SUGGESTED – CONFIRM].`,
    );
  if (dx(ST.cost))
    EX.push(
      `Rough cost estimate: built-up area × a cost-per-sq.ft range for the "${S.tier}" finish level in ${S.loc}, split into structure / finishing / services / contingency, compared with my budget (${S.budget || "not stated"}). Tag every rate [SUGGESTED – CONFIRM], show the arithmetic, and say what to cut if it exceeds the budget.`,
    );
  if (dx(ST.boq))
    EX.push(
      `Rough material quantities: indicative bulk quantities (concrete, reinforcement steel, bricks or blocks, mortar, flooring area, paint area) worked from the verified floor areas, wall lengths and slab areas, with the arithmetic shown. Tag every thumb-rule factor [SUGGESTED – CONFIRM]. For cross-checking my contractor's quote only; no rates and no wastage percentage stated as fact.`,
    );
  if (dx(ST.vastu) && S.vastu !== "Not required")
    EX.push(
      `Vastu compliance report: a table | Item | Direction in the plan | Preferred direction | Status | for entrance, kitchen, pooja, master bedroom, toilets and stair, based on the verified plan and the Vastu notes. Report conflicts with numbers; never move a verified room to fix Vastu.`,
    );
  if (dx(ST.furn))
    EX.push(
      `Furniture layout per room: a table per floor | Room | Clear size (ft-in) | Furniture placed (typical sizes, ft-in) | Clear walking space left | Fits? | using only the verified room sizes and the door and window positions from the schedule. Furniture sizes are typical values tagged [SUGGESTED – CONFIRM]. If something does not fit, say so with the numbers; never move a wall, door or window to make it fit.`,
    );
  if (dx(ST.elev))
    EX.push(
      `Elevation / 3D exterior image prompt: one text-to-image prompt for the front elevation (and one 3D view) built only from the verified plan: ${S.floors} floor(s), ${S.roof} roof, ${S.style} style, ${(S.out || []).join(", ") || "no outdoor features"}, ${S.gate} gate, road on the ${S.road} side. List the window and door positions per floor from the schedule; say: do not add floors, balconies or rooms that are not in the tables.`,
    );
  if (dx(ST.sum))
    EX.push(
      `Final plan summary (one page, for my engineer and contractor): plot, setbacks and envelope; floors and use; one table per floor | Room | Clear size (ft-in) | Area (sq.ft) | Window or shaft |; the stair core${S.shaft === Y ? " and shaft boxes" : ""} copied from the STAIR LOCK${S.shaft === Y ? " and SHAFT LOCK" : ""} table${S.shaft === Y ? "s" : ""}; total built-up area, ground coverage % and FSI from the area statement; parking and entry; the [NEW] register and the open [CONFIRM] items. Copy every number from the verified tables; add no new number.`,
    );
  if (dx(ST.appr))
    EX.push(
      `Approval checklist: (a) one table of every [CONFIRM] item in this reply | No. | Item | Value used in the plan | Who to confirm with | What changes if it differs |; (b) the documents and drawings usually needed for a residential building permit, each marked "confirm the exact list with the ${S.loc} authority". Do not name Acts, rule numbers, clause numbers or fee amounts.`,
    );
  if (EX.length)
    g3.push(
      `Extra deliverables, one section each, in this order, ${tab ? "built only from the verified tables once every check passes" : "built from the design idea's area budget and layout (preliminary; say so in each section)"}:\n${EX.map((x, i) => `E${i + 1}) ${x}`).join("\n")}`,
    );
  if (dimg)
    g3.push(
      `Image prompts (last step, only after every check passes): I want to visualize this plan like a professional civil engineer's drawing. Please provide a highly detailed Image Generation Prompt (suitable for Midjourney, DALL-E 3, or Stable Diffusion) to create a high-quality 2D architectural floor plan blueprint of our verified design. An image tool redraws every picture from scratch, so the stair drifts between floors unless every prompt carries the same locked numbers. Write one text-to-image prompt per floor plus one for the terrace, built only from the verified tables, with these rules.\n   a) One separate image per floor and one for the terrace, never one sheet holding several plans. Same canvas size, same plot-outline position, same scale and same rotation in every prompt.\n   b) Every prompt starts with the same STACK-LOCK block: the plot outline; the road side (${road}) named exactly once; the stair box copied from the STAIR LOCK table in plot inches with feet-inches in brackets, exactly as in that table, AND as percentages of the building outline measured from its South-West corner (x from a% to b% of building width, y from c% to d% of building depth${ver ? ", percentages printed by the script" : ""}) with flight direction, entry-door face and UP/DN arrows; AND a strong plain-English description of its exact location (e.g., "anchored in the extreme North-East corner of the building"). The exact same text describing the stair location MUST be used in every prompt to prevent it from moving; every shaft and duct box in the same two forms; the compass orientation.${mum ? "" : " The terrace prompt leaves out the stair box and draws no stair cabin (none is ticked)."}\n   c) The road is on the ${road} side only. Label it once. The opposite edge is the rear boundary: no road label, no gate, no car bay and no entry steps there. Parking, gate and entry steps are drawn only in the front strip on the road side.\n   d) ${dsvg ? "Attach the PNG export (or a screenshot) of the verified SVG sheet of that floor as the geometry master and say: keep every wall, stair, shaft, door and label exactly where it is; you may only add colour, material texture, furniture and shadows." : "Prompt 1 is the ground floor; every later prompt tells the image tool to attach the ground-floor image and keep the outline, stair box and shafts in the identical position."}\n   e) Then list that floor's rooms with sizes and positions copied from the tables, and say: draw exactly these boxes; do not add, move, rename, mirror or resize anything; draw exactly one stair, anchored rigidly at the exact semantic location stated above. Visual consistency of the stair position across all floors is the absolute highest priority. Do not let the stair drift or change size; copy all labels from the tables.\n   f) Style block, copied into every prompt: ask specifically for a crisp CAD-style top-down (orthographic) 2D floor plan view with professional architectural styling, on a clean white background or a classic dark blueprint (choose one and use the same in every image); detailed wall thicknesses (outer walls visibly thicker than inner partitions, using the wall thicknesses from the tables); a clear staircase representation with treads, flight lines and UP/DN arrows; parking spaces with bay lines and car outlines on the floor that has them; and architectural annotations (room names with sizes, dimension lines, door swings, window symbols, level marks, north arrow, scale bar and a title block). The result must look exactly like a professional, highly detailed civil engineer's final CAD drawing. Add a short negative prompt: no perspective, no 3D render, no photo-realism, no people, no decorative clutter, no extra stairs, no extra rooms. Give me just the image generation prompts, one per floor plus the terrace, each ready to paste in its own code block, with no commentary between them.\n   g) End with a checklist for me to compare the images: stair box position and size, UP/DN arrows, entry door, shafts, stacked toilets, number of road labels (must be 1) and north arrow on each image. If one image differs, I regenerate that image only, with the correct ground-floor image attached.`,
    );
  if (dsvg)
    g3.unshift(
      `SVG plan drawing: one SVG per floor plus the terrace, built from the verified tables and following DRAWING RULES below.`,
    );
  {
    const parts = (
      PM === MODES[0]
        ? [[...g1, ...g2, ...g3]]
        : PM === MODES[2]
          ? [g1, g2, g3]
          : [g1, [...g2, ...g3]]
    ).filter((p) => p.length);
    let c = 0;
    // rule ownership: every site rule that no WORKFLOW item owned gets a delivery point (Coordinate tables when present, else Design idea)
    {
      const di = parts.findIndex((p) =>
          p.some((x) => x.startsWith("Design idea:")),
        ),
        ci = parts.findIndex((p) =>
          p.some((x) => x.startsWith("Coordinate, column and beam tables:")),
        ),
        at = (i) => (parts.length > 1 ? ` (PART ${i + 1})` : ""),
        dW =
          di < 0
            ? "no stage in this run delivers it; treat it as a constraint only"
            : `Design idea item${at(di)}`,
        cW = ci >= 0 ? `Coordinate, column and beam tables item${at(ci)}` : dW,
        tg = (x, w) => `${x} [Delivered: ${w}]`,
        cR = [
          "stair connectivity table, one row per floor",
          "headroom at every tread and landing, printed per flight",
          "stack table per cut line",
          "kitchen sink wall, one line per kitchen",
          "no toilet over the parking, one line per upper-floor toilet",
        ],
        dR = [
          ...(S.shaft === Y
            ? [
                "lowest-level floor drainage of every shaft and duct (the Drains to column of D6)",
              ]
            : []),
          ...(rental ? ["separate meters per rental unit"] : []),
        ];
      site.forEach((x, i) => {
        if (x.startsWith("Stair core:"))
          site[i] = x.replace(
            "Check headroom at every tread and landing.",
            "Check headroom at every tread and landing. [Delivered: " +
              cW +
              "]",
          );
        else if (
          /^(Stair connectivity|Vertical stack lock|Kitchen sinks adjoin)/.test(
            x,
          )
        )
          site[i] = tg(x, cW);
        else if (x.startsWith("Every toilet shares a wall"))
          site[i] = x.replace(
            "no toilet over the parking.",
            "no toilet over the parking. [Delivered: " + cW + "]",
          );
        else if (
          /^(Shafts\/ducts are open to sky|Rental units are fully independent)/.test(
            x,
          )
        )
          site[i] = tg(x, dW);
      });
      parts.forEach((p) =>
        p.forEach((x, j) => {
          if (x.startsWith("Design idea:")) {
            const l = [...(ci < 0 ? cR : []), ...dR];
            if (l.length)
              p[j] =
                x +
                `\n   RULE DELIVERY: these site rules have no other stage, so deliver each one inside this item${at(di)}, after D8, as a short labelled block (not an extra D-part; "NOT GIVEN" with the reason applies): ${l.join("; ")}.`;
          } else if (x.startsWith("Coordinate, column and beam tables:"))
            p[j] =
              x +
              ` RULE DELIVERY: also deliver in this item${at(ci)}, as tables or printed checks: ${cR.join("; ")}. A miss is a failed check, not a note.`;
        }),
      );
    }
    if (!parts.length)
      W.push(
        `No deliverable is ticked. Reply with one line saying so and nothing else.`,
      );
    else {
      W.push(
        `Deliver every item below, in the order given. Every ticked item is mandatory: none may be skipped, shortened or moved to a later reply except at the stop points named here.`,
      );
      const SUF = ` End this item with its script output, verbatim, in a code block. A reply without that block is a failed reply.`;
      parts.forEach((p, i) => {
        const last = i === parts.length - 1;
        W.push(
          `${parts.length > 1 ? `PART ${i + 1} (${i === 0 ? "this response" : "after I approve the previous part or ask for changes; re-run every check the changes affect"})` : "This response"}:\n${p.map((x) => `${++c}) ${x}${ver && !x.startsWith("Independent checker prompt:") ? SUF : ""}`).join("\n")}\nIf the reply would be too long, finish a complete item, end with "CONTINUE FROM: <next item>", and carry on when I say continue. When this part is fully delivered, end it with a "[NEW] register" table: | Name | Value | One-line reason | Used in |, listing every dimension used in this part that is not in PARAMETERS (write "none" if there is none). A dimension without a reason must be removed and its calculation redone. Last of all, before any stop line, check this part against its numbered items and print a completeness table: | Item no. | Delivered / Not delivered | Reason |, one row per numbered item of this part, and for the Design idea item one extra row for each of D1 to D8. "Not delivered" is allowed only for something this prompt assigns to a later part, and the Reason must name that part. Any other "Not delivered" means deliver it now, before the stop line.${last ? "" : ' Only after every item of this part is fully delivered, end with the single line "Waiting for your feedback." (a stop is not a question; do not start the next part). Never use it on a reply that ends with CONTINUE FROM.'}`,
        );
      });
    }
  }
  const D = dsvg
    ? `\n\nDRAWING RULES\nGenerate SVG from the same data as the tables, with no hand-typed numbers. Scale 1 ft = 12 px, same scale and orientation on every sheet, road side labelled. North up is preferred; if a sheet is rotated so the road is at the bottom, rotate the north arrow and every compass tag (window E/W/N/S, road label) by the same angle so none contradicts the drawing. Define the stair core once (one group built from the STAIR LOCK numbers) and place that same group on every floor${mum ? " and on the terrace" : ""}, never redraw it per floor; do the same for every shaft and duct. Draw the same flight lines and UP/DN arrows on every floor. Parking, gate and entry steps are drawn only on the road side. 1'-0" grid, north arrow, hatched boundary walls, all dimension labels computed from coordinates in feet-inches. One plan per floor plus terrace; show stair, parking, entry steps, shafts and columns.${mum ? "" : " No stair cabin is ticked, so the terrace sheet shows no stair box."}`
    : "";
  const num = (a) => a.map((x, i) => `${i + 1}. ${x}`).join("\n");
  const text = `ROLE\nYou are a senior residential architect (${S.loc}) with structural awareness. Dimensional correctness matters more than visual appeal. You never present a room, stair or column whose size and position has not been checked.\n\nHARD RULES\n${num(R.map((x, i) => `R${i + 1}. ${x}`).map((x) => x.replace(/^R\d+\. /, "")))}\n\nCOORDINATES AND UNITS\nOrigin = plot South-West corner. X = West→East (0–${r2(ew * 12)} in), Y = South→North (0–${r2(ns * 12)} in). Road is on the ${road} side. All internal values in inches, every value a multiple of 0.5 in${ver ? ", exact arithmetic (Python fractions.Fraction)" : ""}. Exception, stated once: the STAIR LOCK box, shaft boxes and coordinate tables use plot inches (x1, y1, x2, y2), with feet-inches only in brackets next to the numbers, e.g. 288 [24'-0"]. All other human-facing text uses feet-inches (e.g. 12'-4½").\n\nPARAMETERS (single source of truth)\n${lock.join("\n")}\n${par.join("\n")}\n\nSITE AND DESIGN RULES\n${num(site)}\n\nWORKFLOW\n${W.join("\n")}${D}`;
  const must = [
    "Feasibility check:",
    "Design idea:",
    "D1 STAIR LOCK",
    "D2 WHY THIS POSITION",
    "D3 FRONT STRIP SUM",
    "D4 ACROSS SUMS",
    "D5 ALONG SUMS",
    "D6 SHAFT",
    "D7 VENTILATION",
    "D8 MAIN RISKS",
    "Coordinate, column and beam tables:",
    "Independent checker prompt:",
    "SVG plan drawing:",
    "Door and window schedule:",
    "Area statement:",
    "Plumbing and electrical notes",
    "Rough cost estimate:",
    "Vastu compliance report:",
    "Elevation / 3D exterior image prompt:",
    "Section drawing through the stair:",
    "Structural layout notes",
    "Rough material quantities:",
    "Furniture layout per room:",
    "Final plan summary (one page",
    "Approval checklist:",
    "Image prompts (last step",
    "RULE DELIVERY",
    "[Delivered:",
    "PART 2 ",
    "PART 3 ",
    "CONTINUE FROM: <next item>",
    "Waiting for your feedback.",
    "End this item with its script output",
    "CODE TOOL NOT AVAILABLE",
    "[NEW] register",
    "Item no. | Delivered / Not delivered | Reason",
  ].filter((x) => text.includes(x));
  return { text, lock, k, must };
}

