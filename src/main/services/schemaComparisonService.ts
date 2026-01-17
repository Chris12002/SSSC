import crypto from 'crypto';
import { 
  SchemaObject, 
  SchemaChange, 
  SchemaObjectType, 
  ChangeRiskLevel, 
  ComparisonResult,
  SchemaSource 
} from '../../shared/types';
import SchemaExtractorService from './schemaExtractorService';
import FolderParserService from './folderParserService';

class SchemaComparisonService {
  private schemaExtractor: SchemaExtractorService;
  private folderParser: FolderParserService;

  constructor() {
    this.schemaExtractor = new SchemaExtractorService();
    this.folderParser = new FolderParserService();
  }

  public async compare(source: SchemaSource, target: SchemaSource): Promise<ComparisonResult> {
    const [sourceObjects, targetObjects] = await Promise.all([
      this.extractObjects(source),
      this.extractObjects(target),
    ]);

    const changes = this.compareObjects(sourceObjects, targetObjects);

    return {
      source,
      target,
      changes,
      timestamp: new Date(),
    };
  }

  private async extractObjects(source: SchemaSource): Promise<SchemaObject[]> {
    if (source.type === 'database') {
      if (!source.credentials || !source.database) {
        throw new Error('Database source requires credentials and database name');
      }
      try {
        await this.schemaExtractor.connect(source.credentials, source.database);
        return await this.schemaExtractor.extractAllObjects();
      } finally {
        await this.schemaExtractor.disconnect();
      }
    } else if (source.type === 'folder') {
      if (!source.folderPath) {
        throw new Error('Folder source requires folder path');
      }
      return await this.folderParser.parseFolder(source.folderPath);
    }
    throw new Error(`Unknown source type: ${source.type}`);
  }

