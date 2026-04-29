export interface ProductCsvRow {
  ean: string;
  name: string;
  category: string;
  price: string;
  [key: string]: string;
}

export interface UploadSummary {
  totalRows: number;
  fileName: string;
  preview: ProductCsvRow[];
}
