export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  subcategory: string | null;
  confidence: number;
}

export interface ExtractedPayment {
  date: string;
  description: string;
  amount: number;
  kind: 'invoice_payment' | 'previous_balance';
}

export interface ExtractedFutureInstallment {
  date: string;
  description: string;
  amount: number;
  installmentInfo: string | null;
}

export interface ExtractionResult {
  invoiceTotal: number;
  billingMonth: string;
  bank: string;
  transactions: ExtractedTransaction[];
  payments: ExtractedPayment[];
  futureInstallments: ExtractedFutureInstallment[];
}
