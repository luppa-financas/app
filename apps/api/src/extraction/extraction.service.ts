import { Inject, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_CLIENT, EXTRACTION_MODEL } from './extraction.constants';
import { ExtractedTransaction } from './extraction.types';

interface ClaudeExtractionResult {
  invoiceTotal: number;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    subcategory: string | null;
    confidence: number;
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

    return result.transactions.map((t) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      subcategory: t.subcategory,
      confidence: t.confidence,
    }));
  }
}
