import fs from 'node:fs';
import path from 'node:path';
import pool from '../config/db';

async function runMigrations() {
  console.log('⚙️ Starting database migrations...');
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sắp xếp theo thứ tự 001, 002, ...

    console.log(`Found ${files.length} migration files.`);

    for (const file of files) {
      console.log(`Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Chạy câu lệnh SQL
      await pool.query(sql);
      console.log(`✅ Success: ${file}`);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
