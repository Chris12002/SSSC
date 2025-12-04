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

  private extractColumnNames(definition: string): Set<string> {
    const columns = new Set<string>();
    const columnRegex = /\[(\w+)\]\s+\[(?:varchar|nvarchar|int|bigint|datetime|bit|decimal|numeric|float|money|text|ntext|char|nchar|uniqueidentifier|date|time|datetime2)/gi;
    let match;
    while ((match = columnRegex.exec(definition)) !== null) {
      columns.add(match[1].toLowerCase());
    }
    return columns;
  }

  private detectDataTypeChange(sourceObj: SchemaObject | null, targetObj: SchemaObject | null): boolean {
    if (!sourceObj || !targetObj) return false;
    return false;
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
      
      return definition;
    }

    return '';
  }

  private convertToCreateOrAlter(definition: string, objectType: SchemaObjectType): string {
    const keyword = this.getCreateKeyword(objectType);
    const createRegex = new RegExp(`CREATE\\s+${keyword}`, 'i');
    const createOrAlterRegex = new RegExp(`CREATE\\s+OR\\s+ALTER\\s+${keyword}`, 'i');
    
    if (createOrAlterRegex.test(definition)) {
      return definition;
    }
    
    return definition.replace(createRegex, `CREATE OR ALTER ${keyword}`);
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

  private getDropKeyword(objectType: SchemaObjectType): string {
    switch (objectType) {
      case 'StoredProcedure': return 'PROCEDURE';
      case 'Function': return 'FUNCTION';
      case 'View': return 'VIEW';
      case 'Trigger': return 'TRIGGER';
      case 'Table': return 'TABLE';
      default: return objectType.toUpperCase();
    }
  }

  private generateTableAlterScript(sourceObj: SchemaObject, targetObj: SchemaObject): string {
    const sourceColumns = this.extractColumnNames(sourceObj.definition);
    const targetColumns = this.extractColumnNames(targetObj.definition);
    
    const scripts: string[] = [];
    scripts.push(`-- Table modification: [${sourceObj.schema}].[${sourceObj.name}]`);
    
    for (const col of sourceColumns) {
      if (!targetColumns.has(col)) {
        scripts.push(`-- New column detected, manual ALTER TABLE ADD required`);
        break;
      }
    }
    
    for (const col of targetColumns) {
      if (!sourceColumns.has(col)) {
        scripts.push(`-- WARNING: Column removal detected - manual review required`);
        scripts.push(`-- ALTER TABLE [${targetObj.schema}].[${targetObj.name}] DROP COLUMN [${col}];`);
      }
    }
    
    if (scripts.length === 1) {
      scripts.push(`-- Definition changes detected - manual review recommended`);
    }
    
    return scripts.join('\n');
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
