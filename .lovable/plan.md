
# Plano: Criação de Critérios (Perguntas) Offline

## Resumo do Problema

O sistema atual **NÃO permite criar critérios (perguntas) quando offline**. Isso ocorre porque:

1. **CriterionFormModal.tsx** e **ManageCriteriaModal.tsx** fazem chamadas diretas ao Supabase para criar critérios
2. **Não existe** função no `offlineStorage.ts` para armazenar critérios criados offline
3. **Não existe** lógica no `useOfflineSync.ts` para sincronizar critérios pendentes
4. Os componentes **não verificam** o status offline antes de tentar criar

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│  OFFLINE MODE - Criação de Critério                         │
├─────────────────────────────────────────────────────────────┤
│  1. Usuário clica em "Novo Critério"                        │
│  2. Sistema detecta modo offline                            │
│  3. Gera ID temporário: offline_[timestamp]_[random]        │
│  4. Salva critério no IndexedDB (store: criteria)           │
│  5. Adiciona pendingSync para sincronização futura          │
│  6. Mostra toast confirmando salvamento local               │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ONLINE MODE - Sincronização                                │
├─────────────────────────────────────────────────────────────┤
│  1. syncPendingChanges detecta pendingSync type='create'    │
│  2. Para table='offline_criterion', insere no Supabase      │
│  3. Recebe ID real do servidor                              │
│  4. Atualiza environment_criteria se vinculado a local      │
│  5. Remove do cache offline e pendingSync                   │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/lib/offlineStorage.ts` | Adicionar funções para criar critérios offline |
| `src/hooks/useOfflineSync.ts` | Adicionar lógica de sincronização de critérios |
| `src/components/company-admin/environments/ManageCriteriaModal.tsx` | Suportar criação offline no NewCriterionDialog |
| `src/components/biblioteca/CriterionFormModal.tsx` | Suportar criação offline na biblioteca de critérios |

## Detalhes Técnicos

### 1. Novas Funções em offlineStorage.ts

Adicionar as seguintes funções para gerenciar critérios offline:

```typescript
// Interface para critério offline
export interface OfflineCriterion {
  id: string;                    // offline_[timestamp]_[random]
  company_id: string;
  name: string;
  description: string | null;
  senso: string[] | null;
  scoring_type: string;
  origin: 'custom' | 'master';
  status: 'active';
  master_criterion_id?: string | null;
  _isOffline: true;
  _linkedEnvironmentId?: string; // Se vinculado a um local
}

// Criar critério offline
export const createOfflineCriterion = async (
  criterionData: Omit<OfflineCriterion, 'id' | '_isOffline'>,
  linkedEnvironmentId?: string
): Promise<OfflineCriterion> => {
  const id = generateOfflineId();
  
  const criterion: OfflineCriterion = {
    ...criterionData,
    id,
    _isOffline: true,
    _linkedEnvironmentId: linkedEnvironmentId,
  };
  
  // Salvar no cache local
  await addToStore('criteria', criterion);
  
  // Adicionar pendingSync para sincronização
  await addPendingSync('create', 'offline_criterion', {
    criterion: criterionData,
    linkedEnvironmentId,
  });
  
  return criterion;
};

// Buscar critérios offline
export const getOfflineCriteria = async (): Promise<OfflineCriterion[]> => {
  const allCriteria = await getAllFromStore<any>('criteria');
  return allCriteria.filter(c => c._isOffline === true);
};
```

### 2. Sincronização em useOfflineSync.ts

Adicionar handler para sincronizar critérios criados offline:

```typescript
// Dentro de syncPendingChanges, adicionar:

