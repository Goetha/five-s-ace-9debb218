

# Plano: Corrigir Criacao de Criterios Offline na Biblioteca

## Problema Identificado

Quando o usuario cria um criterio offline no modal, se ele selecionar "Todas as empresas" (ou deixar em branco), o `companyId` fica vazio. No codigo de `handleSaveCriterion`, isso faz o fluxo cair no bloco de "criterio global" (linha 328), que exibe o toast **"Nao disponivel offline"** e descarta o criterio silenciosamente.

O criterio so e salvo offline se o usuario selecionar uma empresa especifica -- mas isso nao esta claro na interface.

## Solucao

### Arquivo 1: `src/components/biblioteca/CriterionFormModal.tsx`

Quando offline, tornar a selecao de empresa **obrigatoria** e desabilitar a opcao "Todas as empresas":

- Adicionar validacao condicional: se `!navigator.onLine`, o campo `companyId` deve ser diferente de vazio e diferente de `"all"`
- Mostrar mensagem de aviso no campo empresa quando offline: "Selecione uma empresa. Criterios globais so podem ser criados online."
- Desabilitar o item "Todas as empresas" no Select quando offline

### Arquivo 2: `src/pages/BibliotecaCriterios.tsx`

Adicionar uma protecao extra no `handleSaveCriterion`: quando offline e `companyId` estiver vazio, mostrar toast orientando o usuario a selecionar uma empresa em vez da mensagem generica "Nao disponivel offline".

## Detalhes Tecnicos

### CriterionFormModal.tsx

```typescript
// No onSubmit, validar antes de enviar:
if (!navigator.onLine && (!data.companyId || data.companyId === "all")) {
  toast({ title: "Selecione uma empresa",
    description: "No modo offline, voce precisa selecionar uma empresa especifica.",
    variant: "destructive" });
  return;
}

// No Select de empresa, desabilitar "Todas as empresas" quando offline:
<SelectItem value="all" disabled={!navigator.onLine}>
  <span className={!navigator.onLine ? "text-muted-foreground" : "font-medium"}>
    Todas as empresas {!navigator.onLine && "(indisponivel offline)"}
  </span>
</SelectItem>
```

### BibliotecaCriterios.tsx

```typescript
// No bloco else (linha 328), melhorar a mensagem quando offline:
if (isOfflineMode) {
  toast({
    title: "Selecione uma empresa",
    description: "No modo offline, selecione uma empresa especifica para criar o criterio.",
    variant: "destructive",
  });
  return;
}
```

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/biblioteca/CriterionFormModal.tsx` | Desabilitar "Todas as empresas" offline + validacao no submit |
| `src/pages/BibliotecaCriterios.tsx` | Melhorar mensagem de erro quando companyId vazio offline |

## Resultado Esperado

- Offline: usuario ve que precisa selecionar empresa especifica
- Offline: opcao "Todas as empresas" fica desabilitada com indicacao visual
- Offline: criterio e salvo localmente e aparece na lista imediatamente
- Online: comportamento inalterado

