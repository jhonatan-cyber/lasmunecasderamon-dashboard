'use client';

import logger from './logger';

const DB_NAME = 'dashboard_cache';
// ⚠️ Increment DB_VERSION when changing the schema (store structure/indexes).
// Failure to increment will cause schema changes to be ignored on existing clients.
const DB_VERSION = 1;
const STORE_NAME = 'api_responses';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('ttl', 'ttl', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.timestamp + entry.ttl;
}

export const indexedDBCache = {
  async get<T>(key: string): Promise<{ data: T; etag?: string } | null> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;
          if (!entry) {
            resolve(null);
            return;
          }

          if (isExpired(entry)) {
            // Delete expired entry silently
            indexedDBCache.remove(key).catch(() => {});
            resolve(null);
            return;
          }

          resolve({ data: entry.data, etag: entry.etag });
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.oncomplete = () => db.close();
      });
    } catch (error) {
      logger.debug('[IndexedDB] get error', { key, error });
      return null;
    }
  },

  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL_MS, etag?: string): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        etag,
      };

      store.put(entry);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    } catch (error) {
      logger.debug('[IndexedDB] set error', { key, error });
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    } catch {
      // Silently fail
    }
  },

  async clear(pattern?: string): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      if (!pattern) {
        store.clear();
      } else {
        // Delete keys matching pattern
        const request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const key = cursor.key as string;
            if (key.startsWith(pattern)) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      }

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    } catch {
      // Silently fail
    }
  },

  async getStats(): Promise<{ size: number; entries: number }> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();
      const allRequest = store.getAll();

      return new Promise((resolve) => {
        countRequest.onsuccess = () => {
          allRequest.onsuccess = () => {
            const entries = allRequest.result || [];
            const size = JSON.stringify(entries).length;
            db.close();
            resolve({ size, entries: countRequest.result });
          };
          allRequest.onerror = () => {
            db.close();
            resolve({ size: 0, entries: countRequest.result });
          };
        };
        countRequest.onerror = () => {
          db.close();
          resolve({ size: 0, entries: 0 });
        };
      });
    } catch {
      return { size: 0, entries: 0 };
    }
  },

  async prune(): Promise<number> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      let pruned = 0;

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const entry = cursor.value as CacheEntry;
            if (isExpired(entry)) {
              cursor.delete();
              pruned++;
            }
            cursor.continue();
          } else {
            // Cursor done
            resolve(pruned);
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch {
      return 0;
    }
  },
};
