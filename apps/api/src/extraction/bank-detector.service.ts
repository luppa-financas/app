import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

export type DetectedBank = 'itau' | 'bradesco' | 'nubank' | 'other';

export const BANK_PATTERNS: Array<{ regex: RegExp; bank: DetectedBank }> = [
  { regex: /ita[uú]/i, bank: 'itau' },
  { regex: /bradesco/i, bank: 'bradesco' },
  { regex: /nubank|nu\s+pagamentos/i, bank: 'nubank' },
];

@Injectable()
export class BankDetectorService {
  private readonly logger = new Logger(BankDetectorService.name);

  async detect(pdf: Buffer): Promise<DetectedBank> {
    let text: string;
    const parser = new PDFParse({ data: pdf });
    try {
      const result = await parser.getText({ first: 1 });
      text = result.text;
    } catch (err) {
      this.logger.warn(
        `Failed to parse PDF for bank detection: ${(err as Error).message}`,
      );
      return 'other';
    } finally {
      await parser.destroy().catch(() => undefined);
    }

    for (const { regex, bank } of BANK_PATTERNS) {
      if (regex.test(text)) return bank;
    }
    return 'other';
  }
}
