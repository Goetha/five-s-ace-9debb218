
# Plano: Corrigir Criação de Critérios Offline na Biblioteca (/criterios)

## Problema

Na rota `/criterios` (Biblioteca de Critérios), **nada funciona offline** porque:

1. **CriterionFormModal** carrega a lista de empresas direto do servidor (linhas 101-115). Offline, a lista fica vazia, impossibilitando selecionar uma empresa.
2. Sem empresa selecionada, o sistema tenta criar um critério **global** que e bloqueado no modo offline.
3. **BibliotecaCriterios.loadCriteria()** faz chamadas ao servidor que falham offline, sem fallback para dados em cache.

## Solucao

### Arquivo 1: `src/components/biblioteca/CriterionFormModal.tsx`

**Problema**: `loadCompanies()` usa apenas Supabase.

**Correcao**: Adicionar fallback para carregar empresas do IndexedDB quando offline.

```typescript
const loadCompanies = async () => {
  setLoadingCompanies(true);
  try {
    if (!navigator.onLine) {
      // OFFLINE: Load from IndexedDB cache
      const { getAllFromStore, initDB } = await import('@/lib/offlineStorage');
      await initDB();
      const cachedCompanies = await getAllFromStore<Company>('companies');
      setCompanies(cachedCompanies.filter(c => c.name)); // basic filter
      return;
    }
    
    // ONLINE: Load from server (existing code)
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("status", "active")
      .order("name");
    
    if (error) throw error;
    setCompanies(data || []);
  } catch (error) {
    console.error("Error loading companies:", error);
    // Fallback to cache on error
    try {
      const { getAllFromStore, initDB } = await import('@/lib/offlineStorage');
      await initDB();
      const cachedCompanies = await getAllFromStore<Company>('companies');
      setCompanies(cachedCompanies.filter(c => c.name));
    } catch {}
  } finally {
    setLoadingCompanies(false);
  }
};
```

### Arquivo 2: `src/pages/BibliotecaCriterios.tsx`

**Problema**: `loadCriteria()` falha completamente offline.

**Correcao**: Adicionar fallback para carregar criterios do cache IndexedDB (stores `master_criteria` e `criteria`).

```typescript
const loadCriteria = async () => {
  setIsLoading(true);
  try {
    if (!navigator.onLine) {
      // OFFLINE: Load from IndexedDB
      const { getAllFromStore, initDB, getOfflineCriteria } = await import('@/lib/offlineStorage');
      await initDB();
      
      const cachedMaster = await getAllFromStore<any>('master_criteria');
      const cachedCompany = await getAllFromStore<any>('criteria');
      
      const masterCriteria = cachedMaster.map(c => ({
        id: c.id, name: c.name,
        senso: normalizeSenso(c.senso),
        scoreType: c.scoring_type, tags: c.tags || [],
        status: toUiStatus(c.status),
        companiesUsing: 0, modelsUsing: 0, isGlobal: true,
      }));
      
      const companyCriteria = cachedCompany.map(c => ({
        id: c.id, name: c.name,
        senso: normalizeSenso(c.senso),
        scoreType: c.scoring_type, tags: c.tags || [],
        status: toUiStatus(c.status || 'active'),
        companiesUsing: 0, modelsUsing: 0, isGlobal: false,
      }));
      
      setCriteria([...masterCriteria, ...companyCriteria]);
      return;
    }

    // ONLINE: existing Supabase logic...
  } catch (error) {
    // Fallback to cache on network error
    // Same IndexedDB logic as above
  } finally {
    setIsLoading(false);
  }
};
```

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/biblioteca/CriterionFormModal.tsx` | Fallback offline para lista de empresas |
| `src/pages/BibliotecaCriterios.tsx` | Fallback offline para lista de criterios + incluir criterios offline pendentes |

## Resultado Esperado

- Offline: lista de criterios carrega do cache
- Offline: modal "Novo Criterio" mostra empresas do cache
- Offline: criterio salvo localmente com toast de confirmacao
- Online: sincronizacao automatica envia criterios pendentes
