import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { WebhookVerifier } from './webhook-verifier';

const mockUsersService = {
  handleUserCreated: jest.fn(),
  handleUserDeleted: jest.fn(),
};

const mockWebhookVerifier = { verify: jest.fn() };

const rawBody = Buffer.from(JSON.stringify({ type: 'user.created', data: { id: 'user_1' } }));
const headers = { 'svix-id': 'msg_1', 'svix-timestamp': '1716000000', 'svix-signature': 'v1,abc' };

function makeReq(body: Buffer) {
  return { rawBody: body } as any;
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
    mockWebhookVerifier.verify.mockReturnValue({ type: 'user.created', data: { id: 'user_1' } });

    await controller.handleWebhook(makeReq(rawBody), headers);

    expect(mockUsersService.handleUserCreated).toHaveBeenCalledWith('user_1');
    expect(mockUsersService.handleUserDeleted).not.toHaveBeenCalled();
  });

  it('should call handleUserDeleted on user.deleted with valid signature', async () => {
    const body = Buffer.from(JSON.stringify({ type: 'user.deleted', data: { id: 'user_1' } }));
    mockWebhookVerifier.verify.mockReturnValue({ type: 'user.deleted', data: { id: 'user_1' } });

    await controller.handleWebhook(makeReq(body), headers);

    expect(mockUsersService.handleUserDeleted).toHaveBeenCalledWith('user_1');
    expect(mockUsersService.handleUserCreated).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when signature is invalid', async () => {
    mockWebhookVerifier.verify.mockImplementation(() => { throw new Error('Invalid signature'); });

    await expect(controller.handleWebhook(makeReq(rawBody), headers)).rejects.toThrow(BadRequestException);
    expect(mockUsersService.handleUserCreated).not.toHaveBeenCalled();
  });

  it('should return 200 without calling service for unknown event types', async () => {
    mockWebhookVerifier.verify.mockReturnValue({ type: 'session.created', data: { id: 'user_1' } });

    await controller.handleWebhook(makeReq(rawBody), headers);

    expect(mockUsersService.handleUserCreated).not.toHaveBeenCalled();
    expect(mockUsersService.handleUserDeleted).not.toHaveBeenCalled();
  });
});
