import React, { useState, useEffect } from 'react';
import { loadAppState, saveAppState, resetAppStateToDemo, clearAllAppState, AppState } from './lib/storage';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ProcurementModule } from './components/ProcurementModule';
import { SalesModule } from './components/SalesModule';
import { CustomerManagement } from './components/CustomerManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { EmptyCrateTracker } from './components/EmptyCrateTracker';
import { ProfitAnalytics } from './components/ProfitAnalytics';
import { RecordSettlementModal } from './components/RecordSettlementModal';
import { AdminLockScreen } from './components/AdminLockScreen';
import { EntityType } from './types';

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Admin Passcode Lock Session State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('tsk_admin_unlocked') === 'true';
  });

  // Shared Modals State
  const [isOpenProcurementModal, setIsOpenProcurementModal] = useState<boolean>(false);
  const [isOpenSalesModal, setIsOpenSalesModal] = useState<boolean>(false);
  const [isOpenPaymentModal, setIsOpenPaymentModal] = useState<boolean>(false);
  const [settlementType, setSettlementType] = useState<EntityType>('Customer');
  const [settlementEntityId, setSettlementEntityId] = useState<string | undefined>(undefined);

  // Auto-save state changes to LocalStorage
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const handleUnlock = () => {
    sessionStorage.setItem('tsk_admin_unlocked', 'true');
    setIsUnlocked(true);
  };

  const handleLockApp = () => {
    sessionStorage.removeItem('tsk_admin_unlocked');
    setIsUnlocked(false);
  };

  const handleChangePin = (newPin: string) => {
    setAppState(prev => ({ ...prev, adminPin: newPin }));
  };

  const handleClearData = () => {
    const cleanState = clearAllAppState(appState.adminPin);
    setAppState(cleanState);
  };

  const handleResetDemo = () => {
    const demoState = resetAppStateToDemo();
    setAppState(demoState);
  };

  const handleOpenPaymentModal = (type: EntityType, entityId?: string) => {
    setSettlementType(type);
    setSettlementEntityId(entityId);
    setIsOpenPaymentModal(true);
  };

  if (!isUnlocked) {
    return (
      <AdminLockScreen
        currentPin={appState.adminPin || '1234'}
        onUnlock={handleUnlock}
        onChangePin={handleChangePin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appState={appState}
        setAppState={setAppState}
        onClearData={handleClearData}
        onResetDemo={handleResetDemo}
        onLockApp={handleLockApp}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            appState={appState}
            setActiveTab={setActiveTab}
            onOpenProcurement={() => {
              setActiveTab('procurement');
              setIsOpenProcurementModal(true);
            }}
            onOpenSales={() => {
              setActiveTab('sales');
              setIsOpenSalesModal(true);
            }}
            onOpenPaymentModal={handleOpenPaymentModal}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementModule
            appState={appState}
            setAppState={setAppState}
            isOpenModal={isOpenProcurementModal}
            setIsOpenModal={setIsOpenProcurementModal}
          />
        )}

        {activeTab === 'sales' && (
          <SalesModule
            appState={appState}
            setAppState={setAppState}
            isOpenModal={isOpenSalesModal}
            setIsOpenModal={setIsOpenSalesModal}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManagement
            appState={appState}
            setAppState={setAppState}
            isOpenPaymentModal={isOpenPaymentModal}
            setIsOpenPaymentModal={(open) => handleOpenPaymentModal('Customer')}
          />
        )}

        {activeTab === 'suppliers' && (
          <SupplierManagement
            appState={appState}
            setAppState={setAppState}
          />
        )}

        {activeTab === 'crates' && (
          <EmptyCrateTracker
            appState={appState}
            setAppState={setAppState}
          />
        )}

        {activeTab === 'analytics' && (
          <ProfitAnalytics
            appState={appState}
            setAppState={setAppState}
          />
        )}
      </main>

      {/* Global Record Settlement Modal */}
      <RecordSettlementModal
        appState={appState}
        setAppState={setAppState}
        isOpen={isOpenPaymentModal}
        onClose={() => setIsOpenPaymentModal(false)}
        defaultType={settlementType}
        defaultEntityId={settlementEntityId}
      />

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© T.S.K Vegetables • Wholesale Tomato Mandi Operations</span>
          <span className="text-slate-400 font-mono">Single-Admin System • APMC Market Yard</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
