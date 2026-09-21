import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, AlertTriangle, Share2, Download, CheckCircle2, UserPlus, X, Box, ShieldAlert, Printer } from 'lucide-react';
import { AppState } from '../lib/storage';
import { Sale, SaleLineItem, CrateSize, Customer, PassbookEntry, EmptyCrateLog, STANDARD_GRADES } from '../types';
import { generateSaleInvoicePDF, generateWhatsAppBillLink, printInvoiceElement } from '../lib/pdf';
import { PrintableInvoice } from './PrintableInvoice';
import { formatDateWithDay } from '../lib/dateUtils';

interface SalesModuleProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  appState,
  setAppState,
  isOpenModal,
  setIsOpenModal,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(appState.customers[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank' | 'Credit'>('Cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Line items for outward dispatch
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([]);

  // Selected Sale Preview Modal
  const [previewSale, setPreviewSale] = useState<Sale | null>(null);

  // Inline New Customer State
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustShop, setNewCustShop] = useState<string>('');

  // Helper to get exact stock available for a given crate size & grade
  const getMaxAvailableForLine = (crateSize: CrateSize, grade?: string): number => {
    const gradeStock = appState.inventory.gradeStocks?.find(
      g => g.crateSize === crateSize && g.grade === (grade || 'Grade A (Top Red)')
    );
    if (gradeStock !== undefined) {
      return Math.max(0, gradeStock.count);
    }
    return crateSize === 'Small' ? Math.max(0, appState.inventory.smallCratesCount) : Math.max(0, appState.inventory.bigCratesCount);
  };

  // Helper to get remaining available stock for a line item accounting for other lines in current form
  const getRemainingAvailableForLine = (lineIndex: number, crateSize: CrateSize, grade?: string): number => {
    const totalMax = getMaxAvailableForLine(crateSize, grade);
    const targetGrade = grade || 'Grade A (Top Red)';

    const usedByOtherLines = lineItems.reduce((sum, item, idx) => {
      if (idx === lineIndex) return sum;
      const itemGrade = item.grade || 'Grade A (Top Red)';
      if (item.crateSize === crateSize && itemGrade === targetGrade) {
        return sum + (item.quantity || 0);
      }
      return sum;
    }, 0);

    return Math.max(0, totalMax - usedByOtherLines);
  };

  // Helper to build list of in-stock / available categories
  const getAvailableStockCategories = () => {
    const list: { crateSize: CrateSize; grade: string; count: number; avgCost: number }[] = [];

    if (appState.inventory.gradeStocks && appState.inventory.gradeStocks.length > 0) {
      appState.inventory.gradeStocks.forEach(g => {
        list.push({ ...g });
      });
    }

    // Fallback if no specific grade stocks exist
    if (list.length === 0) {
      list.push(
        { crateSize: 'Small', grade: 'Grade A (Top Red)', count: appState.inventory.smallCratesCount, avgCost: appState.inventory.smallAvgCost || 300 },
        { crateSize: 'Big', grade: 'Grade A (Top Red)', count: appState.inventory.bigCratesCount, avgCost: appState.inventory.bigAvgCost || 500 }
      );
    }

    return list;
  };

  const availableCategories = getAvailableStockCategories();

  // Reset lines when modal opens with strict stock initialization
  useEffect(() => {
    if (isOpenModal) {
      const customer = appState.customers.find(c => c.id === selectedCustomerId);
      const firstCat = availableCategories[0] || { crateSize: 'Small', grade: 'Grade A (Top Red)', count: 0, avgCost: 300 };
      const maxAvail = getMaxAvailableForLine(firstCat.crateSize, firstCat.grade);
      const initialQty = Math.min(10, maxAvail);

      const defaultRate = firstCat.crateSize === 'Small'
        ? (customer?.defaultSellingRateSmall || 340)
        : (customer?.defaultSellingRateBig || 580);

      setLineItems([
        {
          crateSize: firstCat.crateSize,
          grade: firstCat.grade,
          quantity: initialQty,
          ratePerCrate: defaultRate,
          total: initialQty * defaultRate,
        }
      ]);
      setPaidAmount(0);
      setNotes('');
    }
  }, [isOpenModal, selectedCustomerId]);

  const addLineItem = () => {
    const firstCat = availableCategories[0] || { crateSize: 'Small', grade: 'Grade A (Top Red)', count: 0, avgCost: 300 };
    const maxAvail = getRemainingAvailableForLine(lineItems.length, firstCat.crateSize, firstCat.grade);
    const customer = appState.customers.find(c => c.id === selectedCustomerId);
    const defaultRate = customer?.defaultSellingRateSmall || 340;
    const initialQty = Math.min(5, maxAvail);

    setLineItems([
      ...lineItems,
      {
        crateSize: firstCat.crateSize,
        grade: firstCat.grade,
        quantity: initialQty,
        ratePerCrate: defaultRate,
        total: initialQty * defaultRate,
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof SaleLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    // Auto update rate if category or crate size changes
    if (field === 'crateSize' || field === 'grade') {
      const customer = appState.customers.find(c => c.id === selectedCustomerId);
      if (item.crateSize === 'Small' && customer?.defaultSellingRateSmall) {
        item.ratePerCrate = customer.defaultSellingRateSmall;
      } else if (item.crateSize === 'Big' && customer?.defaultSellingRateBig) {
        item.ratePerCrate = customer.defaultSellingRateBig;
      }
    }

    // STRICT CUMULATIVE STOCK CAPPING
    if (field === 'quantity' || field === 'crateSize' || field === 'grade') {
      const maxAvail = getRemainingAvailableForLine(index, item.crateSize, item.grade);
      const parsedQty = field === 'quantity' ? (parseInt(value) || 0) : item.quantity;
      if (parsedQty > maxAvail) {
        item.quantity = maxAvail;
        alert(`Stock Limit Reached: Only ${maxAvail} ${item.crateSize} Crates (${item.grade || 'Standard'}) available in stock.`);
      } else {
        item.quantity = parsedQty;
      }
    }

    item.total = (item.quantity || 0) * (item.ratePerCrate || 0);
    updated[index] = item;
    setLineItems(updated);
  };

  // Stock shortage calculations
  const smallRequested = lineItems.filter(i => i.crateSize === 'Small').reduce((sum, i) => sum + i.quantity, 0);
  const bigRequested = lineItems.filter(i => i.crateSize === 'Big').reduce((sum, i) => sum + i.quantity, 0);

  const smallStockShortage = Math.max(0, smallRequested - appState.inventory.smallCratesCount);
  const bigStockShortage = Math.max(0, bigRequested - appState.inventory.bigCratesCount);

  // Grade-level cumulative shortage validation
  const gradeShortages: string[] = [];
  const requestedByGrade: Record<string, number> = {};

  lineItems.forEach(item => {
    const key = `${item.crateSize} - ${item.grade || 'Grade A (Top Red)'}`;
    requestedByGrade[key] = (requestedByGrade[key] || 0) + (item.quantity || 0);
  });

  Object.entries(requestedByGrade).forEach(([key, requested]) => {
    const [size, ...gradeParts] = key.split(' - ');
    const gr = gradeParts.join(' - ');
    const max = getMaxAvailableForLine(size as CrateSize, gr);
    if (requested > max) {
      gradeShortages.push(`${key} (Requested: ${requested}, Available: ${max})`);
    }
  });

  const hasStockShortage = smallStockShortage > 0 || bigStockShortage > 0 || gradeShortages.length > 0;

  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);
  const balanceAdded = Math.max(0, totalAmount - paidAmount);

  const handleAddNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustName,
      phone: newCustPhone || 'N/A',
      shopLocation: newCustShop || 'Vegetable Market',
      pendingBalance: 0,
      createdAt: new Date().toISOString(),
    };

    setAppState(prev => ({
      ...prev,
      customers: [newCust, ...prev.customers]
    }));

    setSelectedCustomerId(newCust.id);
    setShowAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustShop('');
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = appState.customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      alert('Please select a valid customer.');
      return;
    }

    const validDispatchItems = lineItems.filter(i => i.quantity > 0);
    if (validDispatchItems.length === 0) {
      alert('Please assign a crate quantity (> 0) to at least one category.');
      return;
    }

    // STRICT STOCK VALIDATION BEFORE SUBMIT
    for (let idx = 0; idx < lineItems.length; idx++) {
      const item = lineItems[idx];
      const maxAvail = getRemainingAvailableForLine(idx, item.crateSize, item.grade);
      if (item.quantity > maxAvail) {
        alert(`❌ CANNOT DISPATCH: Quantity for ${item.crateSize} Crate (${item.grade}) exceeds available stock!\nMax Available for this line: ${maxAvail} Crates\nRequested: ${item.quantity} Crates`);
        return;
      }
    }

    if (hasStockShortage) {
      alert(
        `❌ CANNOT DISPATCH: Assigned crates exceed in-hand stock!\n` +
        (gradeShortages.length > 0 ? `- Grade shortages: ${gradeShortages.join(', ')}\n` : '') +
        (smallStockShortage > 0 ? `- Small Crates shortage: ${smallStockShortage} (Stock: ${appState.inventory.smallCratesCount})\n` : '') +
        (bigStockShortage > 0 ? `- Big Crates shortage: ${bigStockShortage} (Stock: ${appState.inventory.bigCratesCount})\n` : '') +
        `Please record an Inward Procurement Purchase Order to add stock first.`
      );
      return;
    }

    if (totalAmount <= 0) {
      alert('Total sale bill amount must be greater than zero.');
      return;
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const newSale: Sale = {
      id: `sal-${Date.now()}`,
      invoiceNo,
      date,
      customerId: customer.id,
      customerName: customer.name,
      lineItems: validDispatchItems,
      totalAmount,
      paidAmount,
      balanceAdded,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
    };

    // Overall Inventory Deduction
    const newSmallStock = Math.max(0, appState.inventory.smallCratesCount - smallRequested);
    const newBigStock = Math.max(0, appState.inventory.bigCratesCount - bigRequested);

    // Grade Specific Stock Deduction
    const currentGradeStocks = [...(appState.inventory.gradeStocks || [])];
    validDispatchItems.forEach(item => {
      const itemGrade = item.grade || 'Standard';
      const idx = currentGradeStocks.findIndex(g => g.crateSize === item.crateSize && g.grade === itemGrade);
      if (idx >= 0) {
        currentGradeStocks[idx] = {
          ...currentGradeStocks[idx],
          count: Math.max(0, currentGradeStocks[idx].count - item.quantity),
        };
      }
    });

    // Customer Passbook Ledger Updates
    const newCustomerBalance1 = customer.pendingBalance + totalAmount;
    const passbook1: PassbookEntry = {
      id: `pb-${Date.now()}-1`,
      date,
      entityType: 'Customer',
      entityId: customer.id,
      entityName: customer.name,
      type: 'Debit',
      amount: totalAmount,
      runningBalance: newCustomerBalance1,
      transactionType: 'Sale',
      referenceId: invoiceNo,
      notes: notes || `Dispatched ${smallRequested + bigRequested} crates`,
      createdAt: new Date().toISOString(),
    };

    let passbookEntries = [passbook1];
    let finalCustomerBalance = newCustomerBalance1;

    if (paidAmount > 0) {
      finalCustomerBalance -= paidAmount;
      const passbook2: PassbookEntry = {
        id: `pb-${Date.now()}-2`,
        date,
        entityType: 'Customer',
        entityId: customer.id,
        entityName: customer.name,
        type: 'Credit',
        amount: paidAmount,
        runningBalance: finalCustomerBalance,
        transactionType: 'Payment_Received',
        paymentMode: paymentMethod === 'Credit' ? 'Cash' : paymentMethod === 'Bank' ? 'Bank Transfer' : paymentMethod,
        referenceId: invoiceNo,
        notes: `Immediate payment received via ${paymentMethod}`,
        createdAt: new Date().toISOString(),
      };
      passbookEntries.push(passbook2);
    }

    // Empty Crate Tracker Log
    const crateLogs: EmptyCrateLog[] = [];
    if (smallRequested > 0) {
      crateLogs.push({
        id: `ec-${Date.now()}-sm`,
        date,
        entityType: 'Customer',
        entityId: customer.id,
        entityName: customer.name,
        crateSize: 'Small',
        action: 'Given_To_Customer',
        quantity: smallRequested,
        smallBalanceAfter: smallRequested,
        bigBalanceAfter: 0,
        notes: `Issued with ${invoiceNo}`,
        createdAt: new Date().toISOString(),
      });
    }
    if (bigRequested > 0) {
      crateLogs.push({
        id: `ec-${Date.now()}-bg`,
        date,
        entityType: 'Customer',
        entityId: customer.id,
        entityName: customer.name,
        crateSize: 'Big',
        action: 'Given_To_Customer',
        quantity: bigRequested,
        smallBalanceAfter: 0,
        bigBalanceAfter: bigRequested,
        notes: `Issued with ${invoiceNo}`,
        createdAt: new Date().toISOString(),
      });
    }

    setAppState(prev => ({
      ...prev,
      sales: [newSale, ...prev.sales],
      customers: prev.customers.map(c => c.id === customer.id ? { ...c, pendingBalance: finalCustomerBalance } : c),
      inventory: {
        ...prev.inventory,
        smallCratesCount: newSmallStock,
        bigCratesCount: newBigStock,
        gradeStocks: currentGradeStocks,
      },
      passbookEntries: [...passbookEntries, ...prev.passbookEntries],
      emptyCrateLogs: [...crateLogs, ...prev.emptyCrateLogs],
    }));

    setIsOpenModal(false);
    setPreviewSale(newSale);
  };

  const selectedCustomer = appState.customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Outward Sales & Customer Dispatch
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch tomato crates to buyers based strictly on available stock in hand.
          </p>
        </div>
        <button
          onClick={() => setIsOpenModal(true)}
          className="glass-button-primary text-sm bg-gradient-to-r from-emerald-600 to-teal-600"
        >
          <Plus className="w-4 h-4" />
          + Create New Outward Sale
        </button>
      </div>

      {/* Sales History Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-200">Recent Sales & Dispatches</h3>
          <span className="text-xs text-slate-400">{appState.sales.length} Invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Items Dispatched</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Paid</th>
                <th className="p-3.5">Dues Added</th>
                <th className="p-3.5 text-right">Receipt / WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {appState.sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="p-3.5 font-mono font-semibold text-emerald-400">{sale.invoiceNo}</td>
                  <td className="p-3.5 text-slate-300 font-semibold">{formatDateWithDay(sale.date)}</td>
                  <td className="p-3.5 font-medium text-slate-100">{sale.customerName}</td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {sale.lineItems.map((item, idx) => (
                        <span key={idx} className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {item.quantity} {item.crateSize} ({item.grade || 'Standard'}) @ ₹{item.ratePerCrate}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-100">₹{sale.totalAmount.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 text-emerald-400 font-semibold">₹{sale.paidAmount.toLocaleString('en-IN')} ({sale.paymentMethod})</td>
                  <td className="p-3.5 font-semibold text-rose-400">
                    {sale.balanceAdded > 0 ? `₹${sale.balanceAdded.toLocaleString('en-IN')}` : 'CLEAR'}
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => generateSaleInvoicePDF(sale)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Download PDF Invoice"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={generateWhatsAppBillLink(sale)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 inline-block"
                      title="Share Receipt on WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultra Clean & Clear Create Outward Sale Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl p-6 space-y-5 bg-slate-900 border-slate-700 my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  New Outward Sale & Dispatch
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign crates based strictly on in-hand stock availability.
                </p>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="space-y-5">
              {/* SECTION 1: Customer Selection & Date */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-200">Billed Customer *</label>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(true)}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <UserPlus className="w-3 h-3" /> + Add New Customer
                      </button>
                    </div>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="glass-input w-full text-xs font-bold"
                      required
                    >
                      {appState.customers.map((c) => (
                        <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100 font-normal">
                          {c.name} ({c.shopLocation || 'Mandi'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200 mb-1 block">Dispatch Date *</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="glass-input w-full text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Customer Balance Status Badge */}
                {selectedCustomer && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                    <span className="text-slate-400">Current Outstanding Customer Dues:</span>
                    <strong className={`font-bold px-2.5 py-0.5 rounded-full ${
                      selectedCustomer.pendingBalance > 0
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {selectedCustomer.pendingBalance > 0 
                        ? `₹${selectedCustomer.pendingBalance.toLocaleString('en-IN')}` 
                        : 'CLEAR (₹0)'}
                    </strong>
                  </div>
                )}
              </div>

              {/* Stock Warning Banner if Inventory low */}
              {hasStockShortage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400" />
                  <div>
                    <strong>STRICT STOCK EXCEEDED:</strong> Requested crates exceed physical stock in hand!
                    {smallStockShortage > 0 && <span className="block mt-0.5">• Small Crates Shortage: {smallStockShortage} (Stock: {appState.inventory.smallCratesCount})</span>}
                    {bigStockShortage > 0 && <span className="block mt-0.5">• Big Crates Shortage: {bigStockShortage} (Stock: {appState.inventory.bigCratesCount})</span>}
                  </div>
                </div>
              )}

              {/* SECTION 2: Clean Dispatch Line Items Builder with Strict Stock Limits */}
              <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-emerald-400" />
                    Crates & Categories to Dispatch
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Crate Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {lineItems.map((item, index) => {
                    const maxStockAvail = getRemainingAvailableForLine(index, item.crateSize, item.grade);

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-2.5 items-center bg-slate-900/80 p-3 rounded-xl border border-slate-700/70 shadow-sm hover:border-slate-600 transition-all"
                      >
                        {/* Crate Size & Grade Selector */}
                        <div className="col-span-12 sm:col-span-5">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Crate Category / Grade</label>
                          <select
                            value={`${item.crateSize}|||${item.grade || 'Grade A (Top Red)'}`}
                            onChange={(e) => {
                              const [size, gr] = e.target.value.split('|||');
                              updateLineItem(index, 'crateSize', size as CrateSize);
                              updateLineItem(index, 'grade', gr);
                            }}
                            className="glass-input w-full text-xs font-semibold py-2 text-slate-100"
                          >
                            {availableCategories.map((cat, catIdx) => (
                              <option
                                key={catIdx}
                                value={`${cat.crateSize}|||${cat.grade}`}
                                className="bg-slate-900 text-slate-100 font-normal"
                              >
                                {cat.crateSize} Crate — {cat.grade} ({cat.count} in stock)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity with Strict Max Capping */}
                        <div className="col-span-4 sm:col-span-2">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-emerald-400 block">Crate Qty *</label>
                            <span className="text-[9px] font-semibold text-slate-400">Max: {maxStockAvail}</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max={maxStockAvail}
                            value={item.quantity || ''}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            className={`glass-input w-full text-xs py-2 font-bold ${
                              item.quantity > maxStockAvail
                                ? 'text-rose-400 border-rose-500 bg-rose-950/20'
                                : 'text-emerald-400 border-emerald-500/50'
                            }`}
                            placeholder="0"
                            required
                          />
                        </div>

                        {/* Selling Rate */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Selling Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.ratePerCrate || ''}
                            onChange={(e) => updateLineItem(index, 'ratePerCrate', parseFloat(e.target.value) || 0)}
                            className="glass-input w-full text-xs py-2 font-semibold"
                            placeholder="340"
                            required
                          />
                        </div>

                        {/* Line Total */}
                        <div className="col-span-3 sm:col-span-2 text-right">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">Line Total</label>
                          <span className="font-bold text-xs text-slate-100 block py-1.5 font-mono">
                            ₹{item.total.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Remove Button */}
                        {lineItems.length > 1 && (
                          <div className="col-span-1 sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                              title="Remove Line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: Payment Collection & Bill Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <div>
                  <label className="text-xs font-semibold text-slate-200 mb-1 block">Payment Collection Mode</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="glass-input w-full text-xs py-2"
                  >
                    <option value="Cash" className="bg-slate-900">Cash Received</option>
                    <option value="UPI" className="bg-slate-900">UPI / GPay / PhonePe</option>
                    <option value="Bank" className="bg-slate-900">Bank Transfer / NEFT</option>
                    <option value="Credit" className="bg-slate-900">Full Credit (Add to Dues)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-200 mb-1 block">Payment Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full text-emerald-400 text-sm font-bold"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Dues Added: <strong className="text-rose-400">₹{balanceAdded.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="flex flex-col justify-center text-right">
                  <span className="text-xs text-slate-400">Grand Total Invoice Bill:</span>
                  <span className="text-2xl font-black text-slate-100 font-mono">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Dispatch Notes / Transport Vehicle</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dispatched via Auto #KA01EF1234, driver Ramesh"
                  className="glass-input w-full text-xs"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="glass-button-secondary text-xs px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hasStockShortage}
                  className="glass-button-primary text-xs px-6 py-2.5 shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Outward Dispatch & Generate Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Digital Bill Generated Preview Modal */}
      {previewSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl p-6 space-y-5 bg-slate-900 border-slate-700 text-center my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2 text-left">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Invoice {previewSale.invoiceNo} Generated!</h3>
                  <p className="text-xs text-slate-400">
                    Traditional Mandi Bill Header for <strong className="text-slate-200">{previewSale.customerName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewSale(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="overflow-y-auto flex-1 p-2 bg-slate-950 rounded-xl border border-slate-800">
              <PrintableInvoice
                sale={previewSale}
                customer={appState.customers.find(c => c.id === previewSale.customerId)}
              />
            </div>

            {/* Action Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                onClick={() => printInvoiceElement(previewSale.invoiceNo)}
                className="w-full glass-button-primary text-xs py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 flex items-center justify-center gap-2 font-bold"
              >
                <Printer className="w-4 h-4" />
                Print Bill (Thermal/A4)
              </button>

              <a
                href={generateWhatsAppBillLink(previewSale)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full glass-button-primary text-xs py-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 font-bold"
              >
                <Share2 className="w-4 h-4" />
                Share Bill on WhatsApp
              </a>

              <button
                onClick={() => generateSaleInvoicePDF(previewSale)}
                className="w-full glass-button-secondary text-xs py-2.5 flex items-center justify-center gap-2 font-semibold"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Add Customer Drawer */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-5 space-y-4 bg-slate-900 border-slate-700">
            <h4 className="font-bold text-slate-100 text-sm">Add New Customer Record</h4>
            <form onSubmit={handleAddNewCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300">Customer Name *</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="glass-input w-full text-xs mt-1"
                  placeholder="e.g. Ramesh Retail Shop"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="glass-input w-full text-xs mt-1"
                  placeholder="+91 98765 00000"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Shop Location</label>
                <input
                  type="text"
                  value={newCustShop}
                  onChange={(e) => setNewCustShop(e.target.value)}
                  className="glass-input w-full text-xs mt-1"
                  placeholder="KR Market Stall #14"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="glass-button-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary text-xs py-1.5 px-4"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
