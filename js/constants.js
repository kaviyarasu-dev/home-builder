const KEY = "homeplan-prompt-v4",
  Y = "Yes",
  N = "No",
  SIDES = ["North", "South", "East", "West"],
  FN = ["Ground", "First", "Second", "Third"];

const STAGES = [
  "Feasibility check (area budget, stair derivation, [CONFIRM] items, risks)",
  "Design idea (text, with STAIR LOCK table)",
  "Coordinate, column and beam tables + code checks",
  "Independent checker prompt (to paste in a fresh chat)",
  "SVG plan drawing for each floor",
  "Door and window schedule",
  "Area statement + coverage / FSI check",
  "Section drawing through the stair (levels, headroom)",
  "Structural layout notes (indicative: columns, footings, beams)",
  "Plumbing and electrical layout notes (+ rainwater, septic)",
  "Rough cost estimate vs budget",
  "Rough material quantities (concrete, steel, bricks)",
  "Vastu compliance report",
  "Furniture layout check per room",
  "Elevation / 3D exterior image prompt",
  "Final plan summary (one page for engineer / contractor)",
  "Approval checklist (all [CONFIRM] items + documents)",
  "Architectural image prompts (CAD blueprint style, one per floor)",
];
// delivery order = list order. ST gives every option a name so no code depends on a bare number.
const ST = {
  feas: 0,
  design: 1,
  tab: 2,
  chk: 3,
  svg: 4,
  dw: 5,
  area: 6,
  sec: 7,
  str: 8,
  mep: 9,
  cost: 10,
  boq: 11,
  vastu: 12,
  furn: 13,
  elev: 14,
  sum: 15,
  appr: 16,
  img: 17,
};
const MAND = [ST.feas, ST.design, ST.tab, ST.chk, ST.dw, ST.area].map(
  (i) => STAGES[i],
);
const DEF_STAGE = [...MAND, STAGES[ST.svg], STAGES[ST.elev], STAGES[ST.img]];
// ticks actually used: required items always, plus SVG whenever the CAD image prompts are ticked (they attach the SVG sheet as geometry master)
const stg = () => {
  const t = new Set([...MAND, ...(S.stage || [])]);
  if (t.has(STAGES[ST.img])) t.add(STAGES[ST.svg]);
  if (S.vastu === "Not required") t.delete(STAGES[ST.vastu]);
  return STAGES.filter((x) => t.has(x));
};
const MODES = [
  "One reply: everything ticked, no pause",
  "Pause after feasibility + design idea; after I approve, everything else in one reply",
  "Pause after each group; I say continue",
];
const Q = {
  loc: [
    "City / district / state (for local building rules)",
    "t",
    0,
    "Tamil Nadu, India",
  ],
  pw: ["Plot frontage: side facing the road (ft)", "n", 0, 40],
  pd: ["Plot depth (ft)", "n", 0, 60],
  road: [
    "Road is on which side of the plot?",
    "s",
    SIDES.slice().sort().reverse().length
      ? ["East", "West", "North", "South"]
      : 0,
    "North",
  ],
  corner: ["Corner plot (two roads)?", "s", [N, Y], N],
  slope: [
    "Plot level compared to road",
    "s",
    ["Flat", "Slight slope", "Plot lower than road", "Plot higher than road"],
    "Flat",
  ],
  sbk: [
    "Setbacks: front (road side) / rear / left / right, left-right as seen standing on the road facing the plot (ft)",
    "t",
    0,
    "7.75 / 2.5 / 2 / 4",
  ],
  fsi: ["Max ground coverage / FSI allowed", "t", 0, "40 * 60"],
  blk: [
    "Sides with neighbour wall on the boundary (no windows possible)",
    "c",
    SIDES,
    [],
  ],
  newold: [
    "Type of work",
    "s",
    [
      "New construction on vacant plot",
      "Demolish and rebuild",
      "Add floors to existing house",
    ],
    "New construction on vacant plot",
  ],
  use: [
    "Who will use the house?",
    "s",
    ["Personal use (own family)", "Rental only", "Own family + rental floors"],
    "Own family + rental floors",
  ],
  floors: [
    "Number of floors (1 = ground floor only)",
    "s",
    ["1", "2", "3", "4"],
    "2",
  ],
  budget: ["Total construction budget (₹)", "t", 0, ""],
  tier: ["Finish level", "s", ["Basic", "Standard", "Premium"], "Standard"],
  eld: ["Elders who need a ground-floor bedroom / no stairs?", "s", [N, Y], N],
  mob: [
    "Mobility needs (wheelchair / walker)",
    "s",
    ["None", "Now", "Possibly in future"],
    "None",
  ],
  cars: ["Cars to park", "n", 0, 1],
  bay: ["Car bay size per car: width × depth (ft)", "t", 0, "10 × 15"],
  park: [
    "Parking type",
    "s",
    [
      "Open (in the front strip)",
      "Covered under the upper floor",
      "Inside ground floor (garage / stilt)",
      "No parking",
    ],
    "Covered under the upper floor",
  ],
  gate: ["Gate", "s", ["Sliding", "Swing", "No gate"], "Sliding"],
  out: [
    "Outdoor features",
    "c",
    ["Sit-out", "Portico", "Garden / planter", "Rear yard", "Compound wall"],
    ["Portico", "Garden / planter", "Compound wall"],
  ],
  steps: [
    "Entry steps / access to main door",
    "s",
    [
      "Steps outside the building, in the open front area",
      "Steps inside the porch / entrance",
      "Ramp, no steps",
    ],
    "Steps outside the building, in the open front area",
  ],
  stairpos: [
    "Staircase to upper floors",
    "s",
    [
      "Common enclosed stair core, entered from outside",
      "Separate external stair with its own entry",
      "Internal stair inside the owner unit",
    ],
    "Common enclosed stair core, entered from outside",
  ],
  stairt: [
    "Stair type",
    "s",
    ["Dog-leg", "Straight flight", "L-shape", "Spiral (small)"],
    "Dog-leg",
  ],
  terr: [
    "Terrace",
    "c",
    [
      "Mumty (stair cabin)",
      "Overhead water tank",
      "Solar panels",
      "Open terrace use",
      "Terrace garden",
    ],
    ["Mumty (stair cabin)", "Overhead water tank"],
  ],
  svc: [
    "Services",
    "c",
    [
      "Underground sump",
      "Septic tank / sewer connection",
      "Borewell",
      "Rainwater harvesting",
      "Solar water heater",
      "EV charging point",
    ],
    ["Septic tank / sewer connection", "EV charging point"],
  ],
  shaft: [
    "Open-to-sky shafts / ducts allowed for toilets and inner rooms?",
    "s",
    [Y, N],
    Y,
  ],
  fh: ["Floor-to-floor height (ft)", "n", 0, 10],
  plinth: ["Ground floor level above road (ft)", "n", 0, 2],
  vastu: [
    "Vastu",
    "s",
    ["Not required", "Partial (preferences only)", "Strict"],
    "Strict",
  ],
  vnote: [
    "Vastu notes (entrance, kitchen, pooja, master bedroom directions)",
    "a",
  ],
  style: [
    "Elevation style",
    "s",
    ["Modern / box", "Contemporary", "Traditional", "No preference"],
    "No preference",
  ],
  roof: ["Roof", "s", ["Flat", "Sloped", "Mixed"], "Flat"],
  spec: ["Anything else: must-haves, dislikes, special needs", "a"],
  ideas: ["Number of design ideas wanted", "n", 0, 1],
  mode: [
    "Pause points: how should the AI deliver the ticked items?",
    "s",
    MODES,
    MODES[1],
  ],
  stage: [
    "Deliverables: tick every output you want (delivered in this order)",
    "c",
    STAGES,
    DEF_STAGE,
  ],
  ver: ["Verify dimensions with code execution?", "s", [Y, N], Y],
};
const FQ = {
  fuse: [
    "Use of this floor",
    "s",
    ["Own family", "Rental unit(s)", "Own family + rental"],
  ],
  fun: ["Independent units on this floor", "n"],
  fbed: ["Bedrooms per unit", "n"],
  fatt: ["Attached toilets per unit", "n"],
  fcom: ["Common toilets per unit", "n"],
  fkit: ["Kitchen type", "s", ["Closed", "Open to hall", "Semi-open"]],
  frm: [
    "Other rooms (per unit)",
    "c",
    [
      "Hall",
      "Separate dining",
      "Foyer / entrance lobby",
      "Family lounge",
      "Wash / utility area",
      "Pooja room",
      "Study / home office",
      "Store room",
      "Dress / walk-in wardrobe",
      "Guest room",
      "Balcony",
      "Open courtyard (mutram)",
    ],
  ],
};
// Room rules for the ticked "Other rooms" boxes: [Vastu preference (used only when Vastu is on), rule]
const RR = {
  Hall: [
    "North, North-East or East",
    "one clear living space entered from the main door (or from the foyer if ticked) without crossing a bedroom; it carries the main circulation and has a window on an open face.",
  ],
  "Separate dining": [
    null,
    "a defined dining room next to the kitchen with its own wall or opening, not a passage; the kitchen-to-dining route stays short and clear of the main entry path.",
  ],
  "Foyer / entrance lobby": [
    null,
    "a small buffer between the main door and the hall so the door does not open straight into the living area; no bedroom or toilet door opens directly into it. Its size is a named [NEW] parameter.",
  ],
  "Family lounge": [
    null,
    "an open sitting space on that floor with a window or open face; it is a room of that unit, never the common stair lobby and never the only way to another unit.",
  ],
  "Wash / utility area": [
    "North-West or South-East",
    "a working area next to the kitchen for washing clothes and utensils, against a shaft/duct or an external wall, with a floor drain and a wash-machine point; it is reached from the kitchen or hall, never through a bedroom.",
  ],
  "Pooja room": [
    "North-East",
    "a closed room or a wall niche, never inside a toilet, and no toilet directly above or below it; it has a door or curtain opening onto the hall or dining, and ventilation if it is a closed room.",
  ],
  "Study / home office": [
    "North-East, East or West",
    "a quiet room that can double as a home-office space, with a window on an open face, away from the kitchen and the parking side where the plan allows; it is not counted as a bedroom unless it meets every bedroom minimum.",
  ],
  "Store room": [
    "South-West, South or West; avoid North-East and the centre",
    "an enclosed room with one door that may sit inside the plan without an external window; it is never a through-passage and never takes a window face that a habitable room needs.",
  ],
  "Dress / walk-in wardrobe": [
    null,
    "one per unit, attached to the master bedroom and entered only from that bedroom; it may sit inside the plan, and the bedroom's minimum-area check uses the bedroom's clear area excluding it.",
  ],
  "Guest room": [
    "North-West",
    "an extra bedroom counted separately from the bedrooms-per-unit number; it meets every bedroom minimum, has a window on an open face and a toilet within reach that is already counted in the toilets above.",
  ],
  Balcony: [
    null,
    "only on an open face of that floor, opening from a room or lounge, never on a face blocked by a neighbour wall and never beyond any plot line; whether it may project into the setback is [CONFIRM] with the authority. Its depth is a named [NEW] parameter.",
  ],
  "Open courtyard (mutram)": [
    "keep the centre of the house open",
    "an open-to-sky void that is not floor area and carries no slab above it, so every floor above shows the identical void box (same stack-lock rule as a shaft), with floor drainage at the lowest level; rooms around it may take light and air from it, and each such claim is named. Its size is a named [NEW] parameter.",
  ],
};
const SEC = [
  [
    "1 · Plot and site",
    ["loc", "pw", "pd", "road", "corner", "slope", "sbk", "fsi", "blk"],
  ],
  ["2 · Purpose and budget", ["newold", "use", "floors", "budget", "tier"]],
  ["3 · Family", ["eld", "mob"]],
  ["4 · Floors and rooms", "F"],
  ["5 · Parking and outside", ["cars", "bay", "park", "gate", "out", "steps"]],
  [
    "6 · Stair, terrace and services",
    ["stairpos", "stairt", "terr", "svc", "shaft", "fh", "plinth"],
  ],
  ["7 · Vastu", ["vastu", "vnote"]],
  ["8 · Style and special needs", ["style", "roof", "spec"]],
  ["9 · What the AI should deliver", ["ideas", "mode", "stage", "ver"]],
];
function dflt() {
  const d = {};
  for (const k in Q) d[k] = Q[k][3] !== undefined ? Q[k][3] : "";
  for (let i = 0; i < 4; i++) {
    const o = i > 0;
    Object.assign(d, {
      ["f" + i + "_fuse"]: o ? "Rental unit(s)" : "Own family",
      ["f" + i + "_fun"]: o ? 2 : 1,
      ["f" + i + "_fbed"]: 2,
      ["f" + i + "_fatt"]: 2,
      ["f" + i + "_fcom"]: 0,
      ["f" + i + "_fkit"]: "Closed",
      ["f" + i + "_frm"]: o
        ? i === 1
          ? ["Hall"]
          : ["Hall", "Wash / utility area"]
        : ["Hall", "Separate dining"],
    });
  }
  return d;
}

const FU = {
    own: "Own family",
    ren: "Rental unit(s)",
    both: "Own family + rental",
  },
  UP = "Personal use (own family)",
  UR = "Rental only",
  UM = "Own family + rental floors",
  fuK = (i) => "f" + i + "_fuse";

