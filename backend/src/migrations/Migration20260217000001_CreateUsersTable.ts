import { Migration } from '@mikro-orm/migrations';

export class Migration20260217000001_CreateUsersTable extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        is_email_verified BOOLEAN DEFAULT FALSE,
        master_resume_url VARCHAR(500),
        master_profile_json JSONB,
        preferences JSONB,
        refresh_token_hash VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS users;');
  }
}
