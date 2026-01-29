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

      // NEW: Cache for auditors (IFA Admin only)
      if (!database.objectStoreNames.contains('auditors')) {
        database.createObjectStore('auditors', { keyPath: 'id' });
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

// Check if cache has been populated (quick check)
export const hasCachedData = async (): Promise<boolean> => {
  try {
    const companies = await getAllFromStore<any>('companies');
    return companies.length > 0;
  } catch {
    return false;
  }
};

// Clear all cached data (but keep pending sync)
export const clearAllCaches = async (): Promise<void> => {
  const stores = ['audits', 'auditItems', 'criteria', 'environments', 'companies', 'master_criteria', 'master_models', 'user_companies', 'environment_criteria', 'auditors'];
  for (const store of stores) {
    try {
      await clearStore(store);
    } catch (e) {
      console.error(`Error clearing store ${store}:`, e);
    }
  }
};

// =====================
// AUDITORS CACHE (IFA Admin)
// =====================
export const cacheAuditors = async (auditors: any[]): Promise<void> => {
  // Clear existing auditors first
  try {
    await clearStore('auditors');
  } catch (e) {
    // Store might not exist yet
  }
  for (const auditor of auditors) {
    await addToStore('auditors', auditor);
  }
};

export const getCachedAuditors = async (): Promise<any[]> => {
  try {
    return await getAllFromStore('auditors');
  } catch (e) {
    return [];
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

// =====================
// OFFLINE AUDIT FUNCTIONS
// =====================

export interface OfflineAudit {
  id: string; // temporary offline ID
  company_id: string;
  location_id: string;
  auditor_id: string;
  status: string;
  started_at: string;
  total_questions: number;
  total_yes: number;
  total_no: number;
  score: number | null;
  score_level?: string;
  completed_at?: string | null;
  observations?: string | null;
  next_audit_date?: string | null;
  _isOffline: true;
  _locationName?: string;
  _companyName?: string;
}

export interface OfflineAuditItem {
  id: string;
  audit_id: string;
  criterion_id: string;
  question: string;
  answer: boolean | null;
  photo_url: string | null;
  comment: string | null;
  senso?: string[] | null;
  _isOffline: true;
}

// Generate offline ID
export const generateOfflineId = (): string => {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Check if ID is offline
export const isOfflineId = (id: string): boolean => {
  return id.startsWith('offline_');
};

// Create an offline audit with its items
export const createOfflineAudit = async (
  auditData: Omit<OfflineAudit, 'id' | '_isOffline'>,
  items: Array<{ criterion_id: string; question: string; senso?: string[] | null }>
): Promise<{ audit: OfflineAudit; items: OfflineAuditItem[] }> => {
  const auditId = generateOfflineId();
  
  const audit: OfflineAudit = {
    ...auditData,
    id: auditId,
    _isOffline: true,
  };
  
  // Save audit to cache
  await addToStore('audits', audit);
  
  // Create and save audit items
  const auditItems: OfflineAuditItem[] = items.map(item => ({
    id: generateOfflineId(),
    audit_id: auditId,
    criterion_id: item.criterion_id,
    question: item.question,
    answer: null,
    photo_url: null,
    comment: null,
    senso: item.senso,
    _isOffline: true,
  }));
  
  for (const item of auditItems) {
    await addToStore('auditItems', item);
  }
  
  // Add to pending sync
  await addPendingSync('create', 'offline_audit', {
    audit: auditData,
    items,
  });
  
  return { audit, items: auditItems };
};

// Get all offline audits (not yet synced)
export const getOfflineAudits = async (): Promise<OfflineAudit[]> => {
  const allAudits = await getAllFromStore<any>('audits');
  return allAudits.filter(a => a._isOffline === true);
};

// Update an offline audit item
export const updateOfflineAuditItem = async (
  itemId: string,
  updates: Partial<Pick<OfflineAuditItem, 'answer' | 'photo_url' | 'comment'>>
): Promise<void> => {
  const item = await getFromStore<OfflineAuditItem>('auditItems', itemId);
  if (item) {
    const updatedItem = { ...item, ...updates };
    await addToStore('auditItems', updatedItem);
    
    // Add to pending sync if this is an offline item
    if (item._isOffline) {
      await addPendingSync('update', 'offline_audit_item', {
        itemId,
        auditId: item.audit_id,
        updates,
      });
    }
  }
};

// Complete an offline audit
export const completeOfflineAudit = async (
  auditId: string,
  data: { observations?: string; next_audit_date?: string }
): Promise<void> => {
  const audit = await getFromStore<OfflineAudit>('audits', auditId);
  if (audit) {
    const items = await getCachedAuditItemsByAuditId(auditId);
    const answeredItems = items.filter(i => i.answer !== null);
    const yesCount = items.filter(i => i.answer === true).length;
    const noCount = items.filter(i => i.answer === false).length;
    const score = answeredItems.length > 0 
      ? Math.round((yesCount / answeredItems.length) * 100) 
      : 0;
    
    const scoreLevel = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
    
    const updatedAudit = {
      ...audit,
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_yes: yesCount,
      total_no: noCount,
      score,
      score_level: scoreLevel,
      observations: data.observations || null,
      next_audit_date: data.next_audit_date || null,
    };
    
    await addToStore('audits', updatedAudit);
    
    await addPendingSync('update', 'offline_audit_complete', {
      auditId,
      ...data,
      total_yes: yesCount,
      total_no: noCount,
      score,
      score_level: scoreLevel,
    });
  }
};

// Remove synced offline audit (after successful sync)
export const removeOfflineAudit = async (offlineAuditId: string): Promise<void> => {
  // Remove audit
  await deleteFromStore('audits', offlineAuditId);
  
  // Remove all items for this audit
  const items = await getCachedAuditItemsByAuditId(offlineAuditId);
  for (const item of items) {
    await deleteFromStore('auditItems', item.id);
  }
};

// Map offline audit ID to real ID (after sync)
export const mapOfflineToRealId = async (
  offlineId: string,
  realId: string,
  type: 'audit' | 'audit_item'
): Promise<void> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('appMetadata', 'readwrite');
    const store = transaction.objectStore('appMetadata');
    const request = store.put({ 
      key: `id_map_${offlineId}`, 
      value: { realId, type, mappedAt: new Date().toISOString() } 
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get real ID from offline ID
export const getRealIdFromOffline = async (offlineId: string): Promise<string | null> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('appMetadata', 'readonly');
    const store = transaction.objectStore('appMetadata');
    const request = store.get(`id_map_${offlineId}`);
    request.onsuccess = () => resolve(request.result?.value?.realId || null);
    request.onerror = () => reject(request.error);
  });
};
