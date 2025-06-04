import { DataSource } from 'typeorm';
import { getDbConfig, getLocalDbConfig } from './config/dbConfig';

const dataSource = new DataSource(
  process.env.ENVIRONMENT === 'local' ? getLocalDbConfig() : getDbConfig(),
);

if (!dataSource.isInitialized) {
  void dataSource.initialize();
}

export default dataSource;
