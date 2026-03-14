import { Migration } from '@mikro-orm/migrations';

export class Migration20260217000003_CreateTimelineEventsTable extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE timeline_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql('CREATE INDEX idx_timeline_events_job_id ON timeline_events(job_id);');
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS timeline_events;');
  }
}
