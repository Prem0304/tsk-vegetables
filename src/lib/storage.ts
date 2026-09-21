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

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultState = getDemoAppState();
      saveAppState(defaultState);
      return defaultState;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.adminPin) {
      parsed.adminPin = '1234';
    }
    // If state is completely empty, populate demo data
    if ((!parsed.suppliers || parsed.suppliers.length === 0) && (!parsed.sales || parsed.sales.length === 0)) {
      const defaultState = getDemoAppState();
      saveAppState(defaultState);
      return defaultState;
    }
    return parsed;
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
  if (!parsed.suppliers || !parsed.customers || !parsed.inventory) {
    throw new Error('Invalid backup file format.');
  }
  saveAppState(parsed);
  return parsed;
}
