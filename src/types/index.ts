export type CrateSize = 'Small' | 'Big';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  pendingBalance: number; // Positive = Debt owed to supplier (Payable)
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  shopLocation: string;
  defaultSellingRateSmall?: number;
  defaultSellingRateBig?: number;
  pendingBalance: number; // Positive = Debt customer owes us (Receivable)
  createdAt: string;
}

export interface InventoryState {
  smallCratesCount: number;
  bigCratesCount: number;
  smallAvgCost: number; // Weighted average cost per Small Crate
  bigAvgCost: number;   // Weighted average cost per Big Crate
}

export interface PurchaseLineItem {
  crateSize: CrateSize;
  quantity: number;
  ratePerCrate: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  lineItems: PurchaseLineItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAdded: number;
  notes?: string;
  createdAt: string;
}

export interface SaleLineItem {
  crateSize: CrateSize;
  quantity: number;
  ratePerCrate: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  lineItems: SaleLineItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAdded: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank' | 'Credit';
  notes?: string;
  createdAt: string;
}

export type EntityType = 'Customer' | 'Supplier';

export interface PassbookEntry {
  id: string;
  date: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  type: 'Credit' | 'Debit'; // Supplier: Credit=Purchase(+debt), Debit=Payment(-debt); Customer: Debit=Sale(+dues), Credit=Payment(-dues)
  amount: number;
  runningBalance: number;
  transactionType: 'Purchase' | 'Sale' | 'Payment_Received' | 'Payment_Paid' | 'Adjustment';
  paymentMode?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

export type CrateAction = 
  | 'Given_To_Customer' 
  | 'Returned_By_Customer' 
  | 'Received_From_Supplier' 
  | 'Returned_To_Supplier';

export interface EmptyCrateLog {
  id: string;
  date: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  crateSize: CrateSize;
  action: CrateAction;
  quantity: number;
  smallBalanceAfter: number;
  bigBalanceAfter: number;
  notes?: string;
  createdAt: string;
}

export interface CrateBalance {
  entityId: string;
  entityName: string;
  entityType: EntityType;
  smallCratesPending: number; // For customer: crates with them. For supplier: crates with us.
  bigCratesPending: number;
}

export interface WastageLog {
  id: string;
  date: string;
  crateSize: CrateSize;
  quantity: number;
  estimatedLossValue: number;
  reason: string;
  notes?: string;
  createdAt: string;
}
