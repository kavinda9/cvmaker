"use strict";

// ── Config ────────────────────────────────────────────────
const TEMPLATES_DIR = "templates/";
const DEBOUNCE_MS = 280;

const FONTS = {
  playfair: {
    display: "'Playfair Display', Georgia, serif",
    url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
  },
  merriweather: {
    display: "'Merriweather', Georgia, serif",
    url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  },
  lato: {
    display: "'Lato', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",
  },
  raleway: {
    display: "'Raleway', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;600;700&display=swap",
  },
  source: {
    display: "'Source Sans 3', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap",
  },
  dmSans: {
    display: "'DM Sans', system-ui, sans-serif",
    url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap",
  },
};

// ── State ─────────────────────────────────────────────────
let currentTemplate = localStorage.getItem("selectedTemplate") || "cv001";
let templateHTML = "";
let photoDataURL = "assets/images/cvpfp.png";
let accentColor = "#c94a1f";
let currentHeaderFont = "playfair";
let currentBodyFont = "dmSans";
let debounceTimer = null;
let lastRenderedHTML = "";

// ── Elements ──────────────────────────────────────────────
const iframe = document.getElementById("cv-preview");
const scaleWrap = document.getElementById("preview-scale-wrap");
const previewArea = document.getElementById("preview-area");
const btnDownload = document.getElementById("btn-download");

// ══════════════════════════════════════════════════════════
//  DEFAULT DATA
// ══════════════════════════════════════════════════════════
const DEFAULT_DATA = {
  firstName: "Nina",
  lastName: "Lane",
  jobTitle: "Product Designer",
  email: "nina.lane@email.com",
  phone: "+1 555 123 4567",
  location: "San Francisco, CA",
  linkedin: "linkedin.com/in/ninalane",
  website: "ninalane.com",
  summary:
    "Creative and detail-oriented Product Designer with 7+ years of experience crafting user-centric digital experiences. Passionate about design systems, accessibility, and cross-functional collaboration.",
  skills: [
    { name: "Figma", level: 95 },
    { name: "Sketch", level: 80 },
    { name: "Adobe XD", level: 75 },
    { name: "HTML/CSS", level: 70 },
    { name: "JavaScript", level: 60 },
  ],
  interests: [{ name: "Travel" }, { name: "Photography" }, { name: "Yoga" }],
  photo: "assets/images/cvpfp.png",
  experience: [
    {
      role: "Lead Product Designer",
      company: "Acme Inc.",
      location: "Remote",
      startDate: "2022",
      endDate: "Present",
      description:
        "Led design for Acme's flagship SaaS platform. Mentored 3 junior designers. Collaborated with PMs and engineers to ship 10+ features.",
    },
    {
      role: "Product Designer",
      company: "Beta Studio",
      location: "San Francisco, CA",
      startDate: "2019",
      endDate: "2022",
      description:
        "Redesigned mobile app, increasing NPS by 25%. Ran user research and usability tests.",
    },
  ],
  education: [
    {
      degree: "BFA Graphic Design",
      school: "ArtCenter College of Design",
      location: "Pasadena, CA",
      year: "2017",
      detail: "Graduated with Honors",
    },
  ],
  languages: [
    {
      name: "English",
      level: 5,
      l1: "on",
      l2: "on",
      l3: "on",
      l4: "on",
      l5: "on",
    },
    { name: "Spanish", level: 3, l1: "on", l2: "on", l3: "on", l4: "", l5: "" },
  ],
  portfolio: [],
  certifications: [{ name: "UX Certified (NN/g)", year: "2021" }],
};

// ══════════════════════════════════════════════════════════
//  LOCALSTORAGE PERSISTENCE
// ══════════════════════════════════════════════════════════
function saveFormState() {
  try {
    const state = {
      fields: {},
      skills: collectRawSkills(),
      interests: collectRawInterests(),
      experience: collectRawEntries("experience"),
      education: collectRawEntries("education"),
      language: collectRawEntries("language"),
      portfolio: collectRawEntries("portfolio"),
      certification: collectRawEntries("certification"),
      photo: photoDataURL,
      accentColor,
      headerFont: currentHeaderFont,
      bodyFont: currentBodyFont,
    };
    document.querySelectorAll("[data-token]").forEach((el) => {
      if (el.value.trim()) state.fields[el.dataset.token] = el.value;
    });
    localStorage.setItem("cvFormState", JSON.stringify(state));
  } catch (e) {}
}

