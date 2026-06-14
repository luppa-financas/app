import { Inject, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  ANTHROPIC_CLIENT,
  EXTRACTION_MODEL_COMPLEX,
  EXTRACTION_MODEL_DEFAULT,
} from './extraction.constants';
import {
  ExtractedFutureInstallment,
  ExtractedPayment,
  ExtractedTransaction,
  ExtractionResult,
} from './extraction.types';
import { BankDetectorService } from './bank-detector.service';

interface ClaudeTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  subcategory: string | null;
  confidence: number;
}

interface ClaudePayment {
  date: string;
  description: string;
  amount: number;
  kind: 'invoice_payment' | 'previous_balance';
}

interface ClaudeFutureInstallment {
  date: string;
  description: string;
  amount: number;
  installmentInfo: string | null;
}

interface ClaudeExtractionResult {
  invoiceTotal: number;
  billingMonth: string;
  transactions: ClaudeTransaction[];
  payments?: ClaudePayment[];
  futureInstallments?: ClaudeFutureInstallment[];
}

const BILLING_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'extract_transactions',
  description: 'Extract all transactions from a credit card invoice PDF',
  input_schema: {
    type: 'object' as const,
    properties: {
      invoiceTotal: {
        type: 'number',
        description:
          'Total of purchases in the current billing period (NOT "Total a pagar" or net amount due). For Itaú: "Total dos lançamentos atuais". For Nubank: "Total de compras de todos os cartões" plus "IOF de compras internacionais". For Bradesco: sum of all purchases shown.',
      },
      billingMonth: {
        type: 'string',
        description:
          'Billing month of this invoice in format YYYY-MM (zero-padded), taken from the invoice due date / vencimento. Examples: "2026-05" for an invoice due in May 2026. Read from the prominent due-date field on the invoice header (Itaú "Vencimento", Nubank "Vencimento da fatura", Bradesco "Data do vencimento"). NEVER infer from transaction dates.',
      },
      transactions: {
        type: 'array',
        description:
          'Purchases made by the cardholder during the current billing period (and refunds/estornos). Do NOT include invoice payments or previous-period balances here — put those in `payments`.',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Transaction date (YYYY-MM-DD)',
            },
            description: {
              type: 'string',
              description: 'Merchant or transaction description',
            },
            amount: {
              type: 'number',
              description: 'Transaction amount (positive)',
            },
            type: { type: 'string', enum: ['debit', 'credit'] },
            category: {
              type: 'string',
              description:
                'Spending category. One of: Alimentação, Transporte, Moradia, Saúde, Entretenimento, Assinaturas, Compras, Educação, Viagem, Finanças, Pets, Outros',
            },
            subcategory: {
              type: ['string', 'null'],
              description:
                'Subcategory within the chosen category, or null if unsure',
            },
            confidence: {
              type: 'number',
              description:
                'Confidence score between 0 and 1 for the category assignment',
            },
          },
          required: [
            'date',
            'description',
            'amount',
            'type',
            'category',
            'subcategory',
            'confidence',
          ],
        },
      },
      payments: {
        type: 'array',
        description:
          'Invoice payments and previous-period balances — NOT purchase transactions. Includes: "PAGTO. POR DEB EM C/C", "PAGAMENTO DEB AUTOMATIC", "Pagamento recebido", "Pagamento em DD MMM", "SALDO ANTERIOR", "Fatura anterior", "Saldo restante da fatura anterior".',
        items: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD' },
            description: { type: 'string' },
            amount: { type: 'number', description: 'Positive amount' },
            kind: {
              type: 'string',
              enum: ['invoice_payment', 'previous_balance'],
              description:
                '`invoice_payment` for payments of the card invoice; `previous_balance` for carry-over balances.',
            },
          },
          required: ['date', 'description', 'amount', 'kind'],
        },
      },
      futureInstallments: {
        type: 'array',
        description:
          'Installments scheduled for FUTURE billing periods. These are listed in dedicated sections such as "Compras parceladas - próximas faturas" (Itaú), "Próxima fatura", "Demais faturas", "Total para próximas faturas". They will be charged in subsequent invoices — they are NOT part of the current invoice total.',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Original purchase date (YYYY-MM-DD)',
            },
            description: { type: 'string' },
            amount: {
              type: 'number',
              description: 'Positive amount of the future installment',
            },
            installmentInfo: {
              type: ['string', 'null'],
              description:
                'Installment notation if present, e.g. "12/12" or "02/06"',
            },
          },
          required: ['date', 'description', 'amount', 'installmentInfo'],
        },
      },
    },
    required: [
      'invoiceTotal',
      'billingMonth',
      'transactions',
      'payments',
      'futureInstallments',
    ],
  },
};

const EXTRACTION_PROMPT = `Extract every entry from this credit card invoice (fatura) into THREE buckets. Every line in the PDF belongs to exactly ONE bucket — never to multiple, never to none.

BUCKET 1 — \`transactions\` (purchase transactions in the current period)
- Every line representing a purchase made by the cardholder during the current billing period.
- Current installment of split purchases (e.g. "12/03 SMILES FIDEL*CAR 02/05 157,41" — installment 2 of 5 charged this period).
- IOF lines tied to international purchases (spending in this period).
- Refunds / estornos / créditos: type "credit" with a POSITIVE amount.

BUCKET 2 — \`payments\` (invoice payments + previous balances, NOT purchases)
- Invoice payments → kind: "invoice_payment":
  - "PAGTO. POR DEB EM C/C" (Bradesco)
  - "PAGAMENTO DEB AUTOMATIC" / "PAGAMENTO EFETUADO" (Itaú)
  - "Pagamento recebido" / "Pagamento em DD MMM" (Nubank)
- Previous-period balances → kind: "previous_balance":
  - "SALDO ANTERIOR" (Bradesco)
  - "Fatura anterior" / "Saldo restante da fatura anterior" (Nubank)
  - "Total da fatura anterior" / "Pagamento efetuado em" (Itaú resumo)

BUCKET 3 — \`futureInstallments\` (will be charged in next invoices, NOT this one)
- Look for sections labeled "Compras parceladas - próximas faturas" (Itaú), or any section with the heading "Próxima fatura", "Demais faturas", "Total para próximas faturas".
- ITAÚ LAYOUT: this section is a separate table that follows the current-period transactions. Its lines look identical in format to current installments (date + description + XX/YY + value) — distinguish ONLY by which section they appear under.
- Every row in this section goes to \`futureInstallments\`, NEVER to \`transactions\`.

INVOICE TOTAL
Return invoiceTotal as the SUM OF PURCHASES IN THE CURRENT PERIOD.
- Itaú: read "Total dos lançamentos atuais".
- Nubank: "Total de compras de todos os cartões" + "IOF de compras internacionais". DO NOT use "Total a pagar" — it is net of payments.
- Bradesco: read "Total para: <name>" at the bottom of the statement, when present.

BILLING MONTH
Return billingMonth as the month of the invoice's DUE DATE (vencimento), in format YYYY-MM (zero-padded month).
- Itaú: "Vencimento" on the header (e.g. "05/05/2026" → "2026-05").
- Nubank: "Vencimento da fatura" or "Vence em".
- Bradesco: "Data do vencimento".
NEVER derive billingMonth from transaction dates. Only use the explicit due-date field.

AMOUNTS
- amount must always be POSITIVE in all three arrays.
- For transactions: direction is conveyed by type ("debit" for purchases, "credit" for refunds/estornos).

SELF-CHECK BEFORE RETURNING
After populating the three buckets, verify:
1. sum(debits − credits) of items in \`transactions\` ≈ invoiceTotal (within R$ 0,01).
2. If they differ by more than R$ 1, you likely misclassified some entries. Common mistakes:
   - Rows from "Compras parceladas - próximas faturas" leaked into \`transactions\` (move them to \`futureInstallments\`).
   - "SALDO ANTERIOR" / "Fatura anterior" / payment rows leaked into \`transactions\` (move them to \`payments\`).
   - Page-break duplicates (same date + description + amount appearing twice consecutively in the PDF).
Review and correct before producing the final answer.`;

