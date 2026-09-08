import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from './extraction.service';
import { BankDetectorService } from './bank-detector.service';
import { PdfTextService } from './pdf-text.service';
import { ANTHROPIC_CLIENT } from './extraction.constants';

const mockAnthropicClient = { messages: { create: jest.fn() } };
const mockBankDetector = { detect: jest.fn() };
const mockPdfText = { getText: jest.fn() };

const pdf = Buffer.from('fake-pdf');

function makeToolUseResponse(
  invoiceTotal: number,
  transactions: object[],
  payments: object[] = [],
  futureInstallments: object[] = [],
  billingMonth: string = '2025-04',
  bankName?: string,
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
          ...(bankName !== undefined && { bank_name: bankName }),
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
      { provide: PdfTextService, useValue: mockPdfText },
    ],
  }).compile();
  return module.get<ExtractionService>(ExtractionService);
}

describe('ExtractionService', () => {
  let service: ExtractionService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockBankDetector.detect.mockResolvedValue('other');
    mockPdfText.getText.mockResolvedValue('');
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

  describe('bank_name extraction', () => {
    const mockWithBankName = (bankName?: string) =>
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(0, [], [], [], '2025-04', bankName),
      );

    it.each([
      ['Itaú', 'itau'],
      ['ITAÚ UNIBANCO', 'itau'],
      ['Nubank', 'nubank'],
      ['Nu Pagamentos', 'nubank'],
      ['Bradesco', 'bradesco'],
      ['Banco Bradesco', 'bradesco'],
    ])(
      'normalizes known bank_name "%s" to key "%s"',
      async (bankName, expectedKey) => {
        mockWithBankName(bankName);
        expect((await service.extract(pdf)).bank).toBe(expectedKey);
      },
    );

    it.each([
      'Santander',
      'Banco do Brasil',
      'Caixa Econômica Federal',
      'C6 Bank',
    ])('stores unknown bank_name "%s" as-is', async (bankName) => {
      mockWithBankName(bankName);
      expect((await service.extract(pdf)).bank).toBe(bankName);
    });

    it('falls back to BankDetectorService when bank_name is absent', async () => {
      mockBankDetector.detect.mockResolvedValue('nubank');
      mockWithBankName();
      expect((await service.extract(pdf)).bank).toBe('nubank');
    });
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

  describe('total reconciliation (estorno vs model total)', () => {
    const debit = (amount: number, description = 'COMPRA') => ({
      date: '2026-05-08',
      description,
      amount,
      type: 'debit' as const,
      category: 'Compras',
      subcategory: null,
      confidence: 0.9,
    });
    const credit = (amount: number, description = 'ESTORNO') => ({
      date: '2026-05-08',
      description,
      amount,
      type: 'credit' as const,
      category: 'Compras',
      subcategory: null,
      confidence: 0.9,
    });

    it('reconciles invoiceTotal to the net of lines when the model total is gross (estorno not subtracted)', async () => {
      // Model read the gross "Despesas" (588.96); lines net to 569.04 after the 19.92 estorno
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(588.96, [debit(588.96), credit(19.92)]),
      );

      const result = await service.extract(pdf);

      expect(result.invoiceTotal).toBeCloseTo(569.04, 2);
      expect(result.totalMismatch).toBe(true);
    });

    it('keeps the model total and does not flag when it matches the net of lines', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(100, [debit(100)]),
      );

      const result = await service.extract(pdf);

      expect(result.invoiceTotal).toBe(100);
      expect(result.totalMismatch).toBe(false);
    });

    it('tolerates sub-R$0,05 rounding (IOF / international) without flagging', async () => {
      // Nubank-style: line sum 1371.33 vs model 1371.35 — 2 centavos of rounding
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(1371.35, [debit(1371.33, 'AMAZON')]),
      );

      const result = await service.extract(pdf);

      expect(result.invoiceTotal).toBe(1371.35);
      expect(result.totalMismatch).toBe(false);
    });

    it('keeps the model total and flags when the net of lines EXCEEDS it (lines missed credits)', async () => {
      // Model read the net total (100); a missed estorno left the lines at 120
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(100, [debit(120, 'COMPRA')]),
      );

      const result = await service.extract(pdf);

      expect(result.invoiceTotal).toBe(100);
      expect(result.totalMismatch).toBe(true);
    });

    it('keeps the model total and flags when the net of lines is non-positive (leaked-payment guard)', async () => {
      // A payment that leaked into transactions pushes the net negative — do NOT trust it
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(100, [debit(100), credit(600, 'CREDITO ENORME')]),
      );

      const result = await service.extract(pdf);

      expect(result.invoiceTotal).toBe(100);
      expect(result.totalMismatch).toBe(true);
    });
  });

  describe('credit reclassification by description keyword (safety net)', () => {
    const line = (
      type: 'debit' | 'credit',
      amount: number,
      description: string,
    ) => ({
      date: '2026-09-04',
      description,
      amount,
      type,
      category: 'Outros',
      subcategory: null,
      confidence: 0.9,
    });

    it('flips a debit line to credit when the description denotes an estorno', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(80, [
          line('debit', 100, 'COMPRA X'),
          line('debit', 20, 'ESTORNO COMPRA X'),
        ]),
      );

      const result = await service.extract(pdf);

      const estorno = result.transactions.find((t) =>
        t.description.includes('ESTORNO'),
      );
      expect(estorno?.type).toBe('credit');
      expect(result.invoiceTotal).toBe(80);
      expect(result.totalMismatch).toBe(false);
    });

    it('flips "Devolução" / "Reembolso" / "Cashback" too', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(70, [
          line('debit', 100, 'LOJA'),
          line('debit', 10, 'DEVOLUCAO LOJA'),
          line('debit', 10, 'Reembolso viagem'),
          line('debit', 10, 'CASHBACK ITAU'),
        ]),
      );

      const result = await service.extract(pdf);

      const credits = result.transactions.filter((t) => t.type === 'credit');
      expect(credits).toHaveLength(3);
    });

    it('does not flip a purchase whose merchant merely contains "credito"', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(50, [line('debit', 50, 'CREDITO E CIA MATERIAIS')]),
      );

      const result = await service.extract(pdf);

      expect(result.transactions[0].type).toBe('debit');
    });
  });

  describe('credit reclassification by PDF sign marker', () => {
    const line = (
      type: 'debit' | 'credit',
      amount: number,
      description: string,
    ) => ({
      date: '2026-09-04',
      description,
      amount,
      type,
      category: 'Transporte',
      subcategory: null,
      confidence: 0.9,
    });

    it('flips debits to credit when the text shows a trailing "-" for that amount', async () => {
      mockPdfText.getText.mockResolvedValue(
        [
          '05/09 PAGTO. POR DEB EM C/C 1.000,00 -',
          '31/01 URENTCAR FLORIANOPOL',
          'IS',
          '9,99 -',
          '28/02 URENTCAR FLORIANOPOL',
          'IS',
          '9,99 -',
          '04/08 URENTCAR FLORIANOPOL',
          'IS',
          '9,99',
          '17/08 POSTO CARIBE FORTALEZA 303,20',
        ].join('\n'),
      );
      // net total = 9,99 charge + 303,20 − 2×9,99 estorno = 293,21
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(293.21, [
          line('debit', 9.99, 'URENTCAR'),
          line('debit', 9.99, 'URENTCAR'),
          line('debit', 9.99, 'URENTCAR'),
          line('debit', 303.2, 'POSTO CARIBE'),
        ]),
      );

      const result = await service.extract(pdf);

      const credits = result.transactions.filter((t) => t.type === 'credit');
      // text marks two 9,99 credits; the third 9,99 (no "-") stays a debit
      expect(credits).toHaveLength(2);
      expect(result.transactions).toHaveLength(4);
      expect(result.invoiceTotal).toBeCloseTo(293.21, 2);
      expect(result.totalMismatch).toBe(false);
    });

    it('does not exceed the count of markers found in the text', async () => {
      mockPdfText.getText.mockResolvedValue(
        ['10/08 NETFLIX 59,90 -', '11/08 NETFLIX BR 59,90'].join('\n'),
      );
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(59.9, [
          line('debit', 59.9, 'NETFLIX'),
          line('debit', 59.9, 'NETFLIX BR'),
        ]),
      );

      const result = await service.extract(pdf);

      expect(
        result.transactions.filter((t) => t.type === 'credit'),
      ).toHaveLength(1);
    });

    it('does not double-count a credit the model already got right', async () => {
      mockPdfText.getText.mockResolvedValue(
        ['15/08 ESTORNO 9,99 -', '16/08 URENTCAR 9,99 -'].join('\n'),
      );
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(0, [
          line('credit', 9.99, 'ESTORNO'),
          line('debit', 9.99, 'URENTCAR'),
        ]),
      );

      const result = await service.extract(pdf);

      // budget of 2 markers − 1 already-credit = 1 flip left
      expect(
        result.transactions.filter((t) => t.type === 'credit'),
      ).toHaveLength(2);
    });

    it('ignores payment lines when collecting markers', async () => {
      mockPdfText.getText.mockResolvedValue(
        ['05/09 PAGAMENTO EFETUADO 500,00 -', '06/09 LOJA 500,00'].join('\n'),
      );
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(500, [line('debit', 500, 'LOJA')]),
      );

      const result = await service.extract(pdf);

      expect(result.transactions[0].type).toBe('debit');
    });
  });

  describe('consecutive-duplicate dedup guard', () => {
    const dup = (type: 'debit' | 'credit', amount: number) => ({
      date: '2026-09-04',
      description: 'URENTCAR',
      amount,
      type,
      category: 'Transporte',
      subcategory: null,
      confidence: 0.9,
    });

    it('keeps legitimate repeated estorno lines when they already reconcile', async () => {
      // 1 charge + 3 identical estornos; net = 100 - 30 = 70 = model total
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(70, [
          { ...dup('debit', 100), description: 'BIG PURCHASE' },
          dup('credit', 10),
          dup('credit', 10),
          dup('credit', 10),
        ]),
      );

      const result = await service.extract(pdf);

      expect(result.transactions).toHaveLength(4);
      expect(result.totalMismatch).toBe(false);
    });

    it('still drops a real page-break duplicate when that reconciles the total', async () => {
      // Model total 100; lines sum 150 because one debit is duplicated
      mockAnthropicClient.messages.create.mockResolvedValue(
        makeToolUseResponse(100, [
          { ...dup('debit', 50), description: 'STORE A' },
          { ...dup('debit', 50), description: 'STORE A' },
          { ...dup('debit', 50), description: 'STORE B' },
        ]),
      );

      const result = await service.extract(pdf);

      expect(result.transactions).toHaveLength(2);
      expect(result.invoiceTotal).toBe(100);
      expect(result.totalMismatch).toBe(false);
    });
  });

  it('moves "Pagamentos Validos Normais" to the payments bucket (safety net)', async () => {
    mockAnthropicClient.messages.create.mockResolvedValue(
      makeToolUseResponse(100, [
        {
          date: '2026-05-15',
          description: 'UBER',
          amount: 100,
          type: 'debit',
          category: 'Transporte',
          subcategory: null,
          confidence: 0.9,
        },
        {
          date: '2026-05-15',
          description: 'Pagamentos Validos Normais',
          amount: 1012.57,
          type: 'credit',
          category: 'Outros',
          subcategory: null,
          confidence: 0.5,
        },
      ]),
    );

    const result = await service.extract(pdf);

    expect(result.transactions.map((t) => t.description)).not.toContain(
      'Pagamentos Validos Normais',
    );
    expect(
      result.payments.some(
        (p) =>
          p.description === 'Pagamentos Validos Normais' &&
          p.kind === 'invoice_payment',
      ),
    ).toBe(true);
  });
});
