

# Plano: Criacao de Empresa Offline

## Problema

O modal `NewCompanyModal.tsx` depende 100% do servidor para:
1. Validar email contra IFA Admin (`user_roles` query)
2. Inserir empresa no banco (`companies` table)
3. Criar usuario admin via Edge Function (`create-company-user`)
4. Enviar email com credenciais (`send-company-email`)
5. Criar avaliadores via Edge Function
6. Vincular avaliadores existentes

Quando offline, nenhuma dessas operacoes funciona e a criacao falha silenciosamente.

## Solucao

Salvar os dados da empresa localmente no IndexedDB com ID temporario e enfileirar toda a operacao para sincronizacao automatica quando voltar online.

### O que funciona offline
- Preencher formulario (nome, telefone, email)
- Adicionar novos avaliadores a lista
- Salvar empresa localmente
- Empresa aparece na lista com badge "Pendente"

### O que so funciona na sincronizacao (online)
- Criacao de usuarios (admin e avaliadores) via Edge Functions
- Envio de emails com credenciais
- Vinculacao de avaliadores existentes
- Validacao de email contra IFA Admin

### Selecao de avaliadores existentes offline
A lista de avaliadores existentes ja e cacheada no IndexedDB (store `auditors`). Quando offline, o modal carrega essa lista do cache em vez de chamar a Edge Function.

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/lib/offlineStorage.ts` | Adicionar `createOfflineCompany`, `getOfflineCompanies`, `deleteOfflineCompany` |
| `src/hooks/useOfflineSync.ts` | Adicionar handler para `offline_company` no `syncPendingChanges` |
| `src/components/empresas/NewCompanyModal.tsx` | Detectar offline, salvar localmente, carregar avaliadores do cache |
| `src/pages/Empresas.tsx` | Carregar empresas do cache quando offline, incluir empresas offline pendentes |

## Detalhes Tecnicos

### 1. offlineStorage.ts - Nova interface e funcoes

```typescript
export interface OfflineCompany {
  id: string;              // offline_xxx
  name: string;
  phone: string;
  email: string;
  status: 'active';
  created_at: string;
  _isOffline: true;
  _newAuditors: Array<{ name: string; email: string }>;
  _selectedExistingAuditorIds: string[];
}

export const createOfflineCompany = async (
  companyData: { name: string; phone: string; email: string },
  newAuditors: Array<{ name: string; email: string }>,
  selectedExistingAuditorIds: string[]
): Promise<OfflineCompany> => {
  const id = generateOfflineId();
  const company: OfflineCompany = {
    id, ...companyData,
    status: 'active',
    created_at: new Date().toISOString(),
    _isOffline: true,
    _newAuditors: newAuditors,
    _selectedExistingAuditorIds: selectedExistingAuditorIds,
  };
  await addToStore('companies', company);
  await addPendingSync('create', 'offline_company', {
    company: companyData,
    newAuditors,
    selectedExistingAuditorIds,
    offlineId: id,
  });
  return company;
};
```

### 2. useOfflineSync.ts - Handler de sincronizacao

Adicionar bloco para `item.table === 'offline_company'`:

1. Inserir empresa no `companies` table
2. Gerar senha e criar admin via `create-company-user`
3. Enviar email do admin via `send-company-email`
4. Para cada novo avaliador: criar via `create-company-user` + enviar email
5. Para cada avaliador existente: vincular via `update-auditor-companies`
6. Remover empresa offline do cache
7. Remover pendingSync

### 3. NewCompanyModal.tsx - Modo offline

- `loadExistingAuditors`: fallback para `getCachedAuditors()` quando offline
- `onSubmit`: se offline, chamar `createOfflineCompany()` em vez de fazer chamadas ao servidor
- Pular validacao de email IFA Admin (sera feita na sincronizacao)
- Mostrar badge "Offline" no header do modal
- Toast informando que empresa foi salva localmente

### 4. Empresas.tsx - Exibicao offline

- `loadCompaniesFromBackend`: fallback para `getAllFromStore('companies')` quando offline
- Incluir empresas com `_isOffline: true` na lista
- Empresas offline aparecem com indicador visual (badge "Pendente")

## Fluxo

```text
OFFLINE: Usuario preenche formulario
  -> Salva no IndexedDB (companies store)
  -> Adiciona pendingSync (offline_company)
  -> Empresa aparece na lista local
  -> Toast: "Empresa salva localmente"

ONLINE: syncPendingChanges detecta offline_company
  -> INSERT companies
  -> create-company-user (admin)
  -> send-company-email (admin)
  -> create-company-user (avaliadores)
  -> send-company-email (avaliadores)
  -> update-auditor-companies (existentes)
  -> Remove offline company do cache
  -> Toast: "Empresa sincronizada"
```

## Consideracoes

1. **Validacao de email IFA Admin**: Sera feita durante a sincronizacao. Se o email for invalido, a sincronizacao falha e o usuario e notificado
2. **Duplicatas**: Se o usuario criar a mesma empresa online e offline, havera duplicatas. Isso e aceitavel pois a sincronizacao e manual
3. **Avaliadores existentes offline**: A lista vem do cache `auditors` que e populado pelo `OfflineSyncProvider`

