import { Migration } from '@mikro-orm/migrations';

export class Migration20260217000002_CreateJobsTable extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        salary_range VARCHAR(255),
        source_url VARCHAR(2000),
        snapshot_markdown TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'WISHLIST',
        kanban_order FLOAT NOT NULL DEFAULT 0,
        last_activity_at TIMESTAMPTZ,
        ghost_days INT NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql('CREATE INDEX idx_jobs_user_id ON jobs(user_id);');
    this.addSql('CREATE INDEX idx_jobs_status ON jobs(status);');
    this.addSql('CREATE INDEX idx_jobs_title ON jobs(title);');
    this.addSql('CREATE INDEX idx_jobs_company ON jobs(company);');
  }

  override async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS jobs;');
  }
}
