import { ServerLogonFields } from "../../../shared/types";

declare global {
  interface Window {
    api: {
      getProcedures: () => Promise<string[]>;
      getSnapshots: (procName: string) => Promise<any[]>;
      getDiff: (snapshotId1: number, snapshotId2: number) => Promise<string>;
      getSnapshotData: (snapshotId: number) => Promise<string>;
      saveHtmlFile: (outputPath: string, diffHtml: string) => Promise<{ status: string; message: string }>;
      saveDialog: (defaultFileName: string) => Promise<{ canceled: boolean; filePath?: string }>;
      selectFolder: (title?: string) => Promise<{ canceled: boolean; folderPath?: string }>;
      getStoredCredentials: () => Promise<ServerLogonFields | null>;
      storeCredentials: (credentials: ServerLogonFields) => Promise<void>;
      setCredentials: (credentials: ServerLogonFields) => Promise<void>;
      clearStoredCredentials: () => Promise<void>;
      getDatabases: () => Promise<string[]>;
      updateDatabase: (dbName: string) => Promise<{ status: string; message: string }>;
    };
  }
}

export {};
