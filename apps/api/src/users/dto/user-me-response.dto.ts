import { User } from '@prisma/client';

export class UserMeResponseDto {
  id: string;
  roles: string[];

  static from(user: User): UserMeResponseDto {
    return { id: user.id, roles: user.roles };
  }
}
