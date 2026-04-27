// ═══════════════════════════════════════════════════════════
//  script.js  –  CV Maker core logic
//  Responsibilities:
//    1. Manage dynamic entries (experience, education, etc.)
//    2. Collect all form data into a structured object
//    3. Render the template by replacing {{tokens}}
//    4. Debounce live updates → calls preview.js updatePreview()
// ═══════════════════════════════════════════════════════════

"use strict";

// ── Config ──────────────────────────────────────────────────
const TEMPLATES_DIR = "templates/";
const DEBOUNCE_MS = 300;

// ── State ───────────────────────────────────────────────────
let currentTemplate = "cv001"; // active template filename (no ext)
let templateHTML = ""; // raw HTML string of the loaded template

// ── Boot ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadTemplate(currentTemplate);
  bindStaticInputs();
  bindDynamicAddButtons();
  bindTemplatePicker();
  bindPreviewToggle();

  // Seed one entry per repeating section for better UX
  addEntry("experience");
  addEntry("education");
  addEntry("language");
  addEntry("certification");
});

// ═══════════════════════════════════════════════════════════
//  1. Template loading
// ═══════════════════════════════════════════════════════════

async function loadTemplate(name) {
  try {
    const res = await fetch(`${TEMPLATES_DIR}${name}.html`);
    if (!res.ok) throw new Error(`Template not found: ${name}`);
    templateHTML = await res.text();
    scheduleUpdate();
  } catch (err) {
    console.error("[CV Maker] loadTemplate:", err);
  }
}

// ═══════════════════════════════════════════════════════════
//  2. Data collection
// ═══════════════════════════════════════════════════════════

function collectData() {
  const data = {};

  // ── Scalar fields (data-token attribute) ─────────────────
  document.querySelectorAll("[data-token]").forEach((el) => {
    const key = el.dataset.token;
    data[key] = el.value.trim();
  });

  // ── Skills → arrays ──────────────────────────────────────
  data.skillsTechnical = splitComma(data.skillsTechnical);
  data.skillsTools = splitComma(data.skillsTools);
  data.interests = splitComma(data.interests);

  // ── Dynamic: Experience ───────────────────────────────────
  data.experience = collectEntries("experience", (entry) => ({
    role: val(entry, "role"),
    company: val(entry, "company"),
    location: val(entry, "location"),
    startDate: val(entry, "startDate"),
    endDate: val(entry, "endDate"),
    bullets: val(entry, "bullets")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  }));

  // ── Dynamic: Education ────────────────────────────────────
  data.education = collectEntries("education", (entry) => ({
    degree: val(entry, "degree"),
    school: val(entry, "school"),
    year: val(entry, "year"),
    detail: val(entry, "detail"),
  }));

  // ── Dynamic: Languages ────────────────────────────────────
  data.languages = collectEntries("language", (entry) => {
    const level = Math.min(5, Math.max(1, parseInt(val(entry, "level")) || 3));
    return {
      name: val(entry, "name"),
      level,
      // Pre-build dot classes for the template (l1…l5)
      l1: level >= 1 ? "on" : "",
      l2: level >= 2 ? "on" : "",
      l3: level >= 3 ? "on" : "",
      l4: level >= 4 ? "on" : "",
      l5: level >= 5 ? "on" : "",
    };
  });

  // ── Dynamic: Certifications ───────────────────────────────
  data.certifications = collectEntries("certification", (entry) => ({
    name: val(entry, "name"),
    year: val(entry, "year"),
  }));

  return data;
}

// ── Helpers ──────────────────────────────────────────────────
function val(parent, name) {
  const el = parent.querySelector(`[name="${name}"]`);
  return el ? el.value.trim() : "";
}

function splitComma(str = "") {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function collectEntries(type, mapper) {
  const container = document.getElementById(`${type}-entries`);
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(`.dyn-entry[data-type="${type}"]`),
  ).map(mapper);
}

