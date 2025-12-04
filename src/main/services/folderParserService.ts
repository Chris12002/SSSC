import * as fs from 'fs';
import * as path from 'path';
import { SchemaObject, SchemaObjectType } from '../../shared/types';

class FolderParserService {
  public async parseFolder(folderPath: string): Promise<SchemaObject[]> {
    const objects: SchemaObject[] = [];
    
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    await this.parseDirectory(folderPath, objects);
    return objects;
  }

  private async parseDirectory(dirPath: string, objects: SchemaObject[]): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.parseDirectory(fullPath, objects);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
        const parsed = await this.parseFile(fullPath);
        if (parsed) {
          objects.push(parsed);
        }
      }
    }
  }

  private async parseFile(filePath: string): Promise<SchemaObject | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.sql');
    
    const objectInfo = this.detectObjectType(content, fileName);
    if (!objectInfo) {
      return null;
    }

    return {
      name: objectInfo.name,
      schema: objectInfo.schema,
      type: objectInfo.type,
      definition: content.trim(),
    };
  }

  private detectObjectType(content: string, fileName: string): { name: string; schema: string; type: SchemaObjectType } | null {
    const normalizedContent = content.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    
    const patterns: { regex: RegExp; type: SchemaObjectType }[] = [
      { regex: /CREATE\s+(?:OR\s+ALTER\s+)?PROCEDURE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'StoredProcedure' },
      { regex: /CREATE\s+(?:OR\s+ALTER\s+)?PROC\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'StoredProcedure' },
      { regex: /CREATE\s+(?:OR\s+ALTER\s+)?FUNCTION\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'Function' },
      { regex: /CREATE\s+(?:OR\s+ALTER\s+)?VIEW\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'View' },
      { regex: /CREATE\s+(?:OR\s+ALTER\s+)?TRIGGER\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'Trigger' },
      { regex: /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'Table' },
      { regex: /ALTER\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i, type: 'Table' },
    ];

    for (const { regex, type } of patterns) {
      const match = normalizedContent.match(regex);
      if (match) {
        const schema = match[1] || 'dbo';
        const name = match[2] || fileName;
        return { name, schema, type };
      }
    }

    const dirHint = this.inferTypeFromPath(fileName);
    if (dirHint) {
      return { name: fileName, schema: 'dbo', type: dirHint };
    }

    return null;
  }

  private inferTypeFromPath(fileName: string): SchemaObjectType | null {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('_sp') || lowerName.startsWith('sp_') || lowerName.startsWith('usp_')) {
      return 'StoredProcedure';
    }
    if (lowerName.includes('_fn') || lowerName.startsWith('fn_') || lowerName.startsWith('ufn_')) {
      return 'Function';
    }
    if (lowerName.includes('_vw') || lowerName.startsWith('vw_') || lowerName.startsWith('v_')) {
      return 'View';
    }
    if (lowerName.includes('_tr') || lowerName.startsWith('tr_')) {
      return 'Trigger';
    }
    if (lowerName.includes('_tbl') || lowerName.startsWith('tbl_')) {
      return 'Table';
    }
    
    return null;
  }
}

export default FolderParserService;
