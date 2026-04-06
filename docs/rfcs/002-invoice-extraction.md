# RFC 002 — Invoice extraction via LLM

## Problem

Credit card invoices from Brazilian banks have no standard format. Rather than writing and maintaining a regex parser per bank (fragile, breaks silently when banks change layouts), we send the PDF directly to Claude and let it extract the structured transaction list.

## Approach

The user uploads a PDF. The API sends it to Claude as a native document block alongside a structured extraction prompt. Claude returns a JSON array of transactions, which is validated before being saved to the database.

## Request structure

```typescript
const response = await anthropic.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBuffer.toString("base64"),
        },
      },
      {
        type: "text",
        text: "...", // extraction prompt
      },
    ],
  }],
  tools: [extractTransactionsTool], // see below
});
```

## Output via tool_use

We use Claude's `tool_use` feature to enforce a strict output schema. Claude is forced to call the tool with the extracted data rather than returning free-form text, which guarantees a valid, parseable structure.

```typescript
const extractTransactionsTool = {
  name: "extract_transactions",
  description: "Returns all transactions extracted from the invoice",
  input_schema: {
    type: "object",
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date:        { type: "string", description: "DD/MM/YYYY" },
            description: { type: "string" },
            amount:      { type: "number", description: "Positive number in BRL" },
            type:        { type: "string", enum: ["debit", "credit"] },
          },
          required: ["date", "description", "amount", "type"],
        },
      },
      invoice_total: {
        type: "number",
        description: "Total amount due shown on the invoice",
      },
    },
    required: ["transactions", "invoice_total"],
  },
};
```

`credit` entries represent payments or refunds (the invoice reduces). `debit` entries are purchases.

## Validation

Before saving to the database, the extracted result is validated:

1. **Total check**: sum of debit amounts minus sum of credit amounts must match `invoice_total` within a rounding tolerance (R$ 0.10)
2. **Date range**: all transaction dates must fall within a plausible range for the invoice period (±1 month from the invoice due date)
3. **No duplicates**: same date + description + amount appearing more than once is flagged

If validation fails, the invoice is marked as `extraction_failed` and queued for manual review.

## Cost estimate

At the target scale of ~100 users (~150–200 invoices/month):

- Cost per invoice: ~$0.01–0.05 (depends on PDF size and transaction count)
- Total: ~$2–10/month

This is acceptable and removes the entire maintenance burden of bank-specific parsers.

## Why not regex parsers

- Each bank has a unique, undocumented PDF layout
- Layouts change without notice and parsers break silently
- At this scale, LLM cost is negligible compared to maintenance cost
