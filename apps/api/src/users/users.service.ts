import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async handleUserCreated(id: string): Promise<void> {
    await this.repository.create(id);
  }

  async handleUserDeleted(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }
}
