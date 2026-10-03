# Home Plan Prompt Builder - Agent Instructions

This file provides crucial context for AI agents (like Antigravity) working on the "Home Plan Prompt Builder" project. It outlines the project's architecture, technology stack, and specific rules to follow during development.

## 1. Project Overview
"Home Plan Prompt Builder" is a client-side vanilla web application. It takes user requirements (via text, PDF, images, or direct form inputs) and generates a structured, rule-based architect prompt. This prompt can then be copied into any AI (like Claude) to design a house plan. The app includes features to Auto-fill the form using AI, Check the form for conflicts, and Enhance the final prompt.

## 2. Technology Stack & Architecture
- **Vanilla Web Tech**: HTML5, CSS3, JavaScript (ES6+).
- **No Bundlers / No Modules**: The project does **NOT** use Webpack, Vite, Node.js backend, or ES Modules (`<script type="module">`). 
- **Global Scope**: All JavaScript files are loaded sequentially via standard `<script>` tags in `index.html`. 
  - Variables declared with `const` and `let` at the top level of any script are available to all subsequent scripts because they share the global declarative environment.
  - Functions are globally accessible.
  - **CRITICAL RULE**: Do not use `import` or `export` syntax.

## 3. JavaScript Execution Order
Scripts are loaded in `index.html` at the bottom of the `<body>` in a strict dependency order. If you add a new file, ensure it is placed in the correct sequence.

1. **`js/constants.js`**: Core data structures, form definitions (`Q`, `FQ`), and UI constants.
2. **`js/state.js`**: Global state object (`S`), initial state, and LocalStorage persistence logic.
3. **`js/utils.js`**: Shared helper functions (DOM escaping, math, parsing).
4. **`js/builder.js`**: Logic to build the final prompt string from the global `S` object.
5. **`js/ui.js`**: DOM manipulation, UI rendering (`render()`, `show()`), and event listeners for the main form.
6. **`js/ai/enhance.js`**: AI logic to rewrite and enhance the generated prompt for a specific plot.
7. **`js/ai/autofill-core.js`**: Core state patching and validation for the Auto-fill feature.
8. **`js/ai/autofill-files.js`**: Logic for reading and parsing user attachments (Images, text, PDFs).
9. **`js/ai/autofill-run.js`**: The main orchestration for the Auto-fill AI prompt.
10. **`js/ai/checker.js`**: AI logic that reads all answers and detects architectural conflicts.
11. **`js/ai/api.js`**: Handles raw API communication with Anthropic's Claude, streaming, and API key management.
12. **`js/main.js`**: Final initialization code.

## 4. Development Rules & Guidelines
- **State Management**: The form state is stored in the global `S` object. When updating values via code, ensure they are synced to LocalStorage (e.g., using `lsS(KEY, JSON.stringify(S))`) and call `render()` and `show()` to update the UI.
- **No Third-Party Libraries (except PDF.js)**: Everything is built from scratch. Do not add heavy libraries like React, jQuery, or Lodash. (PDF.js is loaded dynamically from a CDN when needed).
- **Styling**: All CSS is in `style.css`. It uses raw CSS variables for theming. Avoid inline styles unless absolutely necessary.
- **SOLID Principles**: Keep files focused. The AI logic was specifically split into multiple files inside `js/ai/` to maintain the Single Responsibility Principle. When adding new features, follow this pattern by creating modular, focused files and including them in `index.html`.
- **Handling AI Tool Calls**: When updating code, remember that `const` or `let` variables in an earlier script CANNOT be re-declared in a later script. They are meant to be shared lexically.
