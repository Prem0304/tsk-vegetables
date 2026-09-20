import { jsPDF } from 'jspdf';
import { Sale, PassbookEntry } from '../types';

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

export function generateSaleInvoicePDF(sale: Sale) {
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
  doc.text(`Date: ${sale.date}`, 112, 20);

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
  doc.text('T.S.K TRADERS', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`OFFICIAL ${entityType.toUpperCase()} LEDGER / PASSBOOK STATEMENT`, 14, 22);

  doc.setFontSize(9);
  doc.text(`Ph: 9715813463 / 8190801030 | Generated: ${new Date().toLocaleDateString('en-IN')}`, 120, 22);

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
  const message = `*T.S.K TRADERS - தக்காளி காய்கனி கமிஷன் மண்டி*
Ph: 9715813463 / 8190801030

*ஸ்ரீ வாழகுருநாதன் துணை | ஸ்ரீ அங்காள ஈஸ்வரி துணை*

*INVOICE RECEIPT:* #${sale.invoiceNo}
Date: ${sale.date}
Customer: ${sale.customerName}

*Dispatched Items:*
${sale.lineItems.map(item => `• ${item.crateSize} Crate ${item.grade ? `[${item.grade}]` : ''}: ${item.quantity} qty @ Rs ${item.ratePerCrate} = Rs ${item.total}`).join('\n')}

*Grand Total Amount:* Rs ${sale.totalAmount}
*Paid Amount:* Rs ${sale.paidAmount} (${sale.paymentMethod})
*Balance Due Added:* Rs ${sale.balanceAdded}

Thank you for trading with T.S.K TRADERS!
APMC Mandi Yard`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

