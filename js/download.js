// ═══════════════════════════════════════════════════════════
//  download.js  –  CV Maker · PDF Download
//  Responsibilities:
//    1. Grab the rendered HTML from the iframe
//    2. Use html2pdf.js to export a clean A4 PDF
//    3. Show loading state on the button during export
// ═══════════════════════════════════════════════════════════

"use strict";

// ── Elements ────────────────────────────────────────────────
const btnDownload = document.getElementById("btn-download");

// ── html2pdf options ─────────────────────────────────────────
function getPdfOptions(filename) {
  return {
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2, // retina-quality render
      useCORS: true,
      letterRendering: true,
      backgroundColor: "#ffffff",
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
    pagebreak: { mode: ["avoid-all", "css"] },
  };
}

// ═══════════════════════════════════════════════════════════
//  Main export function
// ═══════════════════════════════════════════════════════════

async function downloadPDF() {
  // Guard: html2pdf must be loaded
  if (typeof html2pdf === "undefined") {
    alert(
      "PDF library not loaded. Make sure lib/html2pdf.bundle.min.js is included.",
    );
    return;
  }

  const iframe = document.getElementById("cv-preview");
  if (!iframe) return;

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;

  // ── Build a filename from the person's name ──────────────
  const data = window.CVMaker?.collectData?.() ?? {};
  const first = (data.firstName || "").trim();
  const last = (data.lastName || "").trim();
  const namePart = [first, last].filter(Boolean).join("_") || "CV";
  const filename = `${namePart}_CV.pdf`;

  // ── Loading state ────────────────────────────────────────
  setButtonLoading(true);

  try {
    const liveDoc = document.getElementById("cv-preview").contentDocument;
    if (!liveDoc) throw new Error("Preview not ready.");

    const el = liveDoc.querySelector(".page");
    if (!el) throw new Error("No .page element found.");

    // Clone the element to copy styles inline (resolving CSS variables)
    const clone = el.cloneNode(true);
    const win = el.ownerDocument.defaultView || window;
    
    // Copy computed styles from original element to clone
    const applyComputedStyles = (orig, cl) => {
      const style = win.getComputedStyle(orig);
      cl.style.backgroundColor = style.backgroundColor;
      cl.style.color = style.color;
      cl.style.borderColor = style.borderColor;
      cl.style.borderTopColor = style.borderTopColor;
      cl.style.borderBottomColor = style.borderBottomColor;
      cl.style.borderLeftColor = style.borderLeftColor;
      cl.style.borderRightColor = style.borderRightColor;
      cl.style.fill = style.fill;
      cl.style.stroke = style.stroke;
    };

    applyComputedStyles(el, clone);

    const allOriginals = el.querySelectorAll("*");
    const allClones = clone.querySelectorAll("*");
    for (let i = 0; i < allOriginals.length; i++) {
      applyComputedStyles(allOriginals[i], allClones[i]);
    }

    await html2pdf()
      .set({
        margin: 0,
        filename: filename,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: 794,
          height: 1123,
          scrollX: 0,
          scrollY: 0,
          logging: false,
        },
        jsPDF: {
          unit: "px",
          format: [794, 1123],
          orientation: "portrait",
          hotfixes: ["px_scaling"],
        },
      })
      .from(clone)
      .save();


  } catch (err) {
    console.error("[CV Maker] PDF export failed:", err);
    alert("PDF export failed. Please try again.");
  } finally {
    setButtonLoading(false);
  }
}

// ═══════════════════════════════════════════════════════════
//  Button loading state
// ═══════════════════════════════════════════════════════════

function setButtonLoading(isLoading) {
  if (!btnDownload) return;

  if (isLoading) {
    btnDownload.dataset.originalText = btnDownload.textContent;
    btnDownload.textContent = "Exporting…";
    btnDownload.disabled = true;
    btnDownload.style.opacity = "0.7";
  } else {
    btnDownload.textContent =
      btnDownload.dataset.originalText || "Download PDF";
    btnDownload.disabled = false;
    btnDownload.style.opacity = "";
  }
}

// ── Bind ─────────────────────────────────────────────────────
btnDownload?.addEventListener("click", downloadPDF);
