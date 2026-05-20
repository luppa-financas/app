import { Test, TestingModule } from '@nestjs/testing';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import {
  PdfDecryptionService,
  WrongPasswordError,
} from './pdf-decryption.service';

jest.mock('child_process');

type MockProcess = EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
};

function createMockProcess(opts: {
  stdoutData?: Buffer;
  stderrData?: string;
  exitCode: number;
}): MockProcess {
  const proc = new EventEmitter() as MockProcess;
  proc.stdin = new PassThrough();
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();

  setImmediate(() => {
    if (opts.stdoutData) proc.stdout.write(opts.stdoutData);
    if (opts.stderrData) proc.stderr.write(opts.stderrData);
    proc.stdout.end();
    proc.stderr.end();
    proc.emit('close', opts.exitCode);
  });

  return proc;
}

describe('PdfDecryptionService', () => {
  let service: PdfDecryptionService;
  const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfDecryptionService],
    }).compile();
    service = module.get<PdfDecryptionService>(PdfDecryptionService);
  });

  it('should spawn qpdf with --password, --decrypt and stdin/stdout pipes', async () => {
    const decrypted = Buffer.from('decrypted-pdf-bytes');
    spawnMock.mockReturnValue(
      createMockProcess({ stdoutData: decrypted, exitCode: 0 }) as never,
    );

    await service.decrypt(Buffer.from('encrypted'), 's3cret');

    expect(spawnMock).toHaveBeenCalledWith('qpdf', [
      '--password=s3cret',
      '--decrypt',
      '-',
      '-',
    ]);
  });

  it('should resolve with the decrypted buffer when qpdf exits 0', async () => {
    const decrypted = Buffer.from('decrypted-pdf-bytes');
    spawnMock.mockReturnValue(
      createMockProcess({ stdoutData: decrypted, exitCode: 0 }) as never,
    );

    const result = await service.decrypt(Buffer.from('encrypted'), 's3cret');

    expect(result.equals(decrypted)).toBe(true);
  });

  it('should write input buffer to qpdf stdin', async () => {
    const decrypted = Buffer.from('decrypted-pdf-bytes');
    const proc = createMockProcess({ stdoutData: decrypted, exitCode: 0 });
    const chunks: Buffer[] = [];
    proc.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    spawnMock.mockReturnValue(proc as never);

    const input = Buffer.from('encrypted-pdf-bytes');
    await service.decrypt(input, 's3cret');

    const written = Buffer.concat(chunks);
    expect(written.equals(input)).toBe(true);
  });

  it('should throw WrongPasswordError when qpdf exits with code 2', async () => {
    spawnMock.mockReturnValue(
      createMockProcess({
        stderrData: 'invalid password',
        exitCode: 2,
      }) as never,
    );

    await expect(
      service.decrypt(Buffer.from('encrypted'), 'wrong'),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('should throw generic Error when qpdf exits with any other non-zero code', async () => {
    spawnMock.mockReturnValue(
      createMockProcess({
        stderrData: 'corrupt file',
        exitCode: 3,
      }) as never,
    );

    await expect(
      service.decrypt(Buffer.from('encrypted'), 's3cret'),
    ).rejects.toThrow(/qpdf/i);
  });

  it('should not crash when stdin emits EPIPE because qpdf closed early', async () => {
    const proc = createMockProcess({
      stderrData: 'invalid password',
      exitCode: 2,
    });
    spawnMock.mockReturnValue(proc as never);

    // Simulate qpdf closing stdin before we finish writing the buffer.
    setImmediate(() => {
      const epipe = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
      proc.stdin.emit('error', epipe);
    });

    await expect(
      service.decrypt(Buffer.from('encrypted'), 'wrong'),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });
});
