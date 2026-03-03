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
