import React, { useState } from 'react';
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
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar
} from 'lucide-react';
import { AppState } from '../lib/storage';
import { exportDailyCrateSalesToExcel } from '../lib/excel';
import { generateDailyCrateSalesPDF } from '../lib/pdf';

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

  // Crate Sales Download Widget Filter State & Calculations
  const [salesPeriodFilter, setSalesPeriodFilter] = useState<'today' | 'yesterday' | '7days' | 'all'>('today');

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().slice(0, 10);

  const filteredCrateSales = appState.sales.filter(s => {
    if (salesPeriodFilter === 'today') return s.date === todayStr;
    if (salesPeriodFilter === 'yesterday') return s.date === yesterdayStr;
    if (salesPeriodFilter === '7days') return s.date >= sevenDaysAgoStr;
    return true; // 'all'
  });

  const filteredSmallCrates = filteredCrateSales.reduce((sum, s) => {
    return sum + s.lineItems.filter(i => i.crateSize === 'Small').reduce((lSum, i) => lSum + i.quantity, 0);
  }, 0);

  const filteredBigCrates = filteredCrateSales.reduce((sum, s) => {
    return sum + s.lineItems.filter(i => i.crateSize === 'Big').reduce((lSum, i) => lSum + i.quantity, 0);
  }, 0);

  const filteredTotalRevenue = filteredCrateSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const periodLabel = salesPeriodFilter === 'today' ? "Today" : salesPeriodFilter === 'yesterday' ? "Yesterday" : salesPeriodFilter === '7days' ? 'Last 7 Days' : 'All Time';

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/80 p-1 border border-emerald-500/30 flex-shrink-0 shadow-lg shadow-emerald-950/40 overflow-hidden">
            <img src="/tsk_logo.png" alt="T.S.K Vegetables Official Logo" className="w-full h-full object-contain" />
          </div>
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

      {/* Downloadable Daily Crate Sales Summary Section */}
      <div className="glass-panel p-5 space-y-4 bg-slate-900/90 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <Box className="w-5 h-5 text-emerald-400" />
              Crate Sales Ledger & Downloadable Summary
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filter sales dispatches by date, view total crates sold (Small vs Big), and export detailed spreadsheets/PDFs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setSalesPeriodFilter('today')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  salesPeriodFilter === 'today' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Today ({appState.sales.filter(s => s.date === todayStr).length})
              </button>

              <button
                onClick={() => setSalesPeriodFilter('yesterday')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  salesPeriodFilter === 'yesterday' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Yesterday ({appState.sales.filter(s => s.date === yesterdayStr).length})
              </button>

              <button
                onClick={() => setSalesPeriodFilter('7days')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  salesPeriodFilter === '7days' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last 7 Days
              </button>

              <button
                onClick={() => setSalesPeriodFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  salesPeriodFilter === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Export Buttons */}
            <button
              onClick={() => exportDailyCrateSalesToExcel(filteredCrateSales, periodLabel)}
              className="glass-button-secondary text-xs px-3 py-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5"
              title="Download Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Download Excel (.xlsx)
            </button>

            <button
              onClick={() => generateDailyCrateSalesPDF(filteredCrateSales, periodLabel)}
              className="glass-button-secondary text-xs px-3 py-2 border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
              title="Download PDF Report"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Crate Breakdown Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Small Crates Sold</span>
            <span className="text-xl font-bold text-slate-100">{filteredSmallCrates}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{periodLabel}</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Big Crates Sold</span>
            <span className="text-xl font-bold text-amber-300">{filteredBigCrates}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{periodLabel}</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Total Crates Sold</span>
            <span className="text-xl font-bold text-teal-400">{filteredSmallCrates + filteredBigCrates}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{periodLabel}</span>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium block">Total Sales Revenue</span>
            <span className="text-xl font-bold text-emerald-400">₹{filteredTotalRevenue.toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{filteredCrateSales.length} Transactions</span>
          </div>
        </div>

        {/* Itemized Sales Dispatches Preview Table */}
        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Crate Breakdown & Selling Price</th>
                <th className="py-2.5 px-3 text-right">Bill Total (₹)</th>
                <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                <th className="py-2.5 px-3 text-right">Dues Created (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredCrateSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No sales dispatches recorded for {periodLabel.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                filteredCrateSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{sale.date}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">{sale.invoiceNo}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">{sale.customerName}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1.5">
                        {sale.lineItems.map((item, idx) => (
                          <span key={idx} className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                            <strong className="text-slate-200">{item.quantity}</strong> {item.crateSize} {item.grade ? `[${item.grade}]` : ''} @ <span className="text-emerald-400">₹{item.ratePerCrate}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100">₹{sale.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">₹{sale.paidAmount.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                      {sale.balanceAdded === 0 ? <span className="text-emerald-400 text-[10px]">PAID</span> : `₹${sale.balanceAdded.toLocaleString('en-IN')}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
