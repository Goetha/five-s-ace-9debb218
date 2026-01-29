
# Plano: Auditorias 100% Funcionais Offline

## Problemas Identificados

Após análise detalhada do código, identifiquei **5 problemas críticos** que impedem o funcionamento offline completo:

### 1. **Upload de Fotos (Crítico)**
O `ChecklistItem.tsx` tenta fazer upload para o Supabase Storage diretamente (linha 109):
```typescript
await supabase.storage.from('audit-photos').upload(...)
```
Isso **falha imediatamente offline** porque requer conexão com o servidor.

### 2. **AuditResult não funciona offline**
O `AuditResult.tsx` busca dados do Supabase diretamente (linha 37-44):
```typescript
const { data, error } = await supabase.from('audits').select(...)
```
Se offline, o resultado da auditoria não aparece.

### 3. **Salvamento de observações offline**
O `handleSave` no `AuditResult.tsx` só funciona online (linha 73-79).

### 4. **NovaAuditoria não passa flag isOfflineAudit**
O `AuditChecklist` recebe `isOfflineAudit` como prop mas `NovaAuditoria.tsx` não a passa quando cria auditoria offline.

### 5. **Sincronização incompleta de audit_items**
O `useOfflineSync.ts` não sincroniza corretamente as respostas dos itens e fotos quando volta online.

---

## Solução Técnica

### Fase 1: Armazenamento de Fotos Local (Base64 no IndexedDB)

**Arquivo: `src/lib/offlineStorage.ts`**
- Adicionar store `offlinePhotos` para armazenar fotos como Base64
- Criar funções: `saveOfflinePhoto()`, `getOfflinePhoto()`, `deleteOfflinePhoto()`
- Fotos são convertidas para Base64 e armazenadas localmente
- Gerar URL temporário formato: `offline://photo_${timestamp}`

**Arquivo: `src/components/auditoria/ChecklistItem.tsx`**
- Detectar modo offline antes de tentar upload
- Converter foto para Base64 usando FileReader
- Salvar no IndexedDB com `saveOfflinePhoto()`
- Usar URL offline como referência no `photo_url`

### Fase 2: AuditResult Offline

**Arquivo: `src/components/auditoria/AuditResult.tsx`**
- Adicionar lógica para buscar do cache quando offline
- Usar `getFromStore('audits', auditId)` como fallback
- Salvar observações no cache local quando offline
- Adicionar flag visual "Modo Offline"

### Fase 3: Corrigir Props e Fluxo

**Arquivo: `src/pages/auditor/NovaAuditoria.tsx`**
- Passar `isOfflineAudit={isOfflineId(auditId)}` para `AuditChecklist`
- Garantir que `AuditResult` também receba flag offline

### Fase 4: Sincronização Completa ao Voltar Online

**Arquivo: `src/hooks/useOfflineSync.ts`**
Melhorar sincronização para incluir:

1. **Upload de fotos pendentes**:
   - Buscar todas as fotos com URL `offline://`
   - Fazer upload para Supabase Storage
   - Substituir URLs locais por URLs reais

2. **Sincronizar audit_items**:
   - Atualizar cada item com resposta, comentário e nova URL da foto

3. **Ordem correta de sincronização**:
   - Primeiro: criar auditoria → obter ID real
   - Segundo: fazer upload das fotos → obter URLs reais
   - Terceiro: criar audit_items com URLs corretas
   - Quarto: completar auditoria se necessário

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/lib/offlineStorage.ts` | Adicionar store e funções para fotos offline |
| `src/components/auditoria/ChecklistItem.tsx` | Upload de fotos offline com Base64 |
| `src/components/auditoria/AuditResult.tsx` | Buscar do cache quando offline |
| `src/pages/auditor/NovaAuditoria.tsx` | Passar flag isOfflineAudit |
| `src/hooks/useOfflineSync.ts` | Sincronização completa de fotos e itens |

---

## Fluxo de Funcionamento

```
                    OFFLINE
                    
┌─────────────────────────────────────────────────────┐
│  1. Usuário tira foto                               │
│  2. Foto → Base64 → IndexedDB (offlinePhotos)       │
│  3. URL: "offline://photo_123456"                   │
│  4. audit_item.photo_url = ["offline://photo_123"]  │
│  5. Tudo salvo localmente ✓                         │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
                 VOLTA ONLINE
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  1. Sync: criar audit → ID real                     │
│  2. Para cada foto offline://:                      │
│     - Buscar Base64 do IndexedDB                    │
│     - Upload para Supabase Storage                  │
│     - Obter URL pública                             │
│  3. Criar audit_items com URLs reais                │
│  4. Limpar dados offline                            │
└─────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Nova Estrutura IndexedDB

```typescript
// offlinePhotos store
interface OfflinePhoto {
  id: string;          // "offline://photo_123456"
  auditItemId: string; // ID do item relacionado
  base64: string;      // "data:image/jpeg;base64,..."
  fileName: string;    // "photo_123456.jpg"
  createdAt: string;
}
```

### Lógica de Upload Offline

```typescript
// ChecklistItem.tsx - Modificação
if (isOffline || !navigator.onLine) {
  // Converter para Base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target?.result as string;
    const photoId = `offline://photo_${Date.now()}`;
    
    // Salvar no IndexedDB
    await saveOfflinePhoto({
      id: photoId,
      auditItemId: item.id,
      base64,
      fileName: file.name,
      createdAt: new Date().toISOString()
    });
    
    // Atualizar estado com URL offline
    const updatedPhotos = [...photoUrls, photoId];
    onAnswerChange(item.id, localAnswer!, updatedPhotos, comment);
  };
  reader.readAsDataURL(file);
  return;
}
```

---

## Resultado Esperado

Após implementação:
- ✅ Criar nova auditoria offline
- ✅ Responder perguntas offline
- ✅ Tirar e anexar fotos offline (salvas localmente como Base64)
- ✅ Ver resultado da auditoria offline
- ✅ Salvar rascunho offline
- ✅ Finalizar auditoria offline
- ✅ Sincronização automática quando voltar online
- ✅ Upload de fotos para o servidor quando online
- ✅ Substituição de URLs locais por URLs reais

O usuário poderá fazer auditorias completas em ambientes sem Wi-Fi (galpões, fábricas, etc.) e os dados serão sincronizados automaticamente ao reconectar.
