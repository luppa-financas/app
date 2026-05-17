import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';

@Injectable()
export class WebhookVerifier {
  private readonly webhook: Webhook;

  constructor(config: ConfigService) {
    this.webhook = new Webhook(config.getOrThrow('CLERK_WEBHOOK_SECRET'));
  }

  verify(payload: Buffer, headers: Record<string, string>): unknown {
    return this.webhook.verify(payload, headers);
  }
}
