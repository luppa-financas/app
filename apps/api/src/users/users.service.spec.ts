import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

const mockUsersRepository = {
  create: jest.fn(),
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

  it('should delegate handleUserCreated to repository.create', async () => {
    await service.handleUserCreated('user_1');

    expect(mockUsersRepository.create).toHaveBeenCalledWith('user_1');
  });

  it('should delegate handleUserDeleted to repository.delete', async () => {
    await service.handleUserDeleted('user_1');

    expect(mockUsersRepository.delete).toHaveBeenCalledWith('user_1');
  });

  describe('getMe', () => {
    it('should return the user when found', async () => {
      const user = { id: 'user_1', roles: ['mvp'], createdAt: new Date() };
      mockUsersRepository.findById.mockResolvedValue(user);

      const result = await service.getMe('user_1');

      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user_1');
      expect(result).toBe(user);
    });

    it('should throw NotFoundException when user is not found', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.getMe('user_1')).rejects.toThrow(NotFoundException);
    });
  });
});
