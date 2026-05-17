import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from './extraction.service';
import { ANTHROPIC_CLIENT } from './extraction.constants';

const mockAnthropicClient = { messages: { create: jest.fn() } };

const pdf = Buffer.from('fake-pdf');

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
        { date: '2025-04-10', description: 'UBER *TRIP', amount: 60.0, type: 'debit' },
        { date: '2025-04-15', description: 'NETFLIX', amount: 40.0, type: 'debit' },
      ]),
    );

    const result = await service.extract(pdf);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '2025-04-10',
      description: 'UBER *TRIP',
      amount: 60.0,
      type: 'debit',
      category: 'Other',
    });
    expect(result[1].category).toBe('Other');
  });

  it('should throw when Claude returns text instead of tool_use', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'I found the following transactions...' }],
    });

    await expect(service.extract(pdf)).rejects.toThrow('Unexpected response format from Claude');
  });

  it('should throw when transaction sum diverges from invoiceTotal', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(100.0, [
        { date: '2025-04-10', description: 'UBER *TRIP', amount: 60.0, type: 'debit' },
        { date: '2025-04-15', description: 'NETFLIX', amount: 39.0, type: 'debit' },
      ]),
    );

    await expect(service.extract(pdf)).rejects.toThrow('Sum check failed');
  });

  it('should propagate Anthropic SDK errors', async () => {
    mockAnthropicClient.messages.create.mockRejectedValue(new Error('API error'));

    await expect(service.extract(pdf)).rejects.toThrow('API error');
  });
});
