// IndexedDB service for offline storage and sync

const DB_NAME = '5s-manager-offline';
const DB_VERSION = 3; // Incremented version for new stores (user_companies, environment_criteria)

interface PendingSync {
  id: string;
  type: 'create' | 'update';
  table: string;
  data: any;
  createdAt: string;
}

interface AuthCache {
  id: string;
  user: any;
  session: any;
  userRole: string | null;
  userProfile: any;
  companyInfo: any;
  linkedCompanies: any[];
  activeCompanyId: string | null;
  cachedAt: string;
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

      // Cache for criteria (company_criteria)
      if (!database.objectStoreNames.contains('criteria')) {
        database.createObjectStore('criteria', { keyPath: 'id' });
      }

      // Cache for environments
      if (!database.objectStoreNames.contains('environments')) {
        database.createObjectStore('environments', { keyPath: 'id' });
      }

      // NEW: Cache for companies
      if (!database.objectStoreNames.contains('companies')) {
        database.createObjectStore('companies', { keyPath: 'id' });
      }

      // NEW: Cache for master_criteria (global criteria)
      if (!database.objectStoreNames.contains('master_criteria')) {
        database.createObjectStore('master_criteria', { keyPath: 'id' });
      }

      // NEW: Cache for master_models
      if (!database.objectStoreNames.contains('master_models')) {
        database.createObjectStore('master_models', { keyPath: 'id' });
      }

      // NEW: Cache for auth data
      if (!database.objectStoreNames.contains('authCache')) {
        database.createObjectStore('authCache', { keyPath: 'id' });
      }

      // NEW: Cache for user_roles
      if (!database.objectStoreNames.contains('user_roles')) {
        database.createObjectStore('user_roles', { keyPath: 'id' });
      }

      // NEW: App metadata (last sync time, etc)
      if (!database.objectStoreNames.contains('appMetadata')) {
        database.createObjectStore('appMetadata', { keyPath: 'key' });
      }

      // NEW: Cache for user_companies (user-company links)
      if (!database.objectStoreNames.contains('user_companies')) {
        const ucStore = database.createObjectStore('user_companies', { keyPath: 'id' });
        ucStore.createIndex('user_id', 'user_id', { unique: false });
        ucStore.createIndex('company_id', 'company_id', { unique: false });
      }

      // NEW: Cache for environment_criteria (environment-criterion links)
      if (!database.objectStoreNames.contains('environment_criteria')) {
        const ecStore = database.createObjectStore('environment_criteria', { keyPath: 'id' });
        ecStore.createIndex('environment_id', 'environment_id', { unique: false });
        ecStore.createIndex('criterion_id', 'criterion_id', { unique: false });
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

// Clear entire store
export const clearStore = async (storeName: string): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
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
  return clearStore('pendingSync');
};

// =====================
// AUTH CACHE FUNCTIONS
// =====================
export const saveAuthCache = async (authData: Omit<AuthCache, 'id' | 'cachedAt'>): Promise<void> => {
  const cache: AuthCache = {
    id: 'current_user',
    ...authData,
    cachedAt: new Date().toISOString(),
  };
  await addToStore('authCache', cache);
};

export const getAuthCache = async (): Promise<AuthCache | undefined> => {
  return getFromStore<AuthCache>('authCache', 'current_user');
};

export const clearAuthCache = async (): Promise<void> => {
  try {
    await deleteFromStore('authCache', 'current_user');
  } catch (e) {
    // Ignore if not found
  }
};

// =====================
// DATA CACHE FUNCTIONS
// =====================
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

export const cacheCompanies = async (companies: any[]): Promise<void> => {
  for (const company of companies) {
    await addToStore('companies', company);
  }
};

export const cacheMasterCriteria = async (criteria: any[]): Promise<void> => {
  for (const criterion of criteria) {
    await addToStore('master_criteria', criterion);
  }
};

export const cacheMasterModels = async (models: any[]): Promise<void> => {
  for (const model of models) {
    await addToStore('master_models', model);
  }
};

// Get cached data functions
export const getCachedAudits = async (): Promise<any[]> => {
  return getAllFromStore('audits');
};

export const getCachedCriteria = async (): Promise<any[]> => {
  return getAllFromStore('criteria');
};

export const getCachedEnvironments = async (): Promise<any[]> => {
  return getAllFromStore('environments');
};

export const getCachedCompanies = async (): Promise<any[]> => {
  return getAllFromStore('companies');
};

export const getCachedMasterCriteria = async (): Promise<any[]> => {
  return getAllFromStore('master_criteria');
};

export const getCachedMasterModels = async (): Promise<any[]> => {
  return getAllFromStore('master_models');
};

// =====================
// METADATA FUNCTIONS
// =====================
export const setLastSyncTime = async (): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('appMetadata', 'readwrite');
    const store = transaction.objectStore('appMetadata');
    const request = store.put({ key: 'lastSyncAt', value: new Date().toISOString() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getLastSyncTime = async (): Promise<string | null> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('appMetadata', 'readonly');
    const store = transaction.objectStore('appMetadata');
    const request = store.get('lastSyncAt');
    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
};

// Clear all cached data (but keep pending sync)
export const clearAllCaches = async (): Promise<void> => {
  const stores = ['audits', 'auditItems', 'criteria', 'environments', 'companies', 'master_criteria', 'master_models', 'user_companies', 'environment_criteria'];
  for (const store of stores) {
    try {
      await clearStore(store);
    } catch (e) {
      console.error(`Error clearing store ${store}:`, e);
    }
  }
};

// =====================
// USER COMPANIES CACHE
// =====================
export const cacheUserCompanies = async (userCompanies: any[]): Promise<void> => {
  for (const uc of userCompanies) {
    await addToStore('user_companies', uc);
  }
};

export const getCachedUserCompanies = async (): Promise<any[]> => {
  return getAllFromStore('user_companies');
};

export const getCachedUserCompaniesByUserId = async (userId: string): Promise<any[]> => {
  const allUserCompanies = await getAllFromStore<any>('user_companies');
  return allUserCompanies.filter(uc => uc.user_id === userId);
};

// =====================
// ENVIRONMENT CRITERIA CACHE
// =====================
export const cacheEnvironmentCriteria = async (envCriteria: any[]): Promise<void> => {
  for (const ec of envCriteria) {
    await addToStore('environment_criteria', ec);
  }
};

export const getCachedEnvironmentCriteria = async (): Promise<any[]> => {
  return getAllFromStore('environment_criteria');
};

export const getCachedEnvironmentCriteriaByEnvId = async (environmentId: string): Promise<any[]> => {
  const allEnvCriteria = await getAllFromStore<any>('environment_criteria');
  return allEnvCriteria.filter(ec => ec.environment_id === environmentId);
};

// =====================
// FILTERED CACHE GETTERS
// =====================
export const getCachedEnvironmentsByCompanyId = async (companyId: string): Promise<any[]> => {
  const allEnvs = await getAllFromStore<any>('environments');
  return allEnvs.filter(env => env.company_id === companyId);
};

export const getCachedCriteriaByCompanyId = async (companyId: string): Promise<any[]> => {
  const allCriteria = await getAllFromStore<any>('criteria');
  return allCriteria.filter(c => c.company_id === companyId);
};

export const getCachedAuditsByCompanyId = async (companyId: string): Promise<any[]> => {
  const allAudits = await getAllFromStore<any>('audits');
  return allAudits.filter(a => a.company_id === companyId);
};

// Cache audit items
export const cacheAuditItems = async (items: any[]): Promise<void> => {
  for (const item of items) {
    await addToStore('auditItems', item);
  }
};

export const getCachedAuditItems = async (): Promise<any[]> => {
  return getAllFromStore('auditItems');
};

export const getCachedAuditItemsByAuditId = async (auditId: string): Promise<any[]> => {
  const allItems = await getAllFromStore<any>('auditItems');
  return allItems.filter(item => item.audit_id === auditId);
};
