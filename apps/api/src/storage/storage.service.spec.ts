import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { SUPABASE_CLIENT } from './storage.constants';

const mockSupabaseClient = {
  storage: {
    from: jest.fn(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn(),
};

async function createService(prefix: string): Promise<StorageService> {
  mockConfigService.getOrThrow.mockReturnValue(prefix);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      StorageService,
      { provide: SUPABASE_CLIENT, useValue: mockSupabaseClient },
      { provide: ConfigService, useValue: mockConfigService },
    ],
  }).compile();
  return module.get<StorageService>(StorageService);
}

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    jest.resetAllMocks();
    service = await createService('');
  });

  describe('upload', () => {
    it('should return the file path on success', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'user-1/file.pdf' },
          error: null,
        }),
      });

      const result = await service.upload(
        'invoices',
        'user-1/file.pdf',
        Buffer.from('pdf'),
        'application/pdf',
      );

      expect(result).toBe('user-1/file.pdf');
    });

    it('should throw InternalServerErrorException when Supabase returns an error', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'bucket not found' },
        }),
      });

      await expect(
        service.upload(
          'invoices',
          'user-1/file.pdf',
          Buffer.from('pdf'),
          'application/pdf',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should prepend STORAGE_PREFIX=local/ to the path before calling Supabase', async () => {
      service = await createService('local/');
      const uploadMock = jest.fn().mockResolvedValue({
        data: { path: 'local/user-1/file.pdf' },
        error: null,
      });
      mockSupabaseClient.storage.from.mockReturnValue({ upload: uploadMock });

      const result = await service.upload(
        'invoices',
        'user-1/file.pdf',
        Buffer.from('pdf'),
        'application/pdf',
      );

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('invoices');
      expect(uploadMock).toHaveBeenCalledWith(
        'local/user-1/file.pdf',
        Buffer.from('pdf'),
        expect.objectContaining({ contentType: 'application/pdf' }),
      );
      expect(result).toBe('local/user-1/file.pdf');
    });

    it('should prepend STORAGE_PREFIX=prod/ to the path before calling Supabase', async () => {
      service = await createService('prod/');
      const uploadMock = jest.fn().mockResolvedValue({
        data: { path: 'prod/user-1/file.pdf' },
        error: null,
      });
      mockSupabaseClient.storage.from.mockReturnValue({ upload: uploadMock });

      const result = await service.upload(
        'invoices',
        'user-1/file.pdf',
        Buffer.from('pdf'),
        'application/pdf',
      );

      expect(uploadMock).toHaveBeenCalledWith(
        'prod/user-1/file.pdf',
        Buffer.from('pdf'),
        expect.objectContaining({ contentType: 'application/pdf' }),
      );
      expect(result).toBe('prod/user-1/file.pdf');
    });

    it('should pass the path unchanged when STORAGE_PREFIX is empty', async () => {
      service = await createService('');
      const uploadMock = jest.fn().mockResolvedValue({
        data: { path: 'user-1/file.pdf' },
        error: null,
      });
      mockSupabaseClient.storage.from.mockReturnValue({ upload: uploadMock });

      await service.upload(
        'invoices',
        'user-1/file.pdf',
        Buffer.from('pdf'),
        'application/pdf',
      );

      expect(uploadMock).toHaveBeenCalledWith(
        'user-1/file.pdf',
        Buffer.from('pdf'),
        expect.objectContaining({ contentType: 'application/pdf' }),
      );
    });
  });

  describe('download', () => {
    it('should return a Buffer with the file content on success', async () => {
      const fileContent = Buffer.from('pdf content');
      mockSupabaseClient.storage.from.mockReturnValue({
        download: jest
          .fn()
          .mockResolvedValue({ data: new Blob([fileContent]), error: null }),
      });

      const result = await service.download('invoices', 'user-1/file.pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw InternalServerErrorException when Supabase returns an error', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'object not found' },
        }),
      });

      await expect(
        service.download('invoices', 'user-1/file.pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    it('should resolve without error on success', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });

      await expect(
        service.delete('invoices', 'user-1/file.pdf'),
      ).resolves.toBeUndefined();
    });

    it('should throw InternalServerErrorException when Supabase returns an error', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'object not found' },
        }),
      });

      await expect(
        service.delete('invoices', 'user-1/file.pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('configuration', () => {
    it('should fail to instantiate when STORAGE_PREFIX is not defined', async () => {
      const failingConfig = {
        getOrThrow: jest.fn().mockImplementation(() => {
          throw new Error('STORAGE_PREFIX is not defined');
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            StorageService,
            { provide: SUPABASE_CLIENT, useValue: mockSupabaseClient },
            { provide: ConfigService, useValue: failingConfig },
          ],
        }).compile(),
      ).rejects.toThrow(/STORAGE_PREFIX/);
    });
  });
});
