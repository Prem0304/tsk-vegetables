import jsPDF from 'jspdf';
import { Sale, PassbookEntry, EmptyCrateLog, Customer, Supplier } from '../types';
import { formatDateWithDay, formatPhoneForWhatsApp } from './dateUtils';

export function printInvoiceElement(invoiceNo: string) {
  const elem = document.getElementById(`invoice-${invoiceNo}`);
  if (!elem) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice_${invoiceNo}</title>
        <script stroke="" src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&display=swap');
          body { font-family: 'Noto Sans Tamil', sans-serif; background: #ffffff; margin: 0; padding: 16px; }
          @media print {
            body { padding: 0; }
            .print\\:hidden { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${elem.outerHTML}
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 600);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function createSaleInvoicePDFDoc(sale: Sale): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 148, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K TRADERS', 10, 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wholesale Tomato Commission Mandi', 10, 15);
  doc.text('Ph: 9715813463 / 8190801030', 10, 20);
  doc.text('APMC Mandi Yard', 10, 24);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 112, 10);
  doc.setFontSize(8);
  doc.text(`#${sale.invoiceNo}`, 112, 15);
  doc.text(`Date: ${formatDateWithDay(sale.date)}`, 112, 20);

  // Customer Details Box
  doc.setTextColor(15, 23, 42);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, 34, 128, 20, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 14, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.customerName, 14, 45);
  doc.setFontSize(8);
  doc.text(`Location: ${sale.notes || 'Vegetable Mandi Outward Dispatch'}`, 14, 50);

  // Items Table
  let yPos = 60;
  doc.setFillColor(22, 163, 74);
  doc.rect(10, yPos, 128, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Item / Grade Category', 14, yPos + 5);
  doc.text('Qty', 65, yPos + 5);
  doc.text('Rate / Crate', 85, yPos + 5);
  doc.text('Total (Rs)', 115, yPos + 5);

  yPos += 7;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');

  sale.lineItems.forEach((item) => {
    yPos += 6;
    const gradeLabel = item.grade ? `${item.crateSize} (${item.grade})` : `${item.crateSize} Crate`;
    doc.text(gradeLabel.substring(0, 26), 14, yPos);
    doc.text(`${item.quantity}`, 65, yPos);
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
  doc.setTextColor(220, 38, 38);
  doc.text('Balance Dues Added:', 75, yPos);
  doc.text(`Rs ${sale.balanceAdded}`, 115, yPos);

  // Footer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for trading with T.S.K TRADERS! Please return empty crates promptly.', 10, 135);
  doc.text('Contact: 9715813463 / 8190801030', 10, 139);

  return doc;
}

export function generateSaleInvoicePDF(sale: Sale) {
  const doc = createSaleInvoicePDFDoc(sale);
  doc.save(`${sale.invoiceNo}_${sale.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export async function shareInvoiceOnWhatsApp(sale: Sale, customerPhone?: string): Promise<void> {
  const cleanPhone = formatPhoneForWhatsApp(customerPhone);
  const message = `*T.S.K TRADERS - தக்காளி காய்கனி கமிஷன் மண்டி*
Ph: 9715813463 / 8190801030

*ஸ்ரீ வாழகுருநாதன் துணை | ஸ்ரீ அங்காள ஈஸ்வரி துணை*

*INVOICE RECEIPT:* #${sale.invoiceNo}
Date: ${formatDateWithDay(sale.date)}
Customer: ${sale.customerName}

*Dispatched Items:*
${sale.lineItems.map(item => `• ${item.crateSize} Crate ${item.grade ? `[${item.grade}]` : ''}: ${item.quantity} qty @ Rs ${item.ratePerCrate} = Rs ${item.total}`).join('\n')}

*Grand Total Amount:* Rs ${sale.totalAmount}
*Paid Amount:* Rs ${sale.paidAmount} (${sale.paymentMethod})
*Balance Due Added:* Rs ${sale.balanceAdded}

Thank you for trading with T.S.K TRADERS!
APMC Mandi Yard`;

  const fileName = `${sale.invoiceNo}_${sale.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const doc = createSaleInvoicePDFDoc(sale);
  const pdfBlob = doc.output('blob');
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  // 1-Click Native Web Share API (Attaches PDF file directly into WhatsApp on supported devices/mobiles)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: `TSK Mandi Invoice #${sale.invoiceNo}`,
        text: message,
        files: [pdfFile],
      });
      return;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.log('Native file share failed, falling back:', err);
      } else {
        return; // User cancelled share sheet
      }
    }
  }

  // Fallback for Desktop Web Browsers: Download PDF file & Open customer's WhatsApp chat
  doc.save(fileName);
  const targetPath = cleanPhone ? cleanPhone : '';
  const whatsappUrl = `https://wa.me/${targetPath}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
  alert(`📄 Invoice PDF (${fileName}) downloaded!\n💬 WhatsApp chat opened for ${sale.customerName}.\n\nYou can attach the downloaded PDF file into the WhatsApp chat.`);
}

export function printPassbookElement(elementId: string) {
  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Passbook_Statement</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&display=swap');
          body { font-family: 'Noto Sans Tamil', sans-serif; background: #ffffff; margin: 0; padding: 16px; }
          @media print {
            body { padding: 0; }
            .print\\:hidden { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${elem.outerHTML}
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 600);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function generatePassbookPDF(entityName: string, entityType: 'Customer' | 'Supplier', entries: PassbookEntry[], pendingBalance: number) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner - Traditional Mandi Style
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K TRADERS', 14, 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Ph: 9715813463 / 8190801030', 14, 19);
  doc.text('Sri Vazhagurunathan Thunai | Sri Angala Eswari Thunai', 14, 24);
  doc.text('Wholesale Tomato Commission Mandi Yard', 14, 29);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${entityType.toUpperCase()} LEDGER PASSBOOK`, 128, 14);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Statement Date: ${formatDateWithDay(new Date().toISOString().slice(0, 10))}`, 128, 20);

  // Entity Info Box
  doc.setTextColor(15, 23, 42);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 42, 182, 22, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account Holder: ${entityName}`, 20, 50);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Current Outstanding ${entityType === 'Customer' ? 'Receivable Balance' : 'Payable Debt'}:`, 20, 57);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pendingBalance > 0 ? 220 : 22, pendingBalance > 0 ? 38 : 163, pendingBalance > 0 ? 38 : 74);
  doc.text(`Rs ${pendingBalance.toLocaleString('en-IN')}`, 125, 57);

  // Table Headers
  let yPos = 70;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, yPos, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date & Day', 18, yPos + 5.5);
  doc.text('Type', 62, yPos + 5.5);
  doc.text('Reference / Notes', 95, yPos + 5.5);
  doc.text(entityType === 'Customer' ? 'Billed (Rs)' : 'Purchased (Rs)', 138, yPos + 5.5);
  doc.text(entityType === 'Customer' ? 'Received (Rs)' : 'Paid (Rs)', 162, yPos + 5.5);
  doc.text('Balance (Rs)', 184, yPos + 5.5);

  yPos += 8;
  doc.setFontSize(8);

  entries.forEach((entry, idx) => {
    if (yPos > 265) {
      doc.addPage();
      yPos = 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, yPos, 182, 7, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateWithDay(entry.date), 18, yPos + 5);
    doc.text(entry.transactionType.replace('_', ' '), 62, yPos + 5);

    const refNote = entry.referenceId ? `${entry.referenceId} ${entry.notes ? '- ' + entry.notes : ''}` : entry.notes || '-';
    doc.text(refNote.substring(0, 26), 95, yPos + 5);

    if (entry.type === 'Debit') {
      doc.text(`Rs ${entry.amount.toLocaleString('en-IN')}`, 138, yPos + 5);
      doc.text('-', 162, yPos + 5);
    } else {
      doc.text('-', 138, yPos + 5);
      doc.text(`Rs ${entry.amount.toLocaleString('en-IN')}`, 162, yPos + 5);
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Rs ${entry.runningBalance.toLocaleString('en-IN')}`, 184, yPos + 5);

    yPos += 7;
  });

  // Footer Signatures
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  yPos += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${entityType} Signature`, 18, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('For T.S.K TRADERS', 160, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('(Authorized Signatory)', 160, yPos + 4);

  doc.save(`TSK_${entityType}_Passbook_${entityName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function generateWhatsAppBillLink(sale: Sale, customerPhone?: string): string {
  const cleanPhone = formatPhoneForWhatsApp(customerPhone);
  const message = `*T.S.K TRADERS - தக்காளி காய்கனி கமிஷன் மண்டி*
Ph: 9715813463 / 8190801030

*ஸ்ரீ வாழகுருநாதன் துணை | ஸ்ரீ அங்காள ஈஸ்வரி துணை*

*INVOICE RECEIPT:* #${sale.invoiceNo}
Date: ${formatDateWithDay(sale.date)}
Customer: ${sale.customerName}

*Dispatched Items:*
${sale.lineItems.map(item => `• ${item.crateSize} Crate ${item.grade ? `[${item.grade}]` : ''}: ${item.quantity} qty @ Rs ${item.ratePerCrate} = Rs ${item.total}`).join('\n')}

*Grand Total Amount:* Rs ${sale.totalAmount}
*Paid Amount:* Rs ${sale.paidAmount} (${sale.paymentMethod})
*Balance Due Added:* Rs ${sale.balanceAdded}

Thank you for trading with T.S.K TRADERS!
APMC Mandi Yard`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export async function shareInvoicePDFOnWhatsApp(sale: Sale, customerPhone?: string): Promise<void> {
  const cleanPhone = formatPhoneForWhatsApp(customerPhone);
  const pdfDoc = createSaleInvoicePDFDoc(sale);
  const pdfBlob = pdfDoc.output('blob');
  const fileName = `TSK_Invoice_${sale.invoiceNo}.pdf`;
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

  const message = `*T.S.K TRADERS - தக்காளி காய்கனி கமிஷன் மண்டி*
Ph: 9715813463 / 8190801030

*INVOICE RECEIPT:* #${sale.invoiceNo}
Date: ${formatDateWithDay(sale.date)}
Customer: ${sale.customerName}

*Dispatched Items:*
${sale.lineItems.map(item => `• ${item.crateSize} Crate ${item.grade ? `[${item.grade}]` : ''}: ${item.quantity} qty @ Rs ${item.ratePerCrate} = Rs ${item.total}`).join('\n')}

*Grand Total Amount:* Rs ${sale.totalAmount}
*Paid Amount:* Rs ${sale.paidAmount} (${sale.paymentMethod})
*Balance Due Added:* Rs ${sale.balanceAdded}

Thank you for trading with T.S.K TRADERS!
APMC Mandi Yard`;

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `TSK Invoice #${sale.invoiceNo}`,
        text: message,
      });
      return;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed, falling back to download + WhatsApp:', err);
      } else {
        return;
      }
    }
  }

  // Fallback for desktop/browsers: Auto-download PDF file & open WhatsApp Web/App directly to customer phone
  pdfDoc.save(fileName);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

