// js/preview.js – Improved Live Preview
"use strict";

const iframe = document.getElementById("cv-preview");
const scaleWrapper = document.querySelector(".preview-scale-wrapper");

const CV_WIDTH = 794;
const PAD = 64;

let isFirstLoad = true;

function updatePreview(renderedHTML) {
  if (!iframe) return;

  // Fallback: if renderedHTML is empty, show a message
  if (!renderedHTML || !renderedHTML.trim()) {
    renderedHTML = `<body style="padding:40px;font-family:sans-serif;color:#666;">
      <h2>Nothing to preview</h2>
      <p>The template is empty or not loaded yet.</p>
    </body>`;
  }

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(renderedHTML);
  doc.close();

  // Wait for content to load before scaling
  if (isFirstLoad) {
    iframe.onload = () => {
      fitScale();
      isFirstLoad = false;
    };
  } else {
    // Small delay for dynamic content
    setTimeout(fitScale, 50);
  }
}

function fitScale() {
  if (!scaleWrapper || !iframe) return;

  const panelW = document.querySelector(".panel--preview").clientWidth;
  const available = panelW - PAD * 2;
  const scale = Math.max(0.6, Math.min(1, available / CV_WIDTH)); // prevent too small

  scaleWrapper.style.setProperty("--preview-scale", scale);

  const naturalH = scaleWrapper.offsetHeight;
  const scaledH = naturalH * scale;
  scaleWrapper.style.marginBottom = `${scaledH - naturalH + PAD}px`;
}

// Re-scale on resize
const resizeObserver = new ResizeObserver(() => {
  setTimeout(fitScale, 100);
});
resizeObserver.observe(document.querySelector(".panel--preview"));

// Also re-scale when toggling preview-only mode
document.getElementById("btn-preview-toggle")?.addEventListener("click", () => {
  setTimeout(fitScale, 300);
});

// Expose globally
window.updatePreview = updatePreview;
