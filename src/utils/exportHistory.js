import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const exportHistoryCSV = (filename, headers, rows) => {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportHistoryPDF = async (title, filename, headers, rows) => {
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
      <!-- Watermark Overlay -->
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-around; pointer-events: none; opacity: 0.10; transform: rotate(-22deg); z-index: 10; text-align: center;">
        <div style="font-size: 48px; font-weight: 900; color: #047857; letter-spacing: 3px;">VINOFF &amp; CO.NIG.LTD</div>
        <div style="font-size: 48px; font-weight: 900; color: #047857; letter-spacing: 3px;">VINOFF &amp; CO.NIG.LTD</div>
        <div style="font-size: 48px; font-weight: 900; color: #047857; letter-spacing: 3px;">VINOFF &amp; CO.NIG.LTD</div>
      </div>

      <div style="position: relative; z-index: 1;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #064e3b; padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/VinoffLogo.png" style="width: 48px; height: 48px; object-fit: contain;" />
            <div>
              <div style="font-size: 20px; font-weight: 900; color: #064e3b;">VINOFF WHOLESALES</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">OFFICIAL AUDIT REPORT • ${title.toUpperCase()}</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Generated: <strong>${new Date().toLocaleString()}</strong></div>
            <div>Platform: Vinoff Commercial System</div>
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #064e3b; color: #ffffff; text-align: left;">
              ${headers
                .map(
                  (h) =>
                    `<th style="padding: 10px 12px; font-weight: 900; font-size: 10px; text-transform: uppercase;">${h}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${
                idx % 2 === 0 ? "#ffffff" : "#f8fafc"
              };">
                ${r
                  .map(
                    (cell) =>
                      `<td style="padding: 10px 12px; font-weight: 600; color: #334155;">${
                        cell ?? ""
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
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8;">
          Confidential Audit Log • VINOFF &amp; CO.NIG.LTD • Total Records: ${rows.length}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  document.body.removeChild(container);

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const pageCanvasHeight = Math.floor((canvas.width * pageHeight) / pageWidth);

  let yOffset = 0;
  let pageIndex = 0;

  while (yOffset < canvas.height) {
    const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - yOffset);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;

    const ctx = sliceCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

    ctx.drawImage(
      canvas,
      0, yOffset, canvas.width, currentSliceHeight,
      0, 0, canvas.width, currentSliceHeight
    );

    const sliceImgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
    const slicePdfHeight = (currentSliceHeight * pageWidth) / canvas.width;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(sliceImgData, "JPEG", 0, 0, pageWidth, slicePdfHeight);

    yOffset += pageCanvasHeight;
    pageIndex++;
  }

  pdf.save(`${filename}.pdf`);
};
