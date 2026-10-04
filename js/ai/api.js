// ===== Standalone mode: user's own API key =====
const AKEY_ANT = "homeplan-apikey-ant-v1",
  AKEY_OPE = "homeplan-apikey-ope-v1",
  AKEY_KIE = "homeplan-apikey-kie-v1",
  FEAT_CONF = "homeplan-feat-v1",
  DEFPROV = "anthropic",
  DEFMODEL = {
    anthropic: "claude-sonnet-5-5",
    openai: "gpt-6.1-sol",
    kie: "gpt-image-2-5-sunburst-text-to-image"
  };

const MODELS = {
  anthropic: [
    { id: "claude-opus-5-5", name: "Claude Opus 5.5 - High Quality" },
    { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5 - Standard Quality" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5 - Standard Quality" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5 - Fast Quality" }
  ],
  openai: [
    { id: "gpt-6-astra", name: "GPT 6 Astra - High Quality" },
    { id: "gpt-6.1-sol", name: "GPT 6.1 Sol - High Quality" },
    { id: "gpt-6-sol", name: "GPT 6 Sol - Standard Quality" },
    { id: "gpt-6-luna", name: "GPT 6 Luna - Fast Quality" },
    { id: "dall-e-3", name: "DALL-E 3 - High Quality" }
  ],
  kie: [
    {
      id: "gpt-image-2-5-sunburst-text-to-image",
      name: "GPT Image 2.5 Sunburst - High Quality",
      options: {
        aspect_ratio: {
          values: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9", "27:16", "16:27", "9:8", "8:9"],
          default: "auto", // docs default. 27:16, 16:27, 9:8, 8:9 => 1K only
        },
        resolution: { values: ["1K", "2K", "4K"], default: "4K" },
        background: { values: ["transparent", "opaque", "auto"], default: "auto" },
      },
    },
    {
      id: "gpt-image-2-5-flare-text-to-image",
      name: "GPT Image 2.5 Flare - High Quality",
      options: {
        aspect_ratio: {
          values: ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9", "27:16", "16:27", "9:8", "8:9"],
          default: "auto", // docs default. 27:16, 16:27, 9:8, 8:9 => 1K only
        },
        resolution: { values: ["1K", "2K", "4K"], default: "4K" },
        background: { values: ["transparent", "opaque", "auto"], default: "auto" },
      },
    },
    {
      id: "grok-imagine-image-2-0/text-to-image",
      name: "Grok Imagine Image 2.0 - High Quality",
      options: {
        aspect_ratio: { values: ["1:1", "2:3", "3:2", "16:9", "9:16"], default: "1:1" }, // required, only option in docs
      },
    },
    {
      id: "seedream/5-pro-text-to-image",
      name: "Seedream 5.0 Pro - High Quality",
      options: {
        aspect_ratio: {
          values: ["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
          default: "1:1", // docs default
        },
        quality: { values: ["basic", "high"], default: "high" }, // docs default is basic (1K). high = 2K
        output_format: { values: ["png", "jpeg"], default: "png" }, // docs default
        nsfw_checker: { values: [false, true], default: false }, // docs default
      },
    },
    {
      id: "nano-banana-2",
      name: "Nano Banana 2 - Standard Quality",
      options: {
        aspect_ratio: {
          values: ["auto", "1:1", "2:3", "3:2", "1:4", "4:1", "3:4", "4:3", "4:5", "5:4", "1:8", "8:1", "9:16", "16:9", "21:9"],
          default: "auto", // docs default
        },
        resolution: { values: ["1K", "2K", "4K"], default: "4K" }, // docs default is 1K
        output_format: { values: ["png", "jpg"], default: "png" }, // docs default is jpg
        image_input: { type: "array", maxItems: 14, default: [] },
      },
    },
    {
      id: "nano-banana-pro",
      name: "Nano Banana Pro - High Quality",
      options: {
        aspect_ratio: {
          values: ["auto", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
          default: "1:1", // docs default
        },
        resolution: { values: ["1K", "2K", "4K"], default: "4K" }, // docs default is 1K
        output_format: { values: ["png", "jpg"], default: "png" }, // docs default
        image_input: { type: "array", maxItems: 8, default: [] },
      },
    },
    {
      id: "wan/2-7-image-pro",
      name: "Wan 2.7 Image Pro - High Quality",
      options: {
        aspect_ratio: {
          values: ["1:1", "16:9", "4:3", "21:9", "3:4", "9:16", "8:1", "1:8"],
          default: "1:1", // only applies when no input image
        },
        resolution: { values: ["1K", "2K", "4K"], default: "4K" }, // docs default is 2K. 4K only for text-to-image
        n: { min: 1, max: 4, default: 1 }, // docs default is 4 (max 12 if enable_sequential=true). 1 = no wasted credits
        enable_sequential: { values: [false, true], default: false }, // docs default
        thinking_mode: { values: [false, true], default: false }, // docs default. only when enable_sequential=false and no input_urls
        watermark: { values: [false, true], default: false }, // docs default
        nsfw_checker: { values: [false, true], default: false }, // docs default
        seed: { min: 0, max: 2147483647, default: 0 }, // docs default
        input_urls: { type: "array", maxItems: 9, default: [] },
        color_palette: { type: "array", minItems: 3, maxItems: 10, default: null }, // omit from payload when null
        bbox_list: { type: "array", default: null }, // omit from payload when null
      },
    },
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

  // Remove <think> blocks so they don't interfere with loose parsing
  let textWithoutThink = t.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  try {
    return JSON.parse(textWithoutThink);
  } catch (e) { }

  const f = textWithoutThink.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (f) {
    try {
      return JSON.parse(f[1]);
    } catch (e) { }
  }
  const a = textWithoutThink.search(/[{\[]/),
    z = Math.max(textWithoutThink.lastIndexOf("}"), textWithoutThink.lastIndexOf("]"));
  if (a >= 0 && z > a) {
    try {
      return JSON.parse(textWithoutThink.slice(a, z + 1));
    } catch (e) { }
  }
  throw { code: "invalid_json", message: "reply had no valid JSON", text: t };
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      const s = res.status;
      if ([400, 401, 402, 403].includes(s)) {
        let m = "";
        try { const j = await res.json(); m = j.error?.message || ""; } catch (e) { }
        const c = (s === 401 || s === 403) ? "bad_key" : "upstream_error";
        throw { code: c, message: c === "bad_key" ? "API key rejected (" + s + "). Check the key and its credits." : m || "HTTP " + s };
      }

      if ([429, 500, 502, 503, 504, 529].includes(s)) {
        if (attempt >= maxRetries) {
          let m = "";
          try { const j = await res.json(); m = j.error?.message || ""; } catch (e) { }
          throw { code: s === 429 ? "rate_limited" : "upstream_error", message: m || "HTTP " + s };
        }
        let delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          const ra = parseInt(retryAfter, 10);
          if (!isNaN(ra)) delay = ra * 1000;
        }
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }

      let m = "";
      try { const j = await res.json(); m = j.error?.message || ""; } catch (e) { }
      throw { code: "upstream_error", message: m || "HTTP " + s };
    } catch (e) {
      if (e.name === "AbortError" || e.code === "cancelled") throw { code: "cancelled" };
      if (e.code) throw e;
      if (attempt >= maxRetries) {
        throw { code: "network", message: "could not reach API (check internet / blockers)" };
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt) + Math.random() * 1000));
      attempt++;
    }
  }
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

    const idle = typeof createIdleController === "function" ? createIdleController(120000, opts.signal) : { signal: opts.signal, reset: () => { }, clear: () => { } };
    const signal = idle.signal;

    let res;
    try {
      const isHighQuality = this.model.includes("5-5") || this.model.includes("3-7");
      const reqBody = {
        model: this.model,
        max_tokens: opts.max_tokens || (isHighQuality ? 128000 : 64000),
        stream: true,
        messages: [{ role: "user", content }],
      };

      if (isHighQuality) {
        if (opts.budget_tokens && this.model.includes("3-7")) {
          reqBody.thinking = { type: "enabled", budget_tokens: opts.budget_tokens };
        } else {
          reqBody.thinking = { type: "adaptive" };
          reqBody.max_tokens = Math.max(reqBody.max_tokens, 64000);
        }
        const effort = opts.effort || "high";
        reqBody.output_config = { effort: effort };
      }

      res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(reqBody),
      });
    } catch (e) {
      idle.clear();
      throw e;
    }

    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "", thinkingText = "", stop = "";
    let finalUsage = { input_tokens: 0, output_tokens: 0, thinking_tokens: 0 };
    try {
      for (; ;) {
        const { done, value } = await rd.read();
        idle.reset();
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

          if (ev.type === "message_start" && ev.message && ev.message.usage) {
            finalUsage.input_tokens = ev.message.usage.input_tokens || 0;
            console.log("[Anthropic] Token Usage (Start):", ev.message.usage);
          } else if (ev.type === "content_block_start" && ev.content_block && ev.content_block.type === "thinking") {
            thinkingText += "🤔 Model is thinking...\n";
            if (opts.onText) {
              const currentFullText = "<think>\n" + thinkingText + "\n</think>\n\n" + text;
              try { opts.onText({ text: currentFullText, delta: "" }); } catch (e) { }
            }
          } else if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") {
            text += ev.delta.text;
            if (opts.onText) {
              const currentFullText = (thinkingText ? "<think>\n" + thinkingText + "\n</think>\n\n" : "") + text;
              try { opts.onText({ text: currentFullText, delta: ev.delta.text }); } catch (e) { }
            }
          } else if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "thinking_delta") {
            thinkingText += ev.delta.thinking;
            if (opts.onText) {
              const currentFullText = "<think>\n" + thinkingText + "\n</think>\n\n" + text;
              try { opts.onText({ text: currentFullText, delta: "", thinkingDelta: ev.delta.thinking }); } catch (e) { }
            }
          } else if (ev.type === "message_delta") {
            if (ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
            if (ev.usage) {
              finalUsage.output_tokens = ev.usage.output_tokens || finalUsage.output_tokens;
              console.log("[Anthropic] Token Usage (Delta):", ev.usage);
              if (ev.usage.output_tokens_details && ev.usage.output_tokens_details.thinking_tokens !== undefined) {
                finalUsage.thinking_tokens = ev.usage.output_tokens_details.thinking_tokens;
                console.log("[Anthropic] Thinking Tokens:", ev.usage.output_tokens_details.thinking_tokens);
              }
            }
          } else if (ev.type === "error") {
            throw { code: "upstream_error", message: (ev.error && ev.error.message) || "stream error", text };
          }
        }
      }
    } catch (e) {
      idle.clear();
      if (e && e.name === "AbortError") throw { code: "cancelled", text };
      throw e;
    }
    idle.clear();
    const finalText = (thinkingText ? "<think>\n" + thinkingText + "\n</think>\n\n" : "") + text;
    if (!finalText.trim()) throw { code: "empty_completion", message: "The model returned an empty response. (The API may have timed out or stripped the content)" };
    return { text: finalText, truncated: stop === "max_tokens", usage: finalUsage, stopReason: stop };
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

    const idle = typeof createIdleController === "function" ? createIdleController(120000, opts.signal) : { signal: opts.signal, reset: () => { }, clear: () => { } };
    const signal = idle.signal;

    let res;
    try {
      const isReasoning = this.model.includes("gpt-6") || this.model.includes("o1") || this.model.includes("o3");
      const reqBody = {
        model: this.model,
        stream: true,
        messages: [{ role: "user", content }],
        max_completion_tokens: isReasoning ? 100000 : 64000,
        stream_options: { include_usage: true }
      };

      if (isReasoning) {
        reqBody.reasoning_effort = opts.effort || "high";
      }

      res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: signal,
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer " + this.key,
        },
        body: JSON.stringify(reqBody),
      });
    } catch (e) {
      idle.clear();
      throw e;
    }

    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "", reasoningText = "", stop = "";
    try {
      for (; ;) {
        const { done, value } = await rd.read();
        idle.reset();
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

          if (ev.usage) {
            console.log("[OpenAI] Token Usage:", ev.usage);
            if (ev.usage.completion_tokens_details && ev.usage.completion_tokens_details.reasoning_tokens !== undefined) {
              console.log("[OpenAI] Thinking Tokens:", ev.usage.completion_tokens_details.reasoning_tokens);
            }
          }
          if (ev.choices && ev.choices.length > 0) {
            const choice = ev.choices[0];
            let addedText = false;
            if (choice.delta && choice.delta.reasoning_content) {
              reasoningText += choice.delta.reasoning_content;
              addedText = true;
            }
            if (choice.delta && choice.delta.content) {
              text += choice.delta.content;
              addedText = true;
            }
            if (addedText && opts.onText) {
              const currentFullText = (reasoningText ? "<think>\n" + reasoningText + "\n</think>\n\n" : "") + text;
              try { opts.onText({ text: currentFullText, delta: choice.delta.content || "" }); } catch (e) { }
            }
            if (choice.finish_reason) stop = choice.finish_reason;
          }
        }
      }
    } catch (e) {
      idle.clear();
      if (e && e.name === "AbortError") throw { code: "cancelled", text };
      throw e;
    }
    idle.clear();
    const finalText = (reasoningText ? "<think>\n" + reasoningText + "\n</think>\n\n" : "") + text;
    if (!finalText.trim()) throw { code: "empty_completion", message: "The model returned an empty response. (The API may have timed out or stripped the content)" };
    return { text: finalText, truncated: stop === "length" };
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

