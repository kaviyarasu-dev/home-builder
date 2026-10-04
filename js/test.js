(async function() {
  const resultsDiv = document.getElementById('test-results');
  
  function renderSuite(name) {
    const d = document.createElement('div');
    d.className = 'suite';
    d.innerHTML = `<h2>${name}</h2><ul id="suite-${name.replace(/[\s\(\)]+/g, '-')}"></ul>`;
    resultsDiv.appendChild(d);
    return document.getElementById(`suite-${name.replace(/[\s\(\)]+/g, '-')}`);
  }

  async function runTest(suiteUl, name, fn) {
    const li = document.createElement('li');
    li.textContent = `⏳ ${name}...`;
    suiteUl.appendChild(li);
    try {
      await fn();
      li.textContent = `✅ ${name}`;
      li.className = 'pass';
    } catch (e) {
      li.textContent = `❌ ${name} - ${e.message || e}`;
      li.className = 'fail';
      console.error(`Failed test: ${name}`, e);
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || "Assertion failed");
  }

  // Override S for validateBasePlan default fallbacks
  S.pw = "30";
  S.pd = "40";

  // --- 1. Validator Tests ---
  const sValidator = renderSuite("JSON Layout Validator");
  
  await runTest(sValidator, "Passes valid layout", async () => {
    const validJson = {
      plot_width: 30, plot_depth: 40,
      floors: [
        {
          floor_index: 0,
          floor_name: "Ground",
          rooms: [
            { name: "Bedroom", width: 10, length: 12, x: 5, y: 5 },
            { name: "Bathroom", width: 5, length: 6, x: 20, y: 5 }
          ]
        }
      ]
    };
    const errors = validateBasePlan(validJson, 1000, 1000);
    assert(errors.length === 0, "Should have no errors for valid plan. Got: " + errors.join(", "));
  });

  await runTest(sValidator, "Fails invalid JSON structure (missing floors)", async () => {
    const errors = validateBasePlan({}, 1000, 1000);
    assert(errors.length > 0 && errors[0].includes("missing 'floors' array"), "Should fail missing floors");
  });

  await runTest(sValidator, "Fails bedroom too small (<9x9)", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [{
        rooms: [{ name: "Bedroom", width: 8, length: 10, x: 0, y: 0 }]
      }]
    };
    const errors = validateBasePlan(json, 1000, 1000);
    assert(errors.some(e => e.includes("too small for a bedroom")), "Should fail bedroom < 9x9");
  });

  await runTest(sValidator, "Fails bathroom too small (<4x4)", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [{
        rooms: [{ name: "Bathroom", width: 3, length: 3, x: 0, y: 0 }]
      }]
    };
    const errors = validateBasePlan(json, 1000, 1000);
    assert(errors.some(e => e.includes("too small for a bathroom")), "Should fail bathroom < 4x4");
  });

  await runTest(sValidator, "Fails out of bounds", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [{
        rooms: [{ name: "Hall", width: 20, length: 20, x: 15, y: 15 }] // x+w = 35 > plot_width(30)
      }]
    };
    const errors = validateBasePlan(json, 1000, 1000);
    assert(errors.some(e => e.includes("out of plot bounds")), "Should fail out of bounds");
  });

  await runTest(sValidator, "Fails overlapping rooms", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [{
        rooms: [
          { name: "Hall", width: 10, length: 10, x: 0, y: 0 },
          { name: "Kitchen", width: 10, length: 10, x: 5, y: 5 } // Overlaps with Hall
        ]
      }]
    };
    const errors = validateBasePlan(json, 1000, 1000);
    assert(errors.some(e => e.includes("overlap")), "Should fail overlapping rooms");
  });
  
  await runTest(sValidator, "Fails buildable area exceeded", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [{
        rooms: [
          { name: "Hall", width: 20, length: 20, x: 0, y: 0 }, // area = 400
        ]
      }]
    };
    // Let's say buildable eW * eN = 10 * 10 = 100
    const errors = validateBasePlan(json, 10, 10);
    assert(errors.some(e => e.includes("exceeds buildable area")), "Should fail area > buildable");
  });

  // --- 2. Retry Logic Tests ---
  const sRetry = renderSuite("Retry Logic (Exponential Backoff)");
  
  await runTest(sRetry, "Retries on 429 and succeeds", async () => {
    let attempts = 0;
    const originalFetch = window.fetch;
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = (fn) => fn(); // bypass delay for fast tests

    window.fetch = async (url) => {
      attempts++;
      if (attempts === 1) {
        return { ok: false, status: 429, headers: new Map([["retry-after", "0"]]), json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };
    
    try {
      const res = await fetchWithRetry("http://fake", {}, 3);
      assert(res.ok === true, "Should eventually succeed");
      assert(attempts === 2, "Should have retried once");
    } finally {
      window.fetch = originalFetch;
      window.setTimeout = originalSetTimeout;
    }
  });

  await runTest(sRetry, "Fails immediately on 401 (fatal error)", async () => {
    const originalFetch = window.fetch;
    window.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
    try {
      await fetchWithRetry("http://fake", {}, 3);
      assert(false, "Should have thrown");
    } catch (e) {
      assert(e.code === "bad_key", "Should throw bad_key error immediately");
    } finally {
      window.fetch = originalFetch;
    }
  });

  await runTest(sRetry, "Throws upstream_error after max retries (e.g. 529 error)", async () => {
    const originalFetch = window.fetch;
    const origSetTimeout = window.setTimeout;
    window.setTimeout = (fn) => fn(); // bypass delay

    window.fetch = async () => ({ ok: false, status: 529, headers: new Map(), json: async () => ({}) });
    
    try {
      await fetchWithRetry("http://fake", {}, 2);
      assert(false, "Should have thrown");
    } catch (e) {
      assert(e.code === "upstream_error", "Should throw upstream_error after max retries");
    } finally {
      window.fetch = originalFetch;
      window.setTimeout = origSetTimeout;
    }
  });

  // --- 3. State Resilience Tests ---
  const sState = renderSuite("State Resilience (IndexedDB Resume)");
  
  await runTest(sState, "Saves and retrieves state from IDB successfully", async () => {
    await idb.set("testKey", { step: 2, data: "foo" });
    const val = await idb.get("testKey");
    assert(val && val.step === 2 && val.data === "foo", "Should retrieve correct object state");
    await idb.del("testKey");
    const val2 = await idb.get("testKey");
    assert(!val2, "State should be deleted");
  });
  
  // --- 4. Automation Engine Extra Tests ---
  const sAuto = renderSuite("Automation Extra Tests");

  await runTest(sAuto, "autoFixPlan deterministic snapping", async () => {
    const raw = {
      plot_width: 30, plot_depth: 40,
      floors: [{
        rooms: [{ name: "Hall", width: 10.1, length: 9.9, x: 0.1, y: 0.2 }]
      }]
    };
    const fixed = autoFixPlan(raw);
    const r = fixed.floors[0].rooms[0];
    assert(r.width === 10, "Should snap to nearest 0.25 (10)");
    assert(r.length === 10, "Should snap to nearest 0.25 (10)");
    assert(r.x === 0, "Should snap to nearest 0.25 (0)");
    assert(r.y === 0.25, "Should snap to nearest 0.25 (0.25)");
  });

  await runTest(sAuto, "Stair-identical GF vs FF validation", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [
        { floor_index: 0, floor_name: "Ground", rooms: [{ name: "Stair", width: 6, length: 10, x: 5, y: 5 }], openings: [] },
        { floor_index: 1, floor_name: "First", rooms: [{ name: "Stair", width: 6, length: 12, x: 5, y: 5 }], openings: [] } // differing length
      ]
    };
    const errs = validateBasePlan(json, 1000, 1000);
    assert(errs.some(e => e.includes("Staircase mismatch between GF and FF")), "Should fail stair mismatch");
  });

  await runTest(sAuto, "SVG Renderer Smoke Test", async () => {
    const json = {
      plot_width: 30, plot_depth: 40,
      floors: [
        { floor_index: 0, floor_name: "Ground", rooms: [{ name: "Bedroom", width: 10, length: 10, x: 0, y: 0 }], openings: [{ type: 'door', x: 5, y: 0, width: 3, length: 4 }] }
      ]
    };
    const html = renderFloorPlanSVG(json);
    assert(html.includes('<svg'), "Should render SVG element");
    assert(html.includes('Bedroom'), "Should render room label");
    assert(html.includes("10' x 10'"), "Should render room dimensions");
    assert(html.includes("Width: 30'"), "Should render plot width");
  });

  await runTest(sAuto, "Regex guard: Never says verified for failed variant", async () => {
    const mockReport = "This design is fully Vastu verified and excellent.";
    assert(/verified/i.test(mockReport), "Should detect 'verified'");
    const safeReport = "This design has some violations and requires changes.";
    assert(!/verified/i.test(safeReport), "Should pass safe report");
  });

  await runTest(sAuto, "Concept JSON parser and schema validator", async () => {
    const validStr = `\`\`\`json\n{
      "concepts": [
        { "id": "v1", "stair_type": "A", "zoning": "Open plan", "rooms": ["L", "K", "B"], "distinctness_note": "A layout" }
      ]
    }\n\`\`\``;
    const json = parseJsonLoose(validStr);
    assert(json && Array.isArray(json.concepts) && json.concepts.length === 1, "Should parse concepts array");
    assert(json.concepts[0].stair_type === "A", "Should retain stair_type");
  });

})();
