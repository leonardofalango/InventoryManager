export interface StockCsvRow {
  codigo: string;
  descricao: string;
  categoria: string;
  preco: string;
  [key: string]: string;
}

export interface UploadSummary {
  totalRows: number;
  fileName: string;
  preview: StockCsvRow[];
}
