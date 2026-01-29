
# Plano: Sistema de Auditoria 100% Offline - Correção Completa

## Diagnóstico Completo

Após análise detalhada de todo o fluxo offline, identifiquei **7 problemas críticos** que impedem o funcionamento completo:

---

## Problemas Identificados

### 1. ChecklistItem.tsx - Foto antes de resposta falha
**Linha 163**: Quando o usuário anexa foto ANTES de responder a pergunta, `localAnswer` é `null`, e o código chama:
```typescript
onAnswerChange(item.id, currentAnswer as boolean, updatedPhotos, comment);
```
Isso força um cast de `null` para `boolean`, causando comportamento incorreto.

### 2. AuditChecklist.tsx - handleAnswerChange ignora null
**Linha 185-195**: Quando `shouldUseOfflineMode` é true, o salvamento funciona, MAS se `answer` for `null` (foto adicionada antes de responder), o item não é salvo corretamente.

### 3. AuditChecklist.tsx - handleSaveDraft depende de initDB() que pode falhar silenciosamente
**Linha 216**: O `initDB()` é chamado, mas se falhar, o código continua e tenta salvar em um DB não inicializado.

### 4. AuditChecklist.tsx - handleComplete não verifica se items estão no cache
**Linha 391-393**: O loop `for (const item of items)` usa o estado local, mas não garante que os items têm `audit_id` correto.

### 5. useOfflineSync.ts - Sincronização não encontra audit offline correto
**Linha 186-197**: A busca por `matchingOfflineAudit` usa comparação de campos que podem não ser únicos, causando sincronização incorreta.

### 6. Falta de verificação de erro em addToStore
Em vários lugares, `addToStore` é chamado sem tratamento de erro adequado, fazendo operações silenciosamente falharem.

### 7. O fluxo de salvamento não persiste o audit quando criado offline
Em `NovaAuditoria.tsx`, quando cria auditoria offline, o `createOfflineAudit` já salva no IndexedDB. Porém, as atualizações subsequentes no `AuditChecklist` podem não estar encontrando o registro correto.

---

## Solução Técnica

### Fase 1: Corrigir ChecklistItem para fotos sem resposta

**Arquivo: `src/components/auditoria/ChecklistItem.tsx`**
- Permitir adicionar foto mesmo sem resposta selecionada
- Não forçar cast de `null` para `boolean`
- Atualizar o callback para aceitar `answer: boolean | null`

### Fase 2: Corrigir AuditChecklist para salvar corretamente

**Arquivo: `src/components/auditoria/AuditChecklist.tsx`**
- Melhorar `handleAnswerChange` para aceitar `null` e ainda salvar no cache
- Adicionar try-catch robusto em `handleSaveDraft` com fallback
- Garantir que `audit_id` está correto em todos os items antes de salvar
- Verificar se o audit existe no cache antes de tentar atualizar
- Adicionar logs detalhados para debug

### Fase 3: Corrigir interface de AuditItem

**Arquivo: `src/types/audit.ts`**
- Verificar que `answer` pode ser `boolean | null`

### Fase 4: Melhorar sincronização

**Arquivo: `src/hooks/useOfflineSync.ts`**
- Usar `auditId` do pending sync data em vez de buscar por campos
- Melhorar matching de auditorias offline

### Fase 5: Garantir persistência imediata

**Arquivo: `src/lib/offlineStorage.ts`**
- Adicionar função `ensureAuditInCache` que cria o registro se não existir
- Melhorar logs de debug

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/auditoria/ChecklistItem.tsx` | Aceitar foto sem resposta |
| `src/components/auditoria/AuditChecklist.tsx` | Salvamento robusto offline |
| `src/lib/offlineStorage.ts` | Função auxiliar para garantir cache |
| `src/hooks/useOfflineSync.ts` | Melhorar sincronização |

---

## Detalhes Técnicos

### Correção 1: ChecklistItem - Foto sem resposta

```typescript
// ANTES (problemático)
const currentAnswer = localAnswer !== undefined ? localAnswer : null;
onAnswerChange(item.id, currentAnswer as boolean, updatedPhotos, comment);

