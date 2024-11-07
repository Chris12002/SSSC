import { ServerCredentials } from "../components/LoginModal";

declare global {
  interface Window {
    api: {
      getProcedures: () => Promise<string[]>;
      getSnapshots: (procName: string) => Promise<any[]>;
      getDiff: (snapshotId1: number, snapshotId2: number) => Promise<string>;
      getSnapshotData: (snapshotId: number) => Promise<string>;
      saveHtmlFile: (outputPath: string, diffHtml: string) => Promise<{ status: string; message: string }>;
      saveDialog: (defaultFileName: string) => Promise<{ canceled: boolean; filePath?: string }>;  
      getStoredCredentials: () => ServerLogonFields,
      storeCredentials: (credentials: ServerLogonFields) => Promise<void>,
      setCredentials: (credentials: ServerLogonFields) => Promise<void>,
      clearStoredCredentials: () => Promise<void>,    
      getDatabases: () => Promise<string[]>;
      updateDatabase: (dbName: string) => Promise<string>;
    };
  }
}

export {};
