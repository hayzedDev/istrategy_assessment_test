import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'payment_processor',

  // Dynamic entity loading using glob patterns
  entities: [join(__dirname, 'src/**/entities/*.entity{.ts,.js}')],

  // Set up migrations path
  migrations: [join(__dirname, 'src/common/database/migrations/*{.ts,.js}')],

  synchronize: false,
  logging: false,
});
