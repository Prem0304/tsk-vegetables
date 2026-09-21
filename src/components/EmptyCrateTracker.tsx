import React, { useState } from 'react';
import { Box, Plus, RotateCcw, ArrowRightLeft, User, Truck, CheckCircle2, X, Download, FileSpreadsheet } from 'lucide-react';
import { AppState } from '../lib/storage';
import { EmptyCrateLog, CrateSize, EntityType, CrateAction } from '../types';
import { exportEmptyCrateLogsToExcel } from '../lib/excel';
import { generateEmptyCratesPDF } from '../lib/pdf';
import { formatDateWithDay } from '../lib/dateUtils';

interface EmptyCrateTrackerProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const EmptyCrateTracker: React.FC<EmptyCrateTrackerProps> = ({
  appState,
  setAppState,
}) => {
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [entityType, setEntityType] = useState<EntityType>('Customer');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(appState.customers[0]?.id || '');
  const [crateSize, setCrateSize] = useState<CrateSize>('Small');
  const [action, setAction] = useState<CrateAction>('Returned_By_Customer');
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');

  // Calculate Crate Balances per Customer
  const customerCrateBalances = appState.customers.map((customer) => {
    const logs = appState.emptyCrateLogs.filter(
      l => l.entityType === 'Customer' && l.entityId === customer.id
    );

    const smallGiven = logs.filter(l => l.crateSize === 'Small' && l.action === 'Given_To_Customer').reduce((sum, l) => sum + l.quantity, 0);
    const smallReturned = logs.filter(l => l.crateSize === 'Small' && l.action === 'Returned_By_Customer').reduce((sum, l) => sum + l.quantity, 0);
    const smallPending = smallGiven - smallReturned;

    const bigGiven = logs.filter(l => l.crateSize === 'Big' && l.action === 'Given_To_Customer').reduce((sum, l) => sum + l.quantity, 0);
    const bigReturned = logs.filter(l => l.crateSize === 'Big' && l.action === 'Returned_By_Customer').reduce((sum, l) => sum + l.quantity, 0);
    const bigPending = bigGiven - bigReturned;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      smallPending,
      bigPending,
    };
  });

  // Calculate Crate Balances per Supplier
  const supplierCrateBalances = appState.suppliers.map((supplier) => {
    const logs = appState.emptyCrateLogs.filter(
      l => l.entityType === 'Supplier' && l.entityId === supplier.id
    );

    const smallRec = logs.filter(l => l.crateSize === 'Small' && l.action === 'Received_From_Supplier').reduce((sum, l) => sum + l.quantity, 0);
    const smallRet = logs.filter(l => l.crateSize === 'Small' && l.action === 'Returned_To_Supplier').reduce((sum, l) => sum + l.quantity, 0);
    const smallPending = smallRec - smallRet;

    const bigRec = logs.filter(l => l.crateSize === 'Big' && l.action === 'Received_From_Supplier').reduce((sum, l) => sum + l.quantity, 0);
    const bigRet = logs.filter(l => l.crateSize === 'Big' && l.action === 'Returned_To_Supplier').reduce((sum, l) => sum + l.quantity, 0);
    const bigPending = bigRec - bigRet;

    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      smallPending,
      bigPending,
    };
  });

  const totalSmallOutWithCustomers = customerCrateBalances.reduce((sum, c) => sum + Math.max(0, c.smallPending), 0);
  const totalBigOutWithCustomers = customerCrateBalances.reduce((sum, c) => sum + Math.max(0, c.bigPending), 0);

  // Helper to get exact pending returnable crate balance for selected entity & size
  const getPendingReturnableCrates = (eType: EntityType, eId: string, size: CrateSize): number => {
    if (eType === 'Customer') {
      const logs = appState.emptyCrateLogs.filter(
        l => l.entityType === 'Customer' && l.entityId === eId && l.crateSize === size
      );
      const given = logs.filter(l => l.action === 'Given_To_Customer').reduce((sum, l) => sum + l.quantity, 0);
      const returned = logs.filter(l => l.action === 'Returned_By_Customer').reduce((sum, l) => sum + l.quantity, 0);
      return Math.max(0, given - returned);
    } else {
      const logs = appState.emptyCrateLogs.filter(
        l => l.entityType === 'Supplier' && l.entityId === eId && l.crateSize === size
      );
      const received = logs.filter(l => l.action === 'Received_From_Supplier').reduce((sum, l) => sum + l.quantity, 0);
      const returned = logs.filter(l => l.action === 'Returned_To_Supplier').reduce((sum, l) => sum + l.quantity, 0);
      return Math.max(0, received - returned);
    }
  };

  const isReturnAction = action === 'Returned_By_Customer' || action === 'Returned_To_Supplier';
  const pendingDue = isReturnAction ? getPendingReturnableCrates(entityType, selectedEntityId, crateSize) : null;

  const handleLogCrateMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      alert('Crate quantity must be greater than zero.');
      return;
    }

    const entityName = entityType === 'Customer'
      ? appState.customers.find(c => c.id === selectedEntityId)?.name || 'Customer'
      : appState.suppliers.find(s => s.id === selectedEntityId)?.name || 'Supplier';

    // STRICT RETURN CAPPING VALIDATION
    if (isReturnAction && pendingDue !== null && quantity > pendingDue) {
      alert(`❌ CANNOT RETURN: ${entityName} only has ${pendingDue} ${crateSize} Crates pending return!\nRequested return: ${quantity}\nOnly need to return: ${pendingDue}`);
      setQuantity(pendingDue);
      return;
    }

    const newLog: EmptyCrateLog = {
      id: `ec-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      entityType,
      entityId: selectedEntityId,
      entityName,
      crateSize,
      action,
      quantity,
      smallBalanceAfter: 0,
      bigBalanceAfter: 0,
      notes: notes || `Crate movement ${action.replace(/_/g, ' ')}`,
      createdAt: new Date().toISOString(),
    };

    setAppState(prev => ({
      ...prev,
      emptyCrateLogs: [newLog, ...prev.emptyCrateLogs],
    }));

    setShowLogModal(false);
    setQuantity(10);
    setNotes('');
    alert(`Crate movement recorded for ${entityName}!`);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-400" />
            Empty Plastic Crate Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track plastic crates out with customers or owed to suppliers. Mandi plastic crates are valuable reusable assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportEmptyCrateLogsToExcel(appState.emptyCrateLogs, appState.customers, appState.suppliers)}
            className="glass-button-secondary text-xs px-3 py-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5"
            title="Download Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Download Excel (.xlsx)
          </button>

          <button
            onClick={() => generateEmptyCratesPDF(appState.emptyCrateLogs, appState.customers, appState.suppliers)}
            className="glass-button-secondary text-xs px-3 py-2 border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
            title="Download PDF Report"
          >
            <Download className="w-4 h-4 text-amber-400" />
            Download PDF
          </button>

          <button
            onClick={() => {
              const defaultCust = appState.customers[0];
              const due = defaultCust ? getPendingReturnableCrates('Customer', defaultCust.id, 'Small') : 0;
              setEntityType('Customer');
              setSelectedEntityId(defaultCust?.id || '');
              setCrateSize('Small');
              setAction('Returned_By_Customer');
              setQuantity(due > 0 ? due : 1);
              setShowLogModal(true);
            }}
            className="glass-button-primary text-xs px-4 py-2 bg-gradient-to-r from-amber-600 to-emerald-600"
          >
            <ArrowRightLeft className="w-4 h-4" />
            + Record Crate Return / Movement
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Small Crates Out (Customers)</span>
          <p className="text-2xl font-black text-amber-400">{totalSmallOutWithCustomers} Crates</p>
          <span className="text-[10px] text-slate-400">Pending return to Mandi</span>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Big Crates Out (Customers)</span>
          <p className="text-2xl font-black text-amber-400">{totalBigOutWithCustomers} Crates</p>
          <span className="text-[10px] text-slate-400">Pending return to Mandi</span>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Small Crates In Stock</span>
          <p className="text-2xl font-black text-emerald-400">{appState.inventory.smallCratesCount}</p>
          <span className="text-[10px] text-slate-400">Physical stock available</span>
        </div>

        <div className="glass-panel p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Big Crates In Stock</span>
          <p className="text-2xl font-black text-emerald-400">{appState.inventory.bigCratesCount}</p>
          <span className="text-[10px] text-slate-400">Physical stock available</span>
        </div>
      </div>

      {/* Two Column Grid: Customer Crate Balances (Left) vs Supplier Crate Balances (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Crate Balances Table */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              Customer Empty Crate Dues (Out With Buyer)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-2.5">Customer Name</th>
                  <th className="p-2.5 text-center">Small Crates Due</th>
                  <th className="p-2.5 text-center">Big Crates Due</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {customerCrateBalances.map((cb) => (
                  <tr key={cb.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-medium">{cb.name}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${cb.smallPending > 0 ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400'}`}>
                        {cb.smallPending}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${cb.bigPending > 0 ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400'}`}>
                        {cb.bigPending}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => {
                          const size = cb.smallPending > 0 ? 'Small' : 'Big';
                          const due = cb.smallPending > 0 ? cb.smallPending : cb.bigPending;
                          setEntityType('Customer');
                          setSelectedEntityId(cb.id);
                          setCrateSize(size);
                          setAction('Returned_By_Customer');
                          setQuantity(Math.max(1, due));
                          setShowLogModal(true);
                        }}
                        className="text-[11px] text-emerald-400 hover:underline font-semibold"
                      >
                        Return Crates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Crate Balances Table */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              Supplier Empty Crate Balances (With Mandi)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-2.5">Supplier Name</th>
                  <th className="p-2.5 text-center">Small Crates With Us</th>
                  <th className="p-2.5 text-center">Big Crates With Us</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {supplierCrateBalances.map((sb) => (
                  <tr key={sb.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-medium">{sb.name}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${sb.smallPending > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400'}`}>
                        {sb.smallPending}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold ${sb.bigPending > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400'}`}>
                        {sb.bigPending}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => {
                          const size = sb.smallPending > 0 ? 'Small' : 'Big';
                          const due = sb.smallPending > 0 ? sb.smallPending : sb.bigPending;
                          setEntityType('Supplier');
                          setSelectedEntityId(sb.id);
                          setCrateSize(size);
                          setAction('Returned_To_Supplier');
                          setQuantity(Math.max(1, due));
                          setShowLogModal(true);
                        }}
                        className="text-[11px] text-emerald-400 hover:underline font-semibold"
                      >
                        Return to Supplier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Crate Movement Log Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-semibold text-sm text-slate-200">Recent Crate Movement Logs</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Name</th>
                <th className="p-3">Crate Size</th>
                <th className="p-3">Action</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {appState.emptyCrateLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-300 font-semibold">{formatDateWithDay(log.date)}</td>
                  <td className="p-3 text-slate-400">{log.entityType}</td>
                  <td className="p-3 font-medium text-slate-100">{log.entityName}</td>
                  <td className="p-3 font-semibold text-amber-300">{log.crateSize} Crate</td>
                  <td className="p-3 font-medium">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      log.action.includes('Returned')
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-100">{log.quantity}</td>
                  <td className="p-3 text-slate-400">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Crate Movement Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 bg-slate-900 border-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Box className="w-5 h-5 text-amber-400" />
                Record Crate Movement
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogCrateMovement} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Entity Type</label>
                <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('Customer');
                      setSelectedEntityId(appState.customers[0]?.id || '');
                      setAction('Returned_By_Customer');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${entityType === 'Customer' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                  >
                    Customer (Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('Supplier');
                      setSelectedEntityId(appState.suppliers[0]?.id || '');
                      setAction('Returned_To_Supplier');
                    }}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${entityType === 'Supplier' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                  >
                    Supplier (Seller)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Select {entityType}</label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="glass-input w-full"
                >
                  {entityType === 'Customer'
                    ? appState.customers.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)
                    : appState.suppliers.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>)
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Crate Size</label>
                  <select
                    value={crateSize}
                    onChange={(e) => setCrateSize(e.target.value as CrateSize)}
                    className="glass-input w-full"
                  >
                    <option value="Small" className="bg-slate-900">Small Crate</option>
                    <option value="Big" className="bg-slate-900">Big Crate</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Crate Action</label>
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value as CrateAction)}
                    className="glass-input w-full"
                  >
                    {entityType === 'Customer' ? (
                      <>
                        <option value="Returned_By_Customer" className="bg-slate-900">Returned By Customer</option>
                        <option value="Given_To_Customer" className="bg-slate-900">Issued To Customer</option>
                      </>
                    ) : (
                      <>
                        <option value="Returned_To_Supplier" className="bg-slate-900">Returned To Supplier</option>
                        <option value="Received_From_Supplier" className="bg-slate-900">Received From Supplier</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300 font-medium block">Quantity of Crates *</label>
                  {isReturnAction && pendingDue !== null && (
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Pending Due: {pendingDue} Crates (Max Returnable)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={isReturnAction && pendingDue !== null ? pendingDue : undefined}
                  value={quantity || ''}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value) || 0;
                    if (isReturnAction && pendingDue !== null && parsed > pendingDue) {
                      setQuantity(pendingDue);
                      const entityName = entityType === 'Customer'
                        ? appState.customers.find(c => c.id === selectedEntityId)?.name || 'Customer'
                        : appState.suppliers.find(s => s.id === selectedEntityId)?.name || 'Supplier';
                      alert(`Only ${pendingDue} ${crateSize} Crates need to be returned by ${entityName}.`);
                    } else {
                      setQuantity(parsed);
                    }
                  }}
                  className={`glass-input w-full font-bold ${
                    isReturnAction && pendingDue !== null && quantity > pendingDue
                      ? 'text-rose-400 border-rose-500'
                      : 'text-emerald-400'
                  }`}
                  required
                />
                {isReturnAction && pendingDue !== null && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Capped to actual pending crate balance ({pendingDue} crates due).
                  </p>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Reference Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Returned 10 empty crates via auto driver"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="glass-button-secondary py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary py-2 px-5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Crate Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
