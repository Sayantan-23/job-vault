import { Migration } from '@mikro-orm/migrations';

export class Migration20260217000005_CreateNotificationsTable extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message VARCHAR(500) NOT NULL,
        type VARCHAR(20) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql('CREATE INDEX idx_notifications_user_id ON notifications(user_id);');
    this.addSql('CREATE INDEX idx_notifications_is_read ON notifications(is_read);');
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS notifications;');
  }
}
