import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Roboto",
  },
  // Top Header section
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 20,
    marginBottom: 24,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a", // slate-900
    marginBottom: 4,
  },
  companySub: {
    fontSize: 10,
    color: "#94a3b8", // slate-400
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b", // slate-800
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#15803d", // brand-green-700
    textAlign: "right",
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  
  // Metadata row (Billed To & Dates)
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc", // slate-50
    borderWidth: 1,
    borderColor: "#e2e8f0", // slate-200
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  metaLeft: {
    flex: 1,
  },
  metaRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  sectionSubtitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#94a3b8", // slate-400
    textTransform: "uppercase",
    marginBottom: 8,
  },
  billedName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  billedBusiness: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#166534", // green-800
    textTransform: "uppercase",
    marginBottom: 4,
  },
  billedType: {
    fontSize: 10,
    color: "#94a3b8",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
    gap: 12,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
  },

  // Table
  tableContainer: {
    marginBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f1f5f9",
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableCellText: {
    fontSize: 10,
    color: "#334155",
  },
  tableCellBold: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f172a",
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "center" },
  col3: { flex: 1, textAlign: "center" },
  col4: { flex: 1.5, textAlign: "right" },
  col5: { flex: 1.5, textAlign: "right" },

  // Footer splits
  footerGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  footerLeft: {
    flex: 1.2,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 18,
  },
  footerRight: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 18,
  },
  
  // Payment info
  paymentBlock: {
    marginBottom: 16,
  },
  paymentLine: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 4,
  },
  paymentLineBold: {
    fontWeight: "bold",
    color: "#334155",
  },
  termsText: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 1.4,
  },

  // Totals
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
  },
  totalRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 12,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#15803d",
  },
});