function restoreFormState() {
  try {
    const raw = localStorage.getItem("cvFormState");
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (state.fields) {
      Object.entries(state.fields).forEach(([token, value]) => {
        const el = document.querySelector(`[data-token="${token}"]`);
        if (el) el.value = value;
      });
    }
    if (Array.isArray(state.skills)) {
      const list = document.getElementById("skills-list");
      list.innerHTML = "";
      state.skills.forEach(({ name, level }) => addSkillRow(name, level));
    }
    if (Array.isArray(state.interests)) {
      const list = document.getElementById("interests-list");
      list.innerHTML = "";
      state.interests.forEach(({ name }) => addInterestRow(name));
    }
    [
      "experience",
      "education",
      "language",
      "portfolio",
      "certification",
    ].forEach((type) => {
      if (Array.isArray(state[type])) {
        const container = document.getElementById(`${type}-entries`);
        if (container) container.innerHTML = "";
        state[type].forEach((fields) => addEntryWithValues(type, fields));
      }
    });
    if (state.photo) {
      photoDataURL = state.photo;
      const preview = document.getElementById("photo-preview-img");
      const removeBtn = document.getElementById("photo-remove");
      if (preview) {
        preview.src = photoDataURL;
        preview.style.display = "block";
      }
      if (removeBtn) removeBtn.style.display = "inline-flex";
    } else {
      photoDataURL = "";
      const preview = document.getElementById("photo-preview-img");
      const removeBtn = document.getElementById("photo-remove");
      if (preview) {
        preview.src = "";
        preview.style.display = "none";
      }
      if (removeBtn) removeBtn.style.display = "none";
    }
    if (state.accentColor) {
      accentColor = state.accentColor;
      const input = document.getElementById("color-input");
      const preview = document.getElementById("color-preview");
      const hex = document.getElementById("color-hex");
      if (input) input.value = accentColor;
      if (preview) preview.style.background = accentColor;
      if (hex) hex.textContent = accentColor.toUpperCase();
    }
    if (state.headerFont) {
      currentHeaderFont = state.headerFont;
      const sel = document.getElementById("header-font-select");
      if (sel) sel.value = currentHeaderFont;
    }
    if (state.bodyFont) {
      currentBodyFont = state.bodyFont;
      const sel = document.getElementById("body-font-select");
      if (sel) sel.value = currentBodyFont;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function collectRawSkills() {
  return Array.from(document.querySelectorAll(".skill-slider-row")).map(
    (row) => ({
      name: row.querySelector("input[type='text']")?.value || "",
      level: parseInt(row.querySelector("input[type='range']")?.value || "80"),
    }),
  );
}

function collectRawInterests() {
  return Array.from(document.querySelectorAll(".interest-entry input")).map(
    (el) => ({
      name: el.value,
    }),
  );
}

function collectRawEntries(type) {
  const c = document.getElementById(`${type}-entries`);
  if (!c) return [];
  return Array.from(c.querySelectorAll(`.dyn-entry[data-type="${type}"]`)).map(
    (entry) => {
      const obj = {};
      entry.querySelectorAll("[name]").forEach((el) => {
        obj[el.name] = el.value;
      });
      return obj;
    },
  );
}

// ══════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  bindAccordions();
  bindStaticInputs();
  bindDynamicAddButtons();
  bindPhotoUpload();
  bindColorPicker();
  bindFontSelects();
  bindChangeTplButton();
  initModal();
  bindDownload();

  addSkillRow("Figma", 95);
  addSkillRow("Sketch", 80);
  addInterestRow("Travel");
  addInterestRow("Photography");

  addEntry("experience");
  addEntry("education");

  const hadSavedState = restoreFormState();
  if (!hadSavedState) {
    const preview = document.getElementById("photo-preview-img");
    const removeBtn = document.getElementById("photo-remove");
    if (preview) {
      preview.src = "assets/images/cvpfp.png";
      preview.style.display = "block";
    }
    if (removeBtn) removeBtn.style.display = "inline-flex";
  }
  loadTemplate(currentTemplate, !hadSavedState);

  fitScale();
  window.addEventListener("resize", fitScale);

  document
    .getElementById("btn-toggle-preview")
    ?.addEventListener("click", () => {
      document.getElementById("workspace").classList.toggle("show-preview");
    });

  document.addEventListener("input", () => {
    saveFormState();
    scheduleUpdate();
  });
});

// ══════════════════════════════════════════════════════════
//  cvConfig READER
// ══════════════════════════════════════════════════════════
function readCvConfig(tplWindow) {
  const config = tplWindow?.cvConfig;
  if (!config) return;
  if (config.accent) {
    accentColor = config.accent;
    const input = document.getElementById("color-input");
    const preview = document.getElementById("color-preview");
    const hex = document.getElementById("color-hex");
    if (input) input.value = accentColor;
    if (preview) preview.style.background = accentColor;
    if (hex) hex.textContent = accentColor.toUpperCase();
  }
  if (Array.isArray(config.sections)) showSections(config.sections);
}

function showSections(allowedSections) {
  document.querySelectorAll("[data-section-id]").forEach((section) => {
    const id = section.dataset.sectionId;
    if (id === "personal" || id === "profile") {
      section.classList.remove("section-hidden");
    } else if (allowedSections.includes(id)) {
      section.classList.remove("section-hidden");
    } else {
      section.classList.add("section-hidden");
    }
  });
}

// ══════════════════════════════════════════════════════════
//  TEMPLATE LOADING
// ══════════════════════════════════════════════════════════
async function loadTemplate(name, applyDefaults = false) {
  try {
    const res = await fetch(`${TEMPLATES_DIR}${name}.html`);
    if (!res.ok) throw new Error(`${res.status}`);
    templateHTML = await res.text();

    const tempIframe = document.createElement("iframe");
    tempIframe.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;";
    document.body.appendChild(tempIframe);
    tempIframe.contentDocument.open();
    tempIframe.contentDocument.write(templateHTML);
    tempIframe.contentDocument.close();

    setTimeout(() => {
      readCvConfig(tempIframe.contentWindow);
      document.body.removeChild(tempIframe);
      scheduleUpdate();
    }, 300);
  } catch (e) {
    console.error("[CV Maker] loadTemplate failed:", e);
    updateIframe(
      `<body style='padding:40px;font-family:sans-serif;color:#666'><h2>Template not found</h2><p>Make sure <strong>templates/${name}.html</strong> exists.</p></body>`,
    );
  }
}

// ══════════════════════════════════════════════════════════
//  SKILLS
// ══════════════════════════════════════════════════════════
function addSkillRow(name = "", level = 80) {
  const list = document.getElementById("skills-list");
  const row = document.createElement("div");
  row.className = "skill-slider-row";
  row.innerHTML = `
    <input type="text" placeholder="Skill name" value="${esc(name)}" style="flex:1.2" />
    <input type="range" min="0" max="100" value="${level}" />
    <span class="skill-level-pct">${level}%</span>
    <button class="btn-skill-remove" title="Remove">✕</button>
  `;
  const rangeInput = row.querySelector("input[type='range']");
  const pctLabel = row.querySelector(".skill-level-pct");
  rangeInput.addEventListener("input", () => {
    pctLabel.textContent = rangeInput.value + "%";
    saveFormState();
    scheduleUpdate();
  });
  row.querySelector("input[type='text']").addEventListener("input", () => {
    saveFormState();
    scheduleUpdate();
  });
  row.querySelector(".btn-skill-remove").addEventListener("click", () => {
    row.remove();
    saveFormState();
    scheduleUpdate();
  });
  list.appendChild(row);
}

// ══════════════════════════════════════════════════════════
//  INTERESTS
// ══════════════════════════════════════════════════════════
function addInterestRow(name = "") {
  const list = document.getElementById("interests-list");
  const row = document.createElement("div");
  row.className = "interest-entry";
  row.innerHTML = `
    <input type="text" placeholder="e.g. Rock climbing" value="${esc(name)}" />
    <button class="btn-interest-remove" title="Remove">✕</button>
  `;
  row.querySelector("input").addEventListener("input", () => {
    saveFormState();
    scheduleUpdate();
  });
  row.querySelector(".btn-interest-remove").addEventListener("click", () => {
    row.remove();
    saveFormState();
    scheduleUpdate();
  });
  list.appendChild(row);
}

// ══════════════════════════════════════════════════════════
//  DATA COLLECTION
// ══════════════════════════════════════════════════════════
function collectData() {
  const data = JSON.parse(JSON.stringify(DEFAULT_DATA));

  document.querySelectorAll("[data-token]").forEach((el) => {
    const v = el.value.trim();
    if (v) data[el.dataset.token] = v;
  });

  data.photo = photoDataURL || data.photo;

  const skillRows = document.querySelectorAll(".skill-slider-row");
  if (skillRows.length) {
    const skills = Array.from(skillRows)
      .map((row) => ({
        name: row.querySelector("input[type='text']")?.value.trim() || "",
        level: parseInt(
          row.querySelector("input[type='range']")?.value || "80",
        ),
      }))
      .filter((s) => s.name !== "");
    if (skills.length) data.skills = skills;
  }

  const interestInputs = document.querySelectorAll(".interest-entry input");
  if (interestInputs.length) {
    const interests = Array.from(interestInputs)
      .map((el) => ({ name: el.value.trim() }))
      .filter((i) => i.name !== "");
    if (interests.length) data.interests = interests;
  }

  const dyns = [
    { key: "experience", type: "experience" },
    { key: "education", type: "education" },
    { key: "languages", type: "language" },
    { key: "portfolio", type: "portfolio" },
    { key: "certifications", type: "certification" },
  ];
  dyns.forEach(({ key, type }) => {
    const entries = collectEntries(type, (e) => {
      if (type === "experience") {
        const obj = {
          role: val(e, "role"),
          company: val(e, "company"),
          location: val(e, "location"),
          startDate: val(e, "startDate"),
          endDate: val(e, "endDate"),
          description: val(e, "description"),
        };
        return obj.role || obj.company ? obj : null;
      } else if (type === "education") {
        const obj = {
          degree: val(e, "degree"),
          school: val(e, "school"),
          location: val(e, "location"),
          year: val(e, "year"),
          detail: val(e, "detail"),
        };
        return obj.degree || obj.school ? obj : null;
      } else if (type === "language") {
        const name = val(e, "name");
        if (!name) return null;
        const level = Math.min(5, Math.max(1, parseInt(val(e, "level")) || 3));
        return {
          name,
          level,
          l1: level >= 1 ? "on" : "",
          l2: level >= 2 ? "on" : "",
          l3: level >= 3 ? "on" : "",
          l4: level >= 4 ? "on" : "",
          l5: level >= 5 ? "on" : "",
        };
      } else if (type === "portfolio") {
        const name = val(e, "name");
        if (!name) return null;
        return { name, description: val(e, "description") };
      } else if (type === "certification") {
        const name = val(e, "name");
        if (!name) return null;
        return { name, year: val(e, "year") };
      }
      return null;
    });
    const filtered = entries.filter(Boolean);
    if (filtered.length) data[key] = filtered;
  });

  return data;
}

const val = (p, n) => {
  const el = p.querySelector(`[name="${n}"]`);
  return el ? el.value.trim() : "";
};

function collectEntries(type, mapper) {
  const c = document.getElementById(`${type}-entries`);
  return c
    ? Array.from(c.querySelectorAll(`.dyn-entry[data-type="${type}"]`)).map(
        mapper,
      )
    : [];
}

// ══════════════════════════════════════════════════════════
//  TEMPLATE RENDERER
// ══════════════════════════════════════════════════════════
function renderTemplate(html, data) {
  let out = html;
  out = out.replace(
    /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, inner) => {
      const v = data[key];
      if (!v || (Array.isArray(v) && !v.length)) return inner;
      return "";
    },
  );
  out = out.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, inner) => {
      const v = data[key];
      if (Array.isArray(v)) {
        if (!v.length) return "";
        return v.map((item) => renderBlock(inner, item, data)).join("");
      }
      if (v)
        return inner.replace(/\{\{(\w+)\}\}/g, (_, k) => {
          const x = data[k];
          if (x == null) return "";
          return Array.isArray(x) ? x.map(esc).join(", ") : esc(String(x));
        });
      return "";
    },
  );
  out = out.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = data[key];
    if (v == null) return "";
    if (Array.isArray(v)) return v.map(esc).join(", ");
    if (key === "photo") return String(v);
    return esc(String(v));
  });
  return out;
}

