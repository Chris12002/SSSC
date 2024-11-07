// databaseConfig.ts
import Store from 'electron-store';

interface DefaultDatabaseConfig {
    SQLServerAuth: {
      server: string;
      user: string;
      password: string;
      database: string;
      options: {
        encrypt: boolean;
        trustServerCertificate: boolean;
      };
    };
  }

  const defaultDatabaseConfig: DefaultDatabaseConfig = {
    SQLServerAuth: {
      server: '',
      user: '',
      password: '',
      database: '',
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    },
  }

  export enum AuthType {
    SQLServerAuth = 'SQLServerAuth',
  }

const databaseStore = new Store<DefaultDatabaseConfig>({ 
  name: 'appsetttings',
  defaults: defaultDatabaseConfig 
});

export default databaseStore;