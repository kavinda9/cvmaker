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
    // Clone the iframe body so we don't mutate the live preview
    const clone = iframeDoc.documentElement.cloneNode(true);

    // Inline the <style> from the iframe head so html2canvas sees it
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = clone.querySelector("body").innerHTML;
    tempDiv.style.cssText = `
      width: 794px;
      min-height: 1123px;
      background: #fff;
      font-family: 'DM Sans', system-ui, sans-serif;
    `;

    // Copy all <style> and <link rel=stylesheet> into a wrapper
    const wrapper = document.createElement("div");
    const styleEls = clone.querySelectorAll("style, link[rel='stylesheet']");
    styleEls.forEach((el) => wrapper.appendChild(el.cloneNode(true)));
    wrapper.appendChild(tempDiv);

    // Temporarily attach to DOM (off-screen) so fonts render
    wrapper.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    document.body.appendChild(wrapper);

    await html2pdf().set(getPdfOptions(filename)).from(tempDiv).save();

    document.body.removeChild(wrapper);
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
