import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesRepository } from './invoices.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  invoice: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('InvoicesRepository', () => {
  let repository: InvoicesRepository;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<InvoicesRepository>(InvoicesRepository);
  });

  describe('create', () => {
    it('should create an invoice with PENDING status and return it', async () => {
      const invoice = {
        id: 'inv-1',
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'invoices/user-1/fatura.pdf',
        status: 'PENDING',
        createdAt: new Date(),
      };
      mockPrisma.invoice.create.mockResolvedValue(invoice);

      const result = await repository.create({
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'invoices/user-1/fatura.pdf',
      });

      expect(result).toEqual(invoice);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', filename: 'fatura.pdf', storagePath: 'invoices/user-1/fatura.pdf' },
      });
    });
  });

  describe('findById', () => {
    it('should return the invoice when userId matches', async () => {
      const invoice = { id: 'inv-1', userId: 'user-1' };
      mockPrisma.invoice.findFirst.mockResolvedValue(invoice);

      const result = await repository.findById('inv-1', 'user-1');

      expect(result).toEqual(invoice);
      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId: 'user-1' },
      });
    });

    it('should return null when userId does not match', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      const result = await repository.findById('inv-1', 'wrong-user');

      expect(result).toBeNull();
    });
  });
});