function renderBlock(inner, item, root) {
  let b = inner;
  b = b.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (__, k, i2) => {
    const s = item[k] !== undefined ? item[k] : root[k];
    if (!s || (Array.isArray(s) && !s.length)) return i2;
    return "";
  });
  b = b.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (__, k, i2) => {
    const s = item[k] !== undefined ? item[k] : root[k];
    if (Array.isArray(s) && s.length)
      return s
        .map((x) =>
          i2.replace(/\{\{(\w+)\}\}/g, (_, kk) =>
            esc(String(x[kk] !== undefined ? x[kk] : x)),
          ),
        )
        .join("");
    if (s)
      return i2.replace(/\{\{(\w+)\}\}/g, (_, kk) =>
        esc(
          String(
            item[kk] !== undefined
              ? item[kk]
              : root[kk] !== undefined
                ? root[kk]
                : "",
          ),
        ),
      );
    return "";
  });
  b = b.replace(/\{\{(\w+)\}\}/g, (__, k) => {
    const v =
      item[k] !== undefined ? item[k] : root[k] !== undefined ? root[k] : "";
    return Array.isArray(v) ? v.map(esc).join(", ") : esc(String(v));
  });
  return b;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ══════════════════════════════════════════════════════════
//  PREVIEW UPDATE
// ══════════════════════════════════════════════════════════
function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!templateHTML.trim()) return;
    let html = renderTemplate(templateHTML, collectData());
    html = injectCustomStyles(html);
    updateIframe(html);
  }, DEBOUNCE_MS);
}

