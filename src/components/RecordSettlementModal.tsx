import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, X } from 'lucide-react';
import { AppState } from '../lib/storage';
import { EntityType, PassbookEntry } from '../types';

interface RecordSettlementModalProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  isOpen: boolean;
  onClose: () => void;
  defaultType?: EntityType;
  defaultEntityId?: string;
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  appState,
  setAppState,
  isOpen,
  onClose,
  defaultType = 'Customer',
  defaultEntityId,
}) => {
  const [entityType, setEntityType] = useState<EntityType>(defaultType);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [referenceId, setReferenceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setEntityType(defaultType);
      if (defaultEntityId) {
        setSelectedEntityId(defaultEntityId);
      } else {
        setSelectedEntityId(defaultType === 'Customer' ? (appState.customers[0]?.id || '') : (appState.suppliers[0]?.id || ''));
      }
      setAmount(0);
      setReferenceId('');
      setNotes('');
      setDate(new Date().toISOString().slice(0, 10));
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultType, defaultEntityId, appState.customers, appState.suppliers]);

  if (!isOpen) return null;

  const currentCustomer = entityType === 'Customer' ? appState.customers.find(c => c.id === selectedEntityId) : null;
  const currentSupplier = entityType === 'Supplier' ? appState.suppliers.find(s => s.id === selectedEntityId) : null;

  const currentDues = entityType === 'Customer' 
    ? (currentCustomer?.pendingBalance || 0)
    : (currentSupplier?.pendingBalance || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Settlement amount must be greater than zero.');
      return;
    }

    if (entityType === 'Customer') {
      if (!currentCustomer) {
        alert('Please select a valid customer.');
        return;
      }
      const newCustomerBalance = currentCustomer.pendingBalance - amount;

      const newPassbookEntry: PassbookEntry = {
        id: `pb-${Date.now()}`,
        date,
        entityType: 'Customer',
        entityId: currentCustomer.id,
        entityName: currentCustomer.name,
        type: 'Credit',
        amount,
        runningBalance: newCustomerBalance,
        transactionType: 'Payment_Received',
        paymentMode,
        referenceId,
        notes: notes || `Payment received via ${paymentMode}`,
        createdAt: new Date().toISOString(),
      };

      setAppState(prev => ({
        ...prev,
        customers: prev.customers.map(c => c.id === currentCustomer.id ? { ...c, pendingBalance: newCustomerBalance } : c),
        passbookEntries: [newPassbookEntry, ...prev.passbookEntries],
      }));

      alert(`Payment of ₹${amount} recorded for ${currentCustomer.name}! Customer dues balance updated.`);
    } else {
      if (!currentSupplier) {
        alert('Please select a valid supplier.');
        return;
      }
      const newSupplierBalance = currentSupplier.pendingBalance - amount;

      const newPassbookEntry: PassbookEntry = {
        id: `pb-${Date.now()}`,
        date,
        entityType: 'Supplier',
        entityId: currentSupplier.id,
        entityName: currentSupplier.name,
        type: 'Debit',
        amount,
        runningBalance: newSupplierBalance,
        transactionType: 'Payment_Paid',
        paymentMode,
        referenceId,
        notes: notes || `Settlement paid via ${paymentMode}`,
        createdAt: new Date().toISOString(),
      };

      setAppState(prev => ({
        ...prev,
        suppliers: prev.suppliers.map(s => s.id === currentSupplier.id ? { ...s, pendingBalance: newSupplierBalance } : s),
        passbookEntries: [newPassbookEntry, ...prev.passbookEntries],
      }));

      alert(`Settlement of ₹${amount} paid to ${currentSupplier.name}! Supplier debt balance updated.`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-md p-6 space-y-5 bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Record Payment / Settlement
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entity Type Switcher */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setEntityType('Customer');
              setSelectedEntityId(appState.customers[0]?.id || '');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              entityType === 'Customer' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🟢 Customer (Receive Payment)
          </button>
          <button
            type="button"
            onClick={() => {
              setEntityType('Supplier');
              setSelectedEntityId(appState.suppliers[0]?.id || '');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              entityType === 'Supplier' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔴 Supplier (Pay Settlement)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Entity Selector */}
          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Select {entityType === 'Customer' ? 'Customer (Buyer)' : 'Supplier (Seller)'} *
            </label>
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              className="glass-input w-full"
              required
            >
              {entityType === 'Customer'
                ? appState.customers.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                      {c.name} (Outstanding Dues: ₹{c.pendingBalance.toLocaleString('en-IN')})
                    </option>
                  ))
                : appState.suppliers.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                      {s.name} (Outstanding Debt: ₹{s.pendingBalance.toLocaleString('en-IN')})
                    </option>
                  ))
              }
            </select>
          </div>

          {/* Current Outstanding Dues Banner */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
            <span className="text-slate-300">
              Current Outstanding {entityType === 'Customer' ? 'Receivable Dues' : 'Payable Debt'}:
            </span>
            <strong className={`font-bold text-sm ${entityType === 'Customer' ? 'text-rose-400' : 'text-amber-400'}`}>
              ₹{currentDues.toLocaleString('en-IN')}
            </strong>
          </div>

          {/* Amount */}
          <div>
            <label className="text-slate-300 font-medium block mb-1">
              {entityType === 'Customer' ? 'Payment Received Amount (₹) *' : 'Settlement Paid Amount (₹) *'}
            </label>
            <input
              type="number"
              min="1"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="glass-input w-full text-emerald-400 text-base font-bold"
              placeholder="e.g. 5000"
              required
            />
          </div>

          {/* Mode */}
          <div>
            <label className="text-slate-300 font-medium block mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="glass-input w-full"
            >
              <option value="UPI" className="bg-slate-900">UPI / GPay / PhonePe</option>
              <option value="Cash" className="bg-slate-900">Cash Payment</option>
              <option value="Bank Transfer" className="bg-slate-900">Bank Transfer / NEFT / RTGS</option>
              <option value="Cheque" className="bg-slate-900">Cheque</option>
            </select>
          </div>

          {/* Date & Ref */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full"
                required
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">UTR / Ref No</label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="glass-input w-full"
                placeholder="NEFT-889922"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-300 font-medium block mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="glass-input w-full"
              placeholder="e.g. Mandi settlement payment"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="glass-button-secondary py-2 px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button-primary py-2 px-5 text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Settlement & Reflect Everywhere
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
