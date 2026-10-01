import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "../services/api";
import { formatCurrency } from "./formatCurrency";
import { toast } from "../context/ToastContext";
import { unwrapApiRecord } from "./apiResponse";

/**
 * Helper to build standard Vinoff Commercial Invoice HTML for canvas rendering
 */
const buildInvoiceHTML = ({
  invoiceNumber,
  issuedDate,
  dueDate,
  issuedBy,
  status,
  statusBg,
  statusColor,
  statusBorder,
  customerName,
  customerCompany,
  customerEmail,
  customerPhone,
  customerAddress,
  orderRef,
  items,
  subtotal,
  discount,
  deliveryFee,
  total,
  notes,
  bankName,
  accountName,
  accountNumber,
  bankInstructions,
}) => `
  <div style="position: relative; overflow: hidden; background-color: #ffffff;">
    <!-- Overlay Watermark -->
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-around; pointer-events: none; opacity: 0.11; transform: rotate(-22deg); z-index: 10; text-align: center; padding: 100px 0;">
      <div style="margin: 40px 0;">
        <div style="font-size: 46px; font-weight: 900; color: #047857; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">VINOFF &amp; CO.NIG.LTD</div>
        <div style="font-size: 38px; font-weight: 900; color: #047857; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">VINOFF &amp; CO.NIG.LTD</div>
      </div>
      <div style="margin: 40px 0;">
        <div style="font-size: 46px; font-weight: 900; color: #047857; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">VINOFF &amp; CO.NIG.LTD</div>
        <div style="font-size: 38px; font-weight: 900; color: #047857; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">VINOFF &amp; CO.NIG.LTD</div>
      </div>
      <div style="margin: 40px 0;">
        <div style="font-size: 46px; font-weight: 900; color: #047857; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">VINOFF &amp; CO.NIG.LTD</div>
        <div style="font-size: 38px; font-weight: 900; color: #047857; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">VINOFF &amp; CO.NIG.LTD</div>
      </div>
    </div>

    <!-- Foreground Content -->
    <div style="position: relative; z-index: 1;">
      <div style="border-bottom: 3px solid #064e3b; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; box-sizing: border-box;">
        <div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="/VinoffLogo.webp" alt="Vinoff Logo" style="width: 56px; height: 56px; object-fit: contain;" />
            <div style="font-size: 22px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">
              VINOFF <span style="color: #047857;">WHOLESALE</span>
            </div>
          </div>
          <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 6px;">
            Commercial Toiletries, Sanitizers & Industrial Detergents
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Email: sales@vinoff.com &bull; Tel: +234 80 1234 5678
          </div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; text-align: right; box-sizing: border-box;">
          <div style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1.2;">
            COMMERCIAL INVOICE
          </div>
          <div style="font-family: monospace; font-size: 14px; font-weight: 800; color: #047857; margin-top: 3px;">
            #${invoiceNumber}
          </div>
          <div style="margin-top: 6px; margin-bottom: 6px; display: flex; justify-content: flex-end; width: 100%;">
            <span style="display: inline-flex; align-items: center; justify-content: center; padding: 4px 14px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; line-height: 1.2; box-sizing: border-box; white-space: nowrap;">
              ${status}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Issued: <strong style="color: #334155;">${issuedDate}</strong>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Due Date: <strong style="color: #334155;">${dueDate}</strong>
          </div>
          ${
            issuedBy
              ? `<div style="font-size: 11px; color: #047857; font-weight: 800; margin-top: 3px;">
                  Issued by: ${issuedBy}
                </div>`
              : `<div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 3px;">
                  Issued by: <span style="display: inline-block; width: 140px; border-bottom: 1px dashed #cbd5e1; margin-left: 4px;">&nbsp;</span>
                </div>`
          }
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px; box-sizing: border-box;">
        <div>
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 4px;">
            Billed To Customer
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
            ${customerName}
          </div>
          ${customerCompany ? `<div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 2px;">${customerCompany}</div>` : ""}
          ${customerEmail ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${customerEmail}</div>` : ""}
          ${customerPhone ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">${customerPhone}</div>` : ""}
          ${customerAddress ? `<div style="font-size: 11px; color: #64748b; margin-top: 1px;">${customerAddress}</div>` : ""}
        </div>

        <div style="text-align: right;">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 4px;">
            Order Reference
          </div>
          <div style="font-size: 13px; font-family: monospace; font-weight: 800; color: #0f172a;">
            ${orderRef ? `#${orderRef}` : "Direct Wholesale Issuance"}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            Platform: Vinoff Commercial Portal
          </div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; box-sizing: border-box;">
        <thead>
          <tr style="border-bottom: 2px solid #cbd5e1; background-color: #f1f5f9; text-align: left;">
            <th style="padding: 10px 14px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Description</th>
            <th style="padding: 10px 14px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: center;">Qty</th>
            <th style="padding: 10px 14px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: right;">Unit Price</th>
            <th style="padding: 10px 14px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: right;">Total Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item, idx) => `
            <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? "#ffffff" : "#fcfdfd"};">
              <td style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #1e293b;">
                ${item.description || item.name || "Commercial Product"}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #475569; text-align: center;">
                ${item.quantity || 1}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; font-weight: 600; color: #475569; text-align: right;">
                ₦${Number(item.unitPrice || 0).toLocaleString()}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; font-weight: 800; color: #0f172a; text-align: right;">
                ₦${Number(item.total || (item.quantity * item.unitPrice) || 0).toLocaleString()}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; margin-bottom: 28px; box-sizing: border-box;">
        <div style="max-width: 320px;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 6px;">
            Payment Instructions (Bank Transfer)
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.6;">
            <div>Bank: <strong>${bankName || "Guaranty Trust Bank (GTB)"}</strong></div>
            <div>Account Name: <strong>${accountName || "Vinoff Wholesales Ltd"}</strong></div>
            <div>Account Number: <strong style="font-family: monospace; font-size: 12px; color: #047857;">${accountNumber || "0123456789"}</strong></div>
          </div>
          ${
            bankInstructions
              ? `<div style="margin-top: 8px; font-size: 11px; color: #64748b; font-style: italic; background-color: #f8fafc; padding: 6px 10px; border-radius: 8px;">${bankInstructions}</div>`
              : ""
          }
          ${
            notes
              ? `<div style="margin-top: 8px; font-size: 11px; color: #64748b; font-style: italic; background-color: #f8fafc; padding: 6px 10px; border-radius: 8px;">
                  Note: ${notes}
                </div>`
              : ""
          }
        </div>

        <div style="width: 280px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; padding: 4px 0;">
            <span>Subtotal:</span>
            <span style="font-weight: 700; color: #1e293b;">₦${subtotal.toLocaleString()}</span>
          </div>

          ${
            discount > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 12px; color: #dc2626; padding: 4px 0;">
                  <span>Discount:</span>
                  <span style="font-weight: 700;">-₦${discount.toLocaleString()}</span>
                </div>`
              : ""
          }

          ${
            deliveryFee > 0
              ? `<div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; padding: 4px 0;">
                  <span>Delivery Fee:</span>
                  <span style="font-weight: 700; color: #1e293b;">₦${deliveryFee.toLocaleString()}</span>
                </div>`
              : ""
          }

          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: #064e3b; padding: 12px 0 0 0; margin-top: 6px; border-top: 2px solid #064e3b;">
            <span>Total Payable:</span>
            <span>₦${total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; text-align: center; font-size: 10px; color: #94a3b8;">
        Official Commercial Invoice &bull; Thank you for your partnership with Vinoff Wholesale E-Commerce.
      </div>
    </div>
  </div>
`;

/**
 * Adds canvas to jsPDF supporting multiple pages for long documents with high visual quality and minimal file size.
 * Slices the canvas per A4 page and compresses each page as high-quality JPEG.
 */
const appendCanvasToJsPDF = (pdf, canvas) => {
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

  // Calculate canvas pixel height corresponding to one A4 page
  const pageCanvasHeight = Math.floor((canvas.width * pageHeight) / pageWidth);

  let yOffset = 0;
  let pageIndex = 0;

  while (yOffset < canvas.height) {
    const currentSliceHeight = Math.min(pageCanvasHeight, canvas.height - yOffset);

    // Create temporary canvas for current page slice
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;

    const ctx = sliceCanvas.getContext("2d");
    // Draw solid white background so transparent areas render white in JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

    // Draw slice of original canvas onto temporary slice canvas
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
};

/**
 * Helper to prepare normalized invoice parameters
 */
const extractInvoiceParams = (invData) => {
  const invoiceNumber = invData.invoiceNumber || "INV-000";
  const issuedDate = new Date(invData.date || invData.createdAt || Date.now()).toLocaleDateString();
  const dueDate = invData.dueDate ? new Date(invData.dueDate).toLocaleDateString() : "On Receipt";
  const status = (invData.status || "Pending").toUpperCase();

  const customerName =
    invData.customer?.name ||
    `${invData.customer?.firstName || ""} ${invData.customer?.lastName || ""}`.trim() ||
    "Commercial Buyer";
  const customerCompany = invData.customer?.company || invData.customer?.profile?.companyName || "";
  const customerEmail = invData.customer?.email || "";
  const customerPhone = invData.customer?.phone || "";
  const customerAddress =
    invData.customer?.address ||
    invData.customer?.profile?.address ||
    [invData.customer?.profile?.city, invData.customer?.profile?.state].filter(Boolean).join(", ") ||
    "";

  // Format line items with explicit (CTN) or (Pieces) tag
  const rawItems = Array.isArray(invData.items) ? invData.items : [];
  const items = rawItems.map((item) => {
    let baseName = item.description || item.name || "Commercial Product";
    baseName = baseName.replace(/\s*\((CTN|Pieces|ctn|pieces|Units|units)\)\s*$/i, "").trim();

    const isPiece =
      item.isCarton === false ||
      item.unitType === "pieces" ||
      item.unitType === "units" ||
      item.isPieces === true ||
      item.unit === "pieces" ||
      item.unit === "units" ||
      /\(Pieces\)/i.test(item.description || item.name || "");

    const unitTag = isPiece ? "(Pieces)" : "(CTN)";
    const description = `${baseName} ${unitTag}`;
    const unitPrice = Number(item.unitPrice || item.price || 0);
    const quantity = Number(item.quantity || 1);
    const total = Number(item.total || quantity * unitPrice);

    return {
      ...item,
      description,
      quantity,
      unitPrice,
      total,
    };
  });

  const subtotal = Number(invData.subtotal || items.reduce((sum, i) => sum + i.total, 0));
  const discount = Number(invData.discount || 0);
  const deliveryFee = Number(invData.deliveryFee || 0);
  const total = Number(invData.total || invData.totalAmount || subtotal - discount + deliveryFee);
  const notes = invData.notes || "";
  const orderRef = invData.order?.orderNumber || (typeof invData.order === "string" ? invData.order : null);

  let issuedBy = "";
  if (invData.createdBy) {
    if (typeof invData.createdBy === "object") {
      issuedBy =
        invData.createdBy.name ||
        `${invData.createdBy.firstName || ""} ${invData.createdBy.lastName || ""}`.trim();
    } else if (typeof invData.createdBy === "string") {
      issuedBy = invData.createdBy;
    }
  }
  if (!issuedBy && invData.issuedBy) {
    issuedBy = invData.issuedBy;
  }

  const statusBg = status === "PAID" ? "#ecfdf5" : status === "CANCELLED" ? "#fef2f2" : "#fffbeb";
  const statusColor = status === "PAID" ? "#047857" : status === "CANCELLED" ? "#b91c1c" : "#b45309";
  const statusBorder = status === "PAID" ? "#a7f3d0" : status === "CANCELLED" ? "#fecaca" : "#fde68a";

  return {
    invoiceNumber,
    issuedDate,
    dueDate,
    issuedBy,
    status,
    statusBg,
    statusColor,
    statusBorder,
    customerName,
    customerCompany,
    customerEmail,
    customerPhone,
    customerAddress,
    orderRef,
    items,
    subtotal,
    discount,
    deliveryFee,
    total,
    notes,
    bankName: "",
    accountName: "",
    accountNumber: "",
    bankInstructions: "",
  };
};

/**
 * Fetches bank details from the API with a short-lived in-memory cache to avoid redundant requests.
 */
let _cachedBankDetails = null;
let _bankDetailsFetchedAt = 0;
const fetchBankDetails = async () => {
  const now = Date.now();
  // Cache for 5 minutes
  if (_cachedBankDetails && now - _bankDetailsFetchedAt < 5 * 60 * 1000) {
    return _cachedBankDetails;
  }
  try {
    const res = await api.get("/api/settings/bank-details");
    const data = res.data?.data || res.data || res;
    if (data?.bankName) {
      _cachedBankDetails = data;
      _bankDetailsFetchedAt = now;
      return data;
    }
  } catch (e) {
    console.warn("Could not fetch bank details for PDF:", e);
  }
  return null;
};

/**
 * Downloads a pixel-perfect, custom Vinoff Commercial Invoice PDF directly to the user's computer.
 * Does not invoke browser print dialogs or popups. Multi-page ready.
 * @param {string|object} invoiceOrId - The invoice ID string or the full invoice object
 */
export const downloadInvoicePDF = async (invoiceOrId) => {
  let invData = null;

  try {
    if (typeof invoiceOrId === "string") {
      try {
        const res = await api.get(`/api/invoices/${invoiceOrId}/download`);
        invData = unwrapApiRecord(res);
      } catch (e) {
        // Fallback to standard invoice endpoint
        const res = await api.get(`/api/invoices/${invoiceOrId}`);
        invData = unwrapApiRecord(res);
      }
    } else if (invoiceOrId && typeof invoiceOrId === "object") {
      invData = invoiceOrId;
    }

    if (!invData) {
      throw new Error("Unable to retrieve invoice data for download.");
    }

    const params = extractInvoiceParams(invData);

    // Fetch live bank details and merge into params
    const bankData = await fetchBankDetails();
    if (bankData) {
      params.bankName = bankData.bankName || params.bankName;
      params.accountName = bankData.accountName || params.accountName;
      params.accountNumber = bankData.accountNumber || params.accountNumber;
      params.bankInstructions = bankData.instructions || "";
    }

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "800px";
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "48px 56px";
    container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.color = "#0f172a";
    container.style.boxSizing = "border-box";
    container.style.zIndex = "-1";

    container.innerHTML = buildInvoiceHTML(params);
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    document.body.removeChild(container);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    appendCanvasToJsPDF(pdf, canvas);

    const filename = `Invoice-${params.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
    pdf.save(filename);

    toast.success(`Invoice ${params.invoiceNumber} downloaded successfully as PDF`, "Download Complete");
    return true;
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    toast.error(err.message || "Could not generate invoice PDF", "Download Failed");
    throw err;
  }
};

