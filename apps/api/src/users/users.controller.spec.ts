import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { UsersController, UserProfileController } from './users.controller';
import { UsersService } from './users.service';
import { WebhookVerifier } from './webhook-verifier';

const mockUsersService = {
  handleUserCreated: jest.fn(),
  handleUserDeleted: jest.fn(),
};

const mockWebhookVerifier = { verify: jest.fn() };

const rawBody = Buffer.from(
  JSON.stringify({ type: 'user.created', data: { id: 'user_1' } }),
);
const headers = {
  'svix-id': 'msg_1',
  'svix-timestamp': '1716000000',
  'svix-signature': 'v1,abc',
};

function makeReq(body: Buffer): RawBodyRequest<Request> {
  return { rawBody: body } as RawBodyRequest<Request>;
}

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: WebhookVerifier, useValue: mockWebhookVerifier },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.resetAllMocks();
  });

  it('should call handleUserCreated on user.created with valid signature', async () => {
    mockWebhookVerifier.verify.mockReturnValue({
      type: 'user.created',
      data: { id: 'user_1' },
    });

    await controller.handleWebhook(makeReq(rawBody), headers);

    expect(mockUsersService.handleUserCreated).toHaveBeenCalledWith('user_1');
    expect(mockUsersService.handleUserDeleted).not.toHaveBeenCalled();
  });

  it('should call handleUserDeleted on user.deleted with valid signature', async () => {
    const body = Buffer.from(
      JSON.stringify({ type: 'user.deleted', data: { id: 'user_1' } }),
    );
    mockWebhookVerifier.verify.mockReturnValue({
      type: 'user.deleted',
      data: { id: 'user_1' },
    });

    await controller.handleWebhook(makeReq(body), headers);

    expect(mockUsersService.handleUserDeleted).toHaveBeenCalledWith('user_1');
    expect(mockUsersService.handleUserCreated).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when signature is invalid', async () => {
    mockWebhookVerifier.verify.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(
      controller.handleWebhook(makeReq(rawBody), headers),
    ).rejects.toThrow(BadRequestException);
    expect(mockUsersService.handleUserCreated).not.toHaveBeenCalled();
  });

  it('should return 200 without calling service for unknown event types', async () => {
    mockWebhookVerifier.verify.mockReturnValue({
      type: 'session.created',
      data: { id: 'user_1' },
    });

    await controller.handleWebhook(makeReq(rawBody), headers);

    expect(mockUsersService.handleUserCreated).not.toHaveBeenCalled();
    expect(mockUsersService.handleUserDeleted).not.toHaveBeenCalled();
  });
});

describe('UserProfileController', () => {
  let controller: UserProfileController;

  const mockUsersService = {
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UserProfileController>(UserProfileController);
  });

  describe('GET /users/me', () => {
    it('should return id and roles for the authenticated user', async () => {
      const user = { id: 'user_1', roles: ['mvp'], createdAt: new Date() };
      mockUsersService.getMe.mockResolvedValue(user);

      const result = await controller.getMe('user_1');

      expect(mockUsersService.getMe).toHaveBeenCalledWith('user_1');
      expect(result).toEqual({ id: 'user_1', roles: ['mvp'] });
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should propagate NotFoundException when user is not found', async () => {
      mockUsersService.getMe.mockRejectedValue(new NotFoundException());

      await expect(controller.getMe('user_1')).rejects.toThrow(NotFoundException);
    });
  });
});
