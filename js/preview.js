// ═══════════════════════════════════════════════════════════
//  preview.js  –  CV Maker · Live Preview
//  Responsibilities:
//    1. Write rendered HTML into the iframe
//    2. Scale the A4 wrapper to fit the preview panel
//    3. Expose updatePreview() called by script.js
// ═══════════════════════════════════════════════════════════

"use strict";

// ── Elements ────────────────────────────────────────────────
const iframe = document.getElementById("cv-preview");
const scaleWrapper = document.querySelector(".preview-scale-wrapper");
const previewPanel = document.querySelector(".panel--preview");

// ── Constants ───────────────────────────────────────────────
const CV_WIDTH = 794; // A4 at 96 dpi (px)
const PAD = 64; // breathing room around the page (px)

// ═══════════════════════════════════════════════════════════
//  1. Write HTML into iframe
// ═══════════════════════════════════════════════════════════

function updatePreview(renderedHTML) {
  if (!iframe) return;

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(renderedHTML);
  doc.close();

  // Re-apply scale after content loads (iframe height may change)
  iframe.addEventListener("load", fitScale, { once: true });
  fitScale();
}

// ═══════════════════════════════════════════════════════════
//  2. Scale the wrapper to fit the panel
// ═══════════════════════════════════════════════════════════

function fitScale() {
  if (!previewPanel || !scaleWrapper) return;

  const panelW = previewPanel.clientWidth;
  const available = panelW - PAD * 2;
  const scale = Math.min(1, available / CV_WIDTH);

  // Set CSS variable used by the wrapper's transform in style.css
  scaleWrapper.style.setProperty("--preview-scale", scale);

  // Collapse the negative margin so the panel scrolls naturally
  const naturalH = scaleWrapper.offsetHeight;
  const scaledH = naturalH * scale;
  scaleWrapper.style.marginBottom = `${scaledH - naturalH + PAD}px`;
}

// ── Re-scale on window resize ────────────────────────────────
const _resizeObserver = new ResizeObserver(fitScale);
if (previewPanel) _resizeObserver.observe(previewPanel);

// ── Also re-scale when preview-only mode toggles ────────────
document.getElementById("btn-preview-toggle")?.addEventListener("click", () => {
  // Wait for CSS transition to finish before measuring
  setTimeout(fitScale, 250);
});

// ── Expose ──────────────────────────────────────────────────
window.updatePreview = updatePreview;