function injectCustomStyles(html) {
  const headerFont = FONTS[currentHeaderFont] || FONTS.playfair;
  const bodyFont = FONTS[currentBodyFont] || FONTS.dmSans;
  const style = `
    <link rel="stylesheet" href="${headerFont.url}" />
    <link rel="stylesheet" href="${bodyFont.url}" />
    <style>
      :root {
        --accent-color: ${accentColor} !important;
        --yellow: ${accentColor} !important;
        --accent: ${accentColor} !important;
        --cv-accent: ${accentColor} !important;
      }
      body, html { font-family: ${bodyFont.display} !important; }
      .sidebar__name, .sb-section__title, .sec-title, h1, h2, h3 {
        font-family: ${headerFont.display} !important;
      }
    </style>
  `;
  return html.replace("</head>", style + "</head>");
}

function updateIframe(html) {
  lastRenderedHTML = html;
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(fitScale, 60);
}

// ══════════════════════════════════════════════════════════
//  SCALE FIT
// ══════════════════════════════════════════════════════════
function fitScale() {
  const areaW = previewArea.clientWidth - 64;
  const scale = Math.max(0.3, Math.min(1, areaW / 794));
  scaleWrap.style.setProperty("--preview-scale", scale);
  const scaledH = 1123 * scale;
  scaleWrap.style.marginBottom = `${scaledH - 1123 + 32}px`;
}

