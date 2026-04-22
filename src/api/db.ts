import Database from '@tauri-apps/plugin-sql';

const DB_URL = 'sqlite:todo.db';

let instancePromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!instancePromise) {
    instancePromise = Database.load(DB_URL);
  }
  return instancePromise;
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export async function exec(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.execute(sql, params);
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
