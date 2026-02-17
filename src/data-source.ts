import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.pro'
    : process.env.NODE_ENV === 'pre'
      ? '.env.pre'
      : '.env.dev';
config({ path: envFile });

const isCompiled = __dirname.includes('dist');
const migrationsDir = isCompiled
  ? join(__dirname, 'database', 'migrations', '*.js')
  : join(__dirname, 'database', 'migrations', '*.ts');

const host = process.env.DB_HOST ?? 'localhost';
export default new DataSource({
  type: 'postgres',
  host,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: host && !host.includes('localhost') ? { rejectUnauthorized: false } : false,
  entities: ['src/**/*.entity.ts'],
  migrations: [migrationsDir],
  synchronize: false,
});
