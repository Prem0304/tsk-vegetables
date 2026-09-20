import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  PieChart as PieIcon, 
  BarChart2, 
  ShieldAlert, 
  Plus, 
  Trash2,
  AlertOctagon,
  CheckCircle2,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { AppState } from '../lib/storage';
import { WastageLog, CrateSize } from '../types';

interface ProfitAnalyticsProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const ProfitAnalytics: React.FC<ProfitAnalyticsProps> = ({
  appState,
  setAppState,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [showWastageModal, setShowWastageModal] = useState<boolean>(false);

  // Wastage Form State
  const [wastageCrateSize, setWastageCrateSize] = useState<CrateSize>('Small');
  const [wastageQty, setWastageQty] = useState<number>(2);
  const [wastageLossValue, setWastageLossValue] = useState<number>(530);
  const [wastageReason, setWastageReason] = useState<string>('Rotten tomatoes due to transit rain');
  const [wastageNotes, setWastageNotes] = useState<string>('');

  // Date Filtering logic
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredSales = appState.sales.filter(s => {
    const sDate = new Date(s.date);
    if (dateFilter === 'today') return s.date === todayStr;
    if (dateFilter === 'yesterday') return s.date === yesterdayStr;
    if (dateFilter === 'week') return sDate >= sevenDaysAgo;
    if (dateFilter === 'month') return sDate >= startOfMonth;
    return true;
  });

  const filteredPurchases = appState.purchases.filter(p => {
    const pDate = new Date(p.date);
    if (dateFilter === 'today') return p.date === todayStr;
    if (dateFilter === 'yesterday') return p.date === yesterdayStr;
    if (dateFilter === 'week') return pDate >= sevenDaysAgo;
    if (dateFilter === 'month') return pDate >= startOfMonth;
    return true;
  });

  const filteredWastage = appState.wastageLogs.filter(w => {
    const wDate = new Date(w.date);
    if (dateFilter === 'today') return w.date === todayStr;
    if (dateFilter === 'yesterday') return w.date === yesterdayStr;
    if (dateFilter === 'week') return wDate >= sevenDaysAgo;
    if (dateFilter === 'month') return wDate >= startOfMonth;
    return true;
  });

  // Totals & Financial Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPurchaseCost = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // Cost of Goods Sold (COGS) based on weighted average cost
  const totalCOGS = filteredSales.reduce((acc, sale) => {
    const saleCOGS = sale.lineItems.reduce((itemSum, item) => {
      const avgCost = item.crateSize === 'Small' ? appState.inventory.smallAvgCost : appState.inventory.bigAvgCost;
      return itemSum + (item.quantity * avgCost);
    }, 0);
    return acc + saleCOGS;
  }, 0);

  const totalWastageLoss = filteredWastage.reduce((sum, w) => sum + w.estimatedLossValue, 0);

  const grossProfit = totalRevenue - totalCOGS - totalWastageLoss;
  const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Small Crate Margin vs Big Crate Margin
  const smallSales = filteredSales.flatMap(s => s.lineItems.filter(i => i.crateSize === 'Small'));
  const smallRev = smallSales.reduce((sum, i) => sum + i.total, 0);
  const smallQty = smallSales.reduce((sum, i) => sum + i.quantity, 0);
  const smallAvgSellingPrice = smallQty > 0 ? smallRev / smallQty : 0;
  const smallAvgProfitPerCrate = smallAvgSellingPrice > 0 ? smallAvgSellingPrice - appState.inventory.smallAvgCost : 0;

  const bigSales = filteredSales.flatMap(s => s.lineItems.filter(i => i.crateSize === 'Big'));
  const bigRev = bigSales.reduce((sum, i) => sum + i.total, 0);
  const bigQty = bigSales.reduce((sum, i) => sum + i.quantity, 0);
  const bigAvgSellingPrice = bigQty > 0 ? bigRev / bigQty : 0;
  const bigAvgProfitPerCrate = bigAvgSellingPrice > 0 ? bigAvgSellingPrice - appState.inventory.bigAvgCost : 0;

  // Daily Profit Trend Chart Data
  const dailyDataMap: { [date: string]: { date: string, Revenue: number, Cost: number, Profit: number } } = {};
  
  filteredSales.forEach(s => {
    if (!dailyDataMap[s.date]) {
      dailyDataMap[s.date] = { date: s.date, Revenue: 0, Cost: 0, Profit: 0 };
    }
    dailyDataMap[s.date].Revenue += s.totalAmount;
    
    const sCOGS = s.lineItems.reduce((sum, item) => {
      const avgCost = item.crateSize === 'Small' ? appState.inventory.smallAvgCost : appState.inventory.bigAvgCost;
      return sum + (item.quantity * avgCost);
    }, 0);
    dailyDataMap[s.date].Cost += sCOGS;
  });

  const chartData = Object.values(dailyDataMap)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(d => ({
      ...d,
      Profit: Math.max(0, d.Revenue - d.Cost),
    }));

  // Top Customers Data for Chart
  const customerSalesMap: { [name: string]: number } = {};
  filteredSales.forEach(s => {
    customerSalesMap[s.customerName] = (customerSalesMap[s.customerName] || 0) + s.totalAmount;
  });

  const topCustomersData = Object.entries(customerSalesMap)
    .map(([name, amount]) => ({ name: name.split(' ')[0], amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  const handleAddWastageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (wastageQty <= 0) {
      alert('Wastage crate count must be greater than zero.');
      return;
    }

    const newLog: WastageLog = {
      id: `was-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      crateSize: wastageCrateSize,
      quantity: wastageQty,
      estimatedLossValue: wastageLossValue,
      reason: wastageReason,
      notes: wastageNotes,
      createdAt: new Date().toISOString(),
    };

    // Deduct damaged crates from stock
    const newSmallStock = wastageCrateSize === 'Small' 
      ? Math.max(0, appState.inventory.smallCratesCount - wastageQty) 
      : appState.inventory.smallCratesCount;

    const newBigStock = wastageCrateSize === 'Big' 
      ? Math.max(0, appState.inventory.bigCratesCount - wastageQty) 
      : appState.inventory.bigCratesCount;

    setAppState(prev => ({
      ...prev,
      wastageLogs: [newLog, ...prev.wastageLogs],
      inventory: {
        ...prev.inventory,
        smallCratesCount: newSmallStock,
        bigCratesCount: newBigStock,
      }
    }));

    setShowWastageModal(false);
    setWastageNotes('');
    alert(`Wastage write-off logged! Stock deducted.`);
  };

  return (
    <div className="space-y-6">
      {/* Module Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Profit Analytics & Mandi Financials
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time profit margins, cost of goods sold, daily revenue trends, and tomato rot write-offs.
          </p>
        </div>

        {/* Filter Pills & Wastage Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${dateFilter === 'today' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${dateFilter === 'yesterday' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${dateFilter === 'week' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${dateFilter === 'month' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${dateFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={() => setShowWastageModal(true)}
            className="glass-button-danger text-xs px-3.5 py-2"
          >
            <AlertOctagon className="w-4 h-4" />
            + Write-Off Damaged Crates
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Sales Revenue</span>
          <p className="text-2xl font-black text-slate-100">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-400">Total out-bound sales value</span>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Est. COGS (Cost of Goods)</span>
          <p className="text-2xl font-black text-amber-300">₹{Math.round(totalCOGS).toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-400">Weighted avg procurement cost</span>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Gross Profit</span>
          <p className={`text-2xl font-black ${grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{Math.round(grossProfit).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-slate-400">Margin: <strong className="text-emerald-400">{marginPercentage.toFixed(1)}%</strong></span>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Tomato Rot / Wastage Loss</span>
          <p className="text-2xl font-black text-rose-400">₹{totalWastageLoss.toLocaleString('en-IN')}</p>
          <span className="text-xs text-slate-400">{filteredWastage.length} spoiled logs recorded</span>
        </div>
      </div>

      {/* Crate Margin Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-4 flex items-center justify-between border-emerald-500/30">
          <div>
            <span className="text-xs text-slate-400 font-medium">Small Crate Margin Analysis</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-100">Avg Selling: ₹{Math.round(smallAvgSellingPrice)}</span>
              <span className="text-xs text-slate-400">Avg Cost: ₹{Math.round(appState.inventory.smallAvgCost)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Avg Profit / Crate</span>
            <span className="text-lg font-black text-emerald-400">
              +₹{Math.round(smallAvgProfitPerCrate)}
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center justify-between border-amber-500/30">
          <div>
            <span className="text-xs text-slate-400 font-medium">Big Crate Margin Analysis</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-100">Avg Selling: ₹{Math.round(bigAvgSellingPrice)}</span>
              <span className="text-xs text-slate-400">Avg Cost: ₹{Math.round(appState.inventory.bigAvgCost)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Avg Profit / Crate</span>
            <span className="text-lg font-black text-amber-400">
              +₹{Math.round(bigAvgProfitPerCrate)}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Revenue vs Cost Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Daily Revenue vs Cost Trend
            </h3>
            <span className="text-xs text-slate-400">Mandi Sales Performance</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers Volume Chart (5 Cols) */}
        <div className="lg:col-span-5 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              Top Customers by Volume
            </h3>
            <span className="text-xs text-slate-400">Sales Contribution</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {topCustomersData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCustomersData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {topCustomersData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-500">No sales data in selected range</span>
            )}
          </div>
        </div>
      </div>

      {/* Wastage & Spoiled Tomatoes Log Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Wastage & Spoiled Tomato Write-off Logs
          </h3>
          <span className="text-xs text-slate-400">{filteredWastage.length} Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300 uppercase tracking-wider">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Crate Size</th>
                <th className="p-3">Quantity Damaged</th>
                <th className="p-3">Estimated Loss Value</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredWastage.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-400">{log.date}</td>
                  <td className="p-3 font-semibold text-amber-300">{log.crateSize} Crate</td>
                  <td className="p-3 font-bold text-rose-400">{log.quantity} Crates</td>
                  <td className="p-3 font-bold text-rose-400">₹{log.estimatedLossValue.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-slate-200">{log.reason}</td>
                  <td className="p-3 text-slate-400">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Wastage Modal */}
      {showWastageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 space-y-4 bg-slate-900 border-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 text-rose-400">
                <AlertOctagon className="w-5 h-5" />
                Write-Off Damaged / Rotted Crates
              </h3>
              <button onClick={() => setShowWastageModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWastageSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Crate Size</label>
                  <select
                    value={wastageCrateSize}
                    onChange={(e) => setWastageCrateSize(e.target.value as CrateSize)}
                    className="glass-input w-full"
                  >
                    <option value="Small" className="bg-slate-900">Small Crate</option>
                    <option value="Big" className="bg-slate-900">Big Crate</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Crate Count Damaged *</label>
                  <input
                    type="number"
                    min="1"
                    value={wastageQty}
                    onChange={(e) => setWastageQty(parseInt(e.target.value) || 0)}
                    className="glass-input w-full text-rose-400 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Estimated Financial Loss (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={wastageLossValue}
                  onChange={(e) => setWastageLossValue(parseFloat(e.target.value) || 0)}
                  className="glass-input w-full text-rose-400 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Reason for Damage / Rot</label>
                <input
                  type="text"
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value)}
                  className="glass-input w-full"
                  placeholder="e.g. Overripe rot due to transit humidity"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Notes</label>
                <input
                  type="text"
                  value={wastageNotes}
                  onChange={(e) => setWastageNotes(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Lot #A4 write-off"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWastageModal(false)}
                  className="glass-button-secondary py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-danger py-2 px-5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Deduct Stock & Write-Off Loss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