  private compareObjects(sourceObjects: SchemaObject[], targetObjects: SchemaObject[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const sourceMap = this.buildObjectMap(sourceObjects);
    const targetMap = this.buildObjectMap(targetObjects);

    for (const [key, sourceObj] of sourceMap) {
      const targetObj = targetMap.get(key);
      
      if (!targetObj) {
        changes.push(this.createChange(sourceObj, null, 'added'));
      } else {
        const sourceHash = this.hashDefinition(sourceObj.definition);
        const targetHash = this.hashDefinition(targetObj.definition);
        
        if (sourceHash !== targetHash) {
          changes.push(this.createChange(sourceObj, targetObj, 'modified'));
        }
        targetMap.delete(key);
      }
    }

    for (const [, targetObj] of targetMap) {
      changes.push(this.createChange(null, targetObj, 'removed'));
    }

    return changes.sort((a, b) => {
      const riskOrder = { destructive: 0, warning: 1, safe: 2 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return a.objectName.localeCompare(b.objectName);
    });
  }

  private buildObjectMap(objects: SchemaObject[]): Map<string, SchemaObject> {
    const map = new Map<string, SchemaObject>();
    for (const obj of objects) {
      const key = `${obj.schema}.${obj.name}`.toLowerCase();
      map.set(key, obj);
    }
    return map;
  }

  private hashDefinition(definition: string): string {
    const normalized = definition
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  private createChange(
    sourceObj: SchemaObject | null, 
    targetObj: SchemaObject | null, 
    changeType: 'added' | 'removed' | 'modified'
  ): SchemaChange {
    const obj = sourceObj || targetObj!;
    const riskLevel = this.assessRisk(obj.type, changeType, sourceObj, targetObj);
    const script = this.generateScript(obj.type, changeType, sourceObj, targetObj, riskLevel);
    const warningMessage = this.getWarningMessage(obj.type, changeType, riskLevel);

    return {
      objectName: `${obj.schema}.${obj.name}`,
      objectType: obj.type,
      changeType,
      riskLevel,
      sourceDefinition: sourceObj?.definition,
      targetDefinition: targetObj?.definition,
      script,
      warningMessage,
    };
  }

  private assessRisk(
    objectType: SchemaObjectType, 
    changeType: 'added' | 'removed' | 'modified',
    sourceObj: SchemaObject | null,
    targetObj: SchemaObject | null
  ): ChangeRiskLevel {
    if (objectType === 'Table') {
      if (changeType === 'removed') {
        return 'destructive';
      }
      if (changeType === 'modified') {
        const hasColumnRemoval = this.detectColumnRemoval(sourceObj, targetObj);
        if (hasColumnRemoval) {
          return 'destructive';
        }
        const hasDataTypeChange = this.detectDataTypeChange(sourceObj, targetObj);
        if (hasDataTypeChange) {
          return 'warning';
        }
      }
      return 'safe';
    }

    if (['StoredProcedure', 'Function', 'View', 'Trigger'].includes(objectType)) {
      if (changeType === 'removed') {
        return 'warning';
      }
      return 'safe';
    }

    // Indexes are generally safe to add/modify/remove
    if (objectType === 'Index') {
      if (changeType === 'removed') {
        return 'warning'; // Removing an index might affect query performance
      }
      return 'safe';
    }

    return changeType === 'removed' ? 'warning' : 'safe';
  }

  private detectColumnRemoval(sourceObj: SchemaObject | null, targetObj: SchemaObject | null): boolean {
    if (!sourceObj || !targetObj) return false;
    
    const sourceColumns = this.extractColumnNames(sourceObj.definition);
    const targetColumns = this.extractColumnNames(targetObj.definition);
    
    for (const col of targetColumns) {
      if (!sourceColumns.has(col)) {
        return true;
      }
    }
    return false;
  }

  private detectColumnAddition(sourceObj: SchemaObject | null, targetObj: SchemaObject | null): Set<string> {
    const newColumns = new Set<string>();
    if (!sourceObj || !targetObj) return newColumns;
    
    const sourceColumns = this.extractColumnNames(sourceObj.definition);
    const targetColumns = this.extractColumnNames(targetObj.definition);
    
    for (const col of sourceColumns) {
      if (!targetColumns.has(col)) {
        newColumns.add(col);
      }
    }
    return newColumns;
  }

  private extractColumnNames(definition: string): Set<string> {
    const columns = new Set<string>();
    const columnRegex = /\[(\w+)\]\s+\[(?:varchar|nvarchar|int|bigint|datetime|bit|decimal|numeric|float|money|text|ntext|char|nchar|uniqueidentifier|date|time|datetime2|smallint|tinyint|real|smallmoney|smalldatetime|image|xml|varbinary|binary|timestamp|rowversion|sql_variant|geography|geometry|hierarchyid)/gi;
    let match;
    while ((match = columnRegex.exec(definition)) !== null) {
      columns.add(match[1].toLowerCase());
    }
    return columns;
  }

  /**
   * Extracts column definitions with their full type information
   * Returns a Map of column name -> full type definition string
   */
  private extractColumnDefinitions(definition: string): Map<string, string> {
    const columns = new Map<string, string>();
    // Match column name followed by type with optional size/precision, nullability, identity, and default
    const columnRegex = /\[(\w+)\]\s+(\[[^\]]+\](?:\([^)]*\))?)\s*(IDENTITY\([^)]+\))?\s*(NULL|NOT NULL)?/gi;
    let match;
    while ((match = columnRegex.exec(definition)) !== null) {
      const columnName = match[1].toLowerCase();
      const dataType = match[2].toLowerCase();
      const identity = match[3] ? match[3].toLowerCase() : '';
      const nullability = match[4] ? match[4].toLowerCase() : '';
      // Normalize the type definition
      const fullDef = `${dataType}${identity ? ' ' + identity : ''}${nullability ? ' ' + nullability : ''}`.trim();
      columns.set(columnName, fullDef);
    }
    return columns;
  }

  private detectDataTypeChange(sourceObj: SchemaObject | null, targetObj: SchemaObject | null): boolean {
    if (!sourceObj || !targetObj) return false;
    
    const sourceColumns = this.extractColumnDefinitions(sourceObj.definition);
    const targetColumns = this.extractColumnDefinitions(targetObj.definition);
    
    // Check for datatype changes in columns that exist in both
    for (const [colName, sourceType] of sourceColumns) {
      const targetType = targetColumns.get(colName);
      if (targetType && sourceType !== targetType) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets detailed information about what changed in table columns
   */
  private getColumnChanges(sourceObj: SchemaObject, targetObj: SchemaObject): {
    added: string[];
    removed: string[];
    modified: Array<{ column: string; from: string; to: string }>;
  } {
    const sourceColumns = this.extractColumnDefinitions(sourceObj.definition);
    const targetColumns = this.extractColumnDefinitions(targetObj.definition);
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: Array<{ column: string; from: string; to: string }> = [];
    
    // Find added and modified columns
    for (const [colName, sourceType] of sourceColumns) {
      const targetType = targetColumns.get(colName);
      if (!targetType) {
        added.push(colName);
      } else if (sourceType !== targetType) {
        modified.push({ column: colName, from: targetType, to: sourceType });
      }
    }
    
    // Find removed columns
    for (const colName of targetColumns.keys()) {
      if (!sourceColumns.has(colName)) {
        removed.push(colName);
      }
    }
    
    return { added, removed, modified };
  }

  private generateScript(
    objectType: SchemaObjectType,
    changeType: 'added' | 'removed' | 'modified',
    sourceObj: SchemaObject | null,
    targetObj: SchemaObject | null,
    riskLevel: ChangeRiskLevel
  ): string {
    if (riskLevel === 'destructive') {
      return `-- BLOCKED: This change is destructive and cannot be auto-applied\n-- Manual review required\n-- ${changeType.toUpperCase()}: ${(sourceObj || targetObj)?.schema}.${(sourceObj || targetObj)?.name}`;
    }

    if (changeType === 'removed') {
      if (objectType === 'Table') {
        return `-- WARNING: DROP TABLE is blocked\n-- DROP TABLE [${targetObj!.schema}].[${targetObj!.name}];`;
      }
      if (objectType === 'Index') {
        // For indexes, we need to extract the table name from the definition
        const tableMatch = targetObj!.definition.match(/ON\s+\[([^\]]+)\]\.\[([^\]]+)\]/i);
        if (tableMatch) {
          return `DROP INDEX [${targetObj!.name}] ON [${tableMatch[1]}].[${tableMatch[2]}];`;
        }
        return `-- Unable to generate DROP INDEX statement - table name not found`;
      }
      const dropType = this.getDropKeyword(objectType);
      return `DROP ${dropType} IF EXISTS [${targetObj!.schema}].[${targetObj!.name}];`;
    }

    if (changeType === 'added' || changeType === 'modified') {
      const definition = sourceObj!.definition;
      
      if (['StoredProcedure', 'Function', 'View', 'Trigger'].includes(objectType)) {
        return this.convertToCreateOrAlter(definition, objectType);
      }
      
      if (objectType === 'Table') {
        if (changeType === 'added') {
          return definition;
        }
        return this.generateTableAlterScript(sourceObj!, targetObj!);
      }
      
      if (objectType === 'Index') {
        if (changeType === 'modified') {
          // For modified indexes, drop and recreate
          const tableMatch = targetObj!.definition.match(/ON\s+\[([^\]]+)\]\.\[([^\]]+)\]/i);
          if (tableMatch) {
            return `-- Recreating modified index\nDROP INDEX IF EXISTS [${targetObj!.name}] ON [${tableMatch[1]}].[${tableMatch[2]}];\nGO\n${definition}`;
          }
        }
        return definition;
      }
      
      return definition;
    }