// ══════════════════════════════════════════════════════════
//  ACCORDION
// ══════════════════════════════════════════════════════════
function bindAccordions() {
  document.querySelectorAll("[data-toggle]").forEach((header) => {
    header.addEventListener("click", () => {
      header.closest(".form-section").classList.toggle("open");
    });
  });
}

// ══════════════════════════════════════════════════════════
//  DYNAMIC ENTRIES
// ══════════════════════════════════════════════════════════
function addEntry(type) {
  addEntryWithValues(type, {});
}

function addEntryWithValues(type, values) {
  const tpl = document.getElementById(`tpl-${type}`);
  const container = document.getElementById(`${type}-entries`);
  if (!tpl || !container) return;
  const clone = tpl.content.cloneNode(true);
  const entry = clone.querySelector(".dyn-entry");
  const count = container.querySelectorAll(".dyn-entry").length + 1;
  const lbl = entry.querySelector(".dyn-entry__label");
  if (lbl) lbl.textContent = `${cap(type)} ${count}`;

  Object.entries(values).forEach(([name, value]) => {
    const el = entry.querySelector(`[name="${name}"]`);
    if (el) el.value = value;
  });

  entry.querySelector(".dyn-entry__remove").addEventListener("click", () => {
    entry.remove();
    renumber(type);
    saveFormState();
    scheduleUpdate();
  });
  entry.addEventListener("input", () => {
    saveFormState();
    scheduleUpdate();
  });
  container.appendChild(entry);
  const section = document.getElementById(`section-${type}`);
  if (section) section.classList.add("open");
}

function renumber(type) {
  const c = document.getElementById(`${type}-entries`);
  if (!c) return;
  c.querySelectorAll(".dyn-entry").forEach((el, i) => {
    const lbl = el.querySelector(".dyn-entry__label");
    if (lbl) lbl.textContent = `${cap(type)} ${i + 1}`;
  });
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function bindDynamicAddButtons() {
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addEntry(btn.dataset.add);
      saveFormState();
      scheduleUpdate();
    });
  });
  document.getElementById("btn-add-skill")?.addEventListener("click", (e) => {
    e.stopPropagation();
    e.target.closest(".form-section")?.classList.add("open");
    addSkillRow();
    saveFormState();
    scheduleUpdate();
  });
  document
    .getElementById("btn-add-interest")
    ?.addEventListener("click", (e) => {
      e.stopPropagation();
      e.target.closest(".form-section")?.classList.add("open");
      addInterestRow();
      saveFormState();
      scheduleUpdate();
    });
}

