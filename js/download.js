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

    const win = el.ownerDocument.defaultView || window;

    // ── Save and apply computed styles to live DOM temporarily ──
    const elementsToStyle = [el, ...Array.from(el.querySelectorAll("*"))];
    const originalStyles = [];

    elementsToStyle.forEach((node) => {
      // Save original inline style attribute
      originalStyles.push({
        node,
        styleAttr: node.getAttribute("style"),
      });

      // Get computed styles
      const computed = win.getComputedStyle(node);
      
      // Apply colors, borders, fills, strokes inline so they are cloned
      node.style.backgroundColor = computed.backgroundColor;
      node.style.color = computed.color;
      node.style.borderColor = computed.borderColor;
      node.style.borderTopColor = computed.borderTopColor;
      node.style.borderBottomColor = computed.borderBottomColor;
      node.style.borderLeftColor = computed.borderLeftColor;
      node.style.borderRightColor = computed.borderRightColor;
      node.style.fill = computed.fill;
      node.style.stroke = computed.stroke;
    });

    // Clone the page (now with all computed styles saved inline)
    const clone = el.cloneNode(true);

    // Restore original styles on live preview immediately
    originalStyles.forEach(({ node, styleAttr }) => {
      if (styleAttr === null) {
        node.removeAttribute("style");
      } else {
        node.setAttribute("style", styleAttr);
      }
    });

    // ── Perform cv5 specific shape conversions on the clone for PDF output ──
    const isCv5 = liveDoc.title.includes("005") || el.ownerDocument.title.includes("005");
    if (isCv5) {
      // 1. Convert .sb-black-top to SVG polygon
      const sbBlackTop = clone.querySelector(".sb-black-top");
      if (sbBlackTop) {
        sbBlackTop.outerHTML = `
          <svg class="sb-black-top" viewBox="0 0 77 62" preserveAspectRatio="none" style="position:absolute; top:0; left:0; width:77mm; height:62mm; fill:#1C1C1C; z-index:1; clip-path:none; background:none;">
            <polygon points="0,0 77,0 77,28 0,62" />
          </svg>
        `;
      }

      // 2. Convert main header accents to SVG polygons
      const headerAccent = clone.querySelector(".main-header-accent");
      if (headerAccent) {
        const accentBg = headerAccent.style.backgroundColor || "#F5C200";
        headerAccent.outerHTML = `
          <svg class="main-header-accent" viewBox="0 0 133 44" preserveAspectRatio="none" style="position:absolute; top:0; left:0; width:133mm; height:44mm; fill:${accentBg}; z-index:1; clip-path:none; background:none;">
            <polygon points="0,0 133,0 133,30 0,44" />
          </svg>
        `;
      }

      const headerBg = clone.querySelector(".main-header-bg");
      if (headerBg) {
        headerBg.outerHTML = `
          <svg class="main-header-bg" viewBox="0 0 133 40" preserveAspectRatio="none" style="position:absolute; top:0; left:0; width:133mm; height:40mm; fill:#1C1C1C; z-index:2; clip-path:none; background:none;">
            <polygon points="0,0 133,0 133,26 0,40" />
          </svg>
        `;
      }

      // 3. Convert .c-icon (contact ribbon tags) to wrap + polygon
      clone.querySelectorAll(".c-icon").forEach((cIcon) => {
        const innerSvg = cIcon.innerHTML;
        cIcon.outerHTML = `
          <div class="c-icon-wrap" style="width:13mm; height:7.5mm; margin-left:-7mm; position:relative; display:flex; align-items:center; justify-content:center; padding-right:2.5mm; flex-shrink:0;">
            <svg class="c-icon-bg" viewBox="0 0 13 7.5" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; fill:#1C1C1C; z-index:1;">
              <polygon points="0,0 10.14,0 13,3.75 10.14,7.5 0,7.5" />
            </svg>
            <div class="c-icon-svg-container" style="position:relative; z-index:2; display:flex; align-items:center; justify-content:center;">
              ${innerSvg}
            </div>
          </div>
        `;
      });

      // 4. Convert rotated photo-diamond transforms to SVG masking overlay
      const photoWrap = clone.querySelector(".photo-wrap");
      if (photoWrap) {
        const photoImg = photoWrap.querySelector("img");
        const placeholder = photoWrap.querySelector(".photo-diamond-ph");
        const yellowColor = clone.querySelector(".sidebar")?.style.backgroundColor || "#F5C200";

        let contentHtml = "";
        if (photoImg) {
          contentHtml = `<img src="${photoImg.getAttribute("src")}" alt="Profile" style="width:100%; height:100%; object-fit:cover;" />`;
        } else if (placeholder) {
          contentHtml = `
            <div class="photo-placeholder" style="width:100%; height:100%; background:linear-gradient(135deg, #ccc, #999); display:flex; align-items:center; justify-content:center;">
              <span style="font-family:'Oswald',sans-serif; font-size:1.1cm; font-weight:700; color:#fff;">${placeholder.querySelector("span")?.textContent || ""}</span>
            </div>
          `;
        }

        photoWrap.innerHTML = `
          <div class="photo-square" style="width:48mm; height:48mm; overflow:hidden; background:#888;">
            ${contentHtml}
          </div>
          <svg class="photo-mask" viewBox="0 0 48 48" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:6;">
            <polygon class="mask-corner" points="0,0 24,0 0,24" style="fill:${yellowColor};" />
            <polygon class="mask-corner" points="48,0 48,24 24,0" style="fill:${yellowColor};" />
            <polygon class="mask-corner" points="48,48 24,48 48,24" style="fill:${yellowColor};" />
            <polygon class="mask-corner" points="0,48 0,24 24,48" style="fill:${yellowColor};" />
            <polygon class="mask-border" points="24,0.6 47.4,24 24,47.4 0.6,24" style="fill:none; stroke:#1C1C1C; stroke-width:1.2;" />
          </svg>
        `;
      }
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