export default function InvoicePDF({ invoice }) {
  if (!invoice) return null;

  const dateStr = invoice.createdAt?.seconds
    ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString()
    : new Date(invoice.createdAt || Date.now()).toLocaleDateString();

  const dueDateStr = new Date(
    (invoice.createdAt?.seconds ? invoice.createdAt.seconds * 1000 : new Date(invoice.createdAt || Date.now()).getTime()) + 5 * 24 * 60 * 60 * 1000
  ).toLocaleDateString();

  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount) || 0;
  const subtotalAfterDiscount = invoice.subtotalAfterDiscount !== undefined 
    ? Number(invoice.subtotalAfterDiscount) 
    : Math.max(0, subtotal - discount);
  const vatRate = Number(invoice.vatRate) || 0;
  const vatAmount = invoice.vatAmount !== undefined ? Number(invoice.vatAmount) : 0;
  const shipping = Number(invoice.shipping) || 0;
  const total = invoice.total !== undefined ? Number(invoice.total) : (subtotalAfterDiscount + vatAmount + shipping);
  const deposit = Number(invoice.deposit) || 0;
  const balance = invoice.balance !== undefined ? Number(invoice.balance) : (total - deposit);

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid": return { bg: "#dcfce7", text: "#16a34a" };
      case "Pending": return { bg: "#fef3c7", text: "#d97706" };
      default: return { bg: "#fee2e2", text: "#dc2626" }; // Overdue
    }
  };
  const statusColors = getStatusColor(invoice.status);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyTitle}>Vinoff Wholesales Ltd</Text>
            <Text style={styles.companySub}>Plot 14, Commercial Avenue, Lekki Phase 1, Lagos</Text>
            <Text style={styles.companySub}>support@vinoff.com | +234 80 9123 4567</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber || invoice.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer and Metadata */}
        <View style={styles.metaGrid}>
          <View style={styles.metaLeft}>
            <Text style={styles.sectionSubtitle}>Billed Outlet</Text>
            <Text style={styles.billedName}>{invoice.customerName || invoice.client}</Text>
            {invoice.businessName && <Text style={styles.billedBusiness}>{invoice.businessName}</Text>}
            <Text style={styles.billedType}>Verified Wholesale Purchaser</Text>
          </View>
          <View style={styles.metaRight}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date Issued:</Text>
              <Text style={styles.metaValue}>{dateStr}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Due:</Text>
              <Text style={styles.metaValue}>{dueDateStr}</Text>
            </View>
            {invoice.orderId && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order Link:</Text>
                <Text style={styles.metaValue}>{invoice.orderId}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Created By:</Text>
              <Text style={styles.metaValue}>{invoice.createdBy || "Admin"}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableContainer}>
          <Text style={[styles.sectionSubtitle, { marginBottom: 8 }]}>Line Items Summary</Text>
          <View style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8 }}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>Item Description</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>Packaging</Text>
              <Text style={[styles.tableHeaderCell, styles.col3]}>Quantity</Text>
              <Text style={[styles.tableHeaderCell, styles.col4]}>Price</Text>
              <Text style={[styles.tableHeaderCell, styles.col5]}>Total</Text>
            </View>
            {invoice.items?.map((item, index) => {
              const price = item.isCarton ? item.cartonPrice : item.unitPrice;
              const lineTotal = item.quantity * price;
              return (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCellBold, styles.col1]}>{item.name}</Text>
                  <Text style={[styles.tableCellText, styles.col2]}>{item.isCarton ? "Carton" : "Unit"}</Text>
                  <Text style={[styles.tableCellText, styles.col3]}>{item.quantity} {item.isCarton ? "ctn" : "pcs"}</Text>
                  <Text style={[styles.tableCellText, styles.col4]}>₦{price.toLocaleString()}</Text>
                  <Text style={[styles.tableCellBold, styles.col5]}>₦{lineTotal.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Notes and Totals */}
        <View style={styles.footerGrid}>
          {/* Notes Left */}
          <View style={styles.footerLeft}>
            <View style={styles.paymentBlock}>
              <Text style={styles.sectionSubtitle}>Bank Wire Instructions</Text>
              {invoice.paymentInstructions ? (
                typeof invoice.paymentInstructions === 'object' ? (
                  <>
                    {invoice.paymentInstructions.bankName && (
                      <Text style={styles.paymentLine}>
                        Bank Name: <Text style={styles.paymentLineBold}>{invoice.paymentInstructions.bankName}</Text>
                      </Text>
                    )}
                    {invoice.paymentInstructions.accountName && (
                      <Text style={styles.paymentLine}>
                        Account Name: <Text style={styles.paymentLineBold}>{invoice.paymentInstructions.accountName}</Text>
                      </Text>
                    )}
                    {invoice.paymentInstructions.accountNumber && (
                      <Text style={styles.paymentLine}>
                        Account Number: <Text style={styles.paymentLineBold}>{invoice.paymentInstructions.accountNumber}</Text>
                      </Text>
                    )}
                    {invoice.paymentInstructions.instructions && (
                      <Text style={[styles.termsText, { marginTop: 4 }]}>{invoice.paymentInstructions.instructions}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.termsText}>{String(invoice.paymentInstructions)}</Text>
                )
              ) : (
                <>
                  <Text style={styles.paymentLine}>
                    Bank Name: <Text style={styles.paymentLineBold}>Guaranty Trust Bank (GTB)</Text>
                  </Text>
                  <Text style={styles.paymentLine}>
                    Account Name: <Text style={styles.paymentLineBold}>Vinoff Wholesales Ltd</Text>
                  </Text>
                  <Text style={styles.paymentLine}>
                    Account Number: <Text style={styles.paymentLineBold}>0123456789</Text>
                  </Text>
                </>
              )}
            </View>
            
            {invoice.notes && (
              <View>
                <Text style={styles.sectionSubtitle}>Special Terms</Text>
                <Text style={styles.termsText}>{invoice.notes}</Text>
              </View>
            )}
          </View>

          {/* Totals Right */}
          <View style={styles.footerRight}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₦{subtotal.toLocaleString()}</Text>
            </View>
            
            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount Applied:</Text>
                <Text style={[styles.totalValue, { color: "#e11d48" }]}>-₦{discount.toLocaleString()}</Text>
              </View>
            )}

            {discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal (after discount):</Text>
                <Text style={styles.totalValue}>₦{subtotalAfterDiscount.toLocaleString()}</Text>
              </View>
            )}

            {shipping > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping:</Text>
                <Text style={styles.totalValue}>₦{shipping.toLocaleString()}</Text>
              </View>
            )}

            <View style={[styles.totalRow, styles.totalRowDivider]}>
              <Text style={[styles.totalLabel, { color: "#2563eb" }]}>Deposit Amount Paid:</Text>
              <Text style={styles.totalValue}>₦{deposit.toLocaleString()}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: "#059669" }]}>Outstanding Balance:</Text>
              <Text style={styles.totalValue}>₦{balance.toLocaleString()}</Text>
            </View>

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>₦{total.toLocaleString()}</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
