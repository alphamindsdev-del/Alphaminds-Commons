export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
    limit: number;
  };
}

export function encodeCursor(offset: number): string {
  return btoa(JSON.stringify({ offset }));
}

export function decodeCursor(cursor: string): { offset: number } {
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return { offset: 0 };
  }
}

export async function paginatedQuery<T>(
  db: D1Database,
  query: string,
  params: any[],
  cursor?: string,
  limit: number = 20
): Promise<PaginatedResponse<T>> {
  const { offset } = cursor ? decodeCursor(cursor) : { offset: 0 };
  const results = await db
    .prepare(`${query} LIMIT ? OFFSET ?`)
    .bind(...params, limit + 1, offset)
    .all<T>();
  const hasMore = results.results.length > limit;
  const data = (hasMore ? results.results.slice(0, limit) : results.results) as T[];
  const nextOffset = offset + data.length;
  return {
    data,
    pagination: {
      next_cursor: hasMore ? encodeCursor(nextOffset) : null,
      has_more: hasMore,
      limit,
    },
  };
}

export async function isEmailTaken(db: D1Database, email: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM members WHERE email = ? AND deleted_at IS NULL')
    .bind(email)
    .first();
  return row !== null;
}

export async function isUsernameTaken(db: D1Database, username: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM members WHERE username = ? AND deleted_at IS NULL')
    .bind(username)
    .first();
  return row !== null;
}
