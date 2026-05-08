export interface RecentCount {
  ean: string;
  productName: string;
  productLocation: string;
  quantity: number;
  countedAt: string;
}

export interface DashboardData {
  clientName: string;
  status: number;
  progress: number;
  totalSKUs: number;
  countedSKUs: number;
  totalItems: number;
  divergences: number;
  totalLocationsCounted: number;
  totalLocations: number;
  activeCounters: number;
  recentCounts: RecentCount[];
  sectors: SectorData[];
}

export interface SectorData {
  name: string;
  percent: number;
}

export interface DiscrepancyItem {
  ean: string;
  description: string;
  expectedQuantity: number;
  countedQuantity: number;
  difference: number;
}
