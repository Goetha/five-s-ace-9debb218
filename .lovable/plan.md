
# Plano: Suporte Offline para /ambientes (IFA Admin)

## Problema

A pagina `/ambientes` (IFA Admin) nao tem nenhum fallback offline. Quando o usuario abre a pagina sem internet:
- `fetchCompanies()` falha silenciosamente, o select de empresas fica vazio
- `fetchEnvironments()` nunca e chamado (sem empresa selecionada)
- Resultado: pagina vazia com "Selecione uma empresa" sem opcoes

## Solucao

Adicionar fallback de cache IndexedDB nas duas funcoes de fetch, seguindo o mesmo padrao ja usado em `/company-admin/ambientes`.

## Arquivo: `src/pages/Ambientes.tsx`

### Mudanca 1: `fetchCompanies()` - fallback offline

Quando `!navigator.onLine`, carregar empresas do cache via `getCachedCompanies()`:

```typescript
const fetchCompanies = async () => {
  try {
    if (!navigator.onLine) {
      const cached = await getCachedCompanies();
      const activeCompanies = cached.filter(c => c.status === 'active');
      setCompanies(activeCompanies);
      if (activeCompanies.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(activeCompanies[0].id);
      }
      return;
    }
    // ... codigo online existente (inalterado)
  } catch (error) {
    // Fallback: tentar cache em caso de erro
    const cached = await getCachedCompanies();
    setCompanies(cached.filter(c => c.status === 'active'));
  }
};
```

### Mudanca 2: `fetchEnvironments()` - fallback offline

Quando `!navigator.onLine`, carregar ambientes do cache via `getCachedEnvironmentsByCompanyId()`:

```typescript
const fetchEnvironments = async () => {
  if (!selectedCompanyId) return;
  try {
    setLoading(true);

    if (!navigator.onLine) {
      const cached = await getCachedEnvironmentsByCompanyId(selectedCompanyId);
      const mapped = cached.map(env => ({
        ...env,
        status: env.status as 'active' | 'inactive',
        icon: 'Factory',
        audits_count: 0,
      }));
      setEnvironments(mapped);
      return;
    }
    // ... codigo online existente (inalterado)
  } catch (error) {
    // Fallback: tentar cache em caso de erro
    const cached = await getCachedEnvironmentsByCompanyId(selectedCompanyId);
    setEnvironments(cached.map(env => ({
      ...env, status: env.status as 'active' | 'inactive',
      icon: 'Factory', audits_count: 0,
    })));
  } finally {
    setLoading(false);
  }
};
```

### Mudanca 3: Imports

Adicionar imports necessarios:

```typescript
import { getCachedCompanies, getCachedEnvironmentsByCompanyId } from "@/lib/offlineStorage";
```

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/pages/Ambientes.tsx` | Adicionar fallback offline em `fetchCompanies()` e `fetchEnvironments()` + imports |

## Resultado Esperado

- Offline: empresas aparecem no select (carregadas do cache)
- Offline: ao selecionar empresa, ambientes e locais aparecem normalmente
- Online: comportamento inalterado
- Requisito: o usuario precisa ter acessado a pagina pelo menos uma vez online para popular o cache
