import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';

export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong PDF password');
    this.name = 'WrongPasswordError';
  }
}

@Injectable()
export class PdfDecryptionService {
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

      proc.on('error', reject);
      proc.on('close', (code: number) => {
        if (code === 0) {
          resolve(Buffer.concat(stdoutChunks));
          return;
        }
        if (code === 2) {
          reject(new WrongPasswordError());
          return;
        }
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();
        reject(new Error(`qpdf exited with code ${code}: ${stderr}`));
      });

      proc.stdin.end(buffer);
    });
  }
}
