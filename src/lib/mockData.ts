import { Supplier, Customer, InventoryState, Purchase, Sale, PassbookEntry, EmptyCrateLog, WastageLog } from '../types';

export const initialSuppliers: Supplier[] = [];

export const initialCustomers: Customer[] = [];

export const initialInventory: InventoryState = {
  smallCratesCount: 0,
  bigCratesCount: 0,
  smallAvgCost: 0,
  bigAvgCost: 0,
};

export const initialPurchases: Purchase[] = [];

export const initialSales: Sale[] = [];

export const initialPassbookEntries: PassbookEntry[] = [];

export const initialEmptyCrateLogs: EmptyCrateLog[] = [];

export const initialWastageLogs: WastageLog[] = [];
