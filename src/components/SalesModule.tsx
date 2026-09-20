import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, AlertTriangle, Share2, Download, CheckCircle2, UserPlus, X, Box } from 'lucide-react';
import { AppState } from '../lib/storage';
import { Sale, SaleLineItem, CrateSize, Customer, PassbookEntry, EmptyCrateLog, STANDARD_GRADES, GradeStockItem } from '../types';
import { generateSaleInvoicePDF, generateWhatsAppBillLink } from '../lib/pdf';

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

  // Helper to extract all unique procurement categories from inventory or purchases
  const getAvailableCategories = (): GradeStockItem[] => {
    const list: GradeStockItem[] = [];

    // First check gradeStocks in inventory
    if (appState.inventory.gradeStocks && appState.inventory.gradeStocks.length > 0) {
      appState.inventory.gradeStocks.forEach(g => {
        list.push({ ...g });
      });
    }

    // Also scan all purchases line items to ensure all procured categories are present
    appState.purchases.forEach(purchase => {
      purchase.lineItems.forEach(pItem => {
        const pGrade = pItem.grade || 'Standard';
        const exists = list.some(g => g.crateSize === pItem.crateSize && g.grade === pGrade);
        if (!exists) {
          list.push({
            crateSize: pItem.crateSize,
            grade: pGrade,
            count: pItem.crateSize === 'Small' ? appState.inventory.smallCratesCount : appState.inventory.bigCratesCount,
            avgCost: pItem.ratePerCrate,
          });
        }
      });
    });

    // Fallback if no categories yet
    if (list.length === 0) {
      list.push(
        { crateSize: 'Small', grade: 'Grade A (Top Red)', count: appState.inventory.smallCratesCount, avgCost: appState.inventory.smallAvgCost || 300 },
        { crateSize: 'Small', grade: 'Grade B (Medium)', count: appState.inventory.smallCratesCount, avgCost: appState.inventory.smallAvgCost || 240 },
        { crateSize: 'Big', grade: 'Grade A (Top Red)', count: appState.inventory.bigCratesCount, avgCost: appState.inventory.bigAvgCost || 500 }
      );
    }

    return list;
  };

  // Populate all categories whenever modal opens
  useEffect(() => {
    if (isOpenModal) {
      const categories = getAvailableCategories();
      const customer = appState.customers.find(c => c.id === selectedCustomerId);

      const initialLines: SaleLineItem[] = categories.map(cat => {
        const defaultRate = cat.crateSize === 'Small'
          ? (customer?.defaultSellingRateSmall || Math.round(cat.avgCost * 1.25) || 340)
          : (customer?.defaultSellingRateBig || Math.round(cat.avgCost * 1.25) || 580);

        return {
          crateSize: cat.crateSize,
          grade: cat.grade,
          quantity: 0, // Default to 0, admin enters quantity for categories assigned to customer
          ratePerCrate: defaultRate,
          total: 0,
        };
      });

      setLineItems(initialLines);
      setPaidAmount(0);
    }
  }, [isOpenModal, selectedCustomerId, appState.inventory, appState.purchases]);

  const addCustomLineItem = () => {
    const customer = appState.customers.find(c => c.id === selectedCustomerId);
    const defaultRate = customer?.defaultSellingRateSmall || 340;
    setLineItems([
      ...lineItems,
      { crateSize: 'Small', grade: 'Custom Grade', quantity: 0, ratePerCrate: defaultRate, total: 0 }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof SaleLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    item.total = (item.quantity || 0) * (item.ratePerCrate || 0);
    updated[index] = item;
    setLineItems(updated);
  };

  // Active line items with assigned quantity > 0
  const activeDispatchItems = lineItems.filter(i => i.quantity > 0);

  const smallRequested = activeDispatchItems.filter(i => i.crateSize === 'Small').reduce((sum, i) => sum + i.quantity, 0);
  const bigRequested = activeDispatchItems.filter(i => i.crateSize === 'Big').reduce((sum, i) => sum + i.quantity, 0);

  const smallStockShortage = Math.max(0, smallRequested - appState.inventory.smallCratesCount);
  const bigStockShortage = Math.max(0, bigRequested - appState.inventory.bigCratesCount);
  const hasStockShortage = smallStockShortage > 0 || bigStockShortage > 0;

  const totalAmount = activeDispatchItems.reduce((sum, item) => sum + item.total, 0);
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

    if (activeDispatchItems.length === 0) {
      alert('Please assign a crate quantity (> 0) to at least one category to generate dispatch and bill.');
      return;
    }

    if (totalAmount <= 0) {
      alert('Total sale amount must be greater than zero.');
      return;
    }

    if (hasStockShortage) {
      const confirmOverSell = confirm(
        `Warning: Requested crates exceed stock in hand!\n` +
        (smallStockShortage > 0 ? `- Small Crates shortage: ${smallStockShortage}\n` : '') +
        (bigStockShortage > 0 ? `- Big Crates shortage: ${bigStockShortage}\n` : '') +
        `Do you still want to proceed with dispatch?`
      );
      if (!confirmOverSell) return;
    }

    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const newSale: Sale = {
      id: `sal-${Date.now()}`,
      invoiceNo,
      date,
      customerId: customer.id,
      customerName: customer.name,
      lineItems: activeDispatchItems, // Only save assigned categories with >0 quantity
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
    activeDispatchItems.forEach(item => {
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
      notes: notes || `Dispatched ${smallRequested + bigRequested} crates across ${activeDispatchItems.length} categories`,
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
            All procurement categories are listed automatically. Assign crate quantities to dispatch & generate customer bill.
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
                <th className="p-3.5">Assigned Categories & Crates</th>
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
                  <td className="p-3.5 text-slate-400">{sale.date}</td>
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

      {/* New Sale Dispatch Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl p-6 space-y-5 bg-slate-900 border-slate-700 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                Outward Dispatch & Customer Billing Form
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="space-y-5">
              {/* Customer Selection & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Select Customer *</label>
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
                    className="glass-input w-full"
                    required
                  >
                    {appState.customers.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                        {c.name} (Current Dues: ₹{c.pendingBalance})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Dispatch Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="glass-input w-full"
                    required
                  />
                </div>
              </div>

              {/* Stock Warning Banner if Inventory low */}
              {hasStockShortage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
                  <div>
                    <strong>INSUFFICIENT STOCK WARNING:</strong> Assigned crates exceed in-hand stock!
                    {smallStockShortage > 0 && <span className="block mt-0.5">• Need {smallStockShortage} more Small Crates</span>}
                    {bigStockShortage > 0 && <span className="block mt-0.5">• Need {bigStockShortage} more Big Crates</span>}
                  </div>
                </div>
              )}

              {/* All Procured Categories Dispatch Table */}
              <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                      Procured Categories & Crate Assignment
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Enter quantity of crates to assign to {appState.customers.find(c => c.id === selectedCustomerId)?.name || 'customer'} for each category.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={addCustomLineItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Custom Category Line
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, index) => {
                    const gradeStockInfo = appState.inventory.gradeStocks?.find(
                      g => g.crateSize === item.crateSize && g.grade === item.grade
                    );
                    const stockAvailable = gradeStockInfo ? gradeStockInfo.count : (
                      item.crateSize === 'Small' ? appState.inventory.smallCratesCount : appState.inventory.bigCratesCount
                    );

                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-12 gap-2.5 items-center p-3 rounded-xl border transition-all ${
                          item.quantity > 0 
                            ? 'bg-emerald-950/30 border-emerald-500/50' 
                            : 'bg-slate-900/60 border-slate-700/60'
                        }`}
                      >
                        {/* Crate Size */}
                        <div className="col-span-12 sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Crate Size</label>
                          <select
                            value={item.crateSize}
                            onChange={(e) => updateLineItem(index, 'crateSize', e.target.value as CrateSize)}
                            className="glass-input w-full text-xs py-1.5"
                          >
                            <option value="Small" className="bg-slate-900">Small Crate</option>
                            <option value="Big" className="bg-slate-900">Big Crate</option>
                          </select>
                        </div>

                        {/* Grade Category */}
                        <div className="col-span-12 sm:col-span-4">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Procurement Grade / Category</label>
                          <input
                            type="text"
                            list={`sale-all-grades-${index}`}
                            value={item.grade || 'Standard'}
                            onChange={(e) => updateLineItem(index, 'grade', e.target.value)}
                            placeholder="Grade Name"
                            className="glass-input w-full text-xs py-1.5 font-semibold text-slate-100"
                          />
                          <datalist id={`sale-all-grades-${index}`}>
                            {STANDARD_GRADES.map((g, i) => (
                              <option key={i} value={g} />
                            ))}
                          </datalist>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Stock in Hand: <strong className="text-emerald-400">{stockAvailable} Crates</strong>
                          </span>
                        </div>

                        {/* Assign Qty */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">Assign Qty (Crates)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="glass-input w-full text-xs py-1.5 text-emerald-400 font-bold border-emerald-500/50"
                            placeholder="0"
                          />
                        </div>

                        {/* Selling Rate */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Selling Rate (₹/Crate)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.ratePerCrate}
                            onChange={(e) => updateLineItem(index, 'ratePerCrate', parseFloat(e.target.value) || 0)}
                            className="glass-input w-full text-xs py-1.5"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="col-span-3 sm:col-span-1 text-right">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Line Total</label>
                          <span className={`font-bold text-xs block py-1.5 ${item.quantity > 0 ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                            ₹{item.total.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Delete optional row */}
                        <div className="col-span-1 sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded"
                            title="Remove Category Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Collection & Grand Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Payment Collection Mode</label>
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
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Payment Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full text-emerald-400 font-bold"
                    placeholder="0"
                  />
                </div>

                <div className="flex flex-col justify-center text-right">
                  <span className="text-xs text-slate-400">
                    Total Invoice Bill ({activeDispatchItems.length} Categories Assigned):
                  </span>
                  <span className="text-2xl font-black text-slate-100">₹{totalAmount.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-rose-400 font-semibold">
                    Dues Added: ₹{balanceAdded.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Dispatch Notes / Transport Reference</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Dispatched multi-grade lot via Auto #KA01EF1234"
                  className="glass-input w-full text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="glass-button-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary text-xs px-5 py-2.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Outward Dispatch & Generate Bill ({activeDispatchItems.length} Assigned)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Digital Bill Generated Preview Modal */}
      {previewSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-5 bg-slate-900 border-slate-700 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Invoice {previewSale.invoiceNo} Generated!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Dispatched to <strong className="text-slate-200">{previewSale.customerName}</strong>
              </p>
            </div>

            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Bill ({previewSale.lineItems.length} Categories):</span>
                <strong className="text-slate-100">₹{previewSale.totalAmount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid Now:</span>
                <strong className="text-emerald-400">₹{previewSale.paidAmount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Balance Added to Dues:</span>
                <strong className="text-rose-400">₹{previewSale.balanceAdded}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={generateWhatsAppBillLink(previewSale)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full glass-button-primary text-xs py-3 bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Digital Bill on WhatsApp
              </a>
              <button
                onClick={() => generateSaleInvoicePDF(previewSale)}
                className="w-full glass-button-secondary text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF Invoice
              </button>
              <button
                onClick={() => setPreviewSale(null)}
                className="text-xs text-slate-400 hover:text-slate-200 pt-2"
              >
                Done / Close
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
