import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

/**
 * Extracts the raw text layer of a PDF. Used as a deterministic cross-check
 * against the LLM extraction (e.g. detecting credit/estorno sign markers the
 * model tends to miss). Not a transaction parser.
 */
@Injectable()
export class PdfTextService {
  private readonly logger = new Logger(PdfTextService.name);

  async getText(pdf: Buffer): Promise<string> {
    const parser = new PDFParse({ data: pdf });
    try {
      const result = await parser.getText();
      return result.text;
    } catch (err) {
      this.logger.warn(`Failed to parse PDF text: ${(err as Error).message}`);
      return '';
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}
