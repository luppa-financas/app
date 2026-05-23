import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from './extraction.service';
import { ANTHROPIC_CLIENT } from './extraction.constants';

const mockAnthropicClient = { messages: { create: jest.fn() } };

const pdf = Buffer.from('fake-pdf');
const billingMonth = new Date('2025-04-01');

function makeToolUseResponse(invoiceTotal: number, transactions: object[]) {
  return {
    content: [
      {
        type: 'tool_use',
        input: { invoiceTotal, transactions },
      },
    ],
  };
}

async function createService(): Promise<ExtractionService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ExtractionService,
      { provide: ANTHROPIC_CLIENT, useValue: mockAnthropicClient },
    ],
  }).compile();
  return module.get<ExtractionService>(ExtractionService);
}

describe('ExtractionService', () => {
  let service: ExtractionService;

  beforeEach(async () => {
    jest.resetAllMocks();
    service = await createService();
  });

  it('should return extracted transactions on success', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(100.0, [
        {
          date: '2025-04-10',
          description: 'UBER *TRIP',
          amount: 60.0,
          type: 'debit',
          category: 'Transporte',
          subcategory: 'Uber / 99 / Taxi',
          confidence: 0.95,
        },
        {
          date: '2025-04-15',
          description: 'NETFLIX',
          amount: 40.0,
          type: 'debit',
          category: 'Assinaturas',
          subcategory: 'Streaming',
          confidence: 0.98,
        },
      ]),
    );

    const result = await service.extract(pdf, billingMonth);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '2025-04-10',
      description: 'UBER *TRIP',
      amount: 60.0,
      type: 'debit',
      category: 'Transporte',
      subcategory: 'Uber / 99 / Taxi',
      confidence: 0.95,
    });
    expect(result[1].category).toBe('Assinaturas');
  });

  it('should throw when Claude returns text instead of tool_use', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [
        { type: 'text', text: 'I found the following transactions...' },
      ],
    });

    await expect(service.extract(pdf, billingMonth)).rejects.toThrow(
      'Unexpected response format from Claude',
    );
  });

  it('should propagate Anthropic SDK errors', async () => {
    mockAnthropicClient.messages.create.mockRejectedValue(
      new Error('API error'),
    );

    await expect(service.extract(pdf, billingMonth)).rejects.toThrow('API error');
  });
});
