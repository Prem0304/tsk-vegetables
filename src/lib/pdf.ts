import { jsPDF } from 'jspdf';
import { Sale, PassbookEntry, Purchase } from '../types';

export function generateSaleInvoicePDF(sale: Sale) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Compact receipt size perfect for mandi printing
  });

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 148, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K VEGETABLES', 10, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wholesale Tomato Traders | APMC Mandi Yard', 10, 17);
  doc.text('Ph: +91 98765 00000 / +91 91234 00000', 10, 21);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 115, 12);
  doc.setFontSize(8);
  doc.text(`#${sale.invoiceNo}`, 115, 17);
  doc.text(`Date: ${sale.date}`, 115, 21);

  // Customer Details Box
  doc.setTextColor(15, 23, 42);
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(10, 32, 128, 20, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName, 14, 43);
  doc.setFontSize(8);
  doc.text(`Location: ${sale.notes || 'Vegetable Mandi Outward Dispatch'}`, 14, 48);

  // Items Table
  let yPos = 58;
  doc.setFillColor(22, 163, 74); // emerald-600
  doc.rect(10, yPos, 128, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Crate Size', 14, yPos + 5);
  doc.text('Qty', 60, yPos + 5);
  doc.text('Rate / Crate', 85, yPos + 5);
  doc.text('Total (Rs)', 115, yPos + 5);

  yPos += 7;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');

  sale.lineItems.forEach((item) => {
    yPos += 6;
    doc.text(`${item.crateSize} Crate`, 14, yPos);
    doc.text(`${item.quantity}`, 60, yPos);
    doc.text(`Rs ${item.ratePerCrate}`, 85, yPos);
    doc.text(`Rs ${item.total}`, 115, yPos);
  });

  // Totals Divider
  yPos += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(10, yPos, 138, yPos);

  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Grand Total:', 75, yPos);
  doc.text(`Rs ${sale.totalAmount}`, 115, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid Amount (${sale.paymentMethod}):`, 75, yPos);
  doc.text(`Rs ${sale.paidAmount}`, 115, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // red-600
  doc.text('Balance Dues Added:', 75, yPos);
  doc.text(`Rs ${sale.balanceAdded}`, 115, yPos);

  // Footer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business! Please return empty crates promptly.', 10, 135);
  doc.text('Computer Generated Invoice - Single Admin T.S.K Vegetables', 10, 139);

  doc.save(`${sale.invoiceNo}_${sale.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function generatePassbookPDF(entityName: string, entityType: 'Customer' | 'Supplier', entries: PassbookEntry[], pendingBalance: number) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K VEGETABLES', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`OFFICIAL ${entityType.toUpperCase()} LEDGER / PASSBOOK STATEMENT`, 14, 22);

  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 145, 22);

  // Entity Info Box
  doc.setTextColor(15, 23, 42);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 38, 182, 22, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${entityType}: ${entityName}`, 20, 46);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Current Outstanding ${entityType === 'Customer' ? 'Receivable' : 'Payable'}:`, 20, 53);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pendingBalance > 0 ? 220 : 22, pendingBalance > 0 ? 38 : 163, pendingBalance > 0 ? 38 : 74);
  doc.text(`Rs ${pendingBalance.toLocaleString('en-IN')}`, 110, 53);

  // Table Headers
  let yPos = 68;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, yPos, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 18, yPos + 5.5);
  doc.text('Type', 42, yPos + 5.5);
  doc.text('Reference / Note', 80, yPos + 5.5);
  doc.text('Debit (Rs)', 130, yPos + 5.5);
  doc.text('Credit (Rs)', 155, yPos + 5.5);
  doc.text('Balance (Rs)', 178, yPos + 5.5);

  yPos += 8;
  doc.setFontSize(8.5);

  entries.forEach((entry, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, yPos, 182, 7, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.date, 18, yPos + 5);
    doc.text(entry.transactionType.replace('_', ' '), 42, yPos + 5);

    const refNote = entry.referenceId ? `${entry.referenceId} ${entry.notes ? '- ' + entry.notes : ''}` : entry.notes || '-';
    doc.text(refNote.substring(0, 32), 80, yPos + 5);

    if (entry.type === 'Debit') {
      doc.text(`${entry.amount}`, 130, yPos + 5);
      doc.text('-', 155, yPos + 5);
    } else {
      doc.text('-', 130, yPos + 5);
      doc.text(`${entry.amount}`, 155, yPos + 5);
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`${entry.runningBalance}`, 178, yPos + 5);

    yPos += 7;
  });

  doc.save(`TSK_${entityType}_Passbook_${entityName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function generateWhatsAppBillLink(sale: Sale): string {
  const message = `*T.S.K VEGETABLES - INVOICE RECEIPT*
Bill No: ${sale.invoiceNo}
Date: ${sale.date}
Customer: ${sale.customerName}

*Items:*
${sale.lineItems.map(item => `• ${item.crateSize} Crate: ${item.quantity} qty @ Rs ${item.ratePerCrate} = Rs ${item.total}`).join('\n')}

*Total Amount:* Rs ${sale.totalAmount}
*Paid Amount:* Rs ${sale.paidAmount} (${sale.paymentMethod})
*Balance Due:* Rs ${sale.balanceAdded}

Thank you for trading with T.S.K Vegetables!
APMC Mandi Yard`;

  const phone = sale.customerId ? '' : ''; // Admin can enter/select customer phone
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
