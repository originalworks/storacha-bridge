import { DataSourceOptions } from 'typeorm';

export const getDbConfig = (): DataSourceOptions => ({
  host: process.env.DB_HOST,
  type: 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migration/*.js'],
  synchronize: false,
});

export const dbCreatorConfig = (): DataSourceOptions => ({
  name: 'db-creator',
  host: process.env.DB_HOST,
  type: 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.ROOT_DB_NAME,
  synchronize: false,
});

export const testDbConfig = (): DataSourceOptions => ({
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  type: 'postgres',
  entities: ['src/**/**.entity.ts'],
  migrations: ['dist/migration/*.js'],
  synchronize: true,
  dropSchema: true,
});
