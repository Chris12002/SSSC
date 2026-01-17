import sql, { config as dbConfig } from 'mssql';
import { ServerLogonFields, SchemaObject, SchemaObjectType } from '../../shared/types';

class SchemaExtractorService {
  private pool: sql.ConnectionPool | null = null;

  private buildConfig(credentials: ServerLogonFields, database: string): dbConfig {
    return {
      server: credentials.server,
      user: credentials.username,
      password: credentials.password,
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
    };
  }

  public async connect(credentials: ServerLogonFields, database: string): Promise<void> {
    if (this.pool) {
      await this.pool.close();
    }
    const config = this.buildConfig(credentials, database);
    this.pool = await sql.connect(config);
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  private async getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }
    return this.pool;
  }

  public async extractAllObjects(): Promise<SchemaObject[]> {
    const [tables, views, procs, functions, triggers, indexes, sequences, synonyms, userTypes] = await Promise.all([
      this.extractTables(),
      this.extractViews(),
      this.extractStoredProcedures(),
      this.extractFunctions(),
      this.extractTriggers(),
      this.extractIndexes(),
      this.extractSequences(),
      this.extractSynonyms(),
      this.extractUserDefinedTypes(),
    ]);

    return [...tables, ...views, ...procs, ...functions, ...triggers, ...indexes, ...sequences, ...synonyms, ...userTypes];
  }

  public async extractTables(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        t.name AS table_name,
        s.name AS schema_name,
        t.object_id
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
      ORDER BY s.name, t.name
    `);

    const tables: SchemaObject[] = [];
    for (const row of result.recordset) {
      const definition = await this.getTableDefinition(row.schema_name, row.table_name);
      tables.push({
        name: row.table_name,
        schema: row.schema_name,
        type: 'Table',
        definition: definition,
      });
    }
    return tables;
  }

  private async getTableDefinition(schemaName: string, tableName: string): Promise<string> {
    const pool = await this.getPool();
    
    const columnsResult = await pool.request()
      .input('schema', sql.VarChar, schemaName)
      .input('table', sql.VarChar, tableName)
      .query(`
        SELECT 
          c.name AS column_name,
          t.name AS data_type,
          c.max_length,
          c.precision,
          c.scale,
          c.is_nullable,
          c.is_identity,
          c.is_computed,
          cc.definition AS computed_definition,
          cc.is_persisted,
          ISNULL(ic.seed_value, 0) AS seed_value,
          ISNULL(ic.increment_value, 0) AS increment_value,
          d.definition AS default_value,
          d.name AS default_constraint_name,
          c.column_id
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        INNER JOIN sys.tables tbl ON c.object_id = tbl.object_id
        INNER JOIN sys.schemas s ON tbl.schema_id = s.schema_id
        LEFT JOIN sys.identity_columns ic ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        LEFT JOIN sys.default_constraints d ON c.default_object_id = d.object_id
        LEFT JOIN sys.computed_columns cc ON c.object_id = cc.object_id AND c.column_id = cc.column_id
        WHERE s.name = @schema AND tbl.name = @table
        ORDER BY c.column_id
      `);

    const pkResult = await pool.request()
      .input('schema', sql.VarChar, schemaName)
      .input('table', sql.VarChar, tableName)
      .query(`
        SELECT 
          i.name AS constraint_name,
          STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns,
          i.type_desc AS index_type
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        INNER JOIN sys.tables t ON i.object_id = t.object_id
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE i.is_primary_key = 1 AND s.name = @schema AND t.name = @table
        GROUP BY i.name, i.type_desc
      `);

    const fkResult = await pool.request()
      .input('schema', sql.VarChar, schemaName)
      .input('table', sql.VarChar, tableName)
      .query(`
        SELECT 
          fk.name AS constraint_name,
          STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS columns,
          rs.name AS ref_schema,
          rt.name AS ref_table,
          STRING_AGG(rc.name, ', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS ref_columns,
          fk.delete_referential_action_desc AS on_delete,
          fk.update_referential_action_desc AS on_update
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
        INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
        INNER JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
        INNER JOIN sys.columns rc ON fkc.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
        WHERE s.name = @schema AND t.name = @table
        GROUP BY fk.name, rs.name, rt.name, fk.delete_referential_action_desc, fk.update_referential_action_desc
      `);

    // Get CHECK constraints
    const checkResult = await pool.request()
      .input('schema', sql.VarChar, schemaName)
      .input('table', sql.VarChar, tableName)
      .query(`
        SELECT 
          cc.name AS constraint_name,
          cc.definition AS check_definition,
          cc.is_disabled
        FROM sys.check_constraints cc
        INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE s.name = @schema AND t.name = @table
        ORDER BY cc.name
      `);

    // Get UNIQUE constraints
    const uniqueResult = await pool.request()
      .input('schema', sql.VarChar, schemaName)
      .input('table', sql.VarChar, tableName)
      .query(`
        SELECT 
          i.name AS constraint_name,
          STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns,
          i.type_desc AS index_type
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        INNER JOIN sys.tables t ON i.object_id = t.object_id
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE i.is_unique_constraint = 1 AND s.name = @schema AND t.name = @table
        GROUP BY i.name, i.type_desc
      `);

    let definition = `CREATE TABLE [${schemaName}].[${tableName}] (\n`;
    
    const columnDefs: string[] = [];
    for (const col of columnsResult.recordset) {
      let colDef = `  [${col.column_name}]`;
      
      if (col.is_computed) {
        // Computed column
        colDef += ` AS ${col.computed_definition}`;
        if (col.is_persisted) {
          colDef += ' PERSISTED';
        }
      } else {
        colDef += ` ${this.formatDataType(col)}`;
        if (col.is_identity) {
          colDef += ` IDENTITY(${col.seed_value},${col.increment_value})`;
        }
        colDef += col.is_nullable ? ' NULL' : ' NOT NULL';
        if (col.default_value) {
          if (col.default_constraint_name) {
            colDef += ` CONSTRAINT [${col.default_constraint_name}] DEFAULT ${col.default_value}`;
          } else {
            colDef += ` DEFAULT ${col.default_value}`;
          }
        }
      }
      columnDefs.push(colDef);
    }

    // Add PRIMARY KEY constraint
    if (pkResult.recordset.length > 0) {
      const pk = pkResult.recordset[0];
      const pkType = pk.index_type === 'CLUSTERED' ? 'CLUSTERED' : 'NONCLUSTERED';
      columnDefs.push(`  CONSTRAINT [${pk.constraint_name}] PRIMARY KEY ${pkType} (${pk.columns})`);
    }

    // Add UNIQUE constraints
    for (const uq of uniqueResult.recordset) {
      const uqType = uq.index_type === 'CLUSTERED' ? 'CLUSTERED' : 'NONCLUSTERED';
      columnDefs.push(`  CONSTRAINT [${uq.constraint_name}] UNIQUE ${uqType} (${uq.columns})`);
    }

    // Add CHECK constraints
    for (const chk of checkResult.recordset) {
      let chkDef = `  CONSTRAINT [${chk.constraint_name}] CHECK ${chk.check_definition}`;
      if (chk.is_disabled) {
        chkDef = `  -- DISABLED: ${chkDef}`;
      }
      columnDefs.push(chkDef);
    }

    // Add FOREIGN KEY constraints
    for (const fk of fkResult.recordset) {
      let fkDef = `  CONSTRAINT [${fk.constraint_name}] FOREIGN KEY (${fk.columns}) ` +
        `REFERENCES [${fk.ref_schema}].[${fk.ref_table}](${fk.ref_columns})`;
      
      // Add ON DELETE and ON UPDATE actions if not NO_ACTION
      if (fk.on_delete && fk.on_delete !== 'NO_ACTION') {
        fkDef += ` ON DELETE ${fk.on_delete.replace('_', ' ')}`;
      }
      if (fk.on_update && fk.on_update !== 'NO_ACTION') {
        fkDef += ` ON UPDATE ${fk.on_update.replace('_', ' ')}`;
      }
      columnDefs.push(fkDef);
    }

    definition += columnDefs.join(',\n');
    definition += '\n);';

    return definition;
  }

  private formatDataType(col: any): string {
    const typeName = col.data_type.toLowerCase();
    
    switch (typeName) {
      case 'varchar':
      case 'nvarchar':
      case 'char':
      case 'nchar':
      case 'binary':
      case 'varbinary':
        if (col.max_length === -1) {
          return `[${typeName}](MAX)`;
        }
        const length = typeName.startsWith('n') ? col.max_length / 2 : col.max_length;
        return `[${typeName}](${length})`;
      case 'decimal':
      case 'numeric':
        return `[${typeName}](${col.precision},${col.scale})`;
      case 'datetime2':
      case 'datetimeoffset':
      case 'time':
        return `[${typeName}](${col.scale})`;
      default:
        return `[${typeName}]`;
    }
  }

  public async extractViews(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        v.name AS view_name,
        s.name AS schema_name,
        m.definition
      FROM sys.views v
      INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
      INNER JOIN sys.sql_modules m ON v.object_id = m.object_id
      WHERE v.is_ms_shipped = 0
      ORDER BY s.name, v.name
    `);

    return result.recordset.map(row => ({
      name: row.view_name,
      schema: row.schema_name,
      type: 'View' as SchemaObjectType,
      definition: row.definition || '',
    }));
  }

  public async extractStoredProcedures(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        p.name AS proc_name,
        s.name AS schema_name,
        m.definition
      FROM sys.procedures p
      INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
      INNER JOIN sys.sql_modules m ON p.object_id = m.object_id
      WHERE p.is_ms_shipped = 0
      ORDER BY s.name, p.name
    `);

    return result.recordset.map(row => ({
      name: row.proc_name,
      schema: row.schema_name,
      type: 'StoredProcedure' as SchemaObjectType,
      definition: row.definition || '',
    }));
  }

  public async extractFunctions(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        o.name AS func_name,
        s.name AS schema_name,
        m.definition,
        o.type_desc
      FROM sys.objects o
      INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
      INNER JOIN sys.sql_modules m ON o.object_id = m.object_id
      WHERE o.type IN ('FN', 'IF', 'TF', 'AF')
        AND o.is_ms_shipped = 0
      ORDER BY s.name, o.name
    `);

    return result.recordset.map(row => ({
      name: row.func_name,
      schema: row.schema_name,
      type: 'Function' as SchemaObjectType,
      definition: row.definition || '',
    }));
  }

  public async extractTriggers(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        t.name AS trigger_name,
        s.name AS schema_name,
        m.definition
      FROM sys.triggers t
      INNER JOIN sys.sql_modules m ON t.object_id = m.object_id
      LEFT JOIN sys.objects o ON t.parent_id = o.object_id
      LEFT JOIN sys.schemas s ON o.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
        AND t.parent_class = 1
      ORDER BY s.name, t.name
    `);

    return result.recordset.map(row => ({
      name: row.trigger_name,
      schema: row.schema_name || 'dbo',
      type: 'Trigger' as SchemaObjectType,
      definition: row.definition || '',
    }));
  }

  public async extractIndexes(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        i.name AS index_name,
        s.name AS schema_name,
        t.name AS table_name,
        i.type_desc AS index_type,
        i.is_unique,
        i.is_primary_key,
        i.is_unique_constraint,
        i.filter_definition,
        STRING_AGG(
          CASE WHEN ic.is_included_column = 0 
            THEN c.name + CASE WHEN ic.is_descending_key = 1 THEN ' DESC' ELSE ' ASC' END
            ELSE NULL 
          END, 
          ', '
        ) WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns,
        STRING_AGG(
          CASE WHEN ic.is_included_column = 1 THEN c.name ELSE NULL END,
          ', '
        ) WITHIN GROUP (ORDER BY ic.index_column_id) AS included_columns
      FROM sys.indexes i
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE t.is_ms_shipped = 0
        AND i.is_primary_key = 0
        AND i.is_unique_constraint = 0
        AND i.type > 0
        AND i.name IS NOT NULL
      GROUP BY i.name, s.name, t.name, i.type_desc, i.is_unique, i.is_primary_key, 
               i.is_unique_constraint, i.filter_definition
      ORDER BY s.name, t.name, i.name
    `);

    return result.recordset.map(row => {
      let definition = `CREATE`;
      if (row.is_unique) {
        definition += ' UNIQUE';
      }
      definition += ` ${row.index_type} INDEX [${row.index_name}]`;
      definition += `\nON [${row.schema_name}].[${row.table_name}] (${row.key_columns})`;
      
      if (row.included_columns) {
        definition += `\nINCLUDE (${row.included_columns})`;
      }
      
      if (row.filter_definition) {
        definition += `\nWHERE ${row.filter_definition}`;
      }
      
      definition += ';';

      return {
        name: row.index_name,
        schema: row.schema_name,
        type: 'Index' as SchemaObjectType,
        definition: definition,
      };
    });
  }

  /**
   * Execute scripts with optional transaction wrapping
   * @param scripts Array of SQL scripts to execute
   * @param options Execution options
   * @param options.useTransaction Whether to wrap all scripts in a transaction (default: true - industry standard)
   * @param options.stopOnError Whether to stop execution on first error (default: true when using transaction)
   */
  public async executeScripts(
    scripts: string[], 
    options: { useTransaction?: boolean; stopOnError?: boolean } = {}
  ): Promise<{ success: boolean; results: string[]; errors: string[]; rolledBack?: boolean }> {
    const pool = await this.getPool();
    const results: string[] = [];
    const errors: string[] = [];
    
    // Industry standard: transactions enabled by default
    const useTransaction = options.useTransaction !== false;
    const stopOnError = options.stopOnError !== false;
    
    const filteredScripts = scripts.filter(s => s.trim());
    
    if (filteredScripts.length === 0) {
      return { success: true, results: ['No scripts to execute'], errors: [] };
    }

    if (useTransaction) {
      // Transaction-wrapped execution with rollback on failure
      const transaction = new sql.Transaction(pool);
      
      try {
        await transaction.begin();
        results.push('Transaction started');
        
        for (let i = 0; i < filteredScripts.length; i++) {
          const script = filteredScripts[i];
          try {
            const request = new sql.Request(transaction);
            await request.batch(script);
            results.push(`[${i + 1}/${filteredScripts.length}] Successfully executed: ${this.truncateScript(script)}`);
          } catch (err: any) {
            errors.push(`[${i + 1}/${filteredScripts.length}] Error: ${err.message}`);
            
            if (stopOnError) {
              // Rollback the transaction
              try {
                await transaction.rollback();
                results.push('Transaction rolled back due to error');
                return { 
                  success: false, 
                  results, 
                  errors, 
                  rolledBack: true 
                };
              } catch (rollbackErr: any) {
                errors.push(`Rollback failed: ${rollbackErr.message}`);
                return { success: false, results, errors, rolledBack: false };
              }
            }
          }
        }
        
        // All scripts executed successfully (or we continued past errors)
        if (errors.length === 0) {
          await transaction.commit();
          results.push('Transaction committed successfully');
          return { success: true, results, errors };
        } else {
          // We had errors but didn't stop - rollback anyway for safety
          await transaction.rollback();
          results.push('Transaction rolled back due to errors');
          return { success: false, results, errors, rolledBack: true };
        }
        
      } catch (err: any) {
        errors.push(`Transaction error: ${err.message}`);
        try {
          await transaction.rollback();
        } catch (e) {
          // Ignore rollback errors
        }
        return { success: false, results, errors, rolledBack: true };
      }
      
    } else {
      // Non-transactional execution (each script runs independently)
      results.push('Executing without transaction (changes cannot be rolled back)');
      
      for (let i = 0; i < filteredScripts.length; i++) {
        const script = filteredScripts[i];
        try {
          await pool.request().batch(script);
          results.push(`[${i + 1}/${filteredScripts.length}] Successfully executed: ${this.truncateScript(script)}`);
        } catch (err: any) {
          errors.push(`[${i + 1}/${filteredScripts.length}] Error: ${err.message}`);
          
          if (stopOnError) {
            return { success: false, results, errors };
          }
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
      };
    }
  }

  private truncateScript(script: string): string {
    const firstLine = script.split('\n').find(line => line.trim() && !line.trim().startsWith('--')) || script;
    if (firstLine.length > 60) {
      return firstLine.substring(0, 60) + '...';
    }
    return firstLine;
  }

  public async extractSequences(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    
    try {
      const result = await pool.request().query(`
        SELECT 
          seq.name AS sequence_name,
          s.name AS schema_name,
          t.name AS data_type,
          seq.start_value,
          seq.increment,
          seq.minimum_value,
          seq.maximum_value,
          seq.is_cycling,
          seq.cache_size,
          seq.current_value
        FROM sys.sequences seq
        INNER JOIN sys.schemas s ON seq.schema_id = s.schema_id
        INNER JOIN sys.types t ON seq.user_type_id = t.user_type_id
        ORDER BY s.name, seq.name
      `);

      return result.recordset.map(row => {
        let definition = `CREATE SEQUENCE [${row.schema_name}].[${row.sequence_name}]`;
        definition += `\n  AS [${row.data_type}]`;
        definition += `\n  START WITH ${row.start_value}`;
        definition += `\n  INCREMENT BY ${row.increment}`;
        definition += `\n  MINVALUE ${row.minimum_value}`;
        definition += `\n  MAXVALUE ${row.maximum_value}`;
        definition += row.is_cycling ? '\n  CYCLE' : '\n  NO CYCLE';
        if (row.cache_size && row.cache_size > 0) {
          definition += `\n  CACHE ${row.cache_size}`;
        } else {
          definition += '\n  NO CACHE';
        }
        definition += ';';

        return {
          name: row.sequence_name,
          schema: row.schema_name,
          type: 'Sequence' as SchemaObjectType,
          definition: definition,
        };
      });
    } catch (err: any) {
      // Sequences are not supported in older SQL Server versions
      if (err.message.includes('Invalid object name')) {
        return [];
      }
      throw err;
    }
  }

  public async extractSynonyms(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT 
        syn.name AS synonym_name,
        s.name AS schema_name,
        syn.base_object_name
      FROM sys.synonyms syn
      INNER JOIN sys.schemas s ON syn.schema_id = s.schema_id
      ORDER BY s.name, syn.name
    `);

    return result.recordset.map(row => {
      const definition = `CREATE SYNONYM [${row.schema_name}].[${row.synonym_name}]\nFOR ${row.base_object_name};`;

      return {
        name: row.synonym_name,
        schema: row.schema_name,
        type: 'Synonym' as SchemaObjectType,
        definition: definition,
      };
    });
  }

  public async extractUserDefinedTypes(): Promise<SchemaObject[]> {
    const pool = await this.getPool();
    
    // Get both alias types and table types
    const aliasResult = await pool.request().query(`
      SELECT 
        t.name AS type_name,
        s.name AS schema_name,
        bt.name AS base_type,
        t.max_length,
        t.precision,
        t.scale,
        t.is_nullable,
        'ALIAS' AS type_kind
      FROM sys.types t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN sys.types bt ON t.system_type_id = bt.system_type_id AND bt.is_user_defined = 0
      WHERE t.is_user_defined = 1
        AND t.is_table_type = 0
      ORDER BY s.name, t.name
    `);

    const tableTypeResult = await pool.request().query(`
      SELECT 
        tt.name AS type_name,
        s.name AS schema_name,
        tt.type_table_object_id
      FROM sys.table_types tt
      INNER JOIN sys.schemas s ON tt.schema_id = s.schema_id
      ORDER BY s.name, tt.name
    `);

    const objects: SchemaObject[] = [];

    // Process alias types
    for (const row of aliasResult.recordset) {
      let definition = `CREATE TYPE [${row.schema_name}].[${row.type_name}]`;
      definition += `\nFROM ${this.formatBaseType(row)}`;
      definition += row.is_nullable ? ' NULL' : ' NOT NULL';
      definition += ';';

      objects.push({
        name: row.type_name,
        schema: row.schema_name,
        type: 'UserDefinedType' as SchemaObjectType,
        definition: definition,
      });
    }

    // Process table types
    for (const row of tableTypeResult.recordset) {
      const columnsResult = await pool.request()
        .input('objectId', sql.Int, row.type_table_object_id)
        .query(`
          SELECT 
            c.name AS column_name,
            t.name AS data_type,
            c.max_length,
            c.precision,
            c.scale,
            c.is_nullable,
            c.column_id
          FROM sys.columns c
          INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
          WHERE c.object_id = @objectId
          ORDER BY c.column_id
        `);

      let definition = `CREATE TYPE [${row.schema_name}].[${row.type_name}] AS TABLE (`;
      
      const columnDefs: string[] = [];
      for (const col of columnsResult.recordset) {
        let colDef = `\n  [${col.column_name}] ${this.formatDataType(col)}`;
        colDef += col.is_nullable ? ' NULL' : ' NOT NULL';
        columnDefs.push(colDef);
      }
      
      definition += columnDefs.join(',');
      definition += '\n);';

      objects.push({
        name: row.type_name,
        schema: row.schema_name,
        type: 'UserDefinedType' as SchemaObjectType,
        definition: definition,
      });
    }

    return objects;
  }

  private formatBaseType(col: any): string {
    const typeName = col.base_type.toLowerCase();
    
    switch (typeName) {
      case 'varchar':
      case 'nvarchar':
      case 'char':
      case 'nchar':
      case 'binary':
      case 'varbinary':
        if (col.max_length === -1) {
          return `[${typeName}](MAX)`;
        }
        const length = typeName.startsWith('n') ? col.max_length / 2 : col.max_length;
        return `[${typeName}](${length})`;
      case 'decimal':
      case 'numeric':
        return `[${typeName}](${col.precision},${col.scale})`;
      case 'datetime2':
      case 'datetimeoffset':
      case 'time':
        return `[${typeName}](${col.scale})`;
      default:
        return `[${typeName}]`;
    }
  }
}

export default SchemaExtractorService;
