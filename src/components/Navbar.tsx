import React, { useRef, useState } from 'react';
import { Store, RotateCcw, Download, Upload, Box, Lock, Users, Truck, ShoppingCart, TrendingUp, Menu, X } from 'lucide-react';
import { AppState, exportAppStateToJson, importAppStateFromJson } from '../lib/storage';
import { VerifyPasswordModal } from './VerifyPasswordModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onClearData: () => void;
  onResetDemo: () => void;
  onLockApp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  appState,
  setAppState,
  onClearData,
  onResetDemo,
  onLockApp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);

  // Password verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const requestPasswordAuth = (title: string, description: string, onConfirm: () => void) => {
    setPendingAction({ title, description, onConfirm });
    setShowVerifyModal(true);
  };

  const handleExportBackup = () => {
    const jsonStr = exportAppStateToJson(appState);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSK_Vegetables_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const newState = importAppStateFromJson(content);
        setAppState(newState);
        alert('Data backup successfully restored!');
      } catch (err: any) {
        alert('Error restoring backup: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: Store },
    { id: 'procurement', label: 'Procurement', shortLabel: 'Inward', icon: Box },
    { id: 'sales', label: 'Sales Dispatch', shortLabel: 'Sales', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', shortLabel: 'Buyers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', shortLabel: 'Sellers', icon: Truck },
    { id: 'crates', label: 'Empty Crates', shortLabel: 'Crates', icon: Box },
    { id: 'analytics', label: 'Profit Analytics', shortLabel: 'Profit', icon: TrendingUp },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Business Name */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-emerald-500/30 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-950/50 overflow-hidden flex-shrink-0">
                <img src="/tsk_logo.png" alt="T.S.K Vegetables Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-bold text-base sm:text-lg text-slate-100 tracking-tight leading-none">
                    T.S.K VEGETABLES
                  </h1>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    SINGLE ADMIN
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">
                  Wholesale Tomato Mandi Operations & Inventory
                </p>
              </div>
            </div>

            {/* Quick Stock Summary Badges & Admin Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Mobile Quick Stock Badge */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/60 text-[10px] sm:text-xs">
                <span className="text-slate-400 hidden xs:inline">Stock:</span>
                <span className="font-semibold text-emerald-400">
                  Sm: <strong className="text-slate-100 font-bold">{appState.inventory.smallCratesCount}</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-semibold text-amber-400">
                  Big: <strong className="text-slate-100 font-bold">{appState.inventory.bigCratesCount}</strong>
                </span>
              </div>

              {/* Desktop Quick Admin Actions */}
              <div className="hidden sm:flex items-center gap-2">
                {/* Export Backup */}
                <button
                  onClick={handleExportBackup}
                  title="Backup Data to JSON"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span className="hidden md:inline">Backup</span>
                </button>

                {/* Import Backup */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportBackup}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => {
                    requestPasswordAuth(
                      'Restore Backup Data',
                      'Restoring data will replace all existing sales, purchases, customers, and suppliers with backup file content.',
                      () => fileInputRef.current?.click()
                    );
                  }}
                  title="Restore Data from JSON"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="hidden md:inline">Restore</span>
                </button>

                {/* Clear All Data */}
                <button
                  onClick={() => {
                    requestPasswordAuth(
                      'Clear All Mandi Data (Wipe to Zero)',
                      'This action will permanently wipe all purchases, sales, customers, suppliers, passbooks, and empty crate records so you can start fresh with zero data!',
                      () => {
                        onClearData();
                        alert('✅ All Mandi data has been successfully cleared to 0!');
                      }
                    );
                  }}
                  title="Wipe all data to 0"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition-all text-xs flex items-center gap-1.5 font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden md:inline">Clear Data</span>
                </button>

                {/* Lock App */}
                <button
                  onClick={onLockApp}
                  title="Lock Admin Portal"
                  className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all text-xs flex items-center gap-1.5 font-bold"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden md:inline">Lock</span>
                </button>
              </div>

              {/* Mobile Admin Menu Toggle Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="sm:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                title="Admin Quick Menu"
              >
                {showMobileMenu ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Mobile Admin Quick Menu Drawer */}
          {showMobileMenu && (
            <div className="sm:hidden py-3 px-1 border-t border-slate-800 grid grid-cols-2 gap-2 bg-slate-900/95 animate-fadeIn">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleExportBackup();
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2 font-medium"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Backup Data
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  requestPasswordAuth(
                    'Restore Backup Data',
                    'Restoring data will replace all existing sales, purchases, customers, and suppliers with backup file content.',
                    () => fileInputRef.current?.click()
                  );
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2 font-medium"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                Restore Backup
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  requestPasswordAuth(
                    'Clear All Mandi Data (Wipe to Zero)',
                    'This action will permanently wipe all purchases, sales, customers, suppliers, passbooks, and empty crate records so you can start fresh with zero data!',
                    () => {
                      onClearData();
                      alert('✅ All Mandi data has been successfully cleared to 0!');
                    }
                  );
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs flex items-center gap-2 font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All Data
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onLockApp();
                }}
                className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs flex items-center gap-2 font-bold"
              >
                <Lock className="w-4 h-4" />
                Lock Portal
              </button>
            </div>
          )}
        </div>

        {/* Password Verification Modal */}
        {pendingAction && (
          <VerifyPasswordModal
            isOpen={showVerifyModal}
            onClose={() => setShowVerifyModal(false)}
            onConfirm={pendingAction.onConfirm}
            currentPin={appState.adminPin || '1234'}
            actionTitle={pendingAction.title}
            actionDescription={pendingAction.description}
          />
        )}

        {/* Top Horizontal Swipeable Tab Navigation (Visible on Tablet & Desktop) */}
        <nav className="hidden sm:block bg-slate-900/80 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 flex gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                    isActive
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Sticky Mobile Bottom Navigation Bar (Dedicated Mobile Phone Touch Bar) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 flex items-center justify-around py-1.5 px-1 shadow-2xl">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-400 font-bold bg-emerald-500/10 scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[10px] leading-tight font-medium">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
