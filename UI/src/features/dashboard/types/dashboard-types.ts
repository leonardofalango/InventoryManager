export interface RecentCount {
  ean: string;
  productName: string;
  productLocationId: string;
  quantity: number;
  countedAt: string;
}

export interface DashboardData {
  clientName: string;
  status: string;
  progress: number;
  totalSKUs: number;
  countedSKUs: number;
  totalItems: number;
  divergences: number;
  activeCounters: number;
  recentCounts: RecentCount[];
}