/**
 * Generates an invoice PDF File object for uploading or sharing to chat (multi-page support)
 */
export const createInvoicePDFFile = async (invoiceOrId) => {
  let invData = null;
  if (typeof invoiceOrId === "string") {
    try {
      const res = await api.get(`/api/invoices/${invoiceOrId}`);
      invData = unwrapApiRecord(res);
    } catch (e) {
      // ignore
    }
  } else if (invoiceOrId && typeof invoiceOrId === "object") {
    invData = invoiceOrId;
  }

  if (!invData) throw new Error("Invoice data unavailable");

  const params = extractInvoiceParams(invData);

  // Fetch live bank details and merge into params
  const bankData = await fetchBankDetails();
  if (bankData) {
    params.bankName = bankData.bankName || params.bankName;
    params.accountName = bankData.accountName || params.accountName;
    params.accountNumber = bankData.accountNumber || params.accountNumber;
    params.bankInstructions = bankData.instructions || "";
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "800px";
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "48px 56px";
  container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.color = "#0f172a";
  container.style.boxSizing = "border-box";

  container.innerHTML = buildInvoiceHTML(params);
  document.body.appendChild(container);

  const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  document.body.removeChild(container);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  appendCanvasToJsPDF(pdf, canvas);

  const filename = `Invoice-${params.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
  const pdfBlob = pdf.output("blob");
  return new File([pdfBlob], filename, { type: "application/pdf" });
};

/**
 * Legacy HTML element PDF capture with multi-page support
 */
export const generateInvoicePDF = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const hiddenElements = element.querySelectorAll(".print\\:hidden");
    hiddenElements.forEach((el) => {
      el.style.display = "none";
    });

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    hiddenElements.forEach((el) => {
      el.style.display = "";
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    appendCanvasToJsPDF(pdf, canvas);
    pdf.save(filename || "Invoice.pdf");
    toast.success("Document downloaded as PDF");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error(error.message || "Failed to generate PDF");
  }
};

/**
 * Downloads a certified Daily Financial Ledger & Expense Statement PDF
 * @param {string|object} ledgerOrDate - The day date string (YYYY-MM-DD) or full ledger object
 */
export const downloadDailyExpensePDF = async (ledgerOrDate) => {
  let ledger = null;

  try {
    if (typeof ledgerOrDate === "string") {
      const res = await api.get(`/api/admin/expenses/day/${ledgerOrDate}`);
      ledger = res.data?.ledger || res.data?.data || res.data;
    } else if (ledgerOrDate && typeof ledgerOrDate === "object") {
      ledger = ledgerOrDate;
    }

    if (!ledger) {
      throw new Error("Expense ledger details could not be retrieved.");
    }

    const dateStr = ledger.date || new Date().toISOString().split("T")[0];
    const adminName = ledger.loggedByAdmin?.name || ledger.loggedByAdmin?.email || "System Superadmin";
    const lineItems = Array.isArray(ledger.lineItems) ? ledger.lineItems : [];
    const evidenceList = Array.isArray(ledger.evidence) ? ledger.evidence : [];

    const openingBalance = Number(ledger.openingBalance || 0);

    const totalIncome = Number(
      ledger.totalIncome ?? (
        lineItems.filter((i) => i.type === "income").reduce((acc, i) => acc + Number(i.amount || 0), 0)
      )
    );

    const totalExpense = Number(
      ledger.totalExpenses ?? ledger.totalExpense ?? (
        lineItems.filter((i) => i.type === "expense").reduce((acc, i) => acc + Number(i.amount || 0), 0)
      )
    );

    const netAmount = Number(ledger.netAmount ?? (totalIncome - totalExpense));
    const closingBalance = Number(ledger.closingBalance ?? (openingBalance + netAmount));

    const htmlContent = `
      <div style="position: relative; overflow: hidden; background-color: #ffffff;">
        <!-- Watermark -->
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-around; pointer-events: none; opacity: 0.07; transform: rotate(-22deg); z-index: 10; text-align: center; padding: 80px 0;">
          <div style="margin: 40px 0; font-size: 42px; font-weight: 900; color: #047857; letter-spacing: 4px; text-transform: uppercase;">VINOFF OFFICIAL AUDIT</div>
          <div style="margin: 40px 0; font-size: 42px; font-weight: 900; color: #047857; letter-spacing: 4px; text-transform: uppercase;">VINOFF OFFICIAL AUDIT</div>
          <div style="margin: 40px 0; font-size: 42px; font-weight: 900; color: #047857; letter-spacing: 4px; text-transform: uppercase;">VINOFF OFFICIAL AUDIT</div>
        </div>

        <div style="position: relative; z-index: 1;">
          <!-- Header -->
          <div style="border-bottom: 3px solid #064e3b; padding-bottom: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/VinoffLogo.webp" alt="Vinoff Logo" style="width: 52px; height: 52px; object-fit: contain;" />
                <div>
                  <div style="font-size: 22px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px;">
                    VINOFF <span style="color: #047857;">&amp; CO. NIG. LTD</span>
                  </div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 600;">
                    Daily Financial Operations &amp; Expense Report
                  </div>
                </div>
              </div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">
                Generated: ${new Date().toLocaleString()} &bull; Official Daily Statement
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
                DAILY EXPENSE STATEMENT
              </div>
              <div style="font-size: 13px; font-weight: 800; color: #047857; margin-top: 2px;">
                Period: ${dateStr}
              </div>
              <div style="margin-top: 6px;">
                <span style="display: inline-block; padding: 3px 12px; border-radius: 9999px; font-size: 9px; font-weight: 800; text-transform: uppercase; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
                  AUDITED &amp; CLOSED
                </span>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                Admin: <strong style="color: #334155;">${adminName}</strong>
              </div>
            </div>
          </div>

          <!-- Summary Balance Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px;">
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px;">
              <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Opening Balance</div>
              <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 4px;">₦${openingBalance.toLocaleString()}</div>
            </div>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 10px;">
              <div style="font-size: 9px; font-weight: 800; color: #166534; text-transform: uppercase;">Day Inflow (Income)</div>
              <div style="font-size: 14px; font-weight: 900; color: #15803d; margin-top: 4px;">+₦${totalIncome.toLocaleString()}</div>
            </div>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 10px;">
              <div style="font-size: 9px; font-weight: 800; color: #991b1b; text-transform: uppercase;">Day Outflow (Expense)</div>
              <div style="font-size: 14px; font-weight: 900; color: #b91c1c; margin-top: 4px;">-₦${totalExpense.toLocaleString()}</div>
            </div>
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 10px;">
              <div style="font-size: 9px; font-weight: 800; color: #047857; text-transform: uppercase;">Closing Balance</div>
              <div style="font-size: 14px; font-weight: 900; color: #064e3b; margin-top: 4px;">₦${closingBalance.toLocaleString()}</div>
            </div>
          </div>

          <!-- Line Items Table -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 8px;">
              Ledger Transactions &amp; Receipts Breakdown (${lineItems.length} Entries)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: 800;">
                  <th style="padding: 8px 10px; text-align: left;">Category / Description</th>
                  <th style="padding: 8px 10px; text-align: center;">Type</th>
                  <th style="padding: 8px 10px; text-align: center;">Payment Method</th>
                  <th style="padding: 8px 10px; text-align: right;">Amount (₦)</th>
                </tr>
              </thead>
              <tbody>
                ${
                  lineItems.length === 0
                    ? `<tr><td colspan="4" style="text-align: center; padding: 18px; color: #94a3b8; font-style: italic;">No specific itemized entries recorded for this date.</td></tr>`
                    : lineItems
                        .map(
                          (item, index) => `
                        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                          <td style="padding: 8px 10px;">
                            <strong style="color: #0f172a;">${item.category || "General"}</strong>
                            ${item.description ? `<div style="font-size: 10px; color: #64748b; margin-top: 1px;">${item.description}</div>` : ""}
                          </td>
                          <td style="padding: 8px 10px; text-align: center;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; ${
                              item.type === 'income'
                                ? 'background-color: #dcfce7; color: #15803d;'
                                : 'background-color: #fee2e2; color: #b91c1c;'
                            }">
                              ${item.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </td>
                          <td style="padding: 8px 10px; text-align: center; color: #475569; font-size: 10px; text-transform: capitalize;">
                            ${item.paymentMethod || "Transfer / Cash"}
                          </td>
                          <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: ${
                            item.type === 'income' ? '#15803d' : '#b91c1c'
                          };">
                            ${item.type === 'income' ? '+' : '-'}₦${Number(item.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      `
                        )
                        .join("")
                }
              </tbody>
            </table>
          </div>

          <!-- Documented Receipts Section -->
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase;">
                Documented Receipts &amp; Uploaded Files (${evidenceList.length})
              </span>
              <span style="font-size: 10px; color: #047857; font-weight: 700;">
                Verified Cloudinary Secure Archive
              </span>
            </div>
            ${
              evidenceList.length === 0
                ? `<div style="font-size: 10px; color: #94a3b8; font-style: italic;">No digital receipt photos or physical voucher scans attached to this daily record.</div>`
                : `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    ${evidenceList
                      .map(
                        (ev, i) => `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 10px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px;">
                          #${i + 1} &bull; ${ev.filename || "Receipt Scan " + (i + 1)}
                        </span>
                        <span style="color: #047857; font-weight: 800; font-size: 9px; text-transform: uppercase;">Attached</span>
                      </div>
                    `
                      )
                      .join("")}
                  </div>`
            }
          </div>

          <!-- Official Stamp & Signoff -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #e2e8f0; padding-top: 18px; margin-top: 10px;">
            <div>
              <div style="font-size: 10px; color: #64748b; line-height: 1.4;">
                <strong>Certification Statement:</strong><br />
                This document certifies the day's financial ledger records as recorded in the Vinoff Enterprise System.<br />
                All transactions have been verified against source sales receipts, bank credits, and operational logs.
              </div>
            </div>

            <div style="text-align: center; border: 2px dashed #047857; border-radius: 12px; padding: 10px 18px; background-color: #f0fdf4;">
              <div style="font-size: 10px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 1px;">
                VINOFF FINANCE DESK
              </div>
              <div style="font-size: 9px; color: #166534; margin: 4px 0; font-weight: 700;">
                AUTHENTICATED STATEMENT
              </div>
              <div style="font-size: 8px; color: #64748b;">
                Date: ${dateStr}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "800px";
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "44px 50px";
    container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.color = "#0f172a";
    container.style.boxSizing = "border-box";
    container.style.zIndex = "-1";

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    document.body.removeChild(container);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    appendCanvasToJsPDF(pdf, canvas);

    const filename = `Daily-Expense-Statement-${dateStr}.pdf`;
    pdf.save(filename);

    toast.success(`Daily expense statement for ${dateStr} downloaded as PDF`, "Statement Downloaded");
    return true;
  } catch (err) {
    console.error("Failed to generate daily expense PDF:", err);
    toast.error(err.message || "Could not generate PDF", "Download Failed");
    throw err;
  }
};

// Backwards-compatible alias
export const downloadExpenseEvidencePDF = downloadDailyExpensePDF;

export default downloadInvoicePDF;

