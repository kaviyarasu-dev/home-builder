const kOpen = () => {
    $("ks").classList.add("on");
    setTimeout(() => {
      try {
        $("ak").focus();
      } catch (e) {}
    }, 0);
  },
  kClose = () => {
    $("ks").classList.remove("on");
  };
function updKeyBtn() {
  $("ks-open").textContent = (lsG(AKEY_ANT) || lsG(AKEY_OPE) || lsG(AKEY_KIE))
    ? "🔑 API key (saved)"
    : "🔑 AI API key";
}
$("ks-open").onclick = kOpen;
$("ks-x").onclick = kClose;
$("ks").addEventListener("click", (e) => {
  if (e.target === $("ks")) kClose();
});

const pOpen = () => {
    $("prompt-modal").classList.add("on");
  },
  pClose = () => {
    $("prompt-modal").classList.remove("on");
  };

$("vp").onclick = pOpen;
$("pm-x").onclick = pClose;
$("prompt-modal").addEventListener("click", (e) => {
  if (e.target === $("prompt-modal")) pClose();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("ks").classList.contains("on")) kClose();
    if ($("prompt-modal").classList.contains("on")) pClose();
  }
});
function populateModels(provider, selectedModel, selectElement) {
  selectElement.innerHTML = "";
  const models = MODELS[provider] || [];
  models.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id || m;
    opt.textContent = m.name || m;
    if ((m.id || m) === selectedModel) opt.selected = true;
    selectElement.appendChild(opt);
  });
  if (!models.find(m => (m.id || m) === selectedModel)) {
    selectElement.value = models[0].id || models[0];
  }
}

function saveFeatConf() {
  const conf = {
    autofill: { p: $("prov-af").value, m: $("mod-af").value },
    checker: { p: $("prov-ck").value, m: $("mod-ck").value },
    enhance: { p: $("prov-en").value, m: $("mod-en").value },
    runTxt: { p: $("prov-run-txt").value, m: $("mod-run-txt").value },
    runImg: { p: $("prov-run-img").value, m: $("mod-run-img").value }
  };
  lsS(FEAT_CONF, JSON.stringify(conf));
  setupSample();
}

["af", "ck", "en", "run-txt", "run-img"].forEach(f => {
  $(`prov-${f}`).onchange = () => {
    const p = $(`prov-${f}`).value;
    populateModels(p, DEFMODEL[p], $(`mod-${f}`));
    saveFeatConf();
  };
  $(`mod-${f}`).onchange = saveFeatConf;
});

const saveKey = (provider, keyVal, inputId, keyName) => {
  const k = keyVal.trim();
  if (!k) return;
  if (provider === "anthropic" && !/^sk-ant-[\w-]{20,}$/.test(k)) {
    aks("That does not look like an Anthropic API key (starts with sk-ant-).", "er");
    return;
  }
  if (provider === "openai" && !/^sk-[\w-]{20,}$/.test(k)) {
    aks("That does not look like an OpenAI API key (starts with sk-...).", "er");
    return;
  }
  lsS(keyName, k);
  $(inputId).value = "";
  $(inputId).placeholder = "saved ••••" + k.slice(-4);
  aks(`${provider === "anthropic" ? "Claude" : "OpenAI"} key saved.`, "ok");
  setupSample();
};

$("ak-save-ant").onclick = () => saveKey("anthropic", $("ak-ant").value, "ak-ant", AKEY_ANT);
$("ak-save-ope").onclick = () => saveKey("openai", $("ak-ope").value, "ak-ope", AKEY_OPE);
$("ak-save-kie").onclick = () => saveKey("kie", $("ak-kie").value, "ak-kie", AKEY_KIE);

const delKey = (keyName, inputId, defaultPlaceholder) => {
  try { localStorage.removeItem(keyName); } catch (e) {}
  $(inputId).value = "";
  $(inputId).placeholder = defaultPlaceholder;
  aks("Key removed.", "ok");
  setupSample();
};

$("ak-del-ant").onclick = () => delKey(AKEY_ANT, "ak-ant", "sk-ant-...");
$("ak-del-ope").onclick = () => delKey(AKEY_OPE, "ak-ope", "sk-proj-...");
$("ak-del-kie").onclick = () => delKey(AKEY_KIE, "ak-kie", "sk-kie-...");

(async () => {
  try {
    if (window.claude && claude.use) {
      const s = await claude.use("sample");
      sample = { autofill: s, checker: s, enhance: s };
      platformSample = !!s;
    }
  } catch (e) {
    sample = { autofill: null, checker: null, enhance: null };
    platformSample = false;
  }
  $("ks-open").style.display = platformSample ? "none" : "";

  let conf = {};
  try { conf = JSON.parse(lsG(FEAT_CONF) || "{}"); } catch(e){}

  ["af", "ck", "en", "run-txt", "run-img"].forEach(f => {
    const fn = f === "af" ? "autofill" : f === "ck" ? "checker" : f === "run-txt" ? "runTxt" : f === "run-img" ? "runImg" : "enhance";
    const p = (conf[fn] && conf[fn].p) || DEFPROV;
    const m = (conf[fn] && conf[fn].m) || DEFMODEL[p];
    $(`prov-${f}`).value = p;
    populateModels(p, m, $(`mod-${f}`));
  });

  const skAnt = lsG(AKEY_ANT);
  if (skAnt) $("ak-ant").placeholder = "saved ••••" + skAnt.slice(-4);
  const skOpe = lsG(AKEY_OPE);
  if (skOpe) $("ak-ope").placeholder = "saved ••••" + skOpe.slice(-4);
  const skKie = lsG(AKEY_KIE);
  if (skKie) $("ak-kie").placeholder = "saved ••••" + skKie.slice(-4);

  await setupSample();
})();
render();
show();