// Handle offline criterion creation
if (item.type === 'create' && item.table === 'offline_criterion') {
  const { criterion, linkedEnvironmentId } = item.data;
  
  // Criar critério no servidor
  const { data: createdCriterion, error: criterionError } = await supabase
    .from('company_criteria')
    .insert({
      company_id: criterion.company_id,
      name: criterion.name,
      description: criterion.description,
      senso: criterion.senso,
      scoring_type: criterion.scoring_type,
      origin: criterion.origin,
      master_criterion_id: criterion.master_criterion_id,
      status: 'active'
    })
    .select()
    .single();

  if (criterionError) {
    console.error('Error creating criterion:', criterionError);
    errorCount++;
    continue;
  }

  // Se estava vinculado a um local, criar o link
  if (linkedEnvironmentId) {
    await supabase
      .from('environment_criteria')
      .insert({
        environment_id: linkedEnvironmentId,
        criterion_id: createdCriterion.id
      });
  }

  // Remover do cache offline
  const offlineCriteria = await getOfflineCriteria();
  const matchingCriterion = offlineCriteria.find(
    c => c.company_id === criterion.company_id && 
         c.name === criterion.name
  );
  if (matchingCriterion) {
    await deleteFromStore('criteria', matchingCriterion.id);
  }

  await removePendingSync(item.id);
  syncedCount++;
  continue;
}
```

### 3. Modificar NewCriterionDialog em ManageCriteriaModal.tsx

Atualizar para suportar criação offline:

```typescript
function NewCriterionDialog({ isOpen, onClose, companyId, onCreated }: NewCriterionDialogProps) {
  const { isOffline } = useAuth(); // Adicionar
  // ... estados existentes ...

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Digite o nome do critério');
      return;
    }

    setSaving(true);
    try {
      // MODO OFFLINE
      if (!navigator.onLine || isOffline) {
        const { createOfflineCriterion } = await import('@/lib/offlineStorage');
        
        const offlineCriterion = await createOfflineCriterion({
          company_id: companyId,
          name: name.trim(),
          description: description.trim() || null,
          senso: senso.length > 0 ? senso : null,
          scoring_type: 'conform-non-conform',
          origin: 'custom',
          status: 'active',
        });

        toast.success('Critério salvo localmente!', {
          description: 'Será sincronizado quando você voltar online.'
        });
        
        onCreated({
          id: offlineCriterion.id,
          name: offlineCriterion.name,
          description: offlineCriterion.description,
          senso: offlineCriterion.senso,
          scoring_type: offlineCriterion.scoring_type,
        });
        return;
      }

      // MODO ONLINE - código existente
      const { data: newCriterion, error } = await supabase
        .from('company_criteria')
        .insert({ /* ... */ })
        .select()
        .single();

      // ... resto do código existente ...
    } catch (error) {
      // ...
    } finally {
      setSaving(false);
    }
  };

  // UI: Mostrar indicador de modo offline
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Novo Critério
            {isOffline && (
              <Badge variant="outline" className="ml-2 text-amber-500">
                Offline
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        {/* ... resto do formulário ... */}
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Modificar CriterionFormModal.tsx

Similarmente, atualizar o modal da biblioteca de critérios para suportar offline:

```typescript
const onSubmit = async (data: CriterionFormValues) => {
  setIsSubmitting(true);

  try {
    // MODO OFFLINE
    if (!navigator.onLine || isOffline) {
      const { createOfflineCriterion } = await import('@/lib/offlineStorage');
      
      const companyId = data.companyId === "all" ? "" : (data.companyId || "");
      
      if (companyId) {
        // Critério para empresa específica
        await createOfflineCriterion({
          company_id: companyId,
          name: data.name,
          description: data.description || null,
          senso: data.senso,
          scoring_type: data.scoreType,
          origin: 'custom',
          status: 'active',
        });
        
        toast({
          title: "Critério salvo localmente",
          description: "Será sincronizado quando você voltar online."
        });
      } else {
        // Critério global - NÃO PODE SER CRIADO OFFLINE
        toast({
          title: "Não disponível offline",
          description: "Critérios globais só podem ser criados online.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      onClose();
      return;
    }

    // MODO ONLINE - código existente
    // ...
  } finally {
    setIsSubmitting(false);
  }
};
```

## Fluxo Completo

```text
USUÁRIO OFFLINE
     │
     ▼
┌─────────────────┐
│ Clica "Novo     │
│ Critério"       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────┐
│ Sistema detecta │────▶│ Gera ID offline_xxx              │
│ isOffline=true  │     │ Salva no IndexedDB (criteria)    │
└─────────────────┘     │ Adiciona pendingSync             │
                        │ Mostra toast de sucesso          │
                        └──────────────────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────────┐
                        │ Critério aparece na lista com    │
                        │ badge "Offline" ou "Pendente"    │
                        └──────────────────────────────────┘

VOLTA ONLINE
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ OfflineSyncProvider detecta navigator.onLine = true    │
│ syncPendingChanges() é executado                       │
│                                                         │
│ Para cada pendingSync com table='offline_criterion':   │
│   1. INSERT no company_criteria                         │
│   2. Se linkedEnvironmentId, INSERT em environment_    │
│      criteria                                           │
│   3. Deleta registro offline do IndexedDB              │
│   4. Remove pendingSync                                │
└─────────────────────────────────────────────────────────┘
```

## Considerações Importantes

1. **Critérios Globais (master_criteria)**: Não podem ser criados offline pois requerem permissões de IFA Admin e validação do servidor

2. **Vinculação a Locais**: Se o critério foi criado dentro do ManageCriteriaModal, ele já deve ser automaticamente vinculado ao local selecionado

3. **Conflitos de Nome**: O sistema permitirá criar critérios com nomes duplicados offline - a validação de unicidade acontece na sincronização

4. **UI Feedback**: Adicionar badge visual indicando que critérios estão pendentes de sincronização

## Checklist de Validação

Após implementação, verificar:

- [ ] Criar critério offline no ManageCriteriaModal
- [ ] Critério aparece na lista localmente
- [ ] Toast confirma salvamento offline
- [ ] Voltar online e verificar sincronização
- [ ] Critério aparece no banco de dados
- [ ] Link environment_criteria criado corretamente
- [ ] Criar critério offline na BibliotecaCriterios
- [ ] Bloquear criação de critério global offline
