import { ServerLogonFields, SchemaSource, SchemaObject, ComparisonResult } from "../../../shared/types";

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
      getStoredCredentials: (sourceId: string) => Promise<ServerLogonFields | null>;
      storeCredentials: (sourceId: string, credentials: ServerLogonFields) => Promise<void>;
      setCredentials: (sourceId: string, credentials: ServerLogonFields) => Promise<void>;
      clearStoredCredentials: (sourceId: string) => Promise<void>;
      getDatabases: () => Promise<string[]>;
      updateDatabase: (dbName: string) => Promise<{ status: string; message: string }>;
      extractSchema: (source: SchemaSource) => Promise<SchemaObject[]>;
      parseFolder: (folderPath: string) => Promise<SchemaObject[]>;
      compareSchemas: (source: SchemaSource, target: SchemaSource) => Promise<ComparisonResult>;
    };
  }
}

export {};
