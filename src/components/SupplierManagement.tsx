import React, { useState } from 'react';
import { Truck, Search, Plus, Download, Wallet, Phone, MapPin, CheckCircle2, FileSpreadsheet, X } from 'lucide-react';
import { AppState } from '../lib/storage';
import { Supplier, PassbookEntry } from '../types';
import { generatePassbookPDF } from '../lib/pdf';
import { exportPassbookToExcel } from '../lib/excel';

interface SupplierManagementProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const SupplierManagement: React.FC<SupplierManagementProps> = ({
  appState,
  setAppState,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(appState.suppliers[0]?.id || null);

  // Settlement Modal State
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Add Supplier Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [supName, setSupName] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  const selectedSupplier = appState.suppliers.find(s => s.id === selectedSupplierId);
  const supplierPassbook = appState.passbookEntries.filter(
    p => p.entityType === 'Supplier' && p.entityId === selectedSupplierId
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const filteredSuppliers = appState.suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    const openBal = parseFloat(openingBalance) || 0;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: supName,
      phone: supPhone || 'N/A',
      address: supAddress || 'APMC Yard',
      pendingBalance: openBal,
      createdAt: new Date().toISOString(),
    };

    let passbookEntries: PassbookEntry[] = [];
    if (openBal > 0) {
      passbookEntries.push({
        id: `pb-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        entityType: 'Supplier',
        entityId: newSup.id,
        entityName: newSup.name,
        type: 'Credit',
        amount: openBal,
        runningBalance: openBal,
        transactionType: 'Adjustment',
        notes: 'Initial Opening Balance Payable',
        createdAt: new Date().toISOString(),
      });
    }

    setAppState(prev => ({
      ...prev,
      suppliers: [newSup, ...prev.suppliers],
      passbookEntries: [...passbookEntries, ...prev.passbookEntries],
    }));

    setSelectedSupplierId(newSup.id);
    setShowAddModal(false);
    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setOpeningBalance('0');
  };

  const handlePaySupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (payAmount <= 0) {
      alert('Settlement payment amount must be greater than zero.');
      return;
    }

    // Debit reduces supplier debt
    const newRunningBalance = selectedSupplier.pendingBalance - payAmount;

    const newPassbookEntry: PassbookEntry = {
      id: `pb-${Date.now()}`,
      date: payDate,
      entityType: 'Supplier',
      entityId: selectedSupplier.id,
      entityName: selectedSupplier.name,
      type: 'Debit',
      amount: payAmount,
      runningBalance: newRunningBalance,
      transactionType: 'Payment_Paid',
      paymentMode: payMode,
      referenceId: payRef,
      notes: payNotes || `Settlement payment paid via ${payMode}`,
      createdAt: new Date().toISOString(),
    };

    setAppState(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => s.id === selectedSupplier.id ? { ...s, pendingBalance: newRunningBalance } : s),
      passbookEntries: [newPassbookEntry, ...prev.passbookEntries],
    }));

    setShowPayModal(false);
    setPayAmount(0);
    setPayRef('');
    setPayNotes('');
    alert(`Settlement payment of ₹${payAmount} recorded to ${selectedSupplier.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            Supplier Management & Payable Ledgers
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track inward tomato suppliers, manage accounts payable, and record cash/NEFT settlements.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="glass-button-primary text-xs px-4 py-2"
        >
          <Plus className="w-4 h-4" />
          + Add New Supplier
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Supplier Directory (5 Cols) */}
        <div className="lg:col-span-5 glass-panel p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search suppliers..."
              className="glass-input w-full text-xs pl-9 py-2"
            />
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredSuppliers.map((supplier) => {
              const isSelected = selectedSupplierId === supplier.id;
              const hasDebt = supplier.pendingBalance > 0;

              return (
                <div
                  key={supplier.id}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{supplier.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {supplier.address}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" /> {supplier.phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                        hasDebt
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {hasDebt ? `₹${supplier.pendingBalance.toLocaleString('en-IN')}` : 'NIL'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {hasDebt ? 'Payable Debt' : 'Settled'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Supplier Detail Passbook (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-5">
          {selectedSupplier ? (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-100">{selectedSupplier.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                      Supplier Ledger
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedSupplier.address} • {selectedSupplier.phone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowPayModal(true)}
                    className="glass-button-primary text-xs px-3.5 py-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Record Settlement / Pay Supplier
                  </button>

                  <button
                    onClick={() => generatePassbookPDF(selectedSupplier.name, 'Supplier', supplierPassbook, selectedSupplier.pendingBalance)}
                    className="glass-button-secondary text-xs px-3 py-2"
                    title="Export PDF Statement"
                  >
                    <Download className="w-4 h-4" />
                    PDF Statement
                  </button>

                  <button
                    onClick={() => exportPassbookToExcel(supplierPassbook, selectedSupplier.name)}
                    className="glass-button-secondary text-xs px-3 py-2"
                    title="Export Excel Statement"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Running Balance Card */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Total Outstanding Debt Owed</span>
                  <span className="text-2xl font-black text-amber-400">
                    ₹{selectedSupplier.pendingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Passbook Status</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Active Account
                  </span>
                </div>
              </div>

              {/* Timeline Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Transaction</th>
                      <th className="p-3">Ref / Note</th>
                      <th className="p-3">Credit (Purchase)</th>
                      <th className="p-3">Debit (Paid)</th>
                      <th className="p-3">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {supplierPassbook.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="p-3 text-slate-400">{entry.date}</td>
                        <td className="p-3 font-medium">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            entry.transactionType === 'Purchase'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {entry.transactionType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 max-w-[150px] truncate">
                          {entry.referenceId && <span className="font-mono text-emerald-400 mr-1">{entry.referenceId}</span>}
                          {entry.notes}
                        </td>
                        <td className="p-3 font-bold text-amber-400">
                          {entry.type === 'Credit' ? `₹${entry.amount}` : '-'}
                        </td>
                        <td className="p-3 font-bold text-emerald-400">
                          {entry.type === 'Debit' ? `₹${entry.amount}` : '-'}
                        </td>
                        <td className="p-3 font-bold text-slate-100">
                          ₹{entry.runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Select a supplier from the left directory to view passbook ledger.
            </div>
          )}
        </div>
      </div>

      {/* Pay Supplier Settlement Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-5 bg-slate-900 border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Pay Supplier Settlement ({selectedSupplier.name})
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySupplierSubmit} className="space-y-4 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex justify-between">
                <span className="text-slate-300">Total Outstanding Payable Debt:</span>
                <strong className="text-amber-400 font-bold">₹{selectedSupplier.pendingBalance.toLocaleString('en-IN')}</strong>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Settlement Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="glass-input w-full text-emerald-400 text-base font-bold"
                  placeholder="e.g. 10000"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as any)}
                  className="glass-input w-full"
                >
                  <option value="UPI" className="bg-slate-900">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer" className="bg-slate-900">Bank Transfer / NEFT / RTGS</option>
                  <option value="Cash" className="bg-slate-900">Cash Payment</option>
                  <option value="Cheque" className="bg-slate-900">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Transaction Ref / UTR No</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. NEFT-8839210"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Settlement for Kolar truck lot"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="glass-button-secondary py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary py-2 px-5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Supplier Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 bg-slate-900 border-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Add New Supplier Record</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Madanapalle Agro Farms"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="glass-input w-full"
                  placeholder="+91 91234 56789"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Mandi Address / Location</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Chittoor Bypass, AP"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Initial Opening Payable Balance (₹)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="glass-input w-full text-amber-400 font-bold"
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
