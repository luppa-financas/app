import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('UsersRepository', () => {
  let repository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    jest.resetAllMocks();
  });

  it('should create a user with the given id', async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: 'user_1',
      createdAt: new Date(),
    });

    await repository.create('user_1');

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: { id: 'user_1' },
    });
  });

  it('should delete a user by id', async () => {
    mockPrisma.user.delete.mockResolvedValue({ id: 'user_1' });

    await repository.delete('user_1');

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user_1' },
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: 'user_1', roles: ['mvp'], createdAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await repository.findById('user_1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_1' },
      });
      expect(result).toBe(user);
    });

    it('should return null when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('user_1');

      expect(result).toBeNull();
    });
  });
});
