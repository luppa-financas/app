import { Inject, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  ANTHROPIC_CLIENT,
  DEFAULT_CATEGORY,
  EXTRACTION_MODEL,
} from './extraction.constants';
import { ExtractedTransaction } from './extraction.types';

interface ClaudeExtractionResult {
  invoiceTotal: number;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
  }>;
}

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'extract_transactions',
  description: 'Extract all transactions from a credit card invoice PDF',
  input_schema: {
    type: 'object' as const,
    properties: {
      invoiceTotal: {
        type: 'number',
        description: 'Total amount due on the invoice',
      },
      transactions: {
        type: 'array',
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
          },
          required: ['date', 'description', 'amount', 'type'],
        },
      },
    },
    required: ['invoiceTotal', 'transactions'],
  },
};

@Injectable()
export class ExtractionService {
  constructor(@Inject(ANTHROPIC_CLIENT) private readonly client: Anthropic) {}

  async extract(pdf: Buffer): Promise<ExtractedTransaction[]> {
    const response = await this.client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 4096,
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
            {
              type: 'text',
              text: 'Extract all transactions from this credit card invoice. Include every line item.',
            },
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

    this.validateSum(result);

    return result.transactions.map((t) => ({
      ...t,
      category: DEFAULT_CATEGORY,
    }));
  }

  private validateSum({
    invoiceTotal,
    transactions,
  }: ClaudeExtractionResult): void {
    const debitSum = transactions.reduce(
      (acc, t) => (t.type === 'debit' ? acc + t.amount : acc),
      0,
    );
    if (Math.abs(debitSum - invoiceTotal) > 0.01) {
      throw new Error(
        `Sum check failed: transactions sum ${debitSum.toFixed(2)} differs from invoiceTotal ${invoiceTotal.toFixed(2)}`,
      );
    }
  }
}
