// DatabaseService.ts
import sql, { config as dbConfig } from 'mssql';
import { ServerLogonFields, Snapshot, SnapshotContent }  from '../../shared/types';
import databaseStore, { AuthType } from '../config/databaseConfig.js';

  class DatabaseService {
    private static instance: DatabaseService;
    private dbConfig: dbConfig | null = null;
    private authType: AuthType = AuthType.SQLServerAuth; // default to SQL Server Auth
    private connectionPool: sql.ConnectionPool | null = null;

    private constructor() {}

    private dbConfigMap(config:ServerLogonFields) {

      const baseConfig = this.getConfigByType(this.authType);
      switch (this.authType) {
        case AuthType.SQLServerAuth:
          return {   
            ...baseConfig,
            server: config.server,
            user: config.username,
            password: config.password,         
            }
      }

    }

    public getConfigByType(type: AuthType): dbConfig {
      const config = databaseStore.get(type);
      if (!config) {
        throw new Error(`Configuration for ${type} not found.`);
      }
      return config;
    }
  
    public static getInstance(): DatabaseService {
      if (!DatabaseService.instance) {
        DatabaseService.instance = new DatabaseService();
      }
      return DatabaseService.instance;
    }
  
    public async setConfig(config: ServerLogonFields) {
      const mappedConfig = this.dbConfigMap(config);
      this.dbConfig = mappedConfig;
      await this.setConnectionPool();
    }
  
    public getConfig(): dbConfig | null {
      return this.dbConfig;
    }

    public async changeDatabase(databaseName: string) {
      if (!this.dbConfig) {
        throw new Error('Database configuration has not been set.');
      }
      //TODO update for different auth types
      this.dbConfig = { // Don't mutate the original object
        ...this.dbConfig,
        database: databaseName,  // Update the database name
        server: this.dbConfig.server,  // Ensure server is defined
        user: this.dbConfig.user,  // Ensure user is defined
        password: this.dbConfig.password,  // Ensure password is defined
        options: {
          ...this.dbConfig.options, // Shallow copy fix
          encrypt: this.dbConfig.options?.encrypt ?? true,
          trustServerCertificate: this.dbConfig.options?.trustServerCertificate ?? true,
        },
      };    
      await this.setConnectionPool();
    }

    public async getProcedures(): Promise<string[]> {
        try {
          const pool = await this.getConnectionPool();
          const result = await pool.request().query('SELECT DISTINCT ObjectName FROM ChangeControl WITH (NOLOCK)');
          return result.recordset.map((row) => row.ObjectName);
        } catch (err: any) {
          const errorMessage = `Database Error: ${err.message.split('\n')[0]}`;
          // Throw a new error with the concise message
          throw new Error(errorMessage);
        }
      }
      
      public async getSnapshots(procName: string): Promise<Snapshot[]> {
        try {
          const pool = await this.getConnectionPool();
          const result = await pool
            .request()
            .input('ProcFunctionName', sql.VarChar, procName)
            .query(
              'SELECT ChangeControlID, ChangeDateTime FROM ChangeControl WITH (NOLOCK) WHERE ObjectName = @ProcFunctionName ORDER BY ChangeDateTime DESC',
            );
          return result.recordset;
        } catch (err: any) {
          const errorMessage = `Database Error: ${err.message.split('\n')[0]}`;
          // Throw a new error with the concise message
          throw new Error(errorMessage);
        }
      }
      
      public async getSnapshotContent(snapshotId: number): Promise<SnapshotContent | null> {
        try {
          const pool = await this.getConnectionPool();
          const result = await pool
            .request()
            .input('ChangeControlID', sql.Int, snapshotId)
            .query('SELECT ObjectReference FROM ChangeControl WHERE ChangeControlID = @ChangeControlID');
          return result.recordset[0] || null;
        } catch (err: any) {
          const errorMessage = `Database Error: ${err.message.split('\n')[0]}`;
          // Throw a new error with the concise message
          throw new Error(errorMessage);
        }
      }

      public async getDatabases(): Promise<string[]> {
        try {
          const pool = await this.getConnectionPool();
          const result = await pool.request().query('SELECT name FROM sys.databases WHERE database_id > 4');
          const dbs = result.recordset.map((row) => row.name);
          return dbs
        } catch (err: any) {
          const errorMessage = `Database Error: ${err.message.split('\n')[0]}`;
          // Throw a new error with the concise message
          throw new Error(errorMessage);
        }
      }

      private async getConnectionPool(): Promise<sql.ConnectionPool> {
        if (!this.connectionPool) {
          throw new Error("Database has not been initialized.");
        }
        return this.connectionPool;
      }

      private async setConnectionPool(): Promise<void> {
        if (this.connectionPool) {
          await this.connectionPool.close();
          this.connectionPool = null;
        }
        if (this.dbConfig) {
          this.connectionPool = await sql.connect(this.dbConfig);
        } else {
          throw new Error("Database config has not been initialized.");
        }
      }
      
  }
  
  export default DatabaseService;
  