export interface ServerLogonFields {
    server: string;
    username: string;
    password?: string;
    saveCredentials: boolean;
  }

  export interface Snapshot {
    ChangeControlID: number;
    ChangeDateTime: Date;
  }
  
  export interface SnapshotContent {
    ObjectReference: string;
  }

  export interface DiffItem {
    id: string; // Unique identifier for each diff
    content: string; // The HTML content of the diff
    description: string; // Optional description or title
  }