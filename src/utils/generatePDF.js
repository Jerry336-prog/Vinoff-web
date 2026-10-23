import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "../services/api";
import { appendCanvasToPDF, getDocumentWatermarkText } from './documentWatermark';
import { toast } from "../context/ToastContext";
import { fetchInvoiceForExport, isInvoiceStampRequiredError, showInvoiceStampNotice } from '../services/invoice/downloadAccess';
import {
  getCachedBusinessInfo,
  fetchLiveBusinessInfo,
} from "../context/BusinessContext";

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
  businessName,
  brandTitle,
  tagline,
  emailContact,
  phoneContact,
  secondaryPhone,
  storeAddress,
}) => {
  const bTitle = (brandTitle || "VINOFF WHOLESALES").trim();
  const bParts = bTitle.split(/\s+/);
  const bPrimary = bParts[0] || "VINOFF";
  const bSecondary = bParts.slice(1).join(" ") || "WHOLESALES";

  return `
  <div style="position: relative; overflow: hidden; background-color: #ffffff;">
    <!-- Foreground Content -->
    <div style="position: relative; z-index: 1;">
      <div style="border-bottom: 3px solid #064e3b; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; box-sizing: border-box;">
        <div>
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="/VinoffLogo.webp" alt="Vinoff Logo" style="width: 56px; height: 56px; object-fit: contain;" />
            <div style="font-size: 22px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px; text-transform: uppercase;">
              ${bPrimary} <span style="color: #047857;">${bSecondary}</span>
            </div>
          </div>
          <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-top: 6px;">
            ${tagline || "Commercial Toiletries, Sanitizers & Industrial Detergents"}
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 600; margin-top: 3px;">
            Email: ${emailContact || "sales@vinoff.com"} &bull; Tel: ${phoneContact || "+234 80 1234 5678"}${secondaryPhone ? ` / ${secondaryPhone}` : ""}
          </div>
          ${
            storeAddress
              ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${storeAddress}</div>`
              : ""
          }
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
            Platform: ${businessName || "Vinoff Wholesales Ltd"}
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
            Secure Payment with Paystack
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.6;">
            <div>Sign in to your account and open this invoice to pay securely with Paystack.</div>
            <div>Successful payments are confirmed automatically. No receipt upload is required.</div>
          </div>
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

      <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; padding-bottom: 8px; line-height: 1.5; text-align: center; font-size: 10px; color: #94a3b8;">
        Official Commercial Invoice &bull; Thank you for your partnership with ${businessName || "Vinoff Wholesales Ltd"}.
      </div>
    </div>
  </div>
`;
};

/**
 * Helper to prepare normalized invoice parameters
 */
const extractInvoiceParams = (invData) => {
  const cachedBiz = getCachedBusinessInfo();

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

  const issuedBy = String(invData.issuedBy || '').trim();

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
    businessName: cachedBiz?.businessName || "Vinoff Wholesales Ltd",
    brandTitle: cachedBiz?.brandTitle || "VINOFF WHOLESALES",
    tagline: cachedBiz?.tagline || "Commercial Toiletries, Sanitizers & Industrial Detergents",
    watermarkText: cachedBiz?.watermarkText || "VINOFF & CO.NIG.LTD",
    emailContact: cachedBiz?.emailContact || "sales@vinoff.com",
    phoneContact: cachedBiz?.phoneContact || "+234 80 1234 5678",
    secondaryPhone: cachedBiz?.secondaryPhone || "",
    storeAddress: [cachedBiz?.shopAddress, cachedBiz?.complexArea, cachedBiz?.cityState].filter(Boolean).join(", "),
  };
};

/**
 * Fetches live document branding from the API / shared cache.
 */
const applyLiveBusinessAndBankParams = async (params, options = {}) => {
  const bizData = await (options.businessInfo || fetchLiveBusinessInfo().catch(() => getCachedBusinessInfo()));

  if (bizData) {
    params.businessName = bizData.businessName || params.businessName;
    params.brandTitle = bizData.brandTitle || params.brandTitle;
    params.tagline = bizData.tagline || params.tagline;
    params.watermarkText = bizData.watermarkText || params.watermarkText;
    params.emailContact = bizData.emailContact || params.emailContact;
    params.phoneContact = bizData.phoneContact || params.phoneContact;
    params.secondaryPhone = bizData.secondaryPhone ?? params.secondaryPhone;
    params.storeAddress = [bizData.shopAddress, bizData.complexArea, bizData.cityState]
      .filter(Boolean)
      .join(", ");
  }

};

/**
 * Downloads a pixel-perfect, custom Vinoff Commercial Invoice PDF directly to the user's computer.
 * Does not invoke browser print dialogs or popups. Multi-page ready.
 * @param {string|object} invoiceOrId - The invoice ID string or the full invoice object
 */
export const downloadInvoicePDF = async (invoiceOrId, options) => {
  try {
    const invData = await fetchInvoiceForExport(invoiceOrId, options);

    const params = extractInvoiceParams(invData);
    await applyLiveBusinessAndBankParams(params);

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

    appendCanvasToPDF(pdf, canvas, params.watermarkText);

    const filename = `Invoice-${params.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
    pdf.save(filename);

    toast.success(`Invoice ${params.invoiceNumber} downloaded successfully as PDF`, "Download Complete");
    return true;
  } catch (err) {
    if (isInvoiceStampRequiredError(err)) {
      await showInvoiceStampNotice();
      return false;
    }
    console.error("Failed to generate PDF:", err);
    toast.error(err.message || "Could not generate invoice PDF", "Download Failed");
    throw err;
  }
};

