import React from 'react';
import { 
  PlusCircle, 
  ShoppingCart, 
  Truck, 
  Wallet, 
  TrendingUp, 
  Box, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import { AppState } from '../lib/storage';

interface DashboardProps {
  appState: AppState;
  setActiveTab: (tab: string) => void;
  onOpenProcurement: () => void;
  onOpenSales: () => void;
  onOpenPaymentModal: (type: 'Customer' | 'Supplier') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  appState,
  setActiveTab,
  onOpenProcurement,
  onOpenSales,
  onOpenPaymentModal,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Calculations for Today
  const todayPurchases = appState.purchases.filter(p => p.date === todayStr);
  const todaySales = appState.sales.filter(s => s.date === todayStr);

  const todayPurchasedCrates = todayPurchases.reduce(
    (acc, p) => acc + p.lineItems.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  const todaySoldCrates = todaySales.reduce(
    (acc, s) => acc + s.lineItems.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  const todayRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);

  // Estimated COGS & Profit for today
  const todayCOGS = todaySales.reduce((acc, sale) => {
    const saleCOGS = sale.lineItems.reduce((itemSum, item) => {
      const avgCost = item.crateSize === 'Small' ? appState.inventory.smallAvgCost : appState.inventory.bigAvgCost;
      return itemSum + (item.quantity * avgCost);
    }, 0);
    return acc + saleCOGS;
  }, 0);

  const todayEstimatedProfit = todayRevenue - todayCOGS;

  // Outstanding Totals
  const totalReceivables = appState.customers.reduce((sum, c) => sum + Math.max(0, c.pendingBalance), 0);
  const totalPayables = appState.suppliers.reduce((sum, s) => sum + Math.max(0, s.pendingBalance), 0);

  // Empty Crate Totals Pending Return
  const totalSmallCratesWithCustomers = appState.emptyCrateLogs
    .filter(l => l.entityType === 'Customer')
    .reduce((sum, l) => l.crateSize === 'Small' ? (l.action === 'Given_To_Customer' ? sum + l.quantity : sum - l.quantity) : sum, 0);

  const totalBigCratesWithCustomers = appState.emptyCrateLogs
    .filter(l => l.entityType === 'Customer')
    .reduce((sum, l) => l.crateSize === 'Big' ? (l.action === 'Given_To_Customer' ? sum + l.quantity : sum - l.quantity) : sum, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              Mandi Overview & Live Summary
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time daily operations for T.S.K Vegetables • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Quick Actions Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenProcurement}
            className="glass-button-primary text-sm px-4 py-2.5"
          >
            <PlusCircle className="w-4 h-4" />
            + New Purchase
          </button>
          <button
            onClick={onOpenSales}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            + New Sale
          </button>
          <button
            onClick={() => onOpenPaymentModal('Customer')}
            className="glass-button-secondary text-sm px-3.5 py-2.5"
          >
            <Wallet className="w-4 h-4 text-cyan-400" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Stock & Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Crates Trade */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Trade</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-100">{todaySoldCrates} <span className="text-xs font-normal text-slate-400">Sold</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Purchased: <strong className="text-emerald-400">{todayPurchasedCrates} Crates</strong></p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> Mandi Open
              </span>
            </div>
          </div>
        </div>

        {/* Current Stock in Hand */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stock in Hand</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block">Small Crates</span>
              <span className="text-lg font-bold text-slate-100">{appState.inventory.smallCratesCount}</span>
              <span className="text-[10px] text-slate-400 block">Avg: ₹{Math.round(appState.inventory.smallAvgCost)}</span>
            </div>
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block">Big Crates</span>
              <span className="text-lg font-bold text-amber-300">{appState.inventory.bigCratesCount}</span>
              <span className="text-[10px] text-slate-400 block">Avg: ₹{Math.round(appState.inventory.bigAvgCost)}</span>
            </div>
          </div>
        </div>

        {/* Today's Revenue & Estimated Profit */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-100">₹{todayRevenue.toLocaleString('en-IN')}</p>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-400">Est. Gross Profit:</span>
              <span className={`font-semibold ${todayEstimatedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{todayEstimatedProfit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Dues Balance Summary */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <span className="text-slate-300">Receivables (Customer):</span>
              <strong className="text-emerald-400 font-bold">₹{totalReceivables.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between items-center bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              <span className="text-slate-300">Payables (Supplier):</span>
              <strong className="text-rose-400 font-bold">₹{totalPayables.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Empty Crate Status Quick Bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Empty Plastic Crates Out With Customers
            </h4>
            <p className="text-xs text-slate-400">
              Pending Return: <strong className="text-amber-400">{totalSmallCratesWithCustomers} Small Crates</strong> & <strong className="text-amber-400">{totalBigCratesWithCustomers} Big Crates</strong>
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('crates')}
          className="glass-button-secondary text-xs px-3.5 py-2 whitespace-nowrap"
        >
          View Crate Tracker & Logs →
        </button>
      </div>

      {/* Two Column Layout: Recent Sales vs Top Dues Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Dispatches / Sales */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
              Recent Outward Sales & Receipts
            </h3>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-xs text-emerald-400 hover:underline"
            >
              View All Sales
            </button>
          </div>

          <div className="space-y-3">
            {appState.sales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                className="p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-100">{sale.customerName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      {sale.invoiceNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {sale.lineItems.map(i => `${i.quantity} ${i.crateSize}`).join(', ')} • {sale.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-100">₹{sale.totalAmount.toLocaleString('en-IN')}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                    sale.balanceAdded === 0 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {sale.balanceAdded === 0 ? 'PAID FULL' : `Dues: ₹${sale.balanceAdded}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Dues Alert Table */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Top Outstanding Customer Dues
            </h3>
            <button
              onClick={() => setActiveTab('customers')}
              className="text-xs text-emerald-400 hover:underline"
            >
              Open Passbooks
            </button>
          </div>

          <div className="space-y-3">
            {appState.customers
              .filter(c => c.pendingBalance > 0)
              .sort((a, b) => b.pendingBalance - a.pendingBalance)
              .slice(0, 5)
              .map((customer) => (
                <div
                  key={customer.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between transition-all"
                >
                  <div>
                    <h4 className="font-semibold text-sm text-slate-100">{customer.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{customer.shopLocation} • {customer.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-rose-400">₹{customer.pendingBalance.toLocaleString('en-IN')}</p>
                    <button
                      onClick={() => onOpenPaymentModal('Customer')}
                      className="text-[10px] text-emerald-400 hover:underline font-medium"
                    >
                      Receive Payment
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
