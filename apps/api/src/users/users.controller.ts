import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { UsersService } from './users.service';
import { WebhookVerifier } from './webhook-verifier';

interface ClerkWebhookEvent {
  type: string;
  data: { id: string };
}

@Controller('webhooks')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly webhookVerifier: WebhookVerifier,
  ) {}

  @Public()
  @Post('clerk')
  async handleWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers() headers: Record<string, string>,
  ): Promise<void> {
    let event: ClerkWebhookEvent;
    try {
      event = this.webhookVerifier.verify(
        req.rawBody!,
        headers,
      ) as ClerkWebhookEvent;
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'user.created') {
      await this.usersService.handleUserCreated(event.data.id);
    } else if (event.type === 'user.deleted') {
      await this.usersService.handleUserDeleted(event.data.id);
    }
  }
}
