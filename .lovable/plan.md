
# Plano: Corrigir exclusao em massa de empresas no modo offline

## Problema

O botao de lixeira na barra de acoes em massa (`CompanyBulkActions`) chama diretamente o Supabase sem fallback offline (linhas 941-980 de `Empresas.tsx`). Quando offline, a chamada `supabase.from('companies').delete().in('id', selectedCompanies)` falha silenciosamente e nada acontece.

Nota: a exclusao individual (via `DeleteCompanyDialog` + `handleConfirmDelete`) ja tem suporte offline, mas o fluxo em massa nao usa essa funcao.

## Solucao

Adicionar fallback offline no handler `onDelete` do `CompanyBulkActions` (linhas 941-980), seguindo o mesmo padrao do `handleConfirmDelete`.

## Arquivo: `src/pages/Empresas.tsx`

### Mudanca: handler `onDelete` do `CompanyBulkActions` (linhas 941-980)

Adicionar verificacao `!navigator.onLine` antes da chamada ao Supabase:

```typescript
onDelete={() => {
  (async () => {
    try {
      if (selectedCompanies.length === 0) return;

      // OFFLINE FALLBACK
      if (!navigator.onLine) {
        const { deleteFromStore, addPendingSync, initDB } = await import('@/lib/offlineStorage');
        await initDB();
        for (const id of selectedCompanies) {
          await deleteFromStore('companies', id);
          if (!id.startsWith('offline_')) {
            await addPendingSync('delete', 'companies', { id });
          }
        }
        const remaining = companies.filter(c => !selectedCompanies.includes(c.id));
        setCompanies(remaining);
        toast({
          title: 'Empresas removidas localmente',
          description: `${selectedCompanies.length} empresa(s) serao excluidas ao reconectar.`,
        });
        setSelectedCompanies([]);
        return;
      }

      // ONLINE: codigo existente (inalterado)
      const { error } = await supabase
        .from('companies')
        .delete()
        .in('id', selectedCompanies);
      // ... resto do codigo online
    } catch (err) { ... }
  })();
}}
```

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Empresas.tsx` | Adicionar fallback offline no `onDelete` do `CompanyBulkActions` (linhas 941-980) |

## Resultado Esperado

- Offline: selecionar empresas e clicar na lixeira remove da lista imediatamente
- As exclusoes ficam na fila de sincronizacao pendente
- Online: ao reconectar, as exclusoes sao enviadas ao servidor automaticamente
