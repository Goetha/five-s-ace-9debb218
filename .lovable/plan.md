

# Plano: Suporte Offline para Ambientes e Locais

## Problemas Identificados

A pagina de Setores e Locais (`/company-admin/ambientes`) consegue **ler** dados do cache quando offline, mas **criar, editar e excluir** ambientes falha completamente porque:

1. **Modal de criacao/edicao** (`NewEnvironmentModal`): `fetchData()` e `handleSubmit()` dependem 100% do Supabase -- sem fallback offline
2. **Card de ambiente** (`EnvironmentCard`): `fetchCriteriaCounts()` e `handleDelete()` tambem dependem do Supabase
3. **Sincronizacao** (`useOfflineSync`): nao existe handler para sincronizar ambientes criados offline

## Solucao

### Arquivo 1: `src/components/company-admin/environments/NewEnvironmentModal.tsx`

**Problema A - `fetchData()`**: Quando offline, o modal abre vazio (sem lista de setores para selecionar como pai).

**Correcao**: Adicionar fallback offline que carrega ambientes do cache IndexedDB:

```typescript
const fetchData = async () => {
  if (!user) return;
  try {
    const resolvedCompanyId = propsCompanyId || ...;
    
    // OFFLINE FALLBACK
    if (!navigator.onLine) {
      const cachedEnvs = await getCachedEnvironmentsByCompanyId(resolvedCompanyId);
      setCompanyId(resolvedCompanyId);
      setAllEnvironments(cachedEnvs);
      setAvailableEnvironments(cachedEnvs);
      setAvailableModels([]); // Modelos nao disponiveis offline
      return;
    }
    // ... codigo online existente
  }
};
```

**Problema B - `handleSubmit()`**: Criar/editar ambientes falha offline.

**Correcao**: Adicionar bloco offline que salva no IndexedDB e enfileira para sincronizacao:

```typescript
// No inicio do handleSubmit, apos validacoes:
if (!navigator.onLine) {
  const tempId = `offline_env_${Date.now()}`;
  const offlineEnv = {
    id: tempId,
    company_id: companyId,
    name: name.trim(),
    description: description.trim() || null,
    parent_id: finalParentId,
    status,
    created_at: new Date().toISOString(),
    _isOffline: true,
  };
  
  await addToStore('environments', offlineEnv);
  await addPendingSync('create', 'environments', offlineEnv);
  
  // Fechar modal e atualizar lista
  onOpenChange(false);
  onSuccess?.();
  toast({ title: "Salvo localmente!", description: "Sera sincronizado quando voltar online." });
  return;
}
```

### Arquivo 2: `src/components/company-admin/environments/EnvironmentCard.tsx`

**Problema A - `fetchCriteriaCounts()`**: Falha silenciosamente offline, mostrando "0 criterios" para todos os locais.

**Correcao**: Adicionar fallback que le do cache `environmentCriteria`:

```typescript
const fetchCriteriaCounts = async () => {
  try {
    if (!navigator.onLine) {
      const cached = await getCachedEnvironmentCriteriaByEnvId_batch(allEnvIds);
      // contar por environment_id
      setCriteriaCounts(counts);
      return;
    }
    // ... codigo online existente
  }
};
```

**Problema B - `handleDelete()`**: Excluir ambientes falha offline.

**Correcao**: Adicionar fallback que remove do cache e enfileira delete para sync:

```typescript
if (!navigator.onLine) {
  await deleteFromStore('environments', id);
  await addPendingSync('delete', 'environments', { id });
  toast({ title: "Removido localmente!" });
  onRefresh();
  return;
}
```

### Arquivo 3: `src/hooks/useOfflineSync.ts`

**Problema**: Nao existe handler para sincronizar ambientes criados/editados/excluidos offline.

**Correcao**: Adicionar cases no `syncPendingChanges()`:

```typescript
// CREATE environment
if (item.type === 'create' && item.table === 'environments') {
  const { _isOffline, ...envData } = item.data;
  delete envData.id; // remover ID temporario
  const { error } = await supabase.from('environments').insert(envData);
  if (!error) {
    await removePendingSync(item.id);
    syncedCount++;
  }
  continue;
}

// DELETE environment
if (item.type === 'delete' && item.table === 'environments') {
  const { error } = await supabase.from('environments').delete().eq('id', item.data.id);
  if (!error) {
    await removePendingSync(item.id);
    syncedCount++;
  }
  continue;
}
```

### Arquivo 4: `src/pages/company-admin/Ambientes.tsx`

**Correcao menor**: Apos criar/editar offline, o `fetchEnvironments()` (chamado via `onSuccess`) ja tem fallback de cache, entao os novos ambientes aparecerao na lista se recarregarmos do IndexedDB.

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `NewEnvironmentModal.tsx` | Fallback offline em `fetchData()` + `handleSubmit()` |
| `EnvironmentCard.tsx` | Fallback offline em `fetchCriteriaCounts()` + `handleDelete()` |
| `useOfflineSync.ts` | Handlers de sync para create/delete de environments |
| `Ambientes.tsx` | Garantir que `fetchEnvironments` releia cache apos mudancas offline |

## Resultado Esperado

- Offline: usuario pode criar setores e locais, que aparecem na lista imediatamente
- Offline: usuario pode excluir setores e locais
- Offline: contagem de criterios carrega do cache
- Online: ambientes criados offline sao sincronizados automaticamente com o banco

