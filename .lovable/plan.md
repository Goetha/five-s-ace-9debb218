
# Plano de Revisão e Correção do Sistema Offline

## Resumo da Análise

Após uma revisão detalhada do código, identifiquei o estado atual do suporte offline e as áreas que precisam de ajustes.

---

## Estado Atual do Sistema Offline

### Infraestrutura Existente (Funcionando)

1. **IndexedDB Storage** (`src/lib/offlineStorage.ts`)
   - 12 stores configurados: audits, auditItems, criteria, environments, companies, master_criteria, master_models, authCache, user_roles, appMetadata, user_companies, environment_criteria
   - Funções completas de CRUD e cache

2. **OfflineSyncProvider** (`src/components/pwa/OfflineSyncProvider.tsx`)
   - Sincronização automática ao login
   - Cache de: empresas, ambientes, critérios, auditorias, items de auditoria
   - Indicador de progresso visual

3. **Hooks Offline**
   - `useOfflineSync`: Gerencia sincronização pendente
   - `useOfflineQuery`: Padrão "Online first, Cache fallback"
   - `useOfflineData`: Fetching com fallback para cache
   - `useOfflineEnvironments`: Ambientes com suporte offline completo

4. **Auth Persistida** (`src/contexts/AuthContext.tsx`)
   - Cache de sessão, role, perfil e empresa no IndexedDB
   - Restauração automática quando offline

---

## Páginas com Suporte Offline Completo

| Página | Status | Observações |
|--------|--------|-------------|
| Auditorias | ✅ | `fetchFromCache()` implementado |
| BibliotecaCriterios | ✅ | Usa `useOfflineData` + `OfflineBanner` |
| Empresas | ✅ | Usa `useOfflineData` + `OfflineBanner` |
| LocationSelector | ✅ | Usa `useOfflineEnvironments` |
| AuditChecklist | ✅ | Detecta offline e usa cache |
| NewAuditDialog | ✅ | Cria auditorias offline |

---

## Páginas que Precisam de Correção

### 1. **NovaAuditoria.tsx** - CRÍTICO
**Problema:** Não suporta criação offline, apenas usa Supabase diretamente.

**Correção:**
```typescript
// Adicionar lógica offline similar ao NewAuditDialog
// Usar createOfflineAudit quando isOffline === true
// Buscar critérios do cache quando offline
```

### 2. **Avaliadores.tsx** - LIMITADO
**Problema:** Usa Edge Function (`list-all-auditors`) sem fallback para cache.

**Correção:**
```typescript
// Adicionar cache de avaliadores no OfflineSyncProvider
// Implementar getCachedAuditors() no offlineStorage
// Fallback para cache quando offline
```

### 3. **ModelosMestre.tsx** - LIMITADO
**Problema:** Fetches diretos sem fallback para cache. Já tem `useOfflineData` importado mas não usa totalmente.

**Correção:**
```typescript
// Usar o hook useOfflineData para master_models
// Implementar fetchFromCache similar ao Auditorias.tsx
```

### 4. **Company Admin - Ambientes.tsx** - SEM SUPORTE
**Problema:** Query direta sem fallback offline.

**Correção:**
```typescript
// Usar useOfflineEnvironments ou useOfflineQuery
// Adicionar OfflineBanner
```

### 5. **MinhasAuditorias.tsx** - LIMITADO
**Problema:** Fetch direto do Supabase sem fallback.

**Correção:**
```typescript
// Usar getCachedAudits() quando offline
// Adicionar indicador de dados do cache
```

---

## Correções Técnicas Necessárias

### Fase 1: Corrigir NovaAuditoria.tsx

```typescript
// 1. Importar funções offline
import { 
  createOfflineAudit,
  getCachedEnvironmentCriteriaByEnvId,
  getCachedCriteria 
} from "@/lib/offlineStorage";

// 2. Detectar modo offline
const { isOffline } = useAuth();

// 3. Modificar handleLocationSelected
const handleLocationSelected = async (locationId: string, companyId: string) => {
  if (isOffline) {
    // Buscar critérios do cache
    const envCriteria = await getCachedEnvironmentCriteriaByEnvId(locationId);
    const allCriteria = await getCachedCriteria();
    const criteria = allCriteria.filter(c => 
      envCriteria.some(ec => ec.criterion_id === c.id) && c.status === 'active'
    );
    
    // Criar auditoria offline
    const { audit } = await createOfflineAudit({...}, criteria.map(...));
    setAuditId(audit.id);
    setStep('checklist');
  } else {
    // Lógica online existente
  }
};
```

