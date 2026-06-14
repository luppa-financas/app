import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import Anthropic from '@anthropic-ai/sdk';
import { ExtractionService } from './extraction.service';
import { BankDetectorService } from './bank-detector.service';
import { ANTHROPIC_CLIENT } from './extraction.constants';

const RUN = process.env.RUN_EXTRACTION_INTEGRATION === '1';
const describeIf = RUN ? describe : describe.skip;

const TESTDATA_DIR = join(__dirname, 'testdata');

async function loadPdf(filename: string): Promise<Buffer> {
  return readFile(join(TESTDATA_DIR, filename));
}

const EXCLUSION_PATTERNS = [
  /saldo anterior/i,
  /fatura anterior/i,
  /saldo restante da fatura anterior/i,
  /pagamento (recebido|em \d)/i,
  /pagto\.?\s*por\s*deb/i,
  /pagamento\s+deb\s+automatic/i,
  /próximas?\s+faturas?/i,
];

interface ExpectedCase {
  file: string;
  expectedTotal: number;
  expectedBillingMonth: string;
  label: string;
  expectPayments: boolean;
  expectFutureInstallments: boolean;
}

function sumNet(
  transactions: Array<{ amount: number; type: 'debit' | 'credit' }>,
) {
  return transactions.reduce(
    (acc, t) => acc + (t.type === 'credit' ? -t.amount : t.amount),
    0,
  );
}

describeIf('ExtractionService (integration)', () => {
  let service: ExtractionService;

  beforeAll(async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY required for integration tests');
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        BankDetectorService,
        { provide: ANTHROPIC_CLIENT, useValue: client },
      ],
    }).compile();
    service = module.get<ExtractionService>(ExtractionService);
  });

  jest.setTimeout(300_000);

  const cases: ExpectedCase[] = [
    {
      file: 'itau-humberto.pdf',
      expectedTotal: 18918.07,
      expectedBillingMonth: '2026-05',
      label: 'Itaú Humberto',
      expectPayments: true,
      expectFutureInstallments: true,
    },
    {
      file: 'Nubank_2026-05-18.pdf',
      expectedTotal: 1138.35,
      expectedBillingMonth: '2026-05',
      label: 'Nubank',
      expectPayments: true,
      expectFutureInstallments: false,
    },
    {
      file: 'bradesco-final-mai.pdf',
      expectedTotal: 4356.38,
      expectedBillingMonth: '2026-06',
      label: 'Bradesco',
      expectPayments: true,
      expectFutureInstallments: false,
    },
  ];

  for (const c of cases) {
    describe(c.label, () => {
      let result: Awaited<ReturnType<ExtractionService['extract']>>;

      beforeAll(async () => {
        const pdf = await loadPdf(c.file);
        result = await service.extract(pdf);
      });

      it('invoiceTotal and sum match (±R$ 0,01)', () => {
        expect(result.invoiceTotal).toBeCloseTo(c.expectedTotal, 2);
        expect(sumNet(result.transactions)).toBeCloseTo(c.expectedTotal, 2);
      });

      it(`billingMonth matches ${c.expectedBillingMonth}`, () => {
        expect(result.billingMonth).toBe(c.expectedBillingMonth);
      });

      it('no excluded patterns in descriptions', () => {
        for (const t of result.transactions) {
          for (const pattern of EXCLUSION_PATTERNS) {
            expect(t.description).not.toMatch(pattern);
          }
        }
      });

      it('every amount is positive', () => {
        for (const t of result.transactions) {
          expect(t.amount).toBeGreaterThan(0);
          expect(['debit', 'credit']).toContain(t.type);
        }
      });

      if (c.expectPayments) {
        it('payments array is populated with valid entries', () => {
          expect(result.payments.length).toBeGreaterThan(0);
          for (const p of result.payments) {
            expect(p.amount).toBeGreaterThan(0);
            expect(['invoice_payment', 'previous_balance']).toContain(p.kind);
          }
        });
      }

      if (c.expectFutureInstallments) {
        it('futureInstallments array is populated with valid entries', () => {
          expect(result.futureInstallments.length).toBeGreaterThan(0);
          for (const f of result.futureInstallments) {
            expect(f.amount).toBeGreaterThan(0);
          }
        });
      }
    });
  }
});
