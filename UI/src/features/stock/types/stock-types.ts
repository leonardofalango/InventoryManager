export interface StockCsvRow {
  ean: string;
  quantidadeEsperada: string;
  [key: string]: string;
}
export interface UploadSummary {
  totalRows: number;
  fileName: string;
  preview: StockCsvRow[];
}

export interface ExpectedStockItem {
  id: string;
  ean: string;
  productName: string;
  expectedQuantity: number;
}
