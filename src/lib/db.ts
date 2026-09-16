import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

const globalForPg = globalThis as unknown as { pool?: Pool };
export const pool = globalForPg.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}
