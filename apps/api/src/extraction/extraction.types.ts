export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  // MVP: always 'Other' — updated to full union when categorization module is implemented
  category: string;
}
