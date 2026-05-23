import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const mockUsersRepository = {
  upsert: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.resetAllMocks();
  });

  it('should delegate handleUserCreated to repository.upsert', async () => {
    mockUsersRepository.upsert.mockResolvedValue({
      id: 'user_1',
      roles: [],
      createdAt: new Date(),
    });

    await service.handleUserCreated('user_1');

    expect(mockUsersRepository.upsert).toHaveBeenCalledWith('user_1');
  });

  it('should delegate handleUserDeleted to repository.delete', async () => {
    await service.handleUserDeleted('user_1');

    expect(mockUsersRepository.delete).toHaveBeenCalledWith('user_1');
  });

  describe('getMe', () => {
    it('should return existing user', async () => {
      const user = { id: 'user_1', roles: ['mvp'], createdAt: new Date() };
      mockUsersRepository.upsert.mockResolvedValue(user);

      const result = await service.getMe('user_1');

      expect(mockUsersRepository.upsert).toHaveBeenCalledWith('user_1');
      expect(result).toBe(user);
    });

    it('should create and return user when not found', async () => {
      const user = { id: 'user_1', roles: [], createdAt: new Date() };
      mockUsersRepository.upsert.mockResolvedValue(user);

      const result = await service.getMe('user_1');

      expect(mockUsersRepository.upsert).toHaveBeenCalledWith('user_1');
      expect(result).toEqual(user);
    });
  });
});
