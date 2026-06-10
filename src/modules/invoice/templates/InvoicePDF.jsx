import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register standard fonts
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helvetica/v1/helvetica.ttf' },
    { src: 'https://fonts.gstatic.com/s/helvetica/v1/helvetica-bold.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 20,
    marginBottom: 20,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  companySub: {
    fontSize: 8,
    color: '#64748B',
  },
  invoiceTitleContainer: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  invoiceNum: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22C55E', // Green brand color
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  billTo: {
    width: '45%',
  },
  billToTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  billToName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  billToBusiness: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  metaData: {
    width: '45%',
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontWeight: 'bold',
    color: '#64748B',
    marginRight: 6,
  },
  metaValue: {
    color: '#0F172A',
  },
  
  // Table styles
  table: {
    width: '100%',
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCol: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  colDesc: { width: '40%' },
  colType: { width: '15%', textAlignment: 'center' },
  colQty: { width: '12%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  
  itemDesc: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  
  // Financial Summary styles
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  notesContainer: {
    width: '50%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesBody: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 1.4,
  },
  totalsContainer: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginTop: 4,
    borderBottomWidth: 0,
  },
  totalLabel: {
    color: '#64748B',
  },
  totalValue: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  
  // Custom Color badges and totals
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  
  // Specific Color system as requested
  colorPaid: { color: '#22C55E' },
  colorPending: { color: '#F59E0B' },
  colorOverdue: { color: '#EF4444' },
  
  colorDeposit: { color: '#3B82F6', fontWeight: 'bold' },
  colorBalance: { color: '#10B981', fontWeight: 'bold' },
  colorTotal: { color: '#F59E0B', fontWeight: 'bold', fontSize: 13 },
  
  bgPaid: { backgroundColor: '#F0FDF4', color: '#22C55E' },
  bgPending: { backgroundColor: '#FFFBEB', color: '#F59E0B' },
  bgOverdue: { backgroundColor: '#FEF2F2', color: '#EF4444' }
});

const formatPDFCurrency = (value) => {
  return `$${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const InvoicePDF = ({ invoice }) => {
  if (!invoice) return null;
  
  const statusColorClass = invoice.status === 'Paid' 
    ? styles.bgPaid 
    : invoice.status === 'Overdue' 
      ? styles.bgOverdue 
      : styles.bgPending;

  const dateStr = invoice.createdAt?.seconds 
    ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString()
    : new Date().toLocaleDateString();

  const dueDateStr = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.companyName}>Vinoff Wholesales Ltd</Text>
            <Text style={styles.companySub}>Plot 14, Commercial Avenue, Lekki Phase 1, Lagos</Text>
            <Text style={styles.companySub}>support@vinoff.com | +234 80 9123 4567</Text>
          </View>
          <View style={styles.invoiceTitleContainer}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNum}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Client & Metadata Section */}
        <View style={styles.detailsContainer}>
          <View style={styles.billTo}>
            <Text style={styles.billToTitle}>Bill To</Text>
            <Text style={styles.billToName}>{invoice.customerName}</Text>
            {invoice.businessName && (
              <Text style={styles.billToBusiness}>{invoice.businessName}</Text>
            )}
            <Text style={styles.companySub}>Registered Bulk Purchase Outlet</Text>
          </View>
          
          <View style={styles.metaData}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status:</Text>
              <View style={[styles.statusBadge, statusColorClass]}>
                <Text>{invoice.status}</Text>
              </View>
            </View>
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
                <Text style={styles.metaLabel}>Order Ref:</Text>
                <Text style={styles.metaValue}>{invoice.orderId}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCol, styles.colDesc]}>Product Item Description</Text>
            <Text style={[styles.tableHeaderCol, styles.colType, { textAlign: 'center' }]}>Packaging</Text>
            <Text style={[styles.tableHeaderCol, styles.colQty, { textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderCol, styles.colPrice, { textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCol, styles.colTotal, { textAlign: 'right' }]}>Total</Text>
          </View>

          {invoice.items && invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.itemDesc}>{item.name}</Text>
              </View>
              <Text style={[styles.colType, { textAlign: 'center' }]}>
                {item.isCarton ? 'Carton' : 'Unit'}
              </Text>
              <Text style={[styles.colQty, { textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[styles.colPrice, { textAlign: 'right' }]}>
                {formatPDFCurrency(item.isCarton ? item.cartonPrice : item.unitPrice)}
              </Text>
              <Text style={[styles.colTotal, { textAlign: 'right', fontWeight: 'bold' }]}>
                {formatPDFCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Financial Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.notesContainer}>
            <Text style={styles.notesTitle}>Payment Instructions</Text>
            <Text style={styles.notesBody}>
              Please transfer the due deposit/balance to Vinoff Wholesales Ltd bank account: {"\n"}
              Bank: Guaranty Trust Bank (GTB) {"\n"}
              Account Name: Vinoff Wholesales Ltd {"\n"}
              Account Number: 0123456789 {"\n\n"}
              Upload a wire screenshot slip directly in the live support chat thread for real-time verification and shipping scheduling.
            </Text>
            {invoice.notes && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.notesTitle}>Invoice Notes</Text>
                <Text style={styles.notesBody}>{invoice.notes}</Text>
              </View>
            )}
          </View>

          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatPDFCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                  -{formatPDFCurrency(invoice.discount)}
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Deposit Paid</Text>
              <Text style={[styles.totalValue, styles.colorDeposit]}>
                {formatPDFCurrency(invoice.deposit)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Balance Due</Text>
              <Text style={[styles.totalValue, styles.colorBalance]}>
                {formatPDFCurrency(invoice.balance)}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={[styles.totalLabel, { fontWeight: 'bold', color: '#0F172A' }]}>Grand Total</Text>
              <Text style={styles.colorTotal}>{formatPDFCurrency(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, alignItems: 'center' }}>
          <Text style={{ fontSize: 8, color: '#94A3B8' }}>
            Generated by {invoice.createdBy || 'Admin'}. Thank you for buying wholesale with Vinoff!
          </Text>
        </View>

      </Page>
    </Document>
  );
};

export default InvoicePDF;
