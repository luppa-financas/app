import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { readFile, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong PDF password');
    this.name = 'WrongPasswordError';
  }
}

// qpdf reports a non-zero exit for many failure modes (corrupt input, missing
// file, wrong password, …). We can only distinguish wrong-password reliably
// from the stderr text.
const WRONG_PASSWORD_REGEX = /incorrect password supplied|invalid password/i;

@Injectable()
export class PdfDecryptionService {
  private readonly logger = new Logger(PdfDecryptionService.name);

  async decrypt(buffer: Buffer, password: string): Promise<Buffer> {
    const id = randomUUID();
    const inputPath = join(tmpdir(), `qpdf-in-${id}.pdf`);
    const outputPath = join(tmpdir(), `qpdf-out-${id}.pdf`);

    try {
      await writeFile(inputPath, buffer);
      await this.runQpdf(inputPath, outputPath, password, buffer.length);
      return await readFile(outputPath);
    } finally {
      await Promise.all([
        unlink(inputPath).catch(() => undefined),
        unlink(outputPath).catch(() => undefined),
      ]);
    }
  }

  private runQpdf(
    inputPath: string,
    outputPath: string,
    password: string,
    inputSize: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('qpdf', [
        `--password=${password}`,
        '--decrypt',
        inputPath,
        outputPath,
      ]);

      const stderrChunks: Buffer[] = [];
      proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      proc.on('error', reject);
      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve();
          return;
        }
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        this.logger.error(
          `qpdf exited with code ${code} (input ${inputSize} bytes): ${stderr}`,
        );
        if (WRONG_PASSWORD_REGEX.test(stderr)) {
          reject(new WrongPasswordError());
          return;
        }
        reject(new Error(`qpdf failed: ${stderr}`));
      });
    });
  }
}
