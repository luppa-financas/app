import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { SUPABASE_CLIENT } from './storage.constants';

const mockSupabaseClient = {
  storage: {
    from: jest.fn(),
  },
};

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabaseClient },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('upload', () => {
    it('should return the file path on success', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'user-1/file.pdf' }, error: null }),
      });

      const result = await service.upload('invoices', 'user-1/file.pdf', Buffer.from('pdf'), 'application/pdf');

      expect(result).toBe('user-1/file.pdf');
    });

    it('should throw InternalServerErrorException when Supabase returns an error', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'bucket not found' } }),
      });

      await expect(
        service.upload('invoices', 'user-1/file.pdf', Buffer.from('pdf'), 'application/pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('download', () => {
    it('should return a Buffer with the file content on success', async () => {
      const fileContent = Buffer.from('pdf content');
      mockSupabaseClient.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: new Blob([fileContent]), error: null }),
      });

      const result = await service.download('invoices', 'user-1/file.pdf');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw InternalServerErrorException when Supabase returns an error', async () => {
      mockSupabaseClient.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({ data: null, error: { message: 'object not found' } }),
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
        remove: jest.fn().mockResolvedValue({ data: null, error: { message: 'object not found' } }),
      });

      await expect(
        service.delete('invoices', 'user-1/file.pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
