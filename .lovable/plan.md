
# Plano: Corrigir Carregamento de Fotos no Relatório PDF

## Problema Identificado
As fotos não aparecem no PDF porque a função `fetchImageAsBase64` usa `Image` com `crossOrigin = 'anonymous'`, que é bloqueado por CORS ao acessar imagens do Supabase Storage.

## Diagnóstico
- **Dados OK**: As URLs das fotos estão corretas no banco de dados
- **Bloqueio CORS**: O navegador bloqueia o canvas quando a imagem vem de domínio externo (Supabase Storage)
- **Timeout**: O timeout de 2s pode estar atingindo antes da imagem carregar devido ao bloqueio

## Solução Técnica
Substituir o método `Image` + `canvas` por `fetch` + `FileReader` que não sofre bloqueio CORS:

### Alterações em `src/lib/reports/reportDataFormatter.ts`

```typescript
// ANTES: Usa Image (bloqueado por CORS)
const img = new Image();
img.crossOrigin = 'anonymous';
img.src = url;

// DEPOIS: Usa fetch + blob (funciona com Supabase Storage)
const response = await fetch(url);
const blob = await response.blob();
const reader = new FileReader();
reader.readAsDataURL(blob);
```

### Implementação Detalhada

1. **Reescrever `fetchImageAsBase64`**:
   - Usar `fetch()` para baixar a imagem como blob
   - Converter blob para base64 usando `FileReader`
   - Manter timeout de 3 segundos por segurança
   - Adicionar compressão usando canvas após carregar o blob

2. **Otimizações**:
   - Aumentar `IMAGE_TIMEOUT` para 3s (dar mais tempo para carregar)
   - Reduzir tamanho máximo da imagem para 500px (PDF menor)
   - Compressão JPEG 0.65 (boa qualidade, arquivo menor)

## Resultado Esperado
- PDF gerará em ~5-10 segundos (dependendo do número de fotos)
- Todas as fotos das não conformidades aparecerão no relatório
- Sem bloqueio CORS

## Arquivos a Modificar
- `src/lib/reports/reportDataFormatter.ts` - reescrever `fetchImageAsBase64`
