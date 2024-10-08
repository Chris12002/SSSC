import sql from 'mssql';
import Store from 'electron-store';

const store = new Store({
  encryptionKey: 'your-unique-encryption-key',
});

interface Snapshot {
  ChangeControlID: number;
  ChangeDateTime: Date;
}

interface SnapshotContent {
  ObjectReference: string;
}

const dbConfig = store.get('dbConfig') as sql.config;

export async function getProcedures(): Promise<string[]> {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query('SELECT DISTINCT ObjectName FROM ChangeControl WITH (NOLOCK)');
    return result.recordset.map((row) => row.ObjectName);
  } catch (err: any) {
    const errorMessage = `Database Error: ${err.message.split('\n')[0]}`;
    // Throw a new error with the concise message
    throw new Error(errorMessage);
  }
}

export async function getSnapshots(procName: string): Promise<Snapshot[]> {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('ProcFunctionName', sql.VarChar, procName)
      .query(
        'SELECT ChangeControlID, ChangeDateTime FROM ChangeControl WITH (NOLOCK) WHERE ObjectName = @ProcFunctionName ORDER BY ChangeDateTime DESC',
      );
    return result.recordset;
  } catch (err) {
    console.error('Database Error:', err);
    return [];
  }
}

export async function getSnapshotContent(snapshotId: number): Promise<SnapshotContent | null> {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input('ChangeControlID', sql.Int, snapshotId)
      .query('SELECT ObjectReference FROM ChangeControl WHERE ChangeControlID = @ChangeControlID');
    return result.recordset[0] || null;
  } catch (err) {
    console.error('Database Error:', err);
    return null;
  }
}
