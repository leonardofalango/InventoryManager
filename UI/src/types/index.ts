export type Role = "ADMIN" | "MANAGER" | "COUNTER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: string;
  code: string;
  description: string;
  category: string;
  price: number;
}

export interface InventorySession {
  id: string;
  clientId: string;
  clientName: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "AUDIT";
  startDate: string;
  totalItemsCounted: number;
  accuracy?: number;
}

export interface StockCount {
  id: string;
  productId: string;
  sessionId: string;
  quantity: number;
  round: 1 | 2 | 3;
  countedAt: string;
}
