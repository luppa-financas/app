import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong PDF password');
    this.name = 'WrongPasswordError';
  }
}

@Injectable()
export class PdfDecryptionService {
  private readonly logger = new Logger(PdfDecryptionService.name);

  decrypt(buffer: Buffer, password: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const proc = spawn('qpdf', [
        `--password=${password}`,
        '--decrypt',
        '-',
        '-',
      ]);

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
      proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

      // qpdf may close stdin early on errors (e.g. wrong password) while we are
      // still writing the input buffer. Swallow the resulting EPIPE — the real
      // outcome arrives via the 'close' event.
      proc.stdin.on('error', () => {});

      proc.on('error', reject);
      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve(Buffer.concat(stdoutChunks));
          return;
        }
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        this.logger.error(
          `qpdf exited with code ${code} (input ${buffer.length} bytes, password length ${password.length}): ${stderr}`,
        );
        if (code === 2) {
          reject(new WrongPasswordError());
          return;
        }
        reject(new Error(`qpdf exited with code ${code}: ${stderr}`));
      });

      proc.stdin.end(buffer);
    });
  }
}
