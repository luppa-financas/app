import { Test, TestingModule } from '@nestjs/testing';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { readFile, unlink, writeFile } from 'fs/promises';
import {
  PdfDecryptionService,
  WrongPasswordError,
} from './pdf-decryption.service';

jest.mock('child_process');
jest.mock('fs/promises');

type MockProcess = EventEmitter & {
  stdout: PassThrough;
  stderr: PassThrough;
};

function createMockProcess(opts: {
  stderrData?: string;
  exitCode: number;
}): MockProcess {
  const proc = new EventEmitter() as MockProcess;
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();

  setImmediate(() => {
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
  const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
  const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
  const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

  beforeEach(async () => {
    jest.resetAllMocks();
    writeFileMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfDecryptionService],
    }).compile();
    service = module.get<PdfDecryptionService>(PdfDecryptionService);
  });

  it('should write input buffer to a temp file before spawning qpdf', async () => {
    readFileMock.mockResolvedValue(Buffer.from('decrypted-pdf-bytes'));
    spawnMock.mockReturnValue(
      createMockProcess({ exitCode: 0 }) as never,
    );

    await service.decrypt(Buffer.from('encrypted-bytes'), 's3cret');

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [inputPath, writtenBuffer] = writeFileMock.mock.calls[0];
    expect(inputPath).toMatch(/qpdf-in-.*\.pdf$/);
    expect(writtenBuffer).toEqual(Buffer.from('encrypted-bytes'));
  });

  it('should spawn qpdf with --password, --decrypt and the temp file paths', async () => {
    readFileMock.mockResolvedValue(Buffer.from('decrypted-pdf-bytes'));
    spawnMock.mockReturnValue(
      createMockProcess({ exitCode: 0 }) as never,
    );

    await service.decrypt(Buffer.from('encrypted'), 's3cret');

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args] = spawnMock.mock.calls[0];
    expect(cmd).toBe('qpdf');
    expect(args).toEqual([
      '--password=s3cret',
      '--decrypt',
      expect.stringMatching(/qpdf-in-.*\.pdf$/),
      expect.stringMatching(/qpdf-out-.*\.pdf$/),
    ]);
  });

  it('should resolve with the buffer read from the output temp file', async () => {
    const decrypted = Buffer.from('decrypted-pdf-bytes');
    readFileMock.mockResolvedValue(decrypted);
    spawnMock.mockReturnValue(
      createMockProcess({ exitCode: 0 }) as never,
    );

    const result = await service.decrypt(Buffer.from('encrypted'), 's3cret');

    expect(result).toBe(decrypted);
    expect(readFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/qpdf-out-.*\.pdf$/),
    );
  });

  it('should unlink both temp files on success', async () => {
    readFileMock.mockResolvedValue(Buffer.from('decrypted'));
    spawnMock.mockReturnValue(
      createMockProcess({ exitCode: 0 }) as never,
    );

    await service.decrypt(Buffer.from('encrypted'), 's3cret');

    const unlinkedPaths = unlinkMock.mock.calls.map((c) => c[0]);
    expect(unlinkedPaths).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/qpdf-in-.*\.pdf$/),
        expect.stringMatching(/qpdf-out-.*\.pdf$/),
      ]),
    );
  });

  it('should throw WrongPasswordError when stderr matches "incorrect password"', async () => {
    spawnMock.mockReturnValue(
      createMockProcess({
        stderrData: 'Incorrect password supplied',
        exitCode: 2,
      }) as never,
    );

    await expect(
      service.decrypt(Buffer.from('encrypted'), 'wrong'),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });

  it('should throw generic Error when qpdf fails with an unrelated stderr', async () => {
    spawnMock.mockReturnValue(
      createMockProcess({
        stderrData: 'open -: No such file or directory',
        exitCode: 2,
      }) as never,
    );

    await expect(
      service.decrypt(Buffer.from('encrypted'), 's3cret'),
    ).rejects.toThrow(/qpdf/);
  });

  it('should unlink both temp files even when qpdf fails', async () => {
    spawnMock.mockReturnValue(
      createMockProcess({
        stderrData: 'Incorrect password supplied',
        exitCode: 2,
      }) as never,
    );

    await expect(
      service.decrypt(Buffer.from('encrypted'), 'wrong'),
    ).rejects.toBeInstanceOf(WrongPasswordError);

    const unlinkedPaths = unlinkMock.mock.calls.map((c) => c[0]);
    expect(unlinkedPaths).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/qpdf-in-.*\.pdf$/),
        expect.stringMatching(/qpdf-out-.*\.pdf$/),
      ]),
    );
  });

  it('should swallow unlink errors so they do not mask the original failure', async () => {
    unlinkMock.mockRejectedValue(new Error('ENOENT'));
    spawnMock.mockReturnValue(
      createMockProcess({
        stderrData: 'Incorrect password supplied',
        exitCode: 2,
      }) as never,
    );

    await expect(
      service.decrypt(Buffer.from('encrypted'), 'wrong'),
    ).rejects.toBeInstanceOf(WrongPasswordError);
  });
});
