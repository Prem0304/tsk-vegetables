import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Wallet, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Share2,
  X,
  FileText,
  Box,
  ShoppingCart,
  Printer
} from 'lucide-react';
import { AppState } from '../lib/storage';
import { Customer, PassbookEntry, Sale } from '../types';
import { parseCustomerExcel, downloadSampleCustomerExcel, exportCustomersToExcel, exportPassbookToExcel } from '../lib/excel';
import { generatePassbookPDF, generateSaleInvoicePDF, generateWhatsAppBillLink, printInvoiceElement } from '../lib/pdf';
import { PrintableInvoice } from './PrintableInvoice';
import { formatDateWithDay, formatPhoneForWhatsApp } from '../lib/dateUtils';

interface CustomerManagementProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  isOpenPaymentModal: boolean;
  setIsOpenPaymentModal: (open: boolean) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  appState,
  setAppState,
  isOpenPaymentModal,
  setIsOpenPaymentModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'clear'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(appState.customers[0]?.id || null);

  // Excel Import State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);

  // New Customer State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custShop, setCustShop] = useState<string>('');
  const [rateSmall, setRateSmall] = useState<string>('340');
  const [rateBig, setRateBig] = useState<string>('580');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Receive Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const selectedCustomer = appState.customers.find(c => c.id === selectedCustomerId);
  const customerPassbook = appState.passbookEntries.filter(
    p => p.entityType === 'Customer' && p.entityId === selectedCustomerId
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Search and Filtered Customers
  useEffect(() => {
    if (showImportModal || showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showImportModal, showAddModal]);
  const filteredCustomers = appState.customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone.includes(searchTerm) ||
                          c.shopLocation.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'overdue') return matchesSearch && c.pendingBalance > 0;
    if (filterStatus === 'clear') return matchesSearch && c.pendingBalance <= 0;
    return matchesSearch;
  });

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await parseCustomerExcel(file);
      setImportResult(result);
    } catch (err: any) {
      alert('Failed to parse Excel: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.validCustomers.length === 0) return;

    const newCustomers: Customer[] = importResult.validCustomers.map((vc: any, i: number) => ({
      id: `cust-imp-${Date.now()}-${i}`,
      name: vc.name,
      phone: vc.phone,
      shopLocation: vc.shopLocation,
      pendingBalance: vc.openingBalance,
      createdAt: new Date().toISOString(),
    }));

    // Generate initial passbook entries for opening balances > 0
    const newPassbookEntries: PassbookEntry[] = newCustomers
      .filter(c => c.pendingBalance > 0)
      .map(c => ({
        id: `pb-imp-${Date.now()}-${c.id}`,
        date: new Date().toISOString().slice(0, 10),
        entityType: 'Customer',
        entityId: c.id,
        entityName: c.name,
        type: 'Debit',
        amount: c.pendingBalance,
        runningBalance: c.pendingBalance,
        transactionType: 'Adjustment',
        notes: 'Opening Balance imported via Excel',
        createdAt: new Date().toISOString(),
      }));

    setAppState(prev => ({
      ...prev,
      customers: [...newCustomers, ...prev.customers],
      passbookEntries: [...newPassbookEntries, ...prev.passbookEntries],
    }));

    setShowImportModal(false);
    setImportResult(null);
    alert(`Successfully imported ${newCustomers.length} customer records!`);
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    const openBal = parseFloat(openingBalance) || 0;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: custName,
      phone: custPhone || 'N/A',
      shopLocation: custShop || 'Vegetable Market',
      defaultSellingRateSmall: parseFloat(rateSmall) || undefined,
      defaultSellingRateBig: parseFloat(rateBig) || undefined,
      pendingBalance: openBal,
      createdAt: new Date().toISOString(),
    };

    let passbookEntries: PassbookEntry[] = [];
    if (openBal > 0) {
      passbookEntries.push({
        id: `pb-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        entityType: 'Customer',
        entityId: newCust.id,
        entityName: newCust.name,
        type: 'Debit',
        amount: openBal,
        runningBalance: openBal,
        transactionType: 'Adjustment',
        notes: 'Initial Opening Dues Balance',
        createdAt: new Date().toISOString(),
      });
    }

    setAppState(prev => ({
      ...prev,
      customers: [newCust, ...prev.customers],
      passbookEntries: [...passbookEntries, ...prev.passbookEntries],
    }));

    setSelectedCustomerId(newCust.id);
    setShowAddModal(false);
    setCustName('');
    setCustPhone('');
    setCustShop('');
    setOpeningBalance('0');
  };

  const handleReceivePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    const newRunningBalance = selectedCustomer.pendingBalance - paymentAmount;

    const newPassbookEntry: PassbookEntry = {
      id: `pb-${Date.now()}`,
      date: paymentDate,
      entityType: 'Customer',
      entityId: selectedCustomer.id,
      entityName: selectedCustomer.name,
      type: 'Credit',
      amount: paymentAmount,
      runningBalance: newRunningBalance,
      transactionType: 'Payment_Received',
      paymentMode,
      notes: paymentNotes || `Received payment via ${paymentMode}`,
      createdAt: new Date().toISOString(),
    };

    setAppState(prev => ({
      ...prev,
      customers: prev.customers.map(c => c.id === selectedCustomer.id ? { ...c, pendingBalance: newRunningBalance } : c),
      passbookEntries: [newPassbookEntry, ...prev.passbookEntries],
    }));

    setIsOpenPaymentModal(false);
    setPaymentAmount(0);
    setPaymentNotes('');
    alert(`Payment of ₹${paymentAmount} recorded for ${selectedCustomer.name}`);
  };

  const generateWhatsAppReminderLink = () => {
    if (!selectedCustomer) return '#';
    const message = `*T.S.K VEGETABLES - PAYMENT REMINDER*
Hello ${selectedCustomer.name},
This is a friendly reminder regarding your outstanding vegetable dues balance of *Rs ${selectedCustomer.pendingBalance.toLocaleString('en-IN')}*.

Please settle via UPI / Cash at APMC Mandi Yard at your earliest convenience.
Thank you!`;
    const cleanPhone = formatPhoneForWhatsApp(selectedCustomer.phone);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const [activeTabType, setActiveTabType] = useState<'supplies' | 'passbook'>('supplies');
  const [previewSaleModal, setPreviewSaleModal] = useState<Sale | null>(null);

  const selectedCustomerSales = appState.sales.filter(s => s.customerId === selectedCustomerId);

  // Total crates sold to this customer
  const totalSmallCratesSold = selectedCustomerSales.reduce((sum, s) => {
    return sum + s.lineItems.filter(i => i.crateSize === 'Small').reduce((lSum, i) => lSum + i.quantity, 0);
  }, 0);

  const totalBigCratesSold = selectedCustomerSales.reduce((sum, s) => {
    return sum + s.lineItems.filter(i => i.crateSize === 'Big').reduce((lSum, i) => lSum + i.quantity, 0);
  }, 0);

  const totalSalesRevenue = selectedCustomerSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaidRevenue = selectedCustomerSales.reduce((sum, s) => sum + s.paidAmount, 0);

  return (
    <div className="space-y-6">
      {/* Module Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Customer Management & Sales Ledgers
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track crates supplied, prices, sales history, dues balances, and passbook statements per customer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadSampleCustomerExcel()}
            className="glass-button-secondary text-xs px-3 py-2"
            title="Download Excel Import Template"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Sample Excel
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="glass-button-secondary text-xs px-3 py-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Upload className="w-4 h-4" />
            Import Excel/CSV
          </button>

          <button
            onClick={() => exportCustomersToExcel(appState.customers)}
            className="glass-button-secondary text-xs px-3 py-2"
          >
            <Download className="w-4 h-4" />
            Export Customers
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="glass-button-primary text-xs px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            + New Customer
          </button>
        </div>
      </div>

      {/* Two Column Layout: Customer Directory List (Left) & Passbook/Supplies Detail (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Directory (5 Cols) */}
        <div className="lg:col-span-5 glass-panel p-4 space-y-4">
          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, shop location..."
                className="glass-input w-full text-xs pl-9 py-2"
              />
            </div>

            <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${filterStatus === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({appState.customers.length})
              </button>
              <button
                onClick={() => setFilterStatus('overdue')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${filterStatus === 'overdue' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Overdue Dues
              </button>
              <button
                onClick={() => setFilterStatus('clear')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${filterStatus === 'clear' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Clear (₹0)
              </button>
            </div>
          </div>

          {/* Customer Card List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredCustomers.map((customer) => {
              const isSelected = selectedCustomerId === customer.id;
              const hasDues = customer.pendingBalance > 0;

              return (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{customer.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {customer.shopLocation}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" /> {customer.phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                        hasDues
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {hasDues ? `₹${customer.pendingBalance.toLocaleString('en-IN')}` : 'CLEAR'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {hasDues ? 'Pending Dues' : 'No Balance'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Details (Supplies History / Passbook) (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-5">
          {selectedCustomer ? (
            <>
              {/* Customer Header & Navigation Tabs */}
              <div className="space-y-3 pb-4 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-100">{selectedCustomer.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                        Customer Ledger
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedCustomer.shopLocation} • {selectedCustomer.phone}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setIsOpenPaymentModal(true)}
                      className="glass-button-primary text-xs px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600"
                    >
                      <Wallet className="w-4 h-4" />
                      + Receive Payment
                    </button>

                    <button
                      onClick={() => generatePassbookPDF(selectedCustomer.name, 'Customer', customerPassbook, selectedCustomer.pendingBalance)}
                      className="glass-button-secondary text-xs px-3 py-2"
                      title="Export PDF Statement"
                    >
                      <Download className="w-4 h-4" />
                      PDF Passbook
                    </button>

                    {selectedCustomer.pendingBalance > 0 && (
                      <a
                        href={generateWhatsAppReminderLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-button-secondary text-xs px-3 py-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5"
                        title="Send WhatsApp Reminder"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        WhatsApp Reminder
                      </a>
                    )}
                  </div>
                </div>

                {/* Sub Tab Switcher: Supplied Crates & Prices vs Passbook Ledger */}
                <div className="flex gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setActiveTabType('supplies')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activeTabType === 'supplies'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Box className="w-4 h-4 text-amber-300" />
                    📦 Crates & Prices Supplied ({selectedCustomerSales.length} Invoices)
                  </button>
                  <button
                    onClick={() => setActiveTabType('passbook')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activeTabType === 'passbook'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-300" />
                    📖 Full Passbook Timeline ({customerPassbook.length} Entries)
                  </button>
                </div>
              </div>

              {/* TAB 1: SUPPLIED CRATES & SALES SUMMARY */}
              {activeTabType === 'supplies' && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Small Crates Supplied</span>
                      <strong className="text-lg font-black text-amber-400 font-mono">{totalSmallCratesSold} Crates</strong>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Big Crates Supplied</span>
                      <strong className="text-lg font-black text-amber-400 font-mono">{totalBigCratesSold} Crates</strong>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Bill Value</span>
                      <strong className="text-lg font-black text-slate-100 font-mono">₹{totalSalesRevenue.toLocaleString('en-IN')}</strong>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Outstanding Dues</span>
                      <strong className={`text-lg font-black font-mono ${selectedCustomer.pendingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ₹{selectedCustomer.pendingBalance.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* Customer Supplies / Sales List Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-3">Invoice # & Date</th>
                          <th className="p-3">Items / Crates & Grades</th>
                          <th className="p-3 text-right">Bill Total</th>
                          <th className="p-3 text-right">Paid</th>
                          <th className="p-3 text-right">Dues Added</th>
                          <th className="p-3 text-right">View Mandi Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {selectedCustomerSales.length > 0 ? (
                          selectedCustomerSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-800/40 transition-all">
                              <td className="p-3 font-mono">
                                <strong className="text-emerald-400 block">{sale.invoiceNo}</strong>
                                <span className="text-slate-400 text-[10px] font-semibold block">{formatDateWithDay(sale.date)}</span>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  {sale.lineItems.map((item, idx) => (
                                    <div key={idx} className="bg-slate-900/80 border border-slate-700/80 px-2 py-1 rounded text-[11px] flex justify-between gap-2">
                                      <span className="font-semibold text-slate-100">
                                        {item.crateSize} Crate {item.grade ? `(${item.grade})` : ''}
                                      </span>
                                      <span className="font-mono text-emerald-400 font-bold">
                                        {item.quantity} Qty @ ₹{item.ratePerCrate} = ₹{item.total.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-right font-bold text-slate-100 font-mono">
                                ₹{sale.totalAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                                ₹{sale.paidAmount.toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 text-right font-bold text-rose-400 font-mono">
                                {sale.balanceAdded > 0 ? `₹${sale.balanceAdded.toLocaleString('en-IN')}` : 'CLEAR'}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setPreviewSaleModal(sale)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Mandi Bill
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400">
                              No outward sales dispatches recorded yet for {selectedCustomer.name}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: FULL PASSBOOK TIMELINE */}
              {activeTabType === 'passbook' && (
                <div className="space-y-4">
                  {/* Running Balance Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[11px] text-slate-400 block">Total Dues Payable</span>
                      <span className="text-xl font-black text-rose-400">
                        ₹{selectedCustomer.pendingBalance.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[11px] text-slate-400 block">Default Small Crate Rate</span>
                      <span className="text-sm font-bold text-slate-100">
                        ₹{selectedCustomer.defaultSellingRateSmall || 340} / crate
                      </span>
                    </div>

                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                      <span className="text-[11px] text-slate-400 block">Default Big Crate Rate</span>
                      <span className="text-sm font-bold text-slate-100">
                        ₹{selectedCustomer.defaultSellingRateBig || 580} / crate
                      </span>
                    </div>
                  </div>

                  {/* Passbook Entry Timeline Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-3">Date & Day</th>
                          <th className="p-3">Transaction</th>
                          <th className="p-3">Ref & Detailed Itemized Crates Breakdown</th>
                          <th className="p-3 text-right">Debit (Billed ₹)</th>
                          <th className="p-3 text-right">Credit (Paid ₹)</th>
                          <th className="p-3 text-right">Running Dues Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-200">
                        {customerPassbook.map((entry) => {
                          const relatedSale = appState.sales.find(s => s.invoiceNo === entry.referenceId || (s.customerId === entry.entityId && s.date === entry.date));
                          return (
                            <tr key={entry.id} className="hover:bg-slate-800/40 transition-all">
                              <td className="p-3 font-semibold text-slate-300 whitespace-nowrap">
                                {formatDateWithDay(entry.date)}
                              </td>
                              <td className="p-3 font-medium">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  entry.transactionType === 'Sale'
                                    ? 'bg-rose-500/10 text-rose-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {entry.transactionType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">
                                {entry.referenceId && <span className="font-mono text-emerald-400 font-bold mr-1.5">{entry.referenceId}</span>}
                                <span className="text-slate-400">{entry.notes}</span>
                                {relatedSale && relatedSale.lineItems.length > 0 && (
                                  <div className="mt-1.5 space-y-1">
                                    {relatedSale.lineItems.map((item, idx) => (
                                      <div key={idx} className="bg-slate-900/90 border border-slate-700/80 px-2 py-0.5 rounded text-[11px] flex items-center justify-between gap-2">
                                        <span className="font-semibold text-slate-200">
                                          {item.quantity} {item.crateSize} Crates {item.grade ? `[${item.grade}]` : ''}
                                        </span>
                                        <span className="font-mono text-emerald-400 font-bold">
                                          @ ₹{item.ratePerCrate} = ₹{item.total.toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-bold text-rose-400 text-right font-mono">
                                {entry.type === 'Debit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-3 font-bold text-emerald-400 text-right font-mono">
                                {entry.type === 'Credit' ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-3 font-bold text-slate-100 text-right font-mono">
                                ₹{entry.runningBalance.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select a customer from the left directory to view supplied crates and passbook history.
            </div>
          )}
        </div>
      </div>

      {/* Sale Mandi Invoice Preview Modal */}
      {previewSaleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl p-6 space-y-5 bg-slate-900 border-slate-700 text-center my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2 text-left">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Invoice {previewSaleModal.invoiceNo}</h3>
                  <p className="text-xs text-slate-400">
                    Traditional Mandi Bill Header for <strong className="text-slate-200">{previewSaleModal.customerName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSaleModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="overflow-y-auto flex-1 p-2 bg-slate-950 rounded-xl border border-slate-800">
              <PrintableInvoice
                sale={previewSaleModal}
                customer={appState.customers.find(c => c.id === previewSaleModal.customerId)}
              />
            </div>

            {/* Action Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                onClick={() => printInvoiceElement(previewSaleModal.invoiceNo)}
                className="w-full glass-button-primary text-xs py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 flex items-center justify-center gap-2 font-bold"
              >
                <Printer className="w-4 h-4" />
                Print Bill (Thermal/A4)
              </button>

              <a
                href={generateWhatsAppBillLink(
                  previewSaleModal,
                  appState.customers.find(c => c.id === previewSaleModal.customerId)?.phone || selectedCustomer?.phone
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full glass-button-primary text-xs py-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 font-bold"
              >
                <Share2 className="w-4 h-4" />
                Share Bill on WhatsApp
              </a>

              <button
                onClick={() => generateSaleInvoicePDF(previewSaleModal)}
                className="w-full glass-button-secondary text-xs py-2.5 flex items-center justify-center gap-2 font-semibold"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {isOpenPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-5 bg-slate-900 border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Receive Payment from {selectedCustomer.name}
              </h3>
              <button
                onClick={() => setIsOpenPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceivePaymentSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-slate-300 flex justify-between">
                <span>Current Dues Outstanding:</span>
                <strong className="text-rose-400 font-bold">₹{selectedCustomer.pendingBalance.toLocaleString('en-IN')}</strong>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Payment Amount Received (₹) *</label>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="glass-input w-full text-emerald-400 text-base font-bold"
                  placeholder="e.g. 5000"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="glass-input w-full"
                >
                  <option value="Cash" className="bg-slate-900">Cash Settlement</option>
                  <option value="UPI" className="bg-slate-900">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer" className="bg-slate-900">Bank Transfer / NEFT</option>
                  <option value="Cheque" className="bg-slate-900">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Receipt / Reference Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. UPI Ref #889922 received via GPay"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenPaymentModal(false)}
                  className="glass-button-secondary py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary py-2 px-5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Drag and Drop Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl p-6 space-y-5 bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Bulk Customer Import via Excel / CSV
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center space-y-3 bg-slate-800/30 transition-all">
                  <Upload className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Drag & Drop your Excel sheet (.xlsx, .xls) or CSV here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Columns expected: <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">Name, Phone, Address, Opening Balance</code>
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label
                    htmlFor="excel-file-input"
                    className="glass-button-primary text-xs py-2 px-4 inline-flex items-center cursor-pointer"
                  >
                    Select Excel File
                  </label>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                  <span>Need a formatted template?</span>
                  <button
                    onClick={() => downloadSampleCustomerExcel()}
                    className="text-emerald-400 hover:underline font-semibold"
                  >
                    Download Sample XLSX Template
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  ✅ Successfully parsed <strong>{importResult.validCustomers.length}</strong> customer records.
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                    <strong>Warnings / Skipped Rows:</strong>
                    {importResult.errors.map((err: string, i: number) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}

                {/* Preview Table */}
                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Phone</th>
                        <th className="p-2">Shop Location</th>
                        <th className="p-2">Opening Dues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {importResult.validCustomers.map((vc: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{vc.name}</td>
                          <td className="p-2 text-slate-400">{vc.phone}</td>
                          <td className="p-2 text-slate-400">{vc.shopLocation}</td>
                          <td className="p-2 font-bold text-rose-400">₹{vc.openingBalance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setImportResult(null)}
                    className="glass-button-secondary text-xs py-2 px-4"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="glass-button-primary text-xs py-2 px-5"
                  >
                    Confirm Import ({importResult.validCustomers.length} Records)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Add New Customer Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Customer / Shop Name *</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Sri Lakshmi Caterers"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="glass-input w-full"
                    placeholder="+91 98765 00000"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Shop / Market Location</label>
                  <input
                    type="text"
                    value={custShop}
                    onChange={(e) => setCustShop(e.target.value)}
                    className="glass-input w-full"
                    placeholder="Gandhinagar Rd"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Default Rate Small (₹)</label>
                  <input
                    type="number"
                    value={rateSmall}
                    onChange={(e) => setRateSmall(e.target.value)}
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Default Rate Big (₹)</label>
                  <input
                    type="number"
                    value={rateBig}
                    onChange={(e) => setRateBig(e.target.value)}
                    className="glass-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Initial Opening Dues Balance (₹)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="glass-input w-full text-rose-400 font-bold"
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="glass-button-secondary py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary py-2 px-5"
                >
                  Save Customer Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
