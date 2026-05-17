import { Injectable } from '@nestjs/common';
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
}