/**
 * Generates an invoice PDF File object for uploading or sharing to chat (multi-page support)
 */
export const createInvoicePDFFile = async (invoiceOrId, options) => {
  const invData = await fetchInvoiceForExport(invoiceOrId, options);
  options?.signal?.throwIfAborted();

  const params = extractInvoiceParams(invData);
  await applyLiveBusinessAndBankParams(params, options);

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

  let canvas;
  try {
    canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  } finally {
    container.remove();
  }
  options?.signal?.throwIfAborted();

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  appendCanvasToPDF(pdf, canvas, params.watermarkText);

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

    const bizData = (await fetchLiveBusinessInfo().catch(() => null)) || getCachedBusinessInfo();
    appendCanvasToPDF(pdf, canvas, bizData?.watermarkText);
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
export const downloadDailyExpensePDF = async (ledgerOrDate, { asFile = false, businessInfo, signal } = {}) => {
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
    signal?.throwIfAborted();

    const bizData = businessInfo || (await fetchLiveBusinessInfo().catch(() => null)) || getCachedBusinessInfo();
    const wmText = getDocumentWatermarkText(bizData?.watermarkText);
    const bTitle = (bizData?.brandTitle || "VINOFF & CO. NIG. LTD").trim();
    const bParts = bTitle.split(/\s+/);
    const bPrimary = bParts[0] || "VINOFF";
    const bSecondary = bParts.slice(1).join(" ") || "& CO. NIG. LTD";

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
        <div style="position: relative; z-index: 1;">
          <!-- Header -->
          <div style="border-bottom: 3px solid #064e3b; padding-bottom: 18px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <img src="/VinoffLogo.webp" alt="Vinoff Logo" style="width: 52px; height: 52px; object-fit: contain;" />
                <div>
                  <div style="font-size: 22px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px; text-transform: uppercase;">
                    ${bPrimary} <span style="color: #047857;">${bSecondary}</span>
                  </div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 600;">
                    Daily Financial Operations &amp; Expense Report
                  </div>
                </div>
              </div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 6px;">
                Generated: ${new Date().toLocaleString()} &bull; ${bizData?.emailContact || "sales@vinoff.com"} &bull; ${bizData?.phoneContact || "+234 80 1234 5678"}
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
    signal?.throwIfAborted();

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    appendCanvasToPDF(pdf, canvas, wmText);

    const filename = `Daily-Expense-Statement-${dateStr}.pdf`;
    if (asFile) return new File([pdf.output('blob')], filename, { type: 'application/pdf' });
    pdf.save(filename);

    toast.success(`Daily expense statement for ${dateStr} downloaded as PDF`, "Statement Downloaded");
    return true;
  } catch (err) {
    console.error("Failed to generate daily expense PDF:", err);
    if (!asFile) toast.error(err.message || "Could not generate PDF", "Download Failed");
    throw err;
  }
};

// Backwards-compatible alias
export const downloadExpenseEvidencePDF = downloadDailyExpensePDF;
export const createDailyExpensePDFFile = (ledger, options) => downloadDailyExpensePDF(ledger, { ...options, asFile: true });

export default downloadInvoicePDF;

