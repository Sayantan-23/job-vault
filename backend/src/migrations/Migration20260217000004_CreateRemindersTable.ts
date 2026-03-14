import { Migration } from '@mikro-orm/migrations';

export class Migration20260217000004_CreateRemindersTable extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message VARCHAR(500) NOT NULL,
        remind_at TIMESTAMPTZ NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql('CREATE INDEX idx_reminders_user_id ON reminders(user_id);');
    this.addSql('CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);');
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS reminders;');
  }
}
