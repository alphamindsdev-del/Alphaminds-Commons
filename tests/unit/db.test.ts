import { describe, it, expect } from 'vitest';
import {
  encodeCursor,
  decodeCursor,
  paginatedQuery,
} from '../../workers/api/src/lib/db.js';

describe('db utilities', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('encodes and decodes offset', () => {
      const cursor = encodeCursor(20);
      expect(typeof cursor).toBe('string');
      expect(decodeCursor(cursor)).toEqual({ offset: 20 });
    });

    it('handles offset 0', () => {
      const cursor = encodeCursor(0);
      expect(decodeCursor(cursor)).toEqual({ offset: 0 });
    });

    it('decodeCursor returns { offset: 0 } for invalid cursor', () => {
      expect(decodeCursor('not-valid-base64!!')).toEqual({ offset: 0 });
      expect(decodeCursor('')).toEqual({ offset: 0 });
    });
  });

  describe('paginatedQuery', () => {
    function createMockDb(results: any[], extraItems: number = 0) {
      const allResults = [...results];
      for (let i = 0; i < extraItems; i++) {
        allResults.push({ id: `extra-${i}` });
      }
      return {
        prepare: () => ({
          bind: (..._args: any[]) => ({
            all: async <T>() => ({ results: allResults as T[] }),
          }),
        }),
      } as any;
    }

    it('returns data and pagination with has_more=false when fewer than limit', async () => {
      const db = createMockDb([{ id: '1' }, { id: '2' }]);
      const result = await paginatedQuery(db, 'SELECT * FROM test', [], undefined, 20);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.has_more).toBe(false);
      expect(result.pagination.next_cursor).toBeNull();
      expect(result.pagination.limit).toBe(20);
    });

    it('returns has_more=true when results exceed limit', async () => {
      const db = createMockDb([{ id: '1' }], 1);
      const result = await paginatedQuery(db, 'SELECT * FROM test', [], undefined, 1);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.has_more).toBe(true);
      expect(result.pagination.next_cursor).not.toBeNull();
    });

    it('accepts cursor for offset', async () => {
      const db = createMockDb([{ id: '10' }]);
      const cursor = encodeCursor(10);
      const result = await paginatedQuery(db, 'SELECT * FROM test', [], cursor, 20);
      expect(result.data).toHaveLength(1);
    });

    it('defaults limit to 20', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: String(i) }));
      const db = createMockDb(items);
      const result = await paginatedQuery(db, 'SELECT * FROM test', []);
      expect(result.pagination.limit).toBe(20);
      expect(result.data).toHaveLength(15);
    });
  });
});
