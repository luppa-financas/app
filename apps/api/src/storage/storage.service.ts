import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './storage.constants';

@Injectable()
export class StorageService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async upload(bucket: string, path: string, file: Buffer, mimeType: string): Promise<string> {
    const { data, error } = await this.supabase.storage.from(bucket).upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

    if (error || !data) {
      this.fail('upload', error?.message ?? 'no data returned');
    }

    return data.path;
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from(bucket).download(path);

    if (error || !data) {
      this.fail('download', error?.message ?? 'no data returned');
    }

    return Buffer.from(await data.arrayBuffer());
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      this.fail('delete', error.message);
    }
  }

  private fail(op: string, message: string): never {
    throw new InternalServerErrorException(`Storage ${op} failed: ${message}`);
  }
}
