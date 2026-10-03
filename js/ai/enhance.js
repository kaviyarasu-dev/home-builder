function metaPrompt(b) {
  return `You are an expert prompt engineer. Below is a BASELINE prompt for an AI that will design a house plan. Rewrite it into the best possible prompt for THIS specific project. Every change must come from what this plot, family and program actually need.

You may change anything except the locked items: reorder, merge or remove rules that do not apply, add rules this project needs (for example privacy and noise between rental units, risks that follow from the plot size and the requested rooms, parking or stair conflicts), tighten wording, and add a short "KNOWN RISKS" block when the requested program looks impossible for the plot (use numbers).

LOCKED (a program checks these; a broken reply is rejected):
1. Keep each of these lines word-for-word:
${b.lock.join("\n")}
2. Never invent bye-law values, clause numbers or numbers I did not give. Any new design value must be tagged [SUGGESTED – CONFIRM].
3. Keep the STAIR LOCK table, the SHAFT LOCK table if present, the units exception in COORDINATES AND UNITS (STAIR LOCK, shaft boxes and coordinate tables in plot inches with feet-inches only in brackets; all other human-facing text in feet-inches), stair-continuity, vertical stack-lock and orientation rules, the image-prompt rules and the extra-deliverable steps if they are present, every numbered item and every PART stop point in the WORKFLOW (item names word-for-word), the "CONTINUE FROM: <next item>" instruction that closes every part and the "Waiting for your feedback." stop line that follows it on non-last parts only, every RULE DELIVERY line and every [Delivered: …] tag (each site rule must keep its delivery point; if you move or merge a rule, move its tag with it), the numbered parts D1 to D8 inside the Design idea item (labels, table headers and sum formats word-for-word) and the rule that an item which cannot be given says "NOT GIVEN" with the reason, the rule that I am never asked questions, the "[NEW] register" table and the completeness table (Item no. | Delivered / Not delivered | Reason) that close every part, and, when code verification is on, the "End this item with its script output, verbatim, in a code block" line on each item and the "CODE TOOL NOT AVAILABLE" fallback, and keep the rules that nothing may be presented as verified unless the calculation is shown or the script printed it, that a requirement is never silently relaxed, and that ${b.k === 1 ? "exactly ONE design is produced with no alternatives" : "exactly " + b.k + " design ideas are produced"}.
4. The prompt only instructs the AI; never include the design or answer itself.
5. One self-contained prompt in imperative style, no commentary, similar length (shorter is fine).

BASELINE PROMPT:
<<<BASELINE>>>
${b.text}
<<<END BASELINE>>>

Reply in EXACTLY this format:
<<<PROMPT>>>
(the complete rewritten prompt)
<<<CHANGES>>>
- (3 to 6 short bullets: what you changed and why)
<<<END>>>`;
}
en.onclick = async () => {
  if (ctl) {
    ctl.abort();
    return;
  }
  if (!sample || BLK) return;
  const b = build();
  ctl = new AbortController();
  en.textContent = "⏹ Stop";
  msg("Claude is rewriting the prompt… (up to a minute)");
  try {
    const r = await sample(metaPrompt(b), {
      modelTier: "default",
      cache: false,
      signal: ctl.signal,
      onText: ({ text }) =>
        msg("Claude is rewriting… " + text.length + " characters"),
    });
    if (r.truncated) throw { code: "truncated" };
    const t = String(r.text).replace(/\r\n/g, "\n"),
      i = t.indexOf("<<<PROMPT>>>");
    if (i < 0) throw { code: "fmt" };
    const j = t.indexOf("<<<CHANGES>>>", i);
    let p = t
      .slice(i + 12, j < 0 ? t.length : j)
      .replace(/^\s*```[a-z]*\n/, "")
      .replace(/\n```\s*$/, "")
      .trim();
    const ch =
      j < 0
        ? []
        : t
            .slice(j + 13, (t.indexOf("<<<END>>>", j) + 1 || t.length + 1) - 1)
            .split("\n")
            .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
            .filter(Boolean)
            .slice(0, 6);
    if (p.length < 300 || p.length > 30000)
      throw { code: "rej", message: "reply length looks wrong" };
    /* KNOWN RISK: this is the ONLY semantic check. It guards just b.lock (location, plot, extent, floors, per-floor lines, setbacks+envelope, parking). Everything in par[] (slope, FSI, budget, family, levels, stair, outdoor/terrace/services, style, roof, walls/doors/room minimums, spec) and site[] (blocked sides, shafts, Vastu, room-program rules) plus the mandatory rules (STAIR LOCK, stack lock, no questions, design count) can be changed or dropped and the rewrite is still accepted. Also: b is a snapshot taken at click time and ctl is not aborted when the form changes, so a stale result can still land. */
    const miss2 = b.must.find((l) => !p.includes(l));
    if (miss2)
      throw {
        code: "rej",
        message: "a deliverable or stop point was dropped: " + miss2,
      };
    const miss = b.lock.find((l) => !p.includes(l));
    if (miss)
      throw {
        code: "rej",
        message:
          "a locked parameter line was changed: " + miss.slice(0, 50) + "…",
      };
    enh = { text: p, ch };
    show();
    msg("Enhanced for your plot. Original is one click away.", "ok");
  } catch (e) {
    const c = e && e.code;
    if (c === "cancelled") msg("Cancelled. Prompt unchanged.");
    else if (
      [
        "not_granted",
        "sampling_disabled",
        "not_declared",
        "capability_disabled",
        "capability_removed",
      ].includes(c)
    ) {
      sample = null;
      msg(
        "Claude access was not granted, so Enhance is off. Reload and allow it.",
        "er",
      );
    } else if (c === "rate_limited")
      msg("Rate limit reached. Try again later.", "er");
    else if (c === "truncated" || c === "fmt")
      msg(
        "Claude's reply was cut off or in the wrong format. Nothing applied; click again.",
        "er",
      );
    else if (c === "rej")
      msg(
        "Rewrite rejected: " + e.message + ". Prompt unchanged; click again.",
        "er",
      );
    else
      msg(
        "Enhance failed (" +
          ((e && e.message) || "unknown") +
          "). Prompt unchanged.",
        "er",
      );
  }
  ctl = null;
  en.textContent = "✨ Enhance for my plot";
  en.disabled = !sample || BLK;
};