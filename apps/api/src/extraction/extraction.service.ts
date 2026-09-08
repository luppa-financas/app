import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { BankDetectorService, BANK_PATTERNS } from './bank-detector.service';
import { PdfTextService } from './pdf-text.service';

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
  bank_name?: string;
  transactions: ClaudeTransaction[];
  payments?: ClaudePayment[];
  futureInstallments?: ClaudeFutureInstallment[];
}

const BILLING_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

// Max difference (in R$) tolerated between the model's invoiceTotal and the net
// of the extracted lines before we treat it as a mismatch. Absorbs IOF /
// international-conversion rounding (a couple of centavos) without flagging.
const RECONCILE_TOLERANCE = 0.05;

function normalizeBankName(name: string): string {
  return BANK_PATTERNS.find(({ regex }) => regex.test(name))?.bank ?? name;
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'extract_transactions',
  description: 'Extract all transactions from a credit card invoice PDF',
  input_schema: {
    type: 'object' as const,
    properties: {
      bank_name: {
        type: 'string',
        description:
          'Full display name of the card issuer as printed on the invoice (e.g. "Itaú", "Nubank", "Bradesco", "Santander", "Banco do Brasil"). Read from the invoice header or logo text.',
      },
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
      'bank_name',
      'invoiceTotal',
      'billingMonth',
      'transactions',
      'payments',
      'futureInstallments',
    ],
  },
};

const EXTRACTION_PROMPT = `Extract every entry from this credit card invoice (fatura) into THREE buckets.

BANK NAME
Read the card issuer name from the invoice header or logo (e.g. "Itaú", "Nubank", "Bradesco", "Santander"). Return it exactly as printed — do not abbreviate or translate.

 Every line in the PDF belongs to exactly ONE bucket — never to multiple, never to none.

BUCKET 1 — \`transactions\` (purchase transactions in the current period)
- Every line representing a purchase made by the cardholder during the current billing period.
- Current installment of split purchases (e.g. "12/03 SMILES FIDEL*CAR 02/05 157,41" — installment 2 of 5 charged this period).
- IOF lines tied to international purchases (spending in this period).
- Refunds / estornos / créditos: type "credit" with a POSITIVE amount (see "DEBIT vs CREDIT" below).

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
Return invoiceTotal as the SUM OF CURRENT-PERIOD PURCHASES, NET OF ANY REFUNDS/ESTORNOS in the same period (i.e. it must equal sum(debits) − sum(credits) of BUCKET 1).
- Itaú: read "Total dos lançamentos atuais".
- Nubank: "Total de compras de todos os cartões" + "IOF de compras internacionais". DO NOT use "Total a pagar" — it is net of payments.
- Bradesco: read "Total para <NAME>" / "Total da fatura em real" at the very bottom (already net of estornos). DO NOT use "(+) Compras/Débitos" from the "Resumo da fatura" — that figure is GROSS (before estornos).
- Do NOT create line items from the "Resumo da fatura" block ("Saldo anterior", "(-) Créditos/Pagamentos", "(+) Compras/Débitos", "(=) Total"). Those are summary totals, not transactions or payments — only extract dated rows from the "Lançamentos" list.

BILLING MONTH
Return billingMonth as the month of the invoice's DUE DATE (vencimento), in format YYYY-MM (zero-padded month).
- Itaú: "Vencimento" on the header (e.g. "05/05/2026" → "2026-05").
- Nubank: "Vencimento da fatura" or "Vence em".
- Bradesco: "Data do vencimento".
NEVER derive billingMonth from transaction dates. Only use the explicit due-date field.

AMOUNTS
- amount must always be POSITIVE in all three arrays.
- For transactions: direction is conveyed by type ("debit" for purchases, "credit" for refunds/estornos).

DEBIT vs CREDIT (classify EVERY line in \`transactions\`)
Do not assume a line is a purchase. A line is a CREDIT (type "credit") when ANY of these hold — check each line for them:
- a minus sign attached to the amount: "-64,90" or "64,90 -" or "64,90-", or the amount in parentheses "(64,90)". NOTE: a " - " with spaces on both sides is often just a separator between description and value (Itaú) — that alone is NOT a credit.
- a direction marker next to the value: a trailing "C" or "CR" (as opposed to "D"/"DB" for debit);
- the value appears in a dedicated credit column or under a section headed "Créditos", "Estornos", "Pagamentos e créditos", "Devoluções";
- the description denotes a refund: "estorno", "devolução", "reembolso", "cashback", "ajuste a crédito". A bare "crédito"/"credit" in a merchant name (e.g. "UBER_CREDIT", "CREDITO E CIA") or "compra a crédito" is NOT a refund — those are debits.
Otherwise the line is a "debit" (a purchase).
Repeated identical credit lines are NORMAL (e.g. a recurring subscription reversed for several past months) — extract EVERY one of them; never drop a repeat that carries a credit marker.
The same merchant can appear as both a debit (the charge) and one or more credits (the estornos) in the same invoice — keep them all.

SELF-CHECK BEFORE RETURNING
Most invoices carry a "Resumo da fatura" / summary block. Read its figures:
  previous balance ("Saldo anterior" / "Fatura anterior")
  payments + credits ("Créditos/Pagamentos" / "Pagamentos e créditos")
  purchases ("Compras/Débitos" / "Lançamentos")
  total
Then verify, correcting BUCKET assignments until all hold:
1. sum(debits − credits) of items in \`transactions\` ≈ invoiceTotal (within R$ 0,01).
2. sum of \`credits\` in \`transactions\` ~ (payments+credits figure from the summary) minus sum of the \`payments\` you extracted.
   If that figure is clearly larger than your payments but you produced ZERO credits, you missed the estornos - re-scan every line for the credit markers listed above.
3. If totals differ by more than R$ 1, you likely misclassified some entries. Common mistakes:
   - Estorno/refund lines classified as "debit" instead of "credit" (a minus sign or credit column was missed).
   - Summary-block totals ("Resumo da fatura") extracted as if they were line items (drop them).
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
  { regex: /pagamentos?\s+v[aá]lidos/i, kind: 'invoice_payment' },
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

// Deterministic safety net: descriptions that unambiguously denote a credit.
// Bank-agnostic — forces `type: 'credit'` even if the model classified the line
// as a debit. Merchant-only estornos (no keyword) still rely on the model
// reading the credit marker in the PDF.
const CREDIT_KEYWORD_REGEX =
  /\b(estorno|devolu[cç][aã]o|reembolso|cashback|ajuste\s+a\s+cr[eé]dito)\b/i;

function reclassifyKnownCredits(transactions: ExtractedTransaction[]): {
  transactions: ExtractedTransaction[];
  flipped: number;
} {
  let flipped = 0;
  const out = transactions.map((t) => {
    if (t.type === 'debit' && CREDIT_KEYWORD_REGEX.test(t.description)) {
      flipped += 1;
      return { ...t, type: 'credit' as const };
    }
    return t;
  });
  return { transactions: out, flipped };
}

const BR_AMOUNT = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
// An amount with a trailing "-" (Bradesco/Santander) or in parentheses is a
// credit. We deliberately do NOT scan for a *leading* "-": Itaú uses " - " as a
// plain description/amount separator, so "-VALUE" is ambiguous there — leading-
// dash estornos on Itaú/Nubank are caught by the description keyword net and the
// model prompt instead.
const TRAILING_MARKER = new RegExp(`(${BR_AMOUNT})\\s*-(?:\\s|$)`);
const PAREN_MARKER = new RegExp(`\\(\\s*(${BR_AMOUNT})\\s*\\)`);

function toCents(brAmount: string): number {
  return Math.round(
    parseFloat(brAmount.replace(/\./g, '').replace(',', '.')) * 100,
  );
}

/**
 * Deterministic cross-check: scans the PDF text layer for statement lines whose
 * amount carries a credit marker (trailing "-" or parentheses) and returns how
 * many such credit lines exist per amount (in cents). The model routinely misses
 * these markers (e.g. Bradesco prints the "-" on a wrapped line). Payment lines
 * are excluded — they are not purchase-side credits.
 */
function detectCreditSignatures(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  const isDateLine = /^\s*\d{2}\/\d{2}\b/;
  const lines = text.split('\n');
  let entry: string[] = [];

  const flush = () => {
    if (entry.length === 0) return;
    const joined = entry.join(' ');
    entry = [];
    if (matchPaymentKind(joined)) return;
    const match = TRAILING_MARKER.exec(joined) ?? PAREN_MARKER.exec(joined);
    if (!match) return;
    const cents = toCents(match[1]);
    counts.set(cents, (counts.get(cents) ?? 0) + 1);
  };

  for (const line of lines) {
    if (isDateLine.test(line)) {
      flush();
      entry.push(line);
    } else if (entry.length > 0) {
      entry.push(line);
    }
  }
  flush();
  return counts;
}

/**
 * Flips model `debit` lines to `credit` when the PDF text shows a credit marker
 * for that amount and the model did not already account for it. Bounded by the
 * per-amount count found in the text.
 */
function reclassifyBySignatures(
  transactions: ExtractedTransaction[],
  signatures: Map<number, number>,
): { transactions: ExtractedTransaction[]; flipped: number } {
  if (signatures.size === 0) return { transactions, flipped: 0 };

  const budget = new Map(signatures);
  for (const t of transactions) {
    if (t.type === 'credit') {
      const cents = Math.round(t.amount * 100);
      const left = budget.get(cents);
      if (left) budget.set(cents, left - 1);
    }
  }

  let flipped = 0;
  const out = transactions.map((t) => {
    if (t.type !== 'debit') return t;
    const cents = Math.round(t.amount * 100);
    const left = budget.get(cents) ?? 0;
    if (left <= 0) return t;
    budget.set(cents, left - 1);
    flipped += 1;
    return { ...t, type: 'credit' as const };
  });
  return { transactions: out, flipped };
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
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic,
    private readonly bankDetector: BankDetectorService,
    private readonly pdfText: PdfTextService,
  ) {}

  async extract(pdf: Buffer): Promise<ExtractionResult> {
    const [bank, pdfText] = await Promise.all([
      this.bankDetector.detect(pdf),
      this.pdfText.getText(pdf),
    ]);
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

    const byKeyword = reclassifyKnownCredits(transactions);
    if (byKeyword.flipped > 0) {
      this.logger.warn(
        `Reclassified ${byKeyword.flipped} debit line(s) to credit by description keyword`,
      );
      transactions = byKeyword.transactions;
    }

    const bySignature = reclassifyBySignatures(
      transactions,
      detectCreditSignatures(pdfText),
    );
    if (bySignature.flipped > 0) {
      this.logger.warn(
        `Reclassified ${bySignature.flipped} debit line(s) to credit by PDF sign marker`,
      );
      transactions = bySignature.transactions;
    }

    // Only dedup when the lines don't reconcile AND removing consecutive
    // duplicates gets the net closer to the model's total — otherwise we risk
    // dropping legitimate repeated lines (e.g. several identical estornos).
    const drift = Math.abs(sumNet(transactions) - result.invoiceTotal);
    if (drift > 0.01) {
      const deduped = dedupConsecutiveDuplicates(transactions);
      if (Math.abs(sumNet(deduped) - result.invoiceTotal) < drift) {
        transactions = deduped;
      }
    }

    const futureInstallments: ExtractedFutureInstallment[] = (
      result.futureInstallments ?? []
    ).map((f) => ({
      date: f.date,
      description: f.description,
      amount: f.amount,
      installmentInfo: f.installmentInfo,
    }));

    const resolvedBank = result.bank_name
      ? normalizeBankName(result.bank_name)
      : bank;

    const netLines = sumNet(transactions);
    const totalMismatch =
      Math.abs(netLines - result.invoiceTotal) > RECONCILE_TOLERANCE;
    // Reconciliation on mismatch:
    //  - net < model  → the model likely read the GROSS total ("Compras/Débitos")
    //    while the lines already subtract the estornos → trust the net.
    //  - net >= model → the lines likely missed some credits, or a payment leaked
    //    in → the model's total is the safer number.
    const invoiceTotal =
      totalMismatch && netLines > 0 && netLines < result.invoiceTotal
        ? Math.round(netLines * 100) / 100
        : result.invoiceTotal;
    if (totalMismatch) {
      this.logger.warn(
        `Invoice total mismatch: model=${result.invoiceTotal} net=${netLines} → reconciled=${invoiceTotal}`,
      );
    }

    return {
      invoiceTotal,
      billingMonth: result.billingMonth,
      bank: resolvedBank,
      transactions,
      payments,
      futureInstallments,
      totalMismatch,
    };
  }
}
