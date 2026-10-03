// ---- files ----
function loadPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return (
    pdfP ||
    (pdfP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = PDFB + "pdf.min.js";
      s.onload = () => {
        const L = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
        if (!L) {
          rej(new Error("PDF reader did not start"));
          return;
        }
        L.GlobalWorkerOptions.workerSrc = PDFB + "pdf.worker.min.js";
        res(L);
      };
      s.onerror = () => rej(new Error("PDF reader could not be loaded"));
      document.head.appendChild(s);
    }).catch((e) => {
      pdfP = null;
      throw e;
    }))
  );
}
async function pdfPage(doc, n, maxSide) {
  const p = await doc.getPage(n),
    v1 = p.getViewport({ scale: 1 }),
    sc = Math.min(4, maxSide / Math.max(v1.width, v1.height)),
    v = p.getViewport({ scale: sc });
  const c = document.createElement("canvas");
  c.width = Math.ceil(v.width);
  c.height = Math.ceil(v.height);
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  await withTimeout(
    p.render({ canvasContext: x, viewport: v }).promise,
    40000,
    "PDF page took too long to draw",
  );
  return c;
}
async function pdfText(doc, n) {
  const p = await doc.getPage(n),
    tc = await p.getTextContent();
  return tc.items
    .map((i) => i.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
const blobOf = (c, t, qu) =>
  new Promise((res, rej) =>
    c.toBlob(
      (b) => (b ? res(b) : rej(new Error("could not encode image"))),
      t || "image/png",
      qu || 0.92,
    ),
  );
const readURL = (b) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
async function decode(b) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(b);
    } catch (e) {}
  }
  const u = await readURL(b);
  return await withTimeout(
    new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () =>
        rej(new Error("cannot decode this image; use JPG or PNG"));
      i.src = u;
    }),
    8000,
    "cannot decode this image; use JPG or PNG",
  );
}
function drawTo(img, maxSide) {
  const w = img.width || img.naturalWidth,
    h = img.height || img.naturalHeight,
    sc = Math.min(1, maxSide / Math.max(w, h)),
    c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * sc));
  c.height = Math.max(1, Math.round(h * sc));
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
async function reencode(f, lim) {
  const img = await decode(f);
  let b = await blobOf(drawTo(img, 3000), "image/png");
  if (b.size > lim.maxInputBytes)
    b = await blobOf(drawTo(img, 3000), "image/jpeg", 0.9);
  return b;
}
async function thumbOf(b) {
  try {
    const img = await decode(b);
    return drawTo(img, 76).toDataURL("image/jpeg", 0.7);
  } catch (e) {
    return "";
  }
}
async function addOne(f) {
  if (FILES.length >= 12) throw new Error("at most 12 files");
  const nm = f.name || "pasted-image",
    ty = (f.type || "").toLowerCase(),
    ext = (nm.split(".").pop() || "").toLowerCase(),
    id = ++fid;
  if (ty === "application/pdf" || ext === "pdf") {
    const L = await loadPdfjs(),
      buf = await f.arrayBuffer();
    const doc = await withTimeout(
      L.getDocument({ data: new Uint8Array(buf), isEvalSupported: false })
        .promise,
      30000,
      "PDF took too long to open",
    );
    let th = "";
    try {
      th = (await pdfPage(doc, 1, 120)).toDataURL("image/jpeg", 0.7);
    } catch (e) {}
    FILES.push({
      id,
      name: nm,
      kind: "pdf",
      doc,
      pages: doc.numPages,
      thumb: th,
    });
    return;
  }
  if (
    ty.startsWith("image/") ||
    /^(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/.test(ext)
  ) {
    const im = LIM && LIM.images;
    let blob = f;
    if (im) {
      if (!(im.mediaTypes.includes(ty) && f.size <= im.maxInputBytes))
        blob = await reencode(f, im);
    } else {
      try {
        blob = await reencode(f, { maxInputBytes: 3500000 });
      } catch (e) {
        blob = f;
      }
    }
    FILES.push({
      id,
      name: nm,
      kind: "image",
      blob,
      thumb: await thumbOf(blob),
    });
    return;
  }
  if (ty.startsWith("text/") || /^(txt|md|csv|json)$/.test(ext)) {
    const t = await f.text();
    FILES.push({
      id,
      name: nm,
      kind: "text",
      text: t.slice(0, 20000),
      chars: t.length,
    });
    return;
  }
  throw new Error(
    "unsupported file type (use image, PDF or text; export CAD / DWG as PDF or PNG)",
  );
}
async function addFiles(list) {
  afMsg("Reading file(s)…");
  for (const f of [...list]) {
    try {
      await addOne(f);
    } catch (e) {
      afMsg(
        "Could not add " +
          (f.name || "file") +
          ": " +
          ((e && e.message) || "unknown error"),
        "er",
      );
      continue;
    }
    afMsg("");
  }
  drawChips();
  updGo();
}
function drawChips() {
  fch.innerHTML = FILES.map(
    (f) =>
      `<div class="fc">${f.thumb ? `<img alt="" src="${f.thumb}">` : `<div class="ic">${f.kind === "pdf" ? "📄" : f.kind === "text" ? "📝" : "🖼"}</div>`}<div style="min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:190px">${esc(f.name)}</div><div style="color:var(--mu)">${f.kind === "pdf" ? "PDF · " + f.pages + " page" + (f.pages > 1 ? "s" : "") : f.kind === "text" ? "text · " + f.chars + " chars" : "image"}</div></div><button class="x" data-rm="${f.id}" aria-label="Remove">✕</button></div>`,
  ).join("");
}
fch.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-rm]");
  if (!b) return;
  FILES = FILES.filter((f) => String(f.id) !== b.dataset.rm);
  drawChips();
  updGo();
});
[fi, fp].forEach((inp) => {
  inp.onchange = () => {
    const l = [...inp.files];
    inp.value = "";
    if (l.length) addFiles(l);
  };
});
dz.ondragover = (e) => {
  e.preventDefault();
  dz.classList.add("on");
};
dz.ondragleave = () => dz.classList.remove("on");
dz.ondrop = (e) => {
  e.preventDefault();
  dz.classList.remove("on");
  addFiles(e.dataTransfer.files);
};
document.addEventListener("paste", (e) => {
  const fs = [...((e.clipboardData && e.clipboardData.files) || [])];
  if (fs.length) {
    e.preventDefault();
    $("af-d").open = true;
    addFiles(fs);
  }
});
rq.value = lsG(RKEY) || "";
rq.addEventListener("input", () => {
  lsS(RKEY, rq.value);
  updGo();
});
function tryJson(t) {
  t = String(t || "").trim();
  if (!t) return null;
  const a = t.indexOf("{"),
    b = t.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try {
    const o = JSON.parse(t.slice(a, b + 1));
    return o && typeof o === "object" && Array.isArray(o.changes) ? o : null;
  } catch (e) {
    return null;
  }
}
function updGo() {
  go.disabled =
    !afCtl &&
    !(
      tryJson(rq.value) ||
      FILES.some((f) => f.kind === "image") ||
      (sample && (rq.value.trim() || FILES.length))
    );
}
async function copyText(t) {
  try {
    if (navigator.clipboard && window.isSecureContext)
      await navigator.clipboard.writeText(t);
    else {
      const a = document.createElement("textarea");
      a.value = t;
      document.body.appendChild(a);
      a.select();
      document.execCommand("copy");
      a.remove();
    }
    return true;
  } catch (e) {
    return false;
  }
}
$("af-cc").onclick = async () => {
  const t =
    afPrompt(rq.value.trim(), {
      labels: ["(the files attached to this chat message)"],
      texts: [],
    }) +
    "\n\nThe files are attached to this message. Read the dimensions and details from them. Do not ask me anything; use the most likely reading and list doubts in notes. Reply with the JSON only.";
  const ok = await copyText(t);
  afMsg(
    ok
      ? "Prompt copied. Paste it in a Claude chat with your files."
      : "Could not copy automatically on this device.",
    ok ? "ok" : "er",
  );
};
// ---- prepare files for the call ----
async function prepare(signal, noImg) {
  const chk = () => {
    if (signal.aborted) throw { code: "cancelled" };
  };
  const imgs = FILES.filter((f) => f.kind === "image"),
    max = noImg
      ? 0
      : LIM && LIM.images
        ? LIM.images.maxCount
        : LIM
          ? 0
          : imgs.length
            ? 4
            : 0,
    pdfs = FILES.filter((f) => f.kind === "pdf");
  const blobs = [],
    labels = [],
    texts = [],
    notes = [];
  let left = max;
  for (const f of imgs) {
    if (left <= 0) {
      notes.push(
        max
          ? "Image limit reached: " + f.name + " was not sent."
          : "Image skipped (this view cannot send images): " +
              f.name +
              ". Use “Copy prompt for Claude chat” to have images read.",
      );
      continue;
    }
    blobs.push(f.blob);
    labels.push(
      `image ${blobs.length}: ${f.name} (photo / screenshot / drawing)`,
    );
    left--;
  }
  for (const f of FILES.filter((x) => x.kind === "text"))
    texts.push(`[${f.name}]\n${f.text}`);
  let tot = 0;
  for (const f of pdfs) {
    chk();
    try {
      let t = "";
      for (let p = 1; p <= Math.min(f.pages, 10); p++) {
        const x = await pdfText(f.doc, p);
        if (x) t += `(page ${p}) ${x}\n`;
      }
      t = t.slice(0, 8000);
      if (t && tot < 20000) {
        texts.push(`[${f.name} – text layer of the PDF]\n${t}`);
        tot += t.length;
      }
    } catch (e) {}
    if (!max) {
      notes.push(
        f.name +
          ": this view cannot send images, so only the PDF's text was used.",
      );
      continue;
    }
    const n = Math.min(f.pages, left);
    if (n < f.pages)
      notes.push(
        `${f.name}: only the first ${n} of ${f.pages} pages were sent (image limit).`,
      );
    for (let p = 1; p <= n; p++) {
      chk();
      try {
        const b = await blobOf(await pdfPage(f.doc, p, 1600));
        blobs.push(b);
        labels.push(
          `image ${blobs.length}: ${f.name}, page ${p} of ${f.pages} (rendered PDF page)`,
        );
        left--;
      } catch (e) {
        notes.push(
          `${f.name} page ${p} could not be drawn: ${(e && e.message) || "error"}`,
        );
      }
    }
  }
  return { blobs, labels, texts, notes };
}