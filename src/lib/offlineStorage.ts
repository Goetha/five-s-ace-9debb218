// IndexedDB service for offline storage and sync

const DB_NAME = '5s-manager-offline';
const DB_VERSION = 1;

interface PendingSync {
  id: string;
  type: 'create' | 'update';
  table: string;
  data: any;
  createdAt: string;
}

let db: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for pending sync operations
      if (!database.objectStoreNames.contains('pendingSync')) {
        const syncStore = database.createObjectStore('pendingSync', { keyPath: 'id' });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Cache for audits
      if (!database.objectStoreNames.contains('audits')) {
        database.createObjectStore('audits', { keyPath: 'id' });
      }

      // Cache for audit items
      if (!database.objectStoreNames.contains('auditItems')) {
        const itemsStore = database.createObjectStore('auditItems', { keyPath: 'id' });
        itemsStore.createIndex('auditId', 'audit_id', { unique: false });
      }

      // Cache for criteria
      if (!database.objectStoreNames.contains('criteria')) {
        database.createObjectStore('criteria', { keyPath: 'id' });
      }

      // Cache for environments
      if (!database.objectStoreNames.contains('environments')) {
        database.createObjectStore('environments', { keyPath: 'id' });
      }
    };
  });
};

// Generic add to store
export const addToStore = async <T extends { id: string }>(
  storeName: string,
  data: T
): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Generic get from store
export const getFromStore = async <T>(
  storeName: string,
  id: string
): Promise<T | undefined> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic get all from store
export const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete from store
export const deleteFromStore = async (
  storeName: string,
  id: string
): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Add pending sync operation
export const addPendingSync = async (
  type: 'create' | 'update',
  table: string,
  data: any
): Promise<string> => {
  const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const pendingSync: PendingSync = {
    id,
    type,
    table,
    data,
    createdAt: new Date().toISOString(),
  };
  await addToStore('pendingSync', pendingSync);
  return id;
};

// Get all pending sync operations
export const getPendingSync = async (): Promise<PendingSync[]> => {
  return getAllFromStore<PendingSync>('pendingSync');
};

// Remove pending sync operation
export const removePendingSync = async (id: string): Promise<void> => {
  return deleteFromStore('pendingSync', id);
};

// Clear all pending sync operations
export const clearPendingSync = async (): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('pendingSync', 'readwrite');
    const store = transaction.objectStore('pendingSync');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Cache data for offline use
export const cacheAudits = async (audits: any[]): Promise<void> => {
  for (const audit of audits) {
    await addToStore('audits', audit);
  }
};

export const cacheCriteria = async (criteria: any[]): Promise<void> => {
  for (const criterion of criteria) {
    await addToStore('criteria', criterion);
  }
};

export const cacheEnvironments = async (environments: any[]): Promise<void> => {
  for (const env of environments) {
    await addToStore('environments', env);
  }
};

// Get cached audits
export const getCachedAudits = async (): Promise<any[]> => {
  return getAllFromStore('audits');
};

// Get cached criteria
export const getCachedCriteria = async (): Promise<any[]> => {
  return getAllFromStore('criteria');
};

// Get cached environments
export const getCachedEnvironments = async (): Promise<any[]> => {
  return getAllFromStore('environments');
};