function bindStaticInputs() {
  document.querySelectorAll("[data-token]").forEach((el) => {
    el.addEventListener("input", () => {
      saveFormState();
      scheduleUpdate();
    });
  });
}

// ══════════════════════════════════════════════════════════
//  PHOTO UPLOAD
// ══════════════════════════════════════════════════════════
let cropperInstance = null;

function bindPhotoUpload() {
  const input = document.getElementById("f-photo");
  const preview = document.getElementById("photo-preview-img");
  const remove = document.getElementById("photo-remove");
  
  const modal = document.getElementById("crop-modal-overlay");
  const cropImg = document.getElementById("crop-image");
  const btnCancel = document.getElementById("btn-crop-cancel");
  const btnApply = document.getElementById("btn-crop-apply");
  const btnClose = document.getElementById("crop-modal-close");
  
  const zoomIn = document.getElementById("btn-crop-zoom-in");
  const zoomOut = document.getElementById("btn-crop-zoom-out");
  const rotateLeft = document.getElementById("btn-crop-rotate-left");

  if (!input) return;

  const closeCropModal = () => {
    modal.classList.remove("open");
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    input.value = "";
  };

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      cropImg.src = e.target.result;
      modal.classList.add("open");

      if (cropperInstance) {
        cropperInstance.destroy();
      }

      setTimeout(() => {
        cropperInstance = new Cropper(cropImg, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          autoCropArea: 1,
          restore: false,
          guides: false,
          center: false,
          highlight: false,
          cropBoxMovable: false,
          cropBoxResizable: false,
          toggleDragModeOnDblclick: false,
          minContainerWidth: 320,
          minContainerHeight: 320,
        });
      }, 100);
    };
    reader.readAsDataURL(file);
  });

  zoomIn?.addEventListener("click", () => {
    if (cropperInstance) cropperInstance.zoom(0.1);
  });
  zoomOut?.addEventListener("click", () => {
    if (cropperInstance) cropperInstance.zoom(-0.1);
  });
  rotateLeft?.addEventListener("click", () => {
    if (cropperInstance) cropperInstance.rotate(-90);
  });

  btnCancel?.addEventListener("click", closeCropModal);
  btnClose?.addEventListener("click", closeCropModal);

  btnApply?.addEventListener("click", () => {
    if (!cropperInstance) return;

    const canvas = cropperInstance.getCroppedCanvas({
      width: 320,
      height: 320,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    if (canvas) {
      photoDataURL = canvas.toDataURL("image/png");
      if (preview) {
        preview.src = photoDataURL;
        preview.style.display = "block";
      }
      if (remove) remove.style.display = "inline-flex";
      saveFormState();
      scheduleUpdate();
    }

    closeCropModal();
  });

  remove?.addEventListener("click", () => {
    photoDataURL = "";
    input.value = "";
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
    remove.style.display = "none";
    saveFormState();
    scheduleUpdate();
  });
}

// ══════════════════════════════════════════════════════════
//  COLOR PICKER
// ══════════════════════════════════════════════════════════
function bindColorPicker() {
  const input = document.getElementById("color-input");
  const preview = document.getElementById("color-preview");
  const hexLbl = document.getElementById("color-hex");
  if (!input) return;
  const apply = () => {
    accentColor = input.value;
    if (preview) preview.style.background = accentColor;
    if (hexLbl) hexLbl.textContent = accentColor.toUpperCase();
    saveFormState();
    scheduleUpdate();
  };
  input.addEventListener("input", apply);
  input.addEventListener("change", apply);
  document
    .getElementById("color-picker-btn")
    ?.addEventListener("click", () => input.click());
}

// ══════════════════════════════════════════════════════════
//  FONT SELECT
// ══════════════════════════════════════════════════════════
function bindFontSelects() {
  const headerSel = document.getElementById("header-font-select");
  const bodySel = document.getElementById("body-font-select");
  if (!headerSel || !bodySel) return;

  headerSel.querySelectorAll("option").forEach((opt) => {
    const f = FONTS[opt.value];
    if (f) opt.style.fontFamily = f.display;
  });
  bodySel.querySelectorAll("option").forEach((opt) => {
    const f = FONTS[opt.value];
    if (f) opt.style.fontFamily = f.display;
  });

  const applyHeaderFont = () => {
    const f = FONTS[headerSel.value];
    if (f) headerSel.style.fontFamily = f.display;
  };
  const applyBodyFont = () => {
    const f = FONTS[bodySel.value];
    if (f) bodySel.style.fontFamily = f.display;
  };

  headerSel.addEventListener("change", () => {
    currentHeaderFont = headerSel.value;
    applyHeaderFont();
    saveFormState();
    scheduleUpdate();
  });
  bodySel.addEventListener("change", () => {
    currentBodyFont = bodySel.value;
    applyBodyFont();
    saveFormState();
    scheduleUpdate();
  });
  applyHeaderFont();
  applyBodyFont();
}

// ══════════════════════════════════════════════════════════
//  TEMPLATE SWITCHER MODAL
// ══════════════════════════════════════════════════════════
const TEMPLATES = [
  { id: "cv001", name: "Editorial", num: "01", img: "assets/images/cv001.png" },
  { id: "cv002", name: "Minimal", num: "02", img: "assets/images/cv002.png" },
  { id: "cv003", name: "Executive", num: "03", img: "assets/images/cv003.png" },
];

let modalCurrent = 0;
let modalAnimating = false;
let modalCards = [];

function initModal() {
  const track = document.getElementById("modal-track");
  const dotsWrap = document.getElementById("modal-dots");
  if (!track) return;

  modalCurrent = Math.max(
    0,
    TEMPLATES.findIndex((t) => t.id === currentTemplate),
  );

  modalCards = TEMPLATES.map((tpl, i) => {
    const card = document.createElement("div");
    card.className = "modal-card";
    card.dataset.index = i;
    const img = document.createElement("img");
    img.src = tpl.img;
    img.alt = tpl.name;
    card.appendChild(img);
    card.addEventListener("click", () => {
      if (modalAnimating) return;
      if (parseInt(card.dataset.index) !== modalCurrent) return;
      applyTemplate(TEMPLATES[modalCurrent].id);
    });
    track.appendChild(card);
    return card;
  });

  sizeModalCards();
  window.addEventListener("resize", sizeModalCards);

  TEMPLATES.forEach((_, i) => {
    const d = document.createElement("div");
    d.className = "modal-dot" + (i === modalCurrent ? " active" : "");
    d.addEventListener("click", () => modalGoTo(i, i > modalCurrent ? 1 : -1));
    dotsWrap.appendChild(d);
  });

  renderModal();

  document
    .getElementById("modal-prev")
    ?.addEventListener("click", () =>
      modalGoTo((modalCurrent - 1 + TEMPLATES.length) % TEMPLATES.length, -1),
    );
  document
    .getElementById("modal-next")
    ?.addEventListener("click", () =>
      modalGoTo((modalCurrent + 1) % TEMPLATES.length, 1),
    );

  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("tpl-modal-overlay");
    if (!overlay.classList.contains("open")) return;
    if (e.key === "ArrowLeft")
      modalGoTo((modalCurrent - 1 + TEMPLATES.length) % TEMPLATES.length, -1);
    if (e.key === "ArrowRight")
      modalGoTo((modalCurrent + 1) % TEMPLATES.length, 1);
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter") applyTemplate(TEMPLATES[modalCurrent].id);
  });

  let touchX = 0;
  track.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.touches[0].clientX;
    },
    { passive: true },
  );
  track.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40)
        dx < 0
          ? modalGoTo((modalCurrent + 1) % TEMPLATES.length, 1)
          : modalGoTo(
              (modalCurrent - 1 + TEMPLATES.length) % TEMPLATES.length,
              -1,
            );
    },
    { passive: true },
  );

  document
    .getElementById("btn-use-tpl")
    ?.addEventListener("click", () =>
      applyTemplate(TEMPLATES[modalCurrent].id),
    );
  document.getElementById("modal-close")?.addEventListener("click", closeModal);
  document
    .getElementById("tpl-modal-overlay")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
}

