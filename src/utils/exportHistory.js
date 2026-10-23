import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getCachedBusinessInfo, fetchLiveBusinessInfo } from "../context/BusinessContext";
import { appendCanvasToPDF, getDocumentWatermarkText } from './documentWatermark';
import { createCSVContent, saveExportBlob, safeExportFilename } from './exportFiles';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export const exportHistoryCSV = (filename, headers, rows) => {
  saveExportBlob(new Blob([createCSVContent(headers, rows)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
};

export const createHistoryPDFFile = async (title, filename, headers, rows, options = {}) => {
  const biz = options.businessInfo || (await fetchLiveBusinessInfo().catch(() => null)) || getCachedBusinessInfo();
  const wm = getDocumentWatermarkText(biz?.watermarkText);
  const brandTitle = escapeHTML(biz?.brandTitle || "VINOFF WHOLESALES");
  const businessName = escapeHTML(biz?.businessName || "Vinoff Wholesales Ltd");
  const contactLine = escapeHTML([biz?.emailContact, biz?.phoneContact].filter(Boolean).join(" • "));
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Bound each canvas so long annual reports do not exceed browser canvas limits.
  for (let offset = 0; offset < Math.max(rows.length, 1); offset += 100) {
    options.signal?.throwIfAborted();
    const pageRows = rows.slice(offset, offset + 100);
    options.onProgress?.({ phase: 'rendering', message: `Rendering report records ${offset + 1}-${offset + pageRows.length} of ${rows.length}...`, completed: offset, total: rows.length });

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "1100px";
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "40px";
    container.style.fontFamily =
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.color = "#0f172a";
    container.style.boxSizing = "border-box";

    container.innerHTML = `
      <div style="position: relative; overflow: hidden; background-color: #ffffff;">
        <div style="position: relative; z-index: 1;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #064e3b; padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="/VinoffLogo.webp" style="width: 48px; height: 48px; object-fit: contain;" />
              <div>
                <div style="font-size: 20px; font-weight: 900; color: #064e3b; text-transform: uppercase;">${brandTitle}</div>
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">OFFICIAL AUDIT REPORT • ${escapeHTML(title.toUpperCase())}</div>
                ${options.subtitle ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">${escapeHTML(options.subtitle)}</div>` : ''}
                ${contactLine ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${contactLine}</div>` : ""}
              </div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div>Generated: <strong>${new Date().toLocaleString()}</strong></div>
              <div>Platform: ${businessName}</div>
            </div>
          </div>

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background-color: #064e3b; color: #ffffff; text-align: left;">
                ${headers
                  .map(
                    (h) =>
                      `<th style="padding: 10px 12px; font-weight: 900; font-size: 10px; text-transform: uppercase;">${escapeHTML(h)}</th>`
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${pageRows
                .map(
                  (r, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${
                  idx % 2 === 0 ? "#ffffff" : "#f8fafc"
                };">
                  ${r
                    .map(
                      (cell) =>
                        `<td style="padding: 10px 12px; font-weight: 600; color: #334155;">${
                          escapeHTML(cell)
                        }</td>`
                    )
                    .join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <!-- Footer -->
          <div style="margin-top: 24px; padding-top: 16px; padding-bottom: 8px; line-height: 1.5; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8;">
            Confidential Audit Log • ${escapeHTML(wm)} • Total Records: ${rows.length}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    let canvas;
    try {
      canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
    } finally {
      container.remove();
    }

    options.signal?.throwIfAborted();
    if (offset > 0) pdf.addPage();
    appendCanvasToPDF(pdf, canvas, wm);
    canvas.width = 0;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return new File([pdf.output('blob')], `${safeExportFilename(filename)}.pdf`, { type: 'application/pdf' });
};

export const exportHistoryPDF = async (title, filename, headers, rows) => {
  const file = await createHistoryPDFFile(title, filename, headers, rows);
  saveExportBlob(file, file.name);
};
