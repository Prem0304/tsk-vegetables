import React, { useState, useEffect } from 'react';
import { loadAppState, saveAppState, resetAppStateToDemo, AppState } from './lib/storage';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ProcurementModule } from './components/ProcurementModule';
import { SalesModule } from './components/SalesModule';
import { CustomerManagement } from './components/CustomerManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { EmptyCrateTracker } from './components/EmptyCrateTracker';
import { ProfitAnalytics } from './components/ProfitAnalytics';

export function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Shared Modals State
  const [isOpenProcurementModal, setIsOpenProcurementModal] = useState<boolean>(false);
  const [isOpenSalesModal, setIsOpenSalesModal] = useState<boolean>(false);
  const [isOpenPaymentModal, setIsOpenPaymentModal] = useState<boolean>(false);

  // Auto-save state changes to LocalStorage
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const handleResetDemo = () => {
    const demoState = resetAppStateToDemo();
    setAppState(demoState);
  };

  const handleOpenPaymentModal = (type: 'Customer' | 'Supplier') => {
    if (type === 'Customer') {
      setActiveTab('customers');
      setIsOpenPaymentModal(true);
    } else {
      setActiveTab('suppliers');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appState={appState}
        setAppState={setAppState}
        onResetDemo={handleResetDemo}
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
            setIsOpenPaymentModal={setIsOpenPaymentModal}
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
