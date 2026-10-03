// ===== Standalone mode: user's own API key =====
const AKEY_ANT = "homeplan-apikey-ant-v1",
  AKEY_OPE = "homeplan-apikey-ope-v1",
  FEAT_CONF = "homeplan-feat-v1",
  DEFPROV = "anthropic",
  DEFMODEL = {
    anthropic: "claude-sonnet-5-5",
    openai: "gpt-6.1-sol"
  };

const MODELS = {
  anthropic: [
    "claude-opus-5-5",
    "claude-sonnet-5-5",
    "claude-sonnet-5",
    "claude-haiku-4-5"
  ],
  openai: [
    "gpt-6-astra",
    "gpt-6.1-sol",
    "gpt-6-sol",
    "gpt-6-luna"
  ]
};

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
  } catch (e) { }
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) {
    try {
      return JSON.parse(f[1]);
    } catch (e) { }
  }
  const a = t.search(/[{\[]/),
    z = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (a >= 0 && z > a) {
    try {
      return JSON.parse(t.slice(a, z + 1));
    } catch (e) { }
  }
  throw { code: "invalid_json", message: "reply had no valid JSON", text: t };
}

// SOLID: Abstract AI Provider
class AIProvider {
  constructor(key, model) {
    this.key = key;
    this.model = model;
  }
  async call(input, opts) { throw new Error("Not implemented"); }
  limits() { return {}; }
}

class AnthropicProvider extends AIProvider {
  async call(input, opts) {
    opts = opts || {};
    const content = [],
      imgs = opts.images ? [].concat(opts.images) : [];
    for (const b of imgs) {
      const data = await b64(b);
      let mt = b.type || "image/png";
      if (data.startsWith("iVBORw0KGgo")) mt = "image/png";
      else if (data.startsWith("/9j/")) mt = "image/jpeg";
      else if (data.startsWith("R0lGOD")) mt = "image/gif";
      else if (data.startsWith("UklG")) mt = "image/webp";
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mt,
          data: data,
        },
      });
    }
    content.push({ type: "text", text: String(input) });
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 16000,
          stream: true,
          messages: [{ role: "user", content }],
        }),
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw {
        code: "network",
        message: "could not reach api.anthropic.com (check internet / blockers)",
      };
    }
    if (!res.ok) {
      let m = "";
      try {
        const j = await res.json();
        m = (j.error && j.error.message) || "";
      } catch (e) { }
      const c = res.status === 401 || res.status === 403 ? "bad_key" : res.status === 429 ? "rate_limited" : "upstream_error";
      throw {
        code: c,
        message: c === "bad_key" ? "API key rejected (" + res.status + "). Check the key and its credits." : m || "HTTP " + res.status,
      };
    }
    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "", stop = "";
    try {
      for (; ;) {
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
          try { ev = JSON.parse(d); } catch (e) { continue; }
          if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
            text += ev.delta.text;
            if (opts.onText) {
              try { opts.onText({ text, delta: ev.delta.text }); } catch (e) { }
            }
          } else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason)
            stop = ev.delta.stop_reason;
          else if (ev.type === "error")
            throw { code: "upstream_error", message: (ev.error && ev.error.message) || "stream error", text };
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled", text };
      throw e;
    }
    if (!text.trim()) throw { code: "empty_completion" };
    return { text, truncated: stop === "max_tokens" };
  }
  limits() {
    return {
      maxPromptBytes: 900000,
      images: {
        maxCount: 8,
        maxInputBytes: 3500000,
        mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      },
    };
  }
}