export function generateDailyCrateSalesPDF(sales: Sale[], periodTitle: string): void {
  const doc = new jsPDF();

  const totalSmall = sales.reduce((sum, s) => {
    return sum + s.lineItems.filter(i => i.crateSize === 'Small').reduce((lSum, i) => lSum + i.quantity, 0);
  }, 0);

  const totalBig = sales.reduce((sum, s) => {
    return sum + s.lineItems.filter(i => i.crateSize === 'Big').reduce((lSum, i) => lSum + i.quantity, 0);
  }, 0);

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K TRADERS', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`CRATE SALES & DISPATCH REPORT (${periodTitle.toUpperCase()})`, 14, 22);
  doc.setFontSize(8.5);
  doc.text(`Ph: 9715813463 / 8190801030 | Date: ${new Date().toLocaleDateString('en-IN')}`, 120, 22);

  // Summary Metrics Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 36, 182, 18, 2, 2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Small Crates: ${totalSmall}`, 20, 47);
  doc.text(`Big Crates: ${totalBig}`, 75, 47);
  doc.text(`Total Crates: ${totalSmall + totalBig}`, 120, 47);
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Revenue: Rs ${totalRevenue.toLocaleString('en-IN')}`, 155, 47);

  // Table Headers
  let yPos = 60;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, yPos, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 18, yPos + 5.5);
  doc.text('Invoice #', 42, yPos + 5.5);
  doc.text('Customer Name', 72, yPos + 5.5);
  doc.text('Crate Breakdown & Rate', 118, yPos + 5.5);
  doc.text('Total (Rs)', 175, yPos + 5.5);

  yPos += 8;
  doc.setFontSize(8);

  sales.forEach((s, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, yPos, 182, 8, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateWithDay(s.date), 18, yPos + 5.5);
    doc.text(s.invoiceNo, 42, yPos + 5.5);
    doc.text(s.customerName.substring(0, 22), 72, yPos + 5.5);

    const itemsSummary = s.lineItems.map(i => `${i.quantity} ${i.crateSize} @ Rs ${i.ratePerCrate}`).join(', ');
    doc.text(itemsSummary.substring(0, 32), 118, yPos + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`${s.totalAmount}`, 175, yPos + 5.5);

    yPos += 8;
  });

  const cleanPeriod = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`TSK_Crate_Sales_Report_${cleanPeriod}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateEmptyCratesPDF(
  logs: EmptyCrateLog[],
  customers: Customer[],
  suppliers: Supplier[]
): void {
  const doc = new jsPDF();

  const totalSmallOut = customers.reduce((sum, c) => {
    const cLogs = logs.filter(l => l.entityType === 'Customer' && l.entityId === c.id);
    const given = cLogs.filter(l => l.crateSize === 'Small' && l.action === 'Given_To_Customer').reduce((s, l) => s + l.quantity, 0);
    const returned = cLogs.filter(l => l.crateSize === 'Small' && l.action === 'Returned_By_Customer').reduce((s, l) => s + l.quantity, 0);
    return sum + Math.max(0, given - returned);
  }, 0);

  const totalBigOut = customers.reduce((sum, c) => {
    const cLogs = logs.filter(l => l.entityType === 'Customer' && l.entityId === c.id);
    const given = cLogs.filter(l => l.crateSize === 'Big' && l.action === 'Given_To_Customer').reduce((s, l) => s + l.quantity, 0);
    const returned = cLogs.filter(l => l.crateSize === 'Big' && l.action === 'Returned_By_Customer').reduce((s, l) => s + l.quantity, 0);
    return sum + Math.max(0, given - returned);
  }, 0);

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K TRADERS', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPTY PLASTIC CRATES & RETURN REPORT', 14, 22);
  doc.setFontSize(8.5);
  doc.text(`Ph: 9715813463 / 8190801030 | Date: ${new Date().toLocaleDateString('en-IN')}`, 120, 22);

  // Metrics Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 36, 182, 18, 2, 2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Small Crates Out: ${totalSmallOut}`, 20, 47);
  doc.text(`Big Crates Out: ${totalBigOut}`, 85, 47);
  doc.setTextColor(217, 119, 6);
  doc.text(`Total Crates Out: ${totalSmallOut + totalBigOut}`, 145, 47);

  // Table Headers
  let yPos = 60;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, yPos, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Date', 18, yPos + 5.5);
  doc.text('Type', 40, yPos + 5.5);
  doc.text('Name', 65, yPos + 5.5);
  doc.text('Action Movement', 115, yPos + 5.5);
  doc.text('Size', 165, yPos + 5.5);
  doc.text('Qty', 182, yPos + 5.5);

  yPos += 8;
  doc.setFontSize(8);

  logs.forEach((l, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, yPos, 182, 8, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateWithDay(l.date), 18, yPos + 5.5);
    doc.text(l.entityType, 40, yPos + 5.5);
    doc.text(l.entityName.substring(0, 24), 65, yPos + 5.5);
    doc.text(l.action.replace(/_/g, ' '), 115, yPos + 5.5);
    doc.text(l.crateSize, 165, yPos + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`${l.quantity}`, 182, yPos + 5.5);

    yPos += 8;
  });

  doc.save(`TSK_Empty_Crates_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateCrateDuesPDF(
  customers: Customer[],
  suppliers: Supplier[],
  logs: EmptyCrateLog[]
): void {
  const doc = new jsPDF();

  const custBalances = customers.map(c => {
    const cLogs = logs.filter(l => l.entityType === 'Customer' && l.entityId === c.id);
    const smallGiven = cLogs.filter(l => l.crateSize === 'Small' && l.action === 'Given_To_Customer').reduce((s, l) => s + l.quantity, 0);
    const smallReturned = cLogs.filter(l => l.crateSize === 'Small' && l.action === 'Returned_By_Customer').reduce((s, l) => s + l.quantity, 0);
    const smallPending = Math.max(0, smallGiven - smallReturned);

    const bigGiven = cLogs.filter(l => l.crateSize === 'Big' && l.action === 'Given_To_Customer').reduce((s, l) => s + l.quantity, 0);
    const bigReturned = cLogs.filter(l => l.crateSize === 'Big' && l.action === 'Returned_By_Customer').reduce((s, l) => s + l.quantity, 0);
    const bigPending = Math.max(0, bigGiven - bigReturned);

    return {
      name: c.name,
      phone: c.phone,
      shop: c.shopLocation,
      smallPending,
      bigPending,
      totalPending: smallPending + bigPending,
    };
  });

  const totalSmallCust = custBalances.reduce((sum, c) => sum + c.smallPending, 0);
  const totalBigCust = custBalances.reduce((sum, c) => sum + c.bigPending, 0);
  const grandTotalCust = totalSmallCust + totalBigCust;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('T.S.K TRADERS', 14, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PENDING PLASTIC CRATE DUES STATEMENT', 14, 22);
  doc.setFontSize(8.5);
  doc.text(`Ph: 9715813463 / 8190801030 | Date: ${formatDateWithDay(new Date().toISOString().slice(0, 10))}`, 110, 22);

  // Summary Banner
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 36, 182, 18, 2, 2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Small Crates Due: ${totalSmallCust}`, 20, 47);
  doc.text(`Big Crates Due: ${totalBigCust}`, 85, 47);
  doc.setTextColor(220, 38, 38);
  doc.text(`Total Crates Pending Return: ${grandTotalCust}`, 140, 47);

  // Section Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Return Crates Outstanding List', 14, 62);

  // Table Headers
  let yPos = 66;
  doc.setFillColor(15, 23, 42);
  doc.rect(14, yPos, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Name', 18, yPos + 5.5);
  doc.text('Phone', 75, yPos + 5.5);
  doc.text('Location / Shop', 110, yPos + 5.5);
  doc.text('Small Due', 152, yPos + 5.5);
  doc.text('Big Due', 172, yPos + 5.5);
  doc.text('Total', 187, yPos + 5.5);

  yPos += 8;
  doc.setFontSize(8);

  custBalances.forEach((cb, idx) => {
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
    doc.text(cb.name.substring(0, 25), 18, yPos + 5);
    doc.text(cb.phone, 75, yPos + 5);
    doc.text((cb.shop || '-').substring(0, 20), 110, yPos + 5);
    doc.text(`${cb.smallPending}`, 152, yPos + 5);
    doc.text(`${cb.bigPending}`, 172, yPos + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cb.totalPending > 0 ? 220 : 15, cb.totalPending > 0 ? 38 : 23, cb.totalPending > 0 ? 38 : 42);
    doc.text(`${cb.totalPending}`, 187, yPos + 5);

    yPos += 7;
  });

  doc.save(`TSK_Pending_Return_Crates_Dues_${new Date().toISOString().slice(0, 10)}.pdf`);
}