class KieProvider extends AIProvider {
  async call(input, opts) {
    opts = opts || {};
    const signal = opts.signal;
    let taskId;
    try {
      const reqInput = { prompt: String(input) };
      
      if (opts.imageOpts) {
        Object.assign(reqInput, opts.imageOpts);
      } else {
        // Fallback for models without defined options
        reqInput.size = "1024x1024";
        reqInput.aspect_ratio = "1:1";
      }

      const res = await fetchWithRetry("https://api.kie.ai/api/v1/jobs/createTask", {
        method: "POST",
        signal: signal,
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer " + this.key,
        },
        body: JSON.stringify({
          model: this.model,
          input: reqInput
        }),
      });
      const data = await res.json();
      taskId = data.taskId || data.id || data.task_id || (data.data && data.data.taskId) || (data.data && data.data.id);
      if (!taskId) {
        if (data.data && data.data[0] && data.data[0].url) return { text: data.data[0].url, truncated: false };
        if (data.data && data.data.images && data.data.images[0] && data.data.images[0].url) return { text: data.data.images[0].url, truncated: false };
        throw { code: "upstream_error", message: "Kie API returned no task ID: " + JSON.stringify(data) };
      }
    } catch (e) {
      throw e;
    }

    while (true) {
      if (signal && signal.aborted) throw { code: "cancelled" };
      await new Promise(r => setTimeout(r, 4000));
      if (signal && signal.aborted) throw { code: "cancelled" };
      try {
        const pRes = await fetchWithRetry(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
          headers: { "Authorization": "Bearer " + this.key },
          signal: signal
        });
        const pData = await pRes.json();
        const record = pData.data || pData;
        const status = record.status || record.task_status || record.state;

        if (status === "completed" || status === "succeeded" || status === "SUCCESS" || status === "success") {
          const url = record.response?.resultUrls?.[0] || record.images?.[0]?.url || record.data?.[0]?.url || record.result?.images?.[0]?.url || record.imageUrl || (record.images && record.images[0]) || record.url;
          return { text: url, truncated: false };
        }
        if (status === "failed" || status === "FAILED" || status === "fail") {
          throw { code: "upstream_error", message: record.error?.message || record.failReason || "Kie task failed" };
        }
      } catch (e) {
        if (e.code === "cancelled") throw e;
        throw e;
      }
    }
  }
  limits() {
    return {
      maxPromptBytes: 20000,
      images: { maxCount: 0 }
    };
  }
}

function makeApiSample(providerName, key, model) {
  let provider;
  if (providerName === "openai") provider = new OpenAIProvider(key, model);
  else if (providerName === "kie") provider = new KieProvider(key, model);
  else provider = new AnthropicProvider(key, model);

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
    const kKie = lsG(AKEY_KIE);

    let conf = {};
    try { conf = JSON.parse(lsG(FEAT_CONF) || "{}"); } catch (e) { }

    const getP = (f) => (conf[f] && conf[f].p) || DEFPROV;
    const getM = (f, p) => (conf[f] && conf[f].m) || DEFMODEL[p];

    const mk = (f) => {
      const p = getP(f);
      const m = getM(f, p);
      const k = p === "anthropic" ? kAnt : p === "openai" ? kOpe : kKie;
      return k ? makeApiSample(p, k, m) : null;
    };

    sample = {
      autofill: mk("autofill"),
      checker: mk("checker"),
      enhance: mk("enhance"),
      runTxt: mk("runTxt"),
      runImg: mk("runImg")
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
