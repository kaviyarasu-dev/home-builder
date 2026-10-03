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
  $("ks-open").textContent = lsG(AKEY)
    ? "🔑 API key (saved)"
    : "🔑 Claude API key";
}
$("ks-open").onclick = kOpen;
$("ks-x").onclick = kClose;
$("ks").addEventListener("click", (e) => {
  if (e.target === $("ks")) kClose();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("ks").classList.contains("on")) kClose();
});
$("ak-save").onclick = () => {
  const k = $("ak").value.trim(),
    m = $("am").value.trim() || DEFMODEL;
  if (!/^sk-ant-[\w-]{20,}$/.test(k)) {
    aks(
      "That does not look like an Anthropic API key (starts with sk-ant-).",
      "er",
    );
    return;
  }
  lsS(AKEY, k);
  lsS(MKEY, m);
  $("ak").value = "";
  $("ak").placeholder = "saved ••••" + k.slice(-4);
  aks("Saved in this browser only.", "ok");
  setupSample();
  setTimeout(kClose, 900);
};
$("ak-del").onclick = () => {
  try {
    localStorage.removeItem(AKEY);
  } catch (e) {}
  $("ak").value = "";
  $("ak").placeholder = "sk-ant-...";
  aks("Key removed.", "ok");
  setupSample();
};
(async () => {
  try {
    if (window.claude && claude.use) {
      sample = await claude.use("sample");
      platformSample = !!sample;
    }
  } catch (e) {
    sample = null;
    platformSample = false;
  }
  $("ks-open").style.display = platformSample ? "none" : "";
  $("am").value = lsG(MKEY) || DEFMODEL;
  const sk = lsG(AKEY);
  if (sk) $("ak").placeholder = "saved ••••" + sk.slice(-4);
  await setupSample();
})();
render();
show();


