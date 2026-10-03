# Home Plan Prompt Builder - Agent Instructions

This file provides crucial context for AI agents (like Antigravity) working on the "Home Plan Prompt Builder" project. It outlines the project's architecture, technology stack, and specific rules to follow during development.

## 1. Project Overview
"Home Plan Prompt Builder" is a client-side vanilla web application. It takes user requirements (via text, PDF, images, or direct form inputs) and generates a structured, rule-based architect prompt. This prompt can then be used to design a house plan.
**Key Features:**
- **Auto-fill**: AI-powered form filling from unstructured input or files.
- **Check**: AI review of the form for architectural conflicts.
- **Enhance**: AI refinement of the final prompt.
- **Automation Engine**: Automated pipeline to generate the base text report, extract image prompts, auto-generate images (via KIE.ai/OpenAI), and chat with the AI about the plan.
- **Multi-Provider**: Native support for Anthropic (Claude), OpenAI, and KIE.ai API keys.

## 2. Technology Stack & Architecture
- **Vanilla Web Tech**: HTML5, CSS3, JavaScript (ES6+).
- **No Bundlers / No Modules**: The project does **NOT** use Webpack, Vite, Node.js backend, or ES Modules (`<script type="module">`). 
- **Global Scope**: All JavaScript files are loaded sequentially via standard `<script>` tags in `index.html`. 
  - Variables declared with `const` and `let` at the top level of any script are available to all subsequent scripts because they share the global declarative environment.
  - Functions are globally accessible.
  - **CRITICAL RULE**: Do not use `import` or `export` syntax.
- **State Management**: Form state uses LocalStorage. The new Automation Engine uses an `IndexedDB` wrapper to persist pipeline runs, large JSON responses, and image Blobs, preventing data loss on reload.

## 3. JavaScript Execution Order
Scripts are loaded in `index.html` at the bottom of the `<body>` in a strict dependency order. If you add a new file, ensure it is placed in the correct sequence.

1. **`js/constants.js`**: Core data structures, form definitions (`Q`, `FQ`), and UI constants.
2. **`js/state.js`**: Global state object (`S`), initial state, and LocalStorage/IndexedDB persistence logic.
3. **`js/utils.js`**: Shared helper functions (DOM escaping, math, parsing, AbortController timeouts).
4. **`js/builder.js`**: Logic to build the final prompt string from the global `S` object.
5. **`js/ui.js`**: DOM manipulation, UI rendering (`render()`, `show()`), UI tab logic, and event listeners.
6. **`js/ai/enhance.js`**: AI logic to rewrite and enhance the generated prompt for a specific plot.
7. **`js/ai/autofill-core.js`**: Core state patching and validation for the Auto-fill feature.
8. **`js/ai/autofill-files.js`**: Logic for reading and parsing user attachments (Images, text, PDFs).
9. **`js/ai/autofill-run.js`**: The main orchestration for the Automation Engine and Auto-fill features.
10. **`js/ai/checker.js`**: AI logic that detects architectural conflicts.
11. **`js/ai/api.js`**: Handles multi-provider API communication, streaming, exponential backoff, KIE.ai async polling, and API key management.
12. **`js/main.js`**: Final initialization code.

*(Note: Automated verification tests run in `tests.html` using `js/test.js`, independent of the main app.)*

## 4. Development Rules & Guidelines
- **State Updates**: When updating values via code, ensure they are synced (e.g., using `lsS()` or IndexedDB wrappers) and call `render()`/`show()` to update the UI.
- **No Third-Party Libraries (except PDF.js)**: Everything is built from scratch. Do not add heavy libraries like React, jQuery, or Lodash. (PDF.js is loaded dynamically from a CDN when needed).
- **Styling**: All CSS is in `style.css`. It uses raw CSS variables for theming. Avoid inline styles unless absolutely necessary.
- **SOLID Principles**: Keep files focused. The AI logic is split into multiple files inside `js/ai/` to maintain the Single Responsibility Principle. When adding new features, follow this pattern.
- **Handling AI Tool Calls**: When updating code, remember that `const` or `let` variables in an earlier script CANNOT be re-declared in a later script. They are meant to be shared lexically.
- **Testing**: Before finalizing core API or state changes, run/write tests in `tests.html` to ensure resilience (e.g. truncation handling, backoff, invalid JSON parsing).
