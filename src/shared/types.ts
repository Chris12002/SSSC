export interface ServerLogonFields {
    server: string;
    username: string;
    password?: string;
    credentialId?: string;
    sourceId?: string;
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
    id: string;
    content: string;
    description: string;
  }

  export type SchemaSourceType = 'database' | 'folder';

  export interface SchemaSource {
    type: SchemaSourceType;
    name: string;
    database?: string;
    server?: string;
    folderPath?: string;
    credentials?: ServerLogonFields;
  }

  export type SchemaObjectType = 
    | 'Table'
    | 'View'
    | 'StoredProcedure'
    | 'Function'
    | 'Trigger'
    | 'Index'
    | 'Constraint'
    | 'Type'
    | 'Schema'
    | 'Sequence'
    | 'Synonym'
    | 'UserDefinedType';

  export type ChangeRiskLevel = 'safe' | 'warning' | 'destructive';

  export interface SchemaObject {
    name: string;
    schema: string;
    type: SchemaObjectType;
    definition: string;
    hash?: string;
  }

  export interface SchemaChange {
    objectName: string;
    objectType: SchemaObjectType;
    changeType: 'added' | 'removed' | 'modified';
    riskLevel: ChangeRiskLevel;
    sourceDefinition?: string;
    targetDefinition?: string;
    script?: string;
    warningMessage?: string;
  }

  export interface ComparisonResult {
    source: SchemaSource;
    target: SchemaSource;
    changes: SchemaChange[];
    timestamp: Date;
  }