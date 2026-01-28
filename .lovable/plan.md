
# Plano: Corrigir Carregamento Inconsistente de Fotos no PDF

## Problema Identificado
Pela análise do código e dados:
- **Dados OK**: Todas as não conformidades têm `photo_url` no banco de dados
- **Problema**: Algumas imagens carregam e outras não porque `loadImageViaElement` **não tem timeout**
- Se o `Image.onload` nunca disparar, a promise fica pendente para sempre, fazendo com que algumas fotos não apareçam

## Causa Raiz
```typescript
// PROBLEMA: loadImageViaElement não tem timeout!
function loadImageViaElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);  // ← Pode nunca disparar!
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
```

## Solução Técnica

### 1. Adicionar timeout ao loadImageViaElement
```typescript
function loadImageViaElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Timeout de 3 segundos para carregamento da imagem
    const timeout = setTimeout(() => {
      console.warn(`[Image] Timeout loading image element`);
      resolve(null);
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    img.src = url;
  });
}
```

### 2. Adicionar fallback para retornar base64 direto do blob
Se a compressão via canvas falhar, retornar o base64 direto do blob via FileReader:

```typescript
// Fallback: converter blob para base64 sem compressão
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### 3. Melhorar logging para debug
Adicionar logs mais detalhados em cada etapa para facilitar debug futuro

## Arquivos a Modificar
- `src/lib/reports/reportDataFormatter.ts`

## Resultado Esperado
- **100% das fotos** devem aparecer no PDF (desde que existam no storage)
- Fallback garante que mesmo se canvas falhar, a foto aparece
- Timeout previne travamento infinito
