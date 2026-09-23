import { Supplier, Customer, InventoryState, Purchase, Sale, PassbookEntry, EmptyCrateLog, WastageLog } from '../types';
import { initialSuppliers, initialCustomers, initialInventory, initialPurchases, initialSales, initialPassbookEntries, initialEmptyCrateLogs, initialWastageLogs } from './mockData';

export interface AppState {
  suppliers: Supplier[];
  customers: Customer[];
  inventory: InventoryState;
  purchases: Purchase[];
  sales: Sale[];
  passbookEntries: PassbookEntry[];
  emptyCrateLogs: EmptyCrateLog[];
  wastageLogs: WastageLog[];
  adminPin?: string;
}

const STORAGE_KEY = 'tsk_vegetables_app_state_v2';

export function getDemoAppState(): AppState {
  return {
    suppliers: initialSuppliers,
    customers: initialCustomers,
    inventory: initialInventory,
    purchases: initialPurchases,
    sales: initialSales,
    passbookEntries: initialPassbookEntries,
    emptyCrateLogs: initialEmptyCrateLogs,
    wastageLogs: initialWastageLogs,
    adminPin: '1234',
  };
}

export function getEmptyAppState(adminPin: string = '1234'): AppState {
  return {
    suppliers: [],
    customers: [],
    inventory: {
      smallCratesCount: 0,
      bigCratesCount: 0,
      smallAvgCost: 0,
      bigAvgCost: 0,
      gradeStocks: [],
    },
    purchases: [],
    sales: [],
    passbookEntries: [],
    emptyCrateLogs: [],
    wastageLogs: [],
    adminPin: adminPin || '1234',
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultState = getDemoAppState();
      saveAppState(defaultState);
      return defaultState;
    }
    const parsed = JSON.parse(raw) as AppState;
    return {
      suppliers: parsed.suppliers || [],
      customers: parsed.customers || [],
      inventory: parsed.inventory || {
        smallCratesCount: 0,
        bigCratesCount: 0,
        smallAvgCost: 0,
        bigAvgCost: 0,
        gradeStocks: [],
      },
      purchases: parsed.purchases || [],
      sales: parsed.sales || [],
      passbookEntries: parsed.passbookEntries || [],
      emptyCrateLogs: parsed.emptyCrateLogs || [],
      wastageLogs: parsed.wastageLogs || [],
      adminPin: parsed.adminPin || '1234',
    };
  } catch (error) {
    console.error('Failed to load state from LocalStorage:', error);
    return getDemoAppState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state to LocalStorage:', error);
  }
}

export function clearAllAppState(currentPin?: string): AppState {
  const emptyState = getEmptyAppState(currentPin || '1234');
  saveAppState(emptyState);
  return emptyState;
}

export function resetAppStateToDemo(): AppState {
  const demoState = getDemoAppState();
  saveAppState(demoState);
  return demoState;
}

export function exportAppStateToJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importAppStateFromJson(jsonString: string): AppState {
  const parsed = JSON.parse(jsonString);
  if (!parsed.suppliers && !parsed.customers && !parsed.purchases && !parsed.sales) {
    throw new Error('Invalid backup file format.');
  }
  const cleanState: AppState = {
    suppliers: parsed.suppliers || [],
    customers: parsed.customers || [],
    inventory: parsed.inventory || { smallCratesCount: 0, bigCratesCount: 0, smallAvgCost: 0, bigAvgCost: 0, gradeStocks: [] },
    purchases: parsed.purchases || [],
    sales: parsed.sales || [],
    passbookEntries: parsed.passbookEntries || [],
    emptyCrateLogs: parsed.emptyCrateLogs || [],
    wastageLogs: parsed.wastageLogs || [],
    adminPin: parsed.adminPin || '1234',
  };
  saveAppState(cleanState);
  return cleanState;
}