    return '';
  }

  private convertToCreateOrAlter(definition: string, objectType: SchemaObjectType): string {
    const keyword = this.getCreateKeyword(objectType);
    const replaceKeyword = this.getReplaceKeyword(objectType);
    const createRegex = new RegExp(`CREATE\\s+${keyword}`, 'gi');
    const createOrAlterRegex = new RegExp(`CREATE\\s+OR\\s+ALTER\\s+${keyword}`, 'gi');
    
    if (createOrAlterRegex.test(definition)) {
      return definition;
    }
    
    return definition.replace(createRegex, `CREATE OR ALTER ${replaceKeyword}`);
  }

  private getCreateKeyword(objectType: SchemaObjectType): string {
    switch (objectType) {
      case 'StoredProcedure': return 'PROC(?:EDURE)?';
      case 'Function': return 'FUNCTION';
      case 'View': return 'VIEW';
      case 'Trigger': return 'TRIGGER';
      default: return objectType.toUpperCase();
    }
  }

  private getReplaceKeyword(objectType: SchemaObjectType): string {
    switch (objectType) {
      case 'StoredProcedure': return 'PROCEDURE';
      case 'Function': return 'FUNCTION';
      case 'View': return 'VIEW';
      case 'Trigger': return 'TRIGGER';
      default: return objectType.toUpperCase();
    }
  }

  private getDropKeyword(objectType: SchemaObjectType): string {
    switch (objectType) {
      case 'StoredProcedure': return 'PROCEDURE';
      case 'Function': return 'FUNCTION';
      case 'View': return 'VIEW';
      case 'Trigger': return 'TRIGGER';
      case 'Table': return 'TABLE';
      case 'Index': return 'INDEX';
      default: return objectType.toUpperCase();
    }
  }

  private generateTableAlterScript(sourceObj: SchemaObject, targetObj: SchemaObject): string {
    const changes = this.getColumnChanges(sourceObj, targetObj);
    const sourceColDefs = this.extractColumnDefinitions(sourceObj.definition);
    
    const scripts: string[] = [];
    scripts.push(`-- Table modification: [${sourceObj.schema}].[${sourceObj.name}]`);
    scripts.push(`-- Generated at: ${new Date().toISOString()}`);
    scripts.push('');
    
    // Handle added columns
    if (changes.added.length > 0) {
      scripts.push('-- New columns to add:');
      for (const col of changes.added) {
        const colDef = sourceColDefs.get(col);
        if (colDef) {
          // Parse the column definition to build proper ALTER TABLE ADD
          scripts.push(`ALTER TABLE [${sourceObj.schema}].[${sourceObj.name}] ADD [${col}] ${colDef};`);
        }
      }
      scripts.push('');
    }
    
    // Handle modified columns (datatype changes)
    if (changes.modified.length > 0) {
      scripts.push('-- Column datatype changes (review carefully - may cause data loss):');
      for (const mod of changes.modified) {
        scripts.push(`-- Column [${mod.column}]: ${mod.from} -> ${mod.to}`);
        const newDef = sourceColDefs.get(mod.column);
        if (newDef) {
          // Extract just the datatype part for ALTER COLUMN
          const typeMatch = newDef.match(/^(\[[^\]]+\](?:\([^)]*\))?)/);
          const nullMatch = newDef.match(/(NULL|NOT NULL)/i);
          if (typeMatch) {
            const alterType = typeMatch[1];
            const nullability = nullMatch ? nullMatch[1].toUpperCase() : 'NULL';
            scripts.push(`ALTER TABLE [${sourceObj.schema}].[${sourceObj.name}] ALTER COLUMN [${mod.column}] ${alterType} ${nullability};`);
          }
        }
      }
      scripts.push('');
    }
    
    // Handle removed columns (commented out - destructive)
    if (changes.removed.length > 0) {
      scripts.push('-- WARNING: Column removal detected - manual review required');
      scripts.push('-- The following DROP COLUMN statements are commented for safety:');
      for (const col of changes.removed) {
        scripts.push(`-- ALTER TABLE [${targetObj.schema}].[${targetObj.name}] DROP COLUMN [${col}];`);
      }
      scripts.push('');
    }
    
    // Check for constraint changes
    const constraintChanges = this.detectConstraintChanges(sourceObj, targetObj);
    if (constraintChanges.length > 0) {
      scripts.push('-- Constraint changes detected:');
      scripts.push(...constraintChanges);
      scripts.push('');
    }
    
    if (scripts.length <= 3) {
      scripts.push('-- Other definition changes detected - manual review recommended');
    }
    
    return scripts.join('\n');
  }

  /**
   * Detects changes in constraints (PRIMARY KEY, FOREIGN KEY) between source and target
   */
  private detectConstraintChanges(sourceObj: SchemaObject, targetObj: SchemaObject): string[] {
    const scripts: string[] = [];
    
    // Extract constraints from definitions
    const sourceConstraints = this.extractConstraints(sourceObj.definition);
    const targetConstraints = this.extractConstraints(targetObj.definition);
    
    // Find added constraints
    for (const [name, def] of sourceConstraints) {
      if (!targetConstraints.has(name)) {
        scripts.push(`-- New constraint: ${name}`);
        scripts.push(`-- ${def}`);
      } else if (targetConstraints.get(name) !== def) {
        scripts.push(`-- Modified constraint: ${name}`);
        scripts.push(`-- From: ${targetConstraints.get(name)}`);
        scripts.push(`-- To: ${def}`);
      }
    }
    
    // Find removed constraints
    for (const [name, def] of targetConstraints) {
      if (!sourceConstraints.has(name)) {
        scripts.push(`-- Removed constraint: ${name}`);
        scripts.push(`-- ${def}`);
      }
    }
    
    return scripts;
  }

  /**
   * Extracts constraint definitions from a CREATE TABLE statement
   */
  private extractConstraints(definition: string): Map<string, string> {
    const constraints = new Map<string, string>();
    
    // Match CONSTRAINT definitions
    const constraintRegex = /CONSTRAINT\s+\[([^\]]+)\]\s+(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\s*([^,\n]+)/gi;
    let match;
    while ((match = constraintRegex.exec(definition)) !== null) {
      const name = match[1].toLowerCase();
      const fullDef = match[0].trim();
      constraints.set(name, fullDef);
    }
    
    return constraints;
  }

  private getWarningMessage(
    objectType: SchemaObjectType, 
    changeType: 'added' | 'removed' | 'modified',
    riskLevel: ChangeRiskLevel
  ): string | undefined {
    if (riskLevel === 'destructive') {
      if (objectType === 'Table' && changeType === 'removed') {
        return 'Dropping a table will permanently delete all data. This action cannot be automatically applied.';
      }
      if (objectType === 'Table' && changeType === 'modified') {
        return 'This change involves removing columns which may result in data loss.';
      }
    }
    
    if (riskLevel === 'warning') {
      if (changeType === 'removed') {
        return `Removing this ${objectType} may break dependent objects.`;
      }
      if (objectType === 'Table') {
        return 'Table modifications may affect data integrity. Review carefully before applying.';
      }
    }
    
    return undefined;
  }
}

export default SchemaComparisonService;
