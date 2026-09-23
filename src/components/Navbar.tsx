import React, { useRef, useState } from 'react';
import { Store, RotateCcw, Download, Upload, Box, ShieldAlert, Lock } from 'lucide-react';
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
    { id: 'dashboard', label: 'Dashboard', icon: Store },
    { id: 'procurement', label: 'Procurement (Inward)', icon: Box },
    { id: 'sales', label: 'Sales (Dispatch)', icon: Store },
    { id: 'customers', label: 'Customers & Passbook', icon: Store },
    { id: 'suppliers', label: 'Suppliers & Passbook', icon: Store },
    { id: 'crates', label: 'Empty Crates', icon: Box },
    { id: 'analytics', label: 'Profit Analytics', icon: Store },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Business Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-11 h-11 rounded-xl bg-slate-950 border border-emerald-500/30 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-950/50 overflow-hidden">
              <img src="/tsk_logo.png" alt="T.S.K Vegetables Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
                  T.S.K VEGETABLES
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SINGLE ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Wholesale Tomato Mandi Management System
              </p>
            </div>
          </div>

          {/* Top Quick Actions & Stock Badges */}
          <div className="flex items-center gap-3">
            {/* Quick Inventory Badges */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <span className="text-slate-400">Stock:</span>
              <span className="font-medium text-emerald-400">
                Small: <strong className="text-slate-100">{appState.inventory.smallCratesCount}</strong>
              </span>
              <span className="text-slate-600">|</span>
              <span className="font-medium text-amber-400">
                Big: <strong className="text-slate-100">{appState.inventory.bigCratesCount}</strong>
              </span>
            </div>

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
              <span className="hidden md:inline">Lock Portal</span>
            </button>
          </div>
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
      </div>

      {/* Main Navigation Tabs */}
      <nav className="bg-slate-900/80 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 sm:gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
