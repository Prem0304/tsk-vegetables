import React, { useState } from 'react';
import { Plus, Trash2, Box, Truck, CheckCircle2, UserPlus, X } from 'lucide-react';
import { AppState } from '../lib/storage';
import { Purchase, PurchaseLineItem, CrateSize, Supplier, PassbookEntry, EmptyCrateLog, STANDARD_GRADES, GradeStockItem } from '../types';

interface ProcurementModuleProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  isOpenModal: boolean;
  setIsOpenModal: (open: boolean) => void;
}

export const ProcurementModule: React.FC<ProcurementModuleProps> = ({
  appState,
  setAppState,
  isOpenModal,
  setIsOpenModal,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(appState.suppliers[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Dynamic Line Items with Grade / Category
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([
    { crateSize: 'Small', grade: 'Grade A (Top Red)', quantity: 42, ratePerCrate: 300, total: 12600 },
    { crateSize: 'Small', grade: 'Grade B (Medium)', quantity: 9, ratePerCrate: 240, total: 2160 },
  ]);

  // Inline New Supplier State
  const [showAddSupplier, setShowAddSupplier] = useState<boolean>(false);
  const [newSupName, setNewSupName] = useState<string>('');
  const [newSupPhone, setNewSupPhone] = useState<string>('');
  const [newSupAddress, setNewSupAddress] = useState<string>('');

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { crateSize: 'Small', grade: 'Grade A (Top Red)', quantity: 10, ratePerCrate: 250, total: 2500 }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof PurchaseLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    item.total = item.quantity * item.ratePerCrate;
    updated[index] = item;
    setLineItems(updated);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);
  const balanceAdded = Math.max(0, totalAmount - paidAmount);

  const handleAddNewSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupName,
      phone: newSupPhone || 'N/A',
      address: newSupAddress || 'Mandi Yard',
      pendingBalance: 0,
      createdAt: new Date().toISOString(),
    };

    setAppState(prev => ({
      ...prev,
      suppliers: [newSupplier, ...prev.suppliers]
    }));

    setSelectedSupplierId(newSupplier.id);
    setShowAddSupplier(false);
    setNewSupName('');
    setNewSupPhone('');
    setNewSupAddress('');
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = appState.suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      alert('Please select a valid supplier.');
      return;
    }

    if (totalAmount <= 0) {
      alert('Total purchase amount must be greater than zero.');
      return;
    }

    const purchaseNo = `PUR-${Date.now().toString().slice(-6)}`;
    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      purchaseNo,
      date,
      supplierId: supplier.id,
      supplierName: supplier.name,
      lineItems,
      totalAmount,
      paidAmount,
      balanceAdded,
      notes,
      createdAt: new Date().toISOString(),
    };

    // Calculate overall inventory & weighted average cost
    let smallAdded = 0;
    let smallAddedCost = 0;
    let bigAdded = 0;
    let bigAddedCost = 0;

    // Grade breakdown stocks
    const currentGradeStocks = [...(appState.inventory.gradeStocks || [])];

    lineItems.forEach(item => {
      const itemGrade = item.grade || 'Grade A (Top Red)';
      if (item.crateSize === 'Small') {
        smallAdded += item.quantity;
        smallAddedCost += item.total;
      } else {
        bigAdded += item.quantity;
        bigAddedCost += item.total;
      }

      // Update specific grade stock
      const existingGradeIdx = currentGradeStocks.findIndex(
        g => g.crateSize === item.crateSize && g.grade === itemGrade
      );

      if (existingGradeIdx >= 0) {
        const existing = currentGradeStocks[existingGradeIdx];
        const newCount = existing.count + item.quantity;
        const newAvg = newCount > 0 ? ((existing.count * existing.avgCost) + item.total) / newCount : item.ratePerCrate;
        currentGradeStocks[existingGradeIdx] = {
          ...existing,
          count: newCount,
          avgCost: Math.round(newAvg * 100) / 100,
        };
      } else {
        currentGradeStocks.push({
          crateSize: item.crateSize,
          grade: itemGrade,
          count: item.quantity,
          avgCost: item.ratePerCrate,
        });
      }
    });

    const currSmallCount = appState.inventory.smallCratesCount;
    const currSmallCost = appState.inventory.smallAvgCost;
    const newSmallCount = currSmallCount + smallAdded;
    const newSmallAvgCost = newSmallCount > 0 
      ? ((currSmallCount * currSmallCost) + smallAddedCost) / newSmallCount 
      : currSmallCost;

    const currBigCount = appState.inventory.bigCratesCount;
    const currBigCost = appState.inventory.bigAvgCost;
    const newBigCount = currBigCount + bigAdded;
    const newBigAvgCost = newBigCount > 0 
      ? ((currBigCount * currBigCost) + bigAddedCost) / newBigCount 
      : currBigCost;

    // Supplier Passbook Entries
    const newSupplierBalance1 = supplier.pendingBalance + totalAmount;
    const passbook1: PassbookEntry = {
      id: `pb-${Date.now()}-1`,
      date,
      entityType: 'Supplier',
      entityId: supplier.id,
      entityName: supplier.name,
      type: 'Credit',
      amount: totalAmount,
      runningBalance: newSupplierBalance1,
      transactionType: 'Purchase',
      referenceId: purchaseNo,
      notes: notes || `Purchased ${smallAdded + bigAdded} crates lot`,
      createdAt: new Date().toISOString(),
    };

    let passbookEntries = [passbook1];
    let finalSupplierBalance = newSupplierBalance1;

    if (paidAmount > 0) {
      finalSupplierBalance -= paidAmount;
      const passbook2: PassbookEntry = {
        id: `pb-${Date.now()}-2`,
        date,
        entityType: 'Supplier',
        entityId: supplier.id,
        entityName: supplier.name,
        type: 'Debit',
        amount: paidAmount,
        runningBalance: finalSupplierBalance,
        transactionType: 'Payment_Paid',
        paymentMode: 'Cash',
        referenceId: purchaseNo,
        notes: 'Initial purchase payment settlement',
        createdAt: new Date().toISOString(),
      };
      passbookEntries.push(passbook2);
    }

    // Crate Tracker Log
    const crateLogs: EmptyCrateLog[] = [];
    if (smallAdded > 0) {
      crateLogs.push({
        id: `ec-${Date.now()}-sm`,
        date,
        entityType: 'Supplier',
        entityId: supplier.id,
        entityName: supplier.name,
        crateSize: 'Small',
        action: 'Received_From_Supplier',
        quantity: smallAdded,
        smallBalanceAfter: smallAdded,
        bigBalanceAfter: 0,
        notes: `Inward dispatch ${purchaseNo}`,
        createdAt: new Date().toISOString(),
      });
    }
    if (bigAdded > 0) {
      crateLogs.push({
        id: `ec-${Date.now()}-bg`,
        date,
        entityType: 'Supplier',
        entityId: supplier.id,
        entityName: supplier.name,
        crateSize: 'Big',
        action: 'Received_From_Supplier',
        quantity: bigAdded,
        smallBalanceAfter: 0,
        bigBalanceAfter: bigAdded,
        notes: `Inward dispatch ${purchaseNo}`,
        createdAt: new Date().toISOString(),
      });
    }

    setAppState(prev => ({
      ...prev,
      purchases: [newPurchase, ...prev.purchases],
      suppliers: prev.suppliers.map(s => s.id === supplier.id ? { ...s, pendingBalance: finalSupplierBalance } : s),
      inventory: {
        smallCratesCount: newSmallCount,
        bigCratesCount: newBigCount,
        smallAvgCost: Math.round(newSmallAvgCost * 100) / 100,
        bigAvgCost: Math.round(newBigAvgCost * 100) / 100,
        gradeStocks: currentGradeStocks,
      },
      passbookEntries: [...passbookEntries, ...prev.passbookEntries],
      emptyCrateLogs: [...crateLogs, ...prev.emptyCrateLogs],
    }));

    setIsOpenModal(false);
    alert(`Purchase order ${purchaseNo} recorded with grade pricing! Stock updated.`);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            Inward Procurement & Grade Lots
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Record supplier truck dispatches with multi-grade crate categories and purchase pricing.
          </p>
        </div>
        <button
          onClick={() => setIsOpenModal(true)}
          className="glass-button-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          + Record New Purchase Order
        </button>
      </div>

      {/* Purchase History Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-200">Recent Procurement History</h3>
          <span className="text-xs text-slate-400">{appState.purchases.length} Purchase Orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Order No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Grade / Price Breakdown</th>
                <th className="p-3.5">Total Amount</th>
                <th className="p-3.5">Paid</th>
                <th className="p-3.5">Added to Dues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {appState.purchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="p-3.5 font-mono font-semibold text-emerald-400">{purchase.purchaseNo}</td>
                  <td className="p-3.5 text-slate-400">{purchase.date}</td>
                  <td className="p-3.5 font-medium text-slate-100">{purchase.supplierName}</td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {purchase.lineItems.map((item, idx) => (
                        <span key={idx} className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {item.quantity} {item.crateSize} ({item.grade || 'Grade A'}) @ ₹{item.ratePerCrate}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-slate-100">₹{purchase.totalAmount.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 text-emerald-400 font-semibold">₹{purchase.paidAmount.toLocaleString('en-IN')}</td>
                  <td className="p-3.5 font-semibold text-rose-400">
                    {purchase.balanceAdded > 0 ? `₹${purchase.balanceAdded.toLocaleString('en-IN')}` : 'PAID'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl p-6 space-y-5 bg-slate-900 border-slate-700 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                Inward Purchase Entry Form
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-5">
              {/* Supplier Selection & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Select Supplier *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(true)}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <UserPlus className="w-3 h-3" /> + Add New Supplier
                    </button>
                  </div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="glass-input w-full"
                    required
                  >
                    {appState.suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                        {s.name} (Current Dues: ₹{s.pendingBalance})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Purchase Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="glass-input w-full"
                    required
                  />
                </div>
              </div>

              {/* Multi-Line Items (Grade & Price Category Variations) */}
              <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Crate Grade & Price Variations
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Grade / Price Line
                  </button>
                </div>

                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2.5 items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/60">
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

                    <div className="col-span-12 sm:col-span-4">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Grade / Price Category</label>
                      <input
                        type="text"
                        list={`grade-options-${index}`}
                        value={item.grade || 'Grade A (Top Red)'}
                        onChange={(e) => updateLineItem(index, 'grade', e.target.value)}
                        placeholder="Select or type grade name"
                        className="glass-input w-full text-xs py-1.5"
                        required
                      />
                      <datalist id={`grade-options-${index}`}>
                        {STANDARD_GRADES.map((g, i) => (
                          <option key={i} value={g} />
                        ))}
                      </datalist>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="glass-input w-full text-xs py-1.5"
                        required
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Purchase Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.ratePerCrate}
                        onChange={(e) => updateLineItem(index, 'ratePerCrate', parseFloat(e.target.value) || 0)}
                        className="glass-input w-full text-xs py-1.5"
                        required
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-1 text-right">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Total</label>
                      <span className="font-bold text-xs text-slate-100 block py-1.5">
                        ₹{item.total.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {lineItems.length > 1 && (
                      <div className="col-span-1 sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Settlement & Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1 block">Initial Payment Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full text-emerald-400 font-bold"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Remaining added to Supplier Ledger: <strong className="text-rose-400">₹{balanceAdded.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="flex flex-col justify-center text-right space-y-1">
                  <span className="text-xs text-slate-400">Total Purchase Value:</span>
                  <span className="text-2xl font-black text-slate-100">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Lot / Vehicle Reference Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Lot #A4 Kolar truck return, Grade A & B mix"
                  className="glass-input w-full text-xs"
                />
              </div>

              {/* Modal Buttons */}
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
                  Save Purchase & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Add Supplier Drawer */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-5 space-y-4 bg-slate-900 border-slate-700">
            <h4 className="font-bold text-slate-100 text-sm">Add New Supplier Record</h4>
            <form onSubmit={handleAddNewSupplier} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300">Supplier Name *</label>
                <input
                  type="text"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="glass-input w-full text-xs mt-1"
                  placeholder="e.g. Kolar Farmers Mandi"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Phone Number</label>
                <input
                  type="text"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="glass-input w-full text-xs mt-1"
                  placeholder="+91 98765 00000"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Address / Location</label>
                <input
                  type="text"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="glass-input w-full text-xs mt-1"
                  placeholder="APMC Yard, Kolar"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplier(false)}
                  className="glass-button-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary text-xs py-1.5 px-4"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
