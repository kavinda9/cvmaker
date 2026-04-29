// ═══════════════════════════════════════════════════════════
//  script.js  –  CV Maker core logic
// ═══════════════════════════════════════════════════════════

"use strict";

const TEMPLATES_DIR = "templates/";
const DEBOUNCE_MS = 300;

let currentTemplate = "cv001";
let templateHTML = "";
let photoDataURL = ""; // base64 photo

// ── Boot ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadTemplate(currentTemplate);
  bindStaticInputs();
  bindDynamicAddButtons();
  bindTemplatePicker();
  bindPreviewToggle();
  bindPhotoUpload();

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
    const url = `${TEMPLATES_DIR}${name}.html`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        `[CV Maker] loadTemplate fetch failed: ${res.status} ${res.statusText} for ${url}`,
      );
      throw new Error(`Template not found: ${name}`);
    }

    templateHTML = await res.text();

    if (!templateHTML.trim()) {
      console.warn(`[CV Maker] Loaded template is empty: ${url}`);
      updatePreview(
        '<body style="padding:40px;font-family:sans-serif;color:#666;"><h2>Template is empty</h2><p>The template file exists but is empty.</p></body>',
      );
      return;
    }

    // Force initial render after template loads
    setTimeout(() => {
      scheduleUpdate();
    }, 100);
  } catch (err) {
    console.error("[CV Maker] loadTemplate failed:", err);
    // Fallback message
    const fallbackHTML = `<body style="padding:40px;font-family:sans-serif;color:#666;">
      <h2>Failed to load template \"${name}\"</h2>
      <p>Please check that <strong>templates/${name}.html</strong> exists and is accessible.</p>
    </body>`;
    updatePreview(fallbackHTML);
  }
}

// ═══════════════════════════════════════════════════════════
//  2. Data collection
// ═══════════════════════════════════════════════════════════

function collectData() {
  const data = {};

  document.querySelectorAll("[data-token]").forEach((el) => {
    data[el.dataset.token] = el.value.trim();
  });

  data.skillsTechnical = splitComma(data.skillsTechnical);
  data.skillsTools = splitComma(data.skillsTools);
  data.interests = splitComma(data.interests);

  // Photo
  data.photo = photoDataURL || "";

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

  data.education = collectEntries("education", (entry) => ({
    degree: val(entry, "degree"),
    school: val(entry, "school"),
    year: val(entry, "year"),
    detail: val(entry, "detail"),
  }));

  data.languages = collectEntries("language", (entry) => {
    const level = Math.min(5, Math.max(1, parseInt(val(entry, "level")) || 3));
    return {
      name: val(entry, "name"),
      level,
      l1: level >= 1 ? "on" : "",
      l2: level >= 2 ? "on" : "",
      l3: level >= 3 ? "on" : "",
      l4: level >= 4 ? "on" : "",
      l5: level >= 5 ? "on" : "",
    };
  });

  data.certifications = collectEntries("certification", (entry) => ({
    name: val(entry, "name"),
    year: val(entry, "year"),
  }));

  return data;
}

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
//  3. Token replacement
//     Supports:
//       {{key}}            – scalar
//       {{#key}}...{{/key}} – array loop OR scalar conditional
//       {{#arr}}{{#nested}}...{{/nested}}{{/arr}} – nested arrays
//       {{.}}              – current item in array
// ═══════════════════════════════════════════════════════════

function renderTemplate(html, data) {
  let out = html;

  // ── Block tags: arrays AND scalar conditionals ───────────
  out = out.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, inner) => {
      const val = data[key];

      // Array: repeat block per item
      if (Array.isArray(val)) {
        if (val.length === 0) return "";
        return val.map((item) => renderBlock(inner, item, data)).join("");
      }

      // Scalar conditional: render block once if truthy, skip if falsy
      if (val) {
        // Replace {{key}} inside with the scalar value
        return inner.replace(/\{\{(\w+)\}\}/g, (__, k) => {
          const v = data[k];
          if (v === undefined || v === null) return "";
          if (Array.isArray(v)) return v.map(escapeHtml).join(", ");
          return escapeHtml(String(v));
        });
      }

      return "";
    },
  );

  // ── Remaining scalar tokens ──────────────────────────────
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    if (v === undefined || v === null) return "";
    if (Array.isArray(v)) return v.map(escapeHtml).join(", ");
    // Don't escape photo (it's a data URL used in src="")
    if (key === "photo") return String(v);
    return escapeHtml(String(v));
  });

  return out;
}

function renderBlock(inner, item, rootData) {
  let block = inner;

  // Nested array blocks inside item (e.g. {{#bullets}}...{{/bullets}})
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

  // Scalar tokens from item
  block = block.replace(/\{\{(\w+)\}\}/g, (__, k) => {
    const v =
      item[k] !== undefined
        ? item[k]
        : rootData[k] !== undefined
          ? rootData[k]
          : "";
    if (Array.isArray(v)) return v.map(escapeHtml).join(", ");
    return escapeHtml(String(v));
  });

  return block;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════
//  4. Scheduled update (debounced)
// ═══════════════════════════════════════════════════════════

let _debounceTimer = null;

function scheduleUpdate() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    const data = collectData();
    let rendered = "";
    if (templateHTML && templateHTML.trim()) {
      rendered = renderTemplate(templateHTML, data);
    } else {
      rendered = `<body style=\"padding:40px;font-family:sans-serif;color:#666;\"><h2>Nothing to preview</h2><p>The template is empty or not loaded yet.</p></body>`;
    }
    updatePreview(rendered);
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

  const count = container.querySelectorAll(".dyn-entry").length + 1;
  const titleEl = entry.querySelector(".dyn-entry__title");
  if (titleEl) titleEl.textContent = `${capitalize(type)} ${count}`;

  entry.querySelector(".dyn-entry__remove").addEventListener("click", () => {
    entry.remove();
    renumberEntries(type);
    scheduleUpdate();
  });

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
//  6. Photo upload
// ═══════════════════════════════════════════════════════════

function bindPhotoUpload() {
  const input = document.getElementById("f-photo");
  const preview = document.getElementById("photo-preview");
  const removeBtn = document.getElementById("photo-remove");

  if (!input) return;

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      photoDataURL = e.target.result;
      if (preview) {
        preview.src = photoDataURL;
        preview.style.display = "block";
      }
      if (removeBtn) removeBtn.style.display = "inline-flex";
      scheduleUpdate();
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener("click", () => {
    photoDataURL = "";
    input.value = "";
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    removeBtn.style.display = "none";
    scheduleUpdate();
  });
}

// ═══════════════════════════════════════════════════════════
//  7. Event bindings
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

// ── Expose ───────────────────────────────────────────────────
window.CVMaker = {
  collectData,
  renderTemplate,
  scheduleUpdate,
  currentTemplate: () => currentTemplate,
};