const PAYMENT_PATTERNS: Array<{
  regex: RegExp;
  kind: ExtractedPayment['kind'];
}> = [
  { regex: /pagto\.?\s*por\s*deb/i, kind: 'invoice_payment' },
  { regex: /pagamento\s+deb\s+automatic/i, kind: 'invoice_payment' },
  { regex: /pagamento\s+efetuado/i, kind: 'invoice_payment' },
  { regex: /pagamento\s+(recebido|em\s+\d)/i, kind: 'invoice_payment' },
  { regex: /saldo\s+anterior/i, kind: 'previous_balance' },
  { regex: /fatura\s+anterior/i, kind: 'previous_balance' },
  {
    regex: /saldo\s+restante\s+da\s+fatura\s+anterior/i,
    kind: 'previous_balance',
  },
];

function matchPaymentKind(
  description: string,
): ExtractedPayment['kind'] | null {
  for (const p of PAYMENT_PATTERNS) {
    if (p.regex.test(description)) return p.kind;
  }
  return null;
}

function sumNet(transactions: ExtractedTransaction[]): number {
  return transactions.reduce(
    (acc, t) => acc + (t.type === 'credit' ? -t.amount : t.amount),
    0,
  );
}

function dedupConsecutiveDuplicates(
  transactions: ExtractedTransaction[],
): ExtractedTransaction[] {
  const out: ExtractedTransaction[] = [];
  for (const t of transactions) {
    const prev = out[out.length - 1];
    const isDup =
      prev &&
      prev.date === t.date &&
      prev.description === t.description &&
      prev.amount === t.amount &&
      prev.type === t.type;
    if (!isDup) out.push(t);
  }
  return out;
}

@Injectable()
export class ExtractionService {
  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic,
    private readonly bankDetector: BankDetectorService,
  ) {}

  async extract(pdf: Buffer): Promise<ExtractionResult> {
    const bank = await this.bankDetector.detect(pdf);
    const model =
      bank === 'itau' ? EXTRACTION_MODEL_COMPLEX : EXTRACTION_MODEL_DEFAULT;

    const response = await this.client.messages.create({
      model,
      max_tokens: 16000,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'extract_transactions' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdf.toString('base64'),
              },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse) {
      throw new Error(
        'Unexpected response format from Claude: expected tool_use block',
      );
    }

    const result = toolUse.input as ClaudeExtractionResult;

    if (!Array.isArray(result.transactions)) {
      throw new Error(
        `Claude returned malformed extraction result: ${JSON.stringify(result)}`,
      );
    }

    if (
      typeof result.billingMonth !== 'string' ||
      !BILLING_MONTH_REGEX.test(result.billingMonth)
    ) {
      throw new Error(
        `Claude returned invalid billingMonth (expected "YYYY-MM"): ${JSON.stringify(
          result.billingMonth,
        )}`,
      );
    }

    for (const t of result.transactions) {
      if (!(t.amount > 0)) {
        throw new Error(
          `Claude returned a transaction with non-positive amount: ${JSON.stringify(t)}. amount must be positive (direction is conveyed by type).`,
        );
      }
    }

    const initialTransactions: ExtractedTransaction[] = result.transactions.map(
      (t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        subcategory: t.subcategory,
        confidence: t.confidence,
      }),
    );

    const payments: ExtractedPayment[] = (result.payments ?? []).map((p) => ({
      date: p.date,
      description: p.description,
      amount: p.amount,
      kind: p.kind,
    }));

    let transactions: ExtractedTransaction[] = [];
    for (const t of initialTransactions) {
      const kind = matchPaymentKind(t.description);
      if (kind) {
        const alreadyInPayments = payments.some(
          (p) =>
            p.date === t.date &&
            p.description === t.description &&
            p.amount === t.amount,
        );
        if (!alreadyInPayments) {
          payments.push({
            date: t.date,
            description: t.description,
            amount: t.amount,
            kind,
          });
        }
      } else {
        transactions.push(t);
      }
    }

    if (Math.abs(sumNet(transactions) - result.invoiceTotal) > 0.01) {
      transactions = dedupConsecutiveDuplicates(transactions);
    }

    const futureInstallments: ExtractedFutureInstallment[] = (
      result.futureInstallments ?? []
    ).map((f) => ({
      date: f.date,
      description: f.description,
      amount: f.amount,
      installmentInfo: f.installmentInfo,
    }));

    return {
      invoiceTotal: result.invoiceTotal,
      billingMonth: result.billingMonth,
      transactions,
      payments,
      futureInstallments,
    };
  }
}