function sizeModalCards() {
  const track = document.getElementById("modal-track");
  if (!track || !modalCards.length) return;
  const h = Math.min(track.clientHeight * 0.9, 560);
  const w = Math.min(h / 1.4142, track.clientWidth * 0.5, 360);
  modalCards.forEach((c) => {
    c.style.width = Math.round(w) + "px";
    c.style.height = Math.round(w * 1.4142) + "px";
  });
}

function renderModal() {
  const n = TEMPLATES.length;
  const prev = (modalCurrent - 1 + n) % n;
  const next = (modalCurrent + 1) % n;
  const dots = document.querySelectorAll(".modal-dot");
  modalCards.forEach((c, i) => {
    c.classList.remove("is-active", "is-prev", "is-next", "is-hidden");
    if (i === modalCurrent) c.classList.add("is-active");
    else if (i === prev) c.classList.add("is-prev");
    else if (i === next) c.classList.add("is-next");
    else c.classList.add("is-hidden");
  });
  document.getElementById("modal-lbl-num").textContent =
    "Template " + TEMPLATES[modalCurrent].num;
  document.getElementById("modal-lbl-name").textContent =
    TEMPLATES[modalCurrent].name;
  dots.forEach((d, i) => d.classList.toggle("active", i === modalCurrent));
}