### Fase 2: Adicionar Cache de Avaliadores

```typescript
// Em offlineStorage.ts - Adicionar:
export const cacheAuditors = async (auditors: any[]): Promise<void> => {...};
export const getCachedAuditors = async (): Promise<any[]> => {...};

// Em OfflineSyncProvider.tsx - Adicionar step para auditors:
// (Apenas para ifa_admin)
if (userRole === 'ifa_admin') {
  const { data: auditors } = await supabase.functions.invoke('list-all-auditors');
  if (auditors?.auditors) await cacheAuditors(auditors.auditors);
}

// Em Avaliadores.tsx - Adicionar fallback:
const loadAuditors = async () => {
  if (!navigator.onLine) {
    const cached = await getCachedAuditors();
    setAuditors(cached);
    setIsFromCache(true);
    return;
  }
  // ... lógica existente
};
```

### Fase 3: Corrigir ModelosMestre.tsx

```typescript
// Usar padrão similar ao BibliotecaCriterios.tsx
const fetchModelsOnline = useCallback(async () => {
  // ... fetch existente
}, []);

const { isOffline, isFromCache, refetch } = useOfflineData({
  cacheKey: 'master_models',
  fetchOnline: fetchModelsOnline,
});

// Adicionar fallback em fetchModels:
if (!navigator.onLine) {
  const cached = await getCachedMasterModels();
  // processar cached...
  setIsFromCache(true);
  return;
}
```

### Fase 4: Corrigir MinhasAuditorias.tsx

```typescript
// Adicionar importações
import { getCachedAudits, getCachedCompanies, getCachedEnvironments } from "@/lib/offlineStorage";

// Modificar fetchAudits
const fetchAudits = async () => {
  if (!navigator.onLine || isOffline) {
    // Buscar do cache
    const cachedAudits = await getCachedAudits();
    const cachedCompanies = await getCachedCompanies();
    const cachedEnvs = await getCachedEnvironments();
    
    // Filtrar por auditor e processar
    const userAudits = cachedAudits.filter(a => a.auditor_id === user.id);
    // ... processar com nomes de empresa/local do cache
    
    setIsFromCache(true);
    return;
  }
  // ... lógica online existente
};
```

### Fase 5: Corrigir Company Admin Ambientes.tsx

```typescript
// Usar o hook existente
import { useOfflineEnvironments } from "@/hooks/useOfflineEnvironments";

// Substituir fetchEnvironments manual por:
const { 
  allEnvironments, 
  isLoading, 
  isOffline, 
  isFromCache,
  refetch 
} = useOfflineEnvironments(user?.id, activeCompany?.id);

// Adicionar OfflineBanner no render
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/pages/auditor/NovaAuditoria.tsx` | Adicionar suporte offline completo |
| `src/pages/auditor/MinhasAuditorias.tsx` | Adicionar fallback para cache |
| `src/pages/Avaliadores.tsx` | Adicionar fallback para cache |
| `src/pages/ModelosMestre.tsx` | Completar implementação offline |
| `src/pages/company-admin/Ambientes.tsx` | Usar hook offline |
| `src/lib/offlineStorage.ts` | Adicionar store para auditors |
| `src/components/pwa/OfflineSyncProvider.tsx` | Cachear auditors para ifa_admin |

---

## Melhorias Adicionais

1. **Indicadores Visuais Consistentes**
   - Todas as páginas devem mostrar `OfflineBanner` quando usando cache
   - Badge "Offline" nos headers quando sem conexão

2. **Sincronização de Fotos Offline**
   - Fotos capturadas offline são salvas como base64 no IndexedDB
   - Sincronizar para Storage quando voltar online

3. **Timeout de Segurança**
   - Todas as requisições online devem ter timeout de 10s
   - Fallback automático para cache após timeout

4. **Teste de Regressão**
   - Verificar fluxo completo: criar auditoria offline → responder → finalizar → sincronizar

---

## Ordem de Implementação

1. **NovaAuditoria.tsx** - Mais crítico para auditor mobile
2. **MinhasAuditorias.tsx** - Listagem offline essencial
3. **Company Admin Ambientes.tsx** - Gestão offline
4. **Avaliadores.tsx** - IFA Admin secundário
5. **ModelosMestre.tsx** - IFA Admin secundário