// ═══════════════════════════════════════════════════════════
//  3. Token replacement  (Mustache-style, no dependency)
// ═══════════════════════════════════════════════════════════

function renderTemplate(html, data) {
  let out = html;

  // ── Array blocks  {{#key}} ... {{/key}} ──────────────────
  out = out.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, inner) => {
      const items = data[key];
      if (!Array.isArray(items) || items.length === 0) return "";

      return items
        .map((item) => {
          let block = inner;

          // Nested array blocks inside an item (e.g. bullets)
          block = block.replace(
            /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
            (__, k2, inner2) => {
              const sub = item[k2];
              if (!Array.isArray(sub) || sub.length === 0) return "";
              return sub
                .map((s) => inner2.replace(/\{\{\.\}\}/g, escapeHtml(s)))
                .join("");
            },
          );

          // Scalar tokens inside item  {{role}}, {{company}} …
          block = block.replace(/\{\{(\w+)\}\}/g, (__, k) => {
            const v = item[k];
            return v !== undefined ? escapeHtml(String(v)) : "";
          });

          return block;
        })
        .join("");
    },
  );

  // ── Scalar tokens  {{key}} ───────────────────────────────
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.map(escapeHtml).join(", ");
    return escapeHtml(String(v));
  });

  return out;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════
//  4. Scheduled update  (debounced)
// ═══════════════════════════════════════════════════════════

let _debounceTimer = null;

function scheduleUpdate() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    const data = collectData();
    const rendered = renderTemplate(templateHTML, data);
    updatePreview(rendered); // defined in preview.js
  }, DEBOUNCE_MS);
}

// ═══════════════════════════════════════════════════════════
//  5. Dynamic entry management
// ═══════════════════════════════════════════════════════════

function addEntry(type) {
  const tpl = document.getElementById(`tpl-${type}`);
  const container = document.getElementById(`${type}-entries`);
  if (!tpl || !container) return;

  const clone = tpl.content.cloneNode(true);
  const entry = clone.querySelector(".dyn-entry");

  // Update title with entry number
  const count = container.querySelectorAll(".dyn-entry").length + 1;
  const titleEl = entry.querySelector(".dyn-entry__title");
  if (titleEl) titleEl.textContent = `${capitalize(type)} ${count}`;

  // Remove button
  entry.querySelector(".dyn-entry__remove").addEventListener("click", () => {
    entry.remove();
    renumberEntries(type);
    scheduleUpdate();
  });

  // Live update on any input change
  entry.addEventListener("input", scheduleUpdate);

  container.appendChild(entry);
}

function renumberEntries(type) {
  const container = document.getElementById(`${type}-entries`);
  if (!container) return;
  container.querySelectorAll(".dyn-entry").forEach((el, i) => {
    const titleEl = el.querySelector(".dyn-entry__title");
    if (titleEl) titleEl.textContent = `${capitalize(type)} ${i + 1}`;
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ═══════════════════════════════════════════════════════════
//  6. Event bindings
// ═══════════════════════════════════════════════════════════

function bindStaticInputs() {
  document.querySelectorAll("[data-token]").forEach((el) => {
    el.addEventListener("input", scheduleUpdate);
  });
}

function bindDynamicAddButtons() {
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      addEntry(btn.dataset.add);
      scheduleUpdate();
    });
  });
}

function bindTemplatePicker() {
  document.getElementById("template-picker")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".tpl-btn");
    if (!btn) return;

    document
      .querySelectorAll(".tpl-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    currentTemplate = btn.dataset.tpl;
    loadTemplate(currentTemplate);
  });
}

function bindPreviewToggle() {
  document
    .getElementById("btn-preview-toggle")
    ?.addEventListener("click", () => {
      document.querySelector(".workspace").classList.toggle("preview-only");
    });
}

// ── Expose for other modules ─────────────────────────────────
window.CVMaker = {
  collectData,
  renderTemplate,
  scheduleUpdate,
  currentTemplate: () => currentTemplate,
};
