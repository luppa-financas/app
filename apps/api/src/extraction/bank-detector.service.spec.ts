import { Test, TestingModule } from '@nestjs/testing';
import { BankDetectorService } from './bank-detector.service';

const getText = jest.fn();
const destroy = jest.fn();

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: (...args: unknown[]) => getText(...args) as unknown,
    destroy: (): unknown => destroy() as unknown,
  })),
}));

const pdf = Buffer.from('fake-pdf');

async function createService(): Promise<BankDetectorService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [BankDetectorService],
  }).compile();
  return module.get<BankDetectorService>(BankDetectorService);
}

describe('BankDetectorService', () => {
  let service: BankDetectorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    destroy.mockResolvedValue(undefined);
    service = await createService();
  });

  it.each([
    'ITAU UNIBANCO HOLDING S.A.',
    'Itaú',
    'Pague sua fatura - itau',
    'ITAÚ',
  ])('detects itau from text containing %p', async (text) => {
    getText.mockResolvedValue({ text });

    expect(await service.detect(pdf)).toBe('itau');
  });

  it.each(['Aplicativo Bradesco', 'BRADESCO S.A.', 'bradesco'])(
    'detects bradesco from text containing %p',
    async (text) => {
      getText.mockResolvedValue({ text });

      expect(await service.detect(pdf)).toBe('bradesco');
    },
  );

  it.each(['Nubank', 'Nu Pagamentos S.A.', 'NUBANK'])(
    'detects nubank from text containing %p',
    async (text) => {
      getText.mockResolvedValue({ text });

      expect(await service.detect(pdf)).toBe('nubank');
    },
  );

  it('returns "other" when no bank identifier is found', async () => {
    getText.mockResolvedValue({ text: 'some unrelated text' });

    expect(await service.detect(pdf)).toBe('other');
  });

  it('returns "other" when parsing throws', async () => {
    getText.mockRejectedValue(new Error('corrupt'));

    expect(await service.detect(pdf)).toBe('other');
  });

  it('reads only the first page (first: 1)', async () => {
    getText.mockResolvedValue({ text: 'Itaú' });

    await service.detect(pdf);

    expect(getText).toHaveBeenCalledWith({ first: 1 });
  });

  it('destroys the parser after use', async () => {
    getText.mockResolvedValue({ text: 'Itaú' });

    await service.detect(pdf);

    expect(destroy).toHaveBeenCalled();
  });
});
