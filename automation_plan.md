## Goal Description
Automate the manual process of executing the architect prompt and generating images. The automation will transition from a single monolithic prompt execution to a resilient, multi-step pipeline (Base Plan → Floors → Image Prompts → Image Generation). This ensures we stay within token limits, provide faster feedback to the user, and handle failures gracefully.

## User Review Required
> [!IMPORTANT]
> **API Key Setup for kie.ai:** The image generation will use `kie.ai`. The user will need to input their `kie.ai` API key into a dedicated "KIE API Key" field in the settings modal. 
> *Browser-side API keys carry risks.* We will document this risk in the README. The base URLs for API providers (Anthropic, kie.ai) will be configurable so a thin proxy (e.g., Cloudflare Worker / Vercel Edge) can be added later without code changes if live-testing shows API or image CORS is blocked.

> [!WARNING]
> **Storage & State Persistence:** We will persist state per-step in a lightweight `IndexedDB` wrapper (e.g., `step`, `status`, `output`, `attempts`, `usage`). This enables resuming unfinished runs on page load/refresh. Images will be fetched as Blobs and saved to IndexedDB if successful; if CORS blocks the fetch, we will store the URL, flag it as 'may expire', and display it via `<img src>` without failing the pipeline.

---

## Phased Execution Plan
*This plan is divided into 6 manageable parts. Execute them one by one in separate conversations to ensure stability.*

### Part 1: UI & Configuration Setup
**Focus:** Updating the HTML and UI logic to support the new automation features.
**Files to Modify:** `index.html`, `js/ui.js`
**Tasks:**
- **HTML:** Add `kie.ai` models to the Image AI dropdown using exact kie.ai model IDs.
- **HTML:** Add a new input field for the KIE API Key in the settings modal.
- **HTML:** Add an "Abort / Cancel" button to stop the automation run.
- **HTML:** Display an estimated cost / calls count when starting a run.
- **JS:** Initialize dropdowns with exact `kie.ai` IDs.
- **JS:** Wire up the start (`run-go`) and new Cancel buttons.
- **JS:** Dynamically update the `run-st` div with current active step and retry attempts.
- **JS:** Render generated images in the `run-img-grid` via `<img src>` as they complete.
- **JS:** Provide a "Retry this image" button for individual failed images.
- **JS:** Show clear UI messages for fatal API errors (401, 402, 403).

### Part 2: State Management & Storage
**Focus:** Setting up robust local storage and timeout utilities.
**Files to Modify:** `js/utils.js`
**Tasks:**
- Add a lightweight `IndexedDB` wrapper for storing pipeline state, JSON responses, and Blobs to bypass LocalStorage limits.
- Add an `AbortController` based idle timeout function for the fetch streams. The idle timer will reset on every chunk received or on Keepalive/ping events.

### Part 3: Core API Client Enhancements
**Focus:** Upgrading the API client to handle KIE.ai, streaming, and robust error handling.
**Files to Modify:** `js/ai/api.js`
**Tasks:**
- Implement `AbortController` for cancellation and idle timeouts (120-180s for reasoning models).
- Add KIE.ai Support (`submitTask()` and `pollTask()`) since it uses an async task system. Polling will occur every 3-5s.
- Implement exponential backoff with random jitter for `429`, `5xx`, `529` errors and respect `retry-after`.
- Treat `400`, `401`, `402`, and `403` as fatal errors that halt the pipeline.
- Handle truncation detection for both OpenAI and Anthropic shapes.
- Implement prompt caching logic (token count logging).
- Pass a shared `AbortSignal` to all fetch calls so the entire pipeline can be halted instantly.

### Part 4: Automation Engine & Base Plan
**Focus:** Building the core orchestration and the first layout generation step.
**Files to Modify:** `js/ai/autofill-run.js`
**Tasks:**
- **State & Resume:** On page load, check IndexedDB for an unfinished run. If found, display a "Resume" button.
- **Step 1: Base Plan**: Implement strict JSON layout validation (room min sizes, inside plot bounds, no overlaps, per-floor area <= buildable area).
- Use a schema validator (Zod/Ajv style) and the provider's JSON-schema mode.
- If invalid, append the validation error to the prompt and retry (max 2 times).

### Part 5: Parallel Task Execution & Images
**Focus:** Implementing the parallel processing steps for floors and images.
**Files to Modify:** `js/ai/autofill-run.js`
**Tasks:**
- **Step 2: Floors (Parallel):** Map over the floors in the Base JSON.
- **Step 3: Image Prompts (Parallel):** Perform one API call per image in parallel (short prompts) using a shared style block prefix.
- **Step 4: Image Generation:** Uses the `kie.ai` async task API. Execute image generation in parallel with a strict concurrency limit. Individual image failures will not fail the whole run.

### Part 6: Verification & Testing
**Focus:** Testing the pipeline resilience and validation independently.
**Files to Create:** `tests.html`, `js/test.js`
**Tasks:**
- **Validator Tests:** Ensure the JSON layout validator correctly passes valid layouts and fails invalid ones.
- **Retry Logic:** Simulate API errors, network failures, and truncation to test exponential backoff.
- **State Resilience:** Simulate a tab kill and verify the "Resume" flow correctly picks up from the last saved step in IndexedDB.
