import * as XLSX from 'xlsx';
import { Customer, PassbookEntry, Sale } from '../types';

export interface ParsedCustomerImport {
  validCustomers: Array<{
    name: string;
    phone: string;
    shopLocation: string;
    openingBalance: number;
  }>;
  errors: string[];
  totalParsed: number;
}

export async function parseCustomerExcel(file: File): Promise<ParsedCustomerImport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet to JSON array of objects
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const validCustomers: ParsedCustomerImport['validCustomers'] = [];
        const errors: string[] = [];

        rawRows.forEach((row, index) => {
          const rowNum = index + 2; // Assuming row 1 is header
          
          // Flexible key matching
          const keys = Object.keys(row);
          const findVal = (possibleNames: string[]) => {
            const key = keys.find(k => possibleNames.some(p => k.trim().toLowerCase().includes(p.toLowerCase())));
            return key ? row[key] : undefined;
          };

          const name = String(findVal(['name', 'customer name', 'customer']) || '').trim();
          const phone = String(findVal(['phone', 'mobile', 'contact', 'whatsapp']) || '').trim();
          const address = String(findVal(['address', 'shop', 'location', 'shoplocation', 'place']) || '').trim();
          const rawBalance = findVal(['balance', 'opening balance', 'dues', 'pending']) || 0;
          const openingBalance = parseFloat(String(rawBalance)) || 0;

          if (!name) {
            errors.push(`Row ${rowNum}: Customer Name is missing.`);
            return;
          }

          validCustomers.push({
            name,
            phone: phone || 'N/A',
            shopLocation: address || 'Vegetable Mandi',
            openingBalance,
          });
        });

        resolve({
          validCustomers,
          errors,
          totalParsed: rawRows.length,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to read Excel/CSV file.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file contents.'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSampleCustomerExcel(): void {
  const sampleData = [
    { 'Customer Name': 'Ramesh Retail Veggies', 'Phone': '+91 9876543210', 'Shop Location': 'Market Yard Stall 12', 'Opening Balance': 4500 },
    { 'Customer Name': 'Modern Hotel & Dining', 'Phone': '+91 9123456789', 'Shop Location': 'Commercial Street', 'Opening Balance': 0 },
    { 'Customer Name': 'Venkateshwara Supermarket', 'Phone': '+91 9988776655', 'Shop Location': 'Indiranagar 100ft Rd', 'Opening Balance': 12000 },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CustomersTemplate');
  XLSX.writeFile(workbook, 'TSK_Customers_Import_Template.xlsx');
}

export function exportCustomersToExcel(customers: Customer[]): void {
  const exportData = customers.map(c => ({
    'Customer Name': c.name,
    'Phone': c.phone,
    'Shop Location': c.shopLocation,
    'Default Selling Rate (Small)': c.defaultSellingRateSmall || 'N/A',
    'Default Selling Rate (Big)': c.defaultSellingRateBig || 'N/A',
    'Pending Balance (₹)': c.pendingBalance,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  XLSX.writeFile(workbook, `TSK_Customers_List_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function exportPassbookToExcel(entries: PassbookEntry[], entityName: string): void {
  const exportData = entries.map(e => ({
    'Date': e.date,
    'Transaction Type': e.transactionType,
    'Type': e.type,
    'Amount (₹)': e.amount,
    'Running Balance (₹)': e.runningBalance,
    'Payment Mode': e.paymentMode || 'N/A',
    'Reference / Invoice': e.referenceId || 'N/A',
    'Notes': e.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Passbook');
  const cleanName = entityName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `TSK_Passbook_${cleanName}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function exportDailyCrateSalesToExcel(sales: Sale[], periodTitle: string): void {
  const exportRows: any[] = [];

  sales.forEach(s => {
    s.lineItems.forEach(item => {
      exportRows.push({
        'Date': s.date,
        'Invoice No': s.invoiceNo,
        'Customer Name': s.customerName,
        'Crate Size': item.crateSize,
        'Grade / Quality': item.grade || 'Standard',
        'Quantity (Crates)': item.quantity,
        'Rate Per Crate (₹)': item.ratePerCrate,
        'Line Total (₹)': item.total,
        'Bill Total Amount (₹)': s.totalAmount,
        'Amount Paid (₹)': s.paidAmount,
        'Dues Added (₹)': s.balanceAdded,
        'Payment Status': s.balanceAdded === 0 ? 'PAID FULL' : `Dues: ₹${s.balanceAdded}`,
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CrateSales');
  const cleanPeriod = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `TSK_Crate_Sales_${cleanPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