// DEPOIS (correto)
// Manter a resposta atual (pode ser null, true ou false)
// O parent deve aceitar answer: boolean | null
onAnswerChange(item.id, localAnswer ?? null, updatedPhotos, comment);
```

### Correção 2: AuditChecklist - handleAnswerChange robusto

```typescript
// Aceitar answer como boolean | null para permitir fotos antes de resposta
const handleAnswerChange = async (
  itemId: string, 
  answer: boolean | null,  // <-- Aceitar null
  photoUrls?: string[], 
  comment?: string
) => {
  const updatedItems = items.map(item =>
    item.id === itemId
      ? { 
          ...item, 
          answer,  // Pode ser null
          photo_url: photoUrls && photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
          comment: comment !== undefined ? comment : item.comment
        }
      : item
  );
  setItems(updatedItems);

  // SEMPRE salvar no cache offline, mesmo com answer null
  if (shouldUseOfflineMode) {
    const updatedItem = updatedItems.find(i => i.id === itemId);
    if (updatedItem) {
      try {
        await initDB(); // Garantir DB inicializado
        await addToStore('auditItems', { ...updatedItem, audit_id: auditId });
        console.log(`[AuditChecklist] ✅ Item ${itemId} saved`, { answer, hasPhotos: !!photoUrls?.length });
      } catch (err) {
        console.error(`[AuditChecklist] ❌ Failed to save item ${itemId}:`, err);
      }
    }
  }
};
```

### Correção 3: handleSaveDraft com verificação robusta

```typescript
const handleSaveDraft = async () => {
  setIsSaving(true);
  try {
    // CRÍTICO: Inicializar DB primeiro e verificar sucesso
    try {
      await initDB();
    } catch (dbError) {
      console.error('[AuditChecklist] ❌ Failed to init DB:', dbError);
      throw new Error('Não foi possível acessar o armazenamento offline');
    }
    
    // Garantir que o audit existe no cache
    let auditData = await getFromStore<any>('audits', auditId);
    if (!auditData) {
      console.log('[AuditChecklist] Creating missing audit in cache');
      auditData = {
        id: auditId,
        status: 'in_progress',
        total_questions: items.length,
        started_at: new Date().toISOString(),
        _isOffline: true,
      };
    }
    
    // Atualizar contagens
    auditData.total_questions = items.length;
    auditData.total_yes = items.filter(i => i.answer === true).length;
    auditData.total_no = items.filter(i => i.answer === false).length;
    auditData.updated_at = new Date().toISOString();
    
    await addToStore('audits', auditData);
    
    // Salvar todos os items
    let savedCount = 0;
    for (const item of items) {
      try {
        await addToStore('auditItems', { ...item, audit_id: auditId });
        savedCount++;
      } catch (itemError) {
        console.error('[AuditChecklist] ❌ Error saving item:', item.id, itemError);
      }
    }
    
    toast({
      title: "✅ Rascunho salvo offline",
      description: `${savedCount}/${items.length} itens salvos localmente.`
    });
    
  } catch (error) {
    // ...
  }
};
```

---

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────────┐
│  1. Usuário inicia auditoria                        │
│  2. createOfflineAudit salva audit + items no cache │
│  3. Cada interação salva IMEDIATAMENTE no cache     │
│     - Resposta (sim/não)                            │
│     - Foto (Base64 no offlinePhotos)                │
│     - Comentário                                    │
│  4. "Salvar Rascunho" atualiza contagens            │
│  5. "Finalizar" calcula score e marca completed     │
│  6. Tudo persiste localmente ✓                      │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
                 VOLTA ONLINE
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  1. Sync automático detecta pending syncs           │
│  2. Cria audit no servidor → ID real                │
│  3. Upload fotos offline → URLs reais               │
│  4. Cria audit_items com dados completos            │
│  5. Marca audit como completed se necessário        │
│  6. Remove dados offline do cache                   │
└─────────────────────────────────────────────────────┘
```

---

## Checklist de Validação

Após implementação, o sistema deve:

- [ ] Criar nova auditoria 100% offline
- [ ] Permitir anexar fotos ANTES de responder pergunta
- [ ] Salvar rascunho com sucesso offline (toast confirma)
- [ ] Manter dados entre fechamento/abertura do app offline
- [ ] Finalizar auditoria offline com cálculo de score
- [ ] Exibir resultado da auditoria offline
- [ ] Sincronizar automaticamente ao voltar online
- [ ] Enviar fotos para o servidor durante sync
- [ ] Substituir URLs offline por URLs reais
