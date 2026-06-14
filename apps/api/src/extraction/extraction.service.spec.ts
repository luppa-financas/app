import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from './extraction.service';
import { BankDetectorService } from './bank-detector.service';
import { ANTHROPIC_CLIENT } from './extraction.constants';

const mockAnthropicClient = { messages: { create: jest.fn() } };
const mockBankDetector = { detect: jest.fn() };

const pdf = Buffer.from('fake-pdf');

function makeToolUseResponse(
  invoiceTotal: number,
  transactions: object[],
  payments: object[] = [],
  futureInstallments: object[] = [],
  billingMonth: string = '2025-04',
) {
  return {
    content: [
      {
        type: 'tool_use',
        input: {
          invoiceTotal,
          transactions,
          payments,
          futureInstallments,
          billingMonth,
        },
      },
    ],
  };
}

async function createService(): Promise<ExtractionService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ExtractionService,
      { provide: ANTHROPIC_CLIENT, useValue: mockAnthropicClient },
      { provide: BankDetectorService, useValue: mockBankDetector },
    ],
  }).compile();
  return module.get<ExtractionService>(ExtractionService);
}

describe('ExtractionService', () => {
  let service: ExtractionService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockBankDetector.detect.mockResolvedValue('other');
    service = await createService();
  });

  it('should return invoiceTotal alongside transactions', async () => {
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

    const result = await service.extract(pdf);

    expect(result.invoiceTotal).toBe(100.0);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toEqual({
      date: '2025-04-10',
      description: 'UBER *TRIP',
      amount: 60.0,
      type: 'debit',
      category: 'Transporte',
      subcategory: 'Uber / 99 / Taxi',
      confidence: 0.95,
    });
    expect(result.transactions[1].category).toBe('Assinaturas');
  });

  it('should preserve credit type with positive amount for refunds', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(50.0, [
        {
          date: '2025-04-20',
          description: 'ESTORNO PARCIAL',
          amount: 25.0,
          type: 'credit',
          category: 'Outros',
          subcategory: null,
          confidence: 0.9,
        },
      ]),
    );

    const result = await service.extract(pdf);

    expect(result.transactions[0].type).toBe('credit');
    expect(result.transactions[0].amount).toBe(25.0);
  });

  it('should reject transactions with non-positive amounts', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(100.0, [
        {
          date: '2025-04-10',
          description: 'BAD ENTRY',
          amount: -50.0,
          type: 'credit',
          category: 'Outros',
          subcategory: null,
          confidence: 0.5,
        },
      ]),
    );

    await expect(service.extract(pdf)).rejects.toThrow(
      /amount must be positive/i,
    );
  });

  it('should throw when Claude returns text instead of tool_use', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [
        { type: 'text', text: 'I found the following transactions...' },
      ],
    });

    await expect(service.extract(pdf)).rejects.toThrow(
      'Unexpected response format from Claude',
    );
  });

  it('should return payments alongside transactions', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(
        100.0,
        [
          {
            date: '2025-04-10',
            description: 'UBER *TRIP',
            amount: 100.0,
            type: 'debit',
            category: 'Transporte',
            subcategory: 'Uber / 99 / Taxi',
            confidence: 0.95,
          },
        ],
        [
          {
            date: '2025-04-05',
            description: 'PAGTO. POR DEB EM C/C',
            amount: 1000.0,
            kind: 'invoice_payment',
          },
          {
            date: '2025-04-05',
            description: 'SALDO ANTERIOR',
            amount: 1000.0,
            kind: 'previous_balance',
          },
        ],
      ),
    );

    const result = await service.extract(pdf);

    expect(result.payments).toHaveLength(2);
    expect(result.payments[0]).toEqual({
      date: '2025-04-05',
      description: 'PAGTO. POR DEB EM C/C',
      amount: 1000.0,
      kind: 'invoice_payment',
    });
    expect(result.payments[1].kind).toBe('previous_balance');
    expect(result.transactions).toHaveLength(1);
  });

  it('should dedup consecutive duplicate transactions when sum exceeds invoiceTotal', async () => {
    const dup = {
      date: '2025-04-10',
      description: 'CONDOMINIO',
      amount: 14.0,
      type: 'debit',
      category: 'Moradia',
      subcategory: null,
      confidence: 0.9,
    };
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(14.0, [dup, dup]),
    );

    const result = await service.extract(pdf);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('CONDOMINIO');
  });

  it('should NOT dedup when sum already matches invoiceTotal', async () => {
    const sameAmount = (description: string) => ({
      date: '2025-04-10',
      description,
      amount: 14.0,
      type: 'debit',
      category: 'Outros',
      subcategory: null,
      confidence: 0.9,
    });
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(28.0, [sameAmount('UBER'), sameAmount('99 APP')]),
    );

    const result = await service.extract(pdf);

    expect(result.transactions).toHaveLength(2);
  });

  it('should move payment-like transactions to payments array (safety net)', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(
        100.0,
        [
          {
            date: '2025-04-10',
            description: 'UBER',
            amount: 100.0,
            type: 'debit',
            category: 'Transporte',
            subcategory: null,
            confidence: 0.9,
          },
          {
            date: '2025-04-05',
            description: 'PAGTO. POR DEB EM C/C',
            amount: 500.0,
            type: 'credit',
            category: 'Outros',
            subcategory: null,
            confidence: 0.5,
          },
          {
            date: '2025-04-01',
            description: 'SALDO ANTERIOR',
            amount: 200.0,
            type: 'debit',
            category: 'Outros',
            subcategory: null,
            confidence: 0.5,
          },
        ],
        [],
      ),
    );

    const result = await service.extract(pdf);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('UBER');
    expect(result.payments).toHaveLength(2);
    expect(
      result.payments.find((p) => p.description === 'PAGTO. POR DEB EM C/C')
        ?.kind,
    ).toBe('invoice_payment');
    expect(
      result.payments.find((p) => p.description === 'SALDO ANTERIOR')?.kind,
    ).toBe('previous_balance');
  });

  it('should NOT double-count when payment-like entry is in both arrays', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(
        100.0,
        [
          {
            date: '2025-04-05',
            description: 'PAGTO. POR DEB EM C/C',
            amount: 500.0,
            type: 'credit',
            category: 'Outros',
            subcategory: null,
            confidence: 0.5,
          },
        ],
        [
          {
            date: '2025-04-05',
            description: 'PAGTO. POR DEB EM C/C',
            amount: 500.0,
            kind: 'invoice_payment',
          },
        ],
      ),
    );

    const result = await service.extract(pdf);

    expect(result.transactions).toHaveLength(0);
    expect(result.payments).toHaveLength(1);
  });

  it('should return futureInstallments alongside transactions and payments', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(
        100.0,
        [
          {
            date: '2025-04-10',
            description: 'UBER',
            amount: 100.0,
            type: 'debit',
            category: 'Transporte',
            subcategory: null,
            confidence: 0.9,
          },
        ],
        [],
        [
          {
            date: '2025-06-25',
            description: 'LIVELO S.A.',
            amount: 326.72,
            installmentInfo: '12/12',
          },
        ],
      ),
    );

    const result = await service.extract(pdf);

    expect(result.futureInstallments).toHaveLength(1);
    expect(result.futureInstallments[0]).toEqual({
      date: '2025-06-25',
      description: 'LIVELO S.A.',
      amount: 326.72,
      installmentInfo: '12/12',
    });
    expect(result.transactions).toHaveLength(1);
  });

  it('uses the complex model (Sonnet) when the bank is Itaú', async () => {
    mockBankDetector.detect.mockResolvedValue('itau');
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(0, []),
    );

    await service.extract(pdf);

    expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-sonnet-4-6' }),
    );
  });

  it.each(['bradesco', 'nubank', 'other'] as const)(
    'uses the default model (Haiku) when the bank is %s',
    async (bank) => {
      mockBankDetector.detect.mockResolvedValue(bank);
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(0, []),
      );

      await service.extract(pdf);

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      );
    },
  );

  it('should propagate Anthropic SDK errors', async () => {
    mockAnthropicClient.messages.create.mockRejectedValue(
      new Error('API error'),
    );

    await expect(service.extract(pdf)).rejects.toThrow('API error');
  });

  it('should return billingMonth alongside the other buckets', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(0, [], [], [], '2026-05'),
    );

    const result = await service.extract(pdf);

    expect(result.billingMonth).toBe('2026-05');
  });

  it('should throw when Claude does not return billingMonth', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          input: {
            invoiceTotal: 0,
            transactions: [],
            payments: [],
            futureInstallments: [],
          },
        },
      ],
    });

    await expect(service.extract(pdf)).rejects.toThrow(/billingMonth/i);
  });

  it.each([
    '05/2026',
    '2026/05',
    '2026-13',
    '2026-00',
    '26-05',
    '2026-05-15',
    'maio 2026',
    '',
  ])(
    'should throw when Claude returns invalid billingMonth format: %p',
    async (badFormat) => {
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(0, [], [], [], badFormat),
      );

      await expect(service.extract(pdf)).rejects.toThrow(/billingMonth/i);
    },
  );
});