function modalGoTo(index, dir) {
  if (modalAnimating || index === modalCurrent) return;
  modalAnimating = true;
  const oldCard = modalCards[modalCurrent];
  const newCard = modalCards[index];
  oldCard.classList.remove("anim-enter-right", "anim-enter-left");
  newCard.classList.remove(
    "is-hidden",
    "is-prev",
    "is-next",
    "is-active",
    "anim-enter-right",
    "anim-enter-left",
  );
  newCard.classList.add(dir > 0 ? "anim-enter-right" : "anim-enter-left");
  modalCurrent = index;
  renderModal();
  setTimeout(() => {
    newCard.classList.remove("anim-enter-right", "anim-enter-left");
    modalAnimating = false;
  }, 520);
}

function openModal() {
  modalCurrent = Math.max(
    0,
    TEMPLATES.findIndex((t) => t.id === currentTemplate),
  );
  renderModal();
  document.getElementById("tpl-modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("tpl-modal-overlay").classList.remove("open");
}

function applyTemplate(id) {
  closeModal();
  currentTemplate = id;
  localStorage.setItem("selectedTemplate", id);
  loadTemplate(id);
}

function bindChangeTplButton() {
  document
    .getElementById("btn-change-tpl")
    ?.addEventListener("click", openModal);
}

// ══════════════════════════════════════════════════════════
//  PDF DOWNLOAD (FIXED)
//  Copies lastRenderedHTML into a hidden div in THIS document
//  so html2canvas can access all computed styles correctly.
// ══════════════════════════════════════════════════════════
function bindDownload() {
  btnDownload?.addEventListener("click", async () => {
    if (typeof html2pdf === "undefined") {
      alert("PDF library not loaded. Check lib/html2pdf.bundle.min.js.");
      return;
    }
    if (!lastRenderedHTML) {
      alert("Nothing to export yet. Please wait for the preview to load.");
      return;
    }

    const data = collectData();
    const first = (data.firstName || "").trim();
    const last = (data.lastName || "").trim();
    const filename =
      ([first, last].filter(Boolean).join("_") || "CV") + "_CV.pdf";

    const originalHTML = btnDownload.innerHTML;
    btnDownload.textContent = "Exporting…";
    btnDownload.disabled = true;

    let container = null;

    try {
      // Parse the fully rendered HTML string
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(lastRenderedHTML, "text/html");

      // Build a hidden container in THIS document (so html2canvas can read styles)
      container = document.createElement("div");
      container.style.cssText =
        "position:fixed;left:-9999px;top:0;" +
        "width:794px;height:1123px;overflow:hidden;background:#fff;z-index:-1;";

      // Copy all <style> tags from the parsed template
      parsedDoc.querySelectorAll("style").forEach((s) => {
        const clone = document.createElement("style");
        clone.textContent = s.textContent;
        container.appendChild(clone);
      });

      // Copy the .page element
      const pageEl = parsedDoc.querySelector(".page");
      if (!pageEl) throw new Error("No .page element found in template.");
      const pageClone = pageEl.cloneNode(true);
      container.appendChild(pageClone);

      document.body.appendChild(container);

      // Run skill-bar scripts etc.
      parsedDoc.querySelectorAll("script").forEach((s) => {
        try {
          new Function(s.textContent)();
        } catch (_) {}
      });

      // Let styles paint
      await new Promise((r) => setTimeout(r, 200));

      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 1.0 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 794,
            height: 1123,
            scrollX: 0,
            scrollY: 0,
            logging: false,
            windowWidth: 794,
            windowHeight: 1123,
          },
          jsPDF: {
            unit: "px",
            format: [794, 1123],
            orientation: "portrait",
            hotfixes: ["px_scaling"],
          },
        })
        .from(pageClone)
        .save();
    } catch (err) {
      console.error("[CV Maker] PDF export failed:", err);
      alert("PDF export failed: " + err.message);
    } finally {
      if (container && container.parentNode)
        document.body.removeChild(container);
      btnDownload.innerHTML = originalHTML;
      btnDownload.disabled = false;
    }
  });
}

// ── Expose ───────────────────────────────────────────────────
window.CVMaker = { collectData, scheduleUpdate };
