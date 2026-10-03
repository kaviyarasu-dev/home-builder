// ===== Standalone mode: user's own Claude API key (used only when claude.ai's built-in access is absent) =====
const AKEY = "homeplan-apikey-v1",
  MKEY = "homeplan-model-v1",
  DEFMODEL = "claude-sonnet-5-5";
let platformSample = false;
const aks = (t, c) => {
  const e = $("ak-st");
  e.textContent = t || "";
  e.className = c || "";
};
const b64 = (b) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
function parseJsonLoose(t) {
  t = String(t || "").trim();
  try {
    return JSON.parse(t);
  } catch (e) {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) {
    try {
      return JSON.parse(f[1]);
    } catch (e) {}
  }
  const a = t.search(/[{\[]/),
    z = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (a >= 0 && z > a) {
    try {
      return JSON.parse(t.slice(a, z + 1));
    } catch (e) {}
  }
  throw { code: "invalid_json", message: "reply had no valid JSON", text: t };
}
function makeApiSample(key, model) {
  async function call(input, opts) {
    opts = opts || {};
    const content = [],
      imgs = opts.images ? [].concat(opts.images) : [];
    for (const b of imgs)
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: b.type || "image/png",
          data: await b64(b),
        },
      });
    content.push({ type: "text", text: String(input) });
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: 16000,
          stream: true,
          messages: [{ role: "user", content }],
        }),
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw {
        code: "network",
        message:
          "could not reach api.anthropic.com (check internet / blockers)",
      };
    }
    if (!res.ok) {
      let m = "";
      try {
        const j = await res.json();
        m = (j.error && j.error.message) || "";
      } catch (e) {}
      const c =
        res.status === 401 || res.status === 403
          ? "bad_key"
          : res.status === 429
            ? "rate_limited"
            : "upstream_error";
      throw {
        code: c,
        message:
          c === "bad_key"
            ? "API key rejected (" +
              res.status +
              "). Check the key and its credits."
            : m || "HTTP " + res.status,
      };
    }
    const rd = res.body.getReader(),
      dec = new TextDecoder();
    let buf = "",
      text = "",
      stop = "";
    try {
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const d = line.slice(5).trim();
          if (!d || d === "[DONE]") continue;
          let ev;
          try {
            ev = JSON.parse(d);
          } catch (e) {
            continue;
          }
          if (
            ev.type === "content_block_delta" &&
            ev.delta &&
            ev.delta.type === "text_delta"
          ) {
            text += ev.delta.text;
            if (opts.onText) {
              try {
                opts.onText({ text, delta: ev.delta.text });
              } catch (e) {}
            }
          } else if (
            ev.type === "message_delta" &&
            ev.delta &&
            ev.delta.stop_reason
          )
            stop = ev.delta.stop_reason;
          else if (ev.type === "error")
            throw {
              code: "upstream_error",
              message: (ev.error && ev.error.message) || "stream error",
              text,
            };
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled", text };
      throw e;
    }
    if (!text.trim()) throw { code: "empty_completion" };
    return { text, truncated: stop === "max_tokens" };
  }
  const f = (i, o) => call(i, o);
  f.json = async (i, o) => {
    const r = await call(i, o);
    if (r.truncated)
      throw { code: "invalid_json", message: "reply cut short", text: r.text };
    return parseJsonLoose(r.text);
  };
  f.limits = async () => ({
    maxPromptBytes: 900000,
    images: {
      maxCount: 8,
      maxInputBytes: 3500000,
      mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    },
  });
  return f;
}
async function setupSample() {
  updKeyBtn();
  if (!platformSample) {
    const k = lsG(AKEY);
    sample = k ? makeApiSample(k, lsG(MKEY) || DEFMODEL) : null;
  }
  en.disabled = !sample || BLK;
  LIM = null;
  if (sample) {
    msg("");
    afMsg("");
    try {
      LIM = typeof sample.limits === "function" ? await sample.limits() : null;
    } catch (e) {
      LIM = null;
    }
    dzh.textContent =
      LIM && LIM.images
        ? "Images, PDF, TXT / MD / CSV · up to " +
          LIM.images.maxCount +
          " images per run"
        : "Images, PDF, TXT / MD / CSV · image ah direct ah padikka try pannum; mudiyalana prompt copy aagum";
  } else {
    msg(
      platformSample
        ? "Enhance needs Claude access and is unavailable in this view."
        : "Enhance needs Claude access. Tap the 🔑 Claude API key button at the top and add your key.",
    );
    afMsg(
      platformSample
        ? "Auto-fill needs Claude access and is unavailable in this view. Fill the form below manually."
        : "Auto-fill needs Claude access. Tap the 🔑 Claude API key button at the top and add your key, or fill the form manually.",
      "er",
    );
    dzh.textContent = "Images, PDF, TXT / MD / CSV";
  }
  updGo();
}
// ----- API key popup (button at the top opens it) -----

