import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async handleUserCreated(id: string): Promise<void> {
    await this.repository.upsert(id);
  }

  async handleUserDeleted(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getMe(userId: string): Promise<User> {
    return this.repository.upsert(userId);
  }
}
