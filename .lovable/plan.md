

# Plano: Corrigir Criacao de Criterios Offline

## Problemas Identificados

### Problema 1: Lista nao atualiza apos criar criterio offline (BibliotecaCriterios)
No arquivo `BibliotecaCriterios.tsx`, linha 293, apos salvar o criterio offline, o codigo faz `return` sem chamar `loadCriteria()`. A lista nunca e recarregada com o novo criterio.

### Problema 2: ManageCriteriaModal.fetchData nao tem fallback offline
O `fetchData()` (linhas 71-167) faz 3 queries ao Supabase sem nenhum fallback. Quando offline, todas falham e a lista de criterios fica vazia - impossibilitando ver ou criar criterios.

## Solucao

### Arquivo 1: `src/pages/BibliotecaCriterios.tsx`

**Problema**: `handleSaveCriterion` faz `return` na linha 293 sem recarregar a lista.

**Correcao**: Adicionar `await loadCriteria()` antes do `return` para que o criterio recem-criado apareca na lista.

```typescript
// Dentro do bloco offline (linha ~291)
setSelectedIds([]);
setCurrentPage(1);
await loadCriteria(); // <-- ADICIONAR ESTA LINHA
return;
```

### Arquivo 2: `src/components/company-admin/environments/ManageCriteriaModal.tsx`

**Problema**: `fetchData()` nao tem fallback offline. A lista fica vazia.

**Correcao**: Adicionar fallback que carrega criterios do cache IndexedDB quando offline.

```typescript
const fetchData = async () => {
  setLoading(true);
  try {
    // OFFLINE FALLBACK
    if (!navigator.onLine) {
      const { getAllFromStore, initDB, getOfflineCriteria } = 
        await import('@/lib/offlineStorage');
      await initDB();
      
      // Carregar criterios do cache
      const cachedMaster = await getAllFromStore<any>('master_criteria');
      const cachedCompany = await getAllFromStore<any>('criteria');
      
      // Filtrar criterios da empresa
      const companyCriteria = cachedCompany
        .filter((c: any) => c.company_id === companyId && !c.master_criterion_id)
        .map((c: any) => ({
          id: c.id, name: c.name, description: c.description,
          senso: c.senso, scoring_type: c.scoring_type,
          isGlobal: false,
        }));
      
      const masterCriteria = cachedMaster.map((c: any) => ({
        id: c.id, name: c.name, description: c.description,
        senso: c.senso, scoring_type: c.scoring_type,
        isGlobal: true,
      }));
      
      // Carregar environment_criteria do cache
      const cachedEnvCriteria = await getAllFromStore<any>('environmentCriteria');
      const linkedIds = new Set(
        cachedEnvCriteria
          .filter((ec: any) => ec.environment_id === localId)
          .map((ec: any) => ec.criterion_id)
      );
      
      // Mapear linked IDs (master vs company)
      const finalLinkedIds = new Set<string>();
      linkedIds.forEach(id => {
        const cc = cachedCompany.find((c: any) => c.id === id);
        if (cc?.master_criterion_id) {
          finalLinkedIds.add(cc.master_criterion_id);
        } else {
          finalLinkedIds.add(id);
        }
      });
      
      setAllCriteria([...masterCriteria, ...companyCriteria]);
      setLinkedCriteriaIds(finalLinkedIds);
      return;
    }

    // ONLINE: codigo existente...
  } catch (error) {
    // Fallback para cache em caso de erro de rede
  } finally {
    setLoading(false);
  }
};
```

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/BibliotecaCriterios.tsx` | Adicionar `await loadCriteria()` apos salvar criterio offline |
| `src/components/company-admin/environments/ManageCriteriaModal.tsx` | Adicionar fallback offline no `fetchData()` |

## Resultado Esperado

- Criterios criados offline aparecem imediatamente na lista da Biblioteca
- No ManageCriteriaModal, criterios do cache sao exibidos quando offline
- Criterios offline podem ser criados e vinculados a locais offline

