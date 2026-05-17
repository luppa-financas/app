export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  subcategory: string | null;
  confidence: number;
}