class OpenAIProvider extends AIProvider {
  async call(input, opts) {
    opts = opts || {};
    const content = [], imgs = opts.images ? [].concat(opts.images) : [];
    for (const b of imgs) {
      const data = await b64(b);
      let mt = b.type || "image/png";
      if (data.startsWith("iVBORw0KGgo")) mt = "image/png";
      else if (data.startsWith("/9j/")) mt = "image/jpeg";
      else if (data.startsWith("R0lGOD")) mt = "image/gif";
      else if (data.startsWith("UklG")) mt = "image/webp";
      content.push({
        type: "image_url",
        image_url: { url: "data:" + mt + ";base64," + data }
      });
    }
    content.push({ type: "text", text: String(input) });

    let res;
    try {
      // NOTE: o1-series might require max_completion_tokens, but as of now max_completion_tokens or not specifying it works.
      const reqBody = {
        model: this.model,
        stream: true,
        messages: [{ role: "user", content }],
        max_completion_tokens: 16000,
      };

      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer " + this.key,
        },
        body: JSON.stringify(reqBody),
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw {
        code: "network",
        message: "could not reach api.openai.com (check internet / blockers)",
      };
    }
    if (!res.ok) {
      let m = "";
      try {
        const j = await res.json();
        m = (j.error && j.error.message) || "";
      } catch (e) { }
      const c = res.status === 401 || res.status === 403 ? "bad_key" : res.status === 429 ? "rate_limited" : "upstream_error";
      throw {
        code: c,
        message: c === "bad_key" ? "API key rejected (" + res.status + "). Check the key and its credits." : m || "HTTP " + res.status,
      };
    }

    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "", stop = "";
    try {
      for (; ;) {
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
          try { ev = JSON.parse(d); } catch (e) { continue; }

          if (ev.choices && ev.choices.length > 0) {
            const choice = ev.choices[0];
            if (choice.delta && choice.delta.content) {
              text += choice.delta.content;
              if (opts.onText) {
                try { opts.onText({ text, delta: choice.delta.content }); } catch (e) { }
              }
            }
            if (choice.finish_reason) stop = choice.finish_reason;
          }
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled", text };
      throw e;
    }
    if (!text.trim()) throw { code: "empty_completion" };
    return { text, truncated: stop === "length" };
  }
  limits() {
    return {
      maxPromptBytes: 300000,
      images: {
        maxCount: 8,
        maxInputBytes: 3500000,
        mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      },
    };
  }
}

function makeApiSample(providerName, key, model) {
  let provider = providerName === "openai" ? new OpenAIProvider(key, model) : new AnthropicProvider(key, model);

  const call = async (input, opts) => provider.call(input, opts);
  const f = (i, o) => call(i, o);
  f.json = async (i, o) => {
    const r = await call(i, o);
    if (r.truncated)
      throw { code: "invalid_json", message: "reply cut short", text: r.text };
    return parseJsonLoose(r.text);
  };
  f.limits = async () => provider.limits();
  return f;
}

async function setupSample() {
  updKeyBtn();
  if (!platformSample) {
    const kAnt = lsG(AKEY_ANT);
    const kOpe = lsG(AKEY_OPE);
    
    let conf = {};
    try { conf = JSON.parse(lsG(FEAT_CONF) || "{}"); } catch(e){}

    const getP = (f) => (conf[f] && conf[f].p) || DEFPROV;
    const getM = (f, p) => (conf[f] && conf[f].m) || DEFMODEL[p];
    
    const mk = (f) => {
        const p = getP(f);
        const m = getM(f, p);
        const k = p === "anthropic" ? kAnt : kOpe;
        return k ? makeApiSample(p, k, m) : null;
    };

    sample = {
        autofill: mk("autofill"),
        checker: mk("checker"),
        enhance: mk("enhance")
    };
  }
  en.disabled = !sample.enhance || BLK;
  LIM = null;
  if (sample.autofill || sample.checker || sample.enhance) {
    msg("");
    afMsg("");
    try {
      LIM = sample.autofill && typeof sample.autofill.limits === "function" ? await sample.autofill.limits() : null;
    } catch (e) {
      LIM = null;
    }
    
    if (sample.autofill) {
        dzh.textContent =
          LIM && LIM.images
            ? "Images, PDF, TXT / MD / CSV · up to " +
            LIM.images.maxCount +
            " images per run"
            : "Images, PDF, TXT / MD / CSV · image ah direct ah padikka try pannum; mudiyalana prompt copy aagum";
    } else {
        dzh.textContent = "Images, PDF, TXT / MD / CSV";
        afMsg("Auto-fill needs an API key for its selected provider.", "er");
    }
    
    if (!sample.enhance && !platformSample) {
        msg("Enhance needs an API key for its selected provider.", "er");
    }
  } else {
    msg(
      platformSample
        ? "Enhance needs AI access and is unavailable in this view."
        : "Enhance needs AI access. Tap the 🔑 AI API key button at the top and add your key.",
    );
    afMsg(
      platformSample
        ? "Auto-fill needs AI access and is unavailable in this view. Fill the form below manually."
        : "Auto-fill needs AI access. Tap the 🔑 AI API key button at the top and add your key, or fill the form manually.",
      "er",
    );
    dzh.textContent = "Images, PDF, TXT / MD / CSV";
  }
  updGo();
}
// ----- API key popup (button at the top opens it) -----
