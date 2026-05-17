import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    create: jest.fn(),
    delete: jest.fn(),
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
    mockPrisma.user.create.mockResolvedValue({ id: 'user_1', createdAt: new Date() });

    await repository.create('user_1');

    expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: { id: 'user_1' } });
  });

  it('should delete a user by id', async () => {
    mockPrisma.user.delete.mockResolvedValue({ id: 'user_1' });

    await repository.delete('user_1');

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user_1' } });
  });
});
