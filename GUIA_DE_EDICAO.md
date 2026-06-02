# Guia de edição da A11y Dev Helper

Este guia é para quem vai abrir o repositório pela primeira vez e começar a mexer na extensão.

## Antes de começar

Você precisa ter instalado:

- Node.js
- npm
- Visual Studio Code
- Git

Depois de clonar o repositório, instale as dependências:

```bash
npm install
```

Compile para confirmar que o ambiente está funcionando:

```bash
npm run compile
```

Também é recomendado rodar o lint:

```bash
npm run lint
```

## Como executar a extensão em modo de desenvolvimento

1. Abra a pasta do projeto no VS Code.
2. Pressione `F5`.
3. O VS Code abrirá uma nova janela chamada Extension Development Host.
4. Nessa nova janela, abra um arquivo `.html`, `.jsx` ou `.tsx`.
5. Escreva algum código que viole uma regra, por exemplo uma imagem sem `alt`.
6. Confira o aviso no painel `Problems`.

Quando alterar o código da extensão, recompile ou use o modo watch:

```bash
npm run watch
```

Depois, recarregue a janela Extension Development Host com `Ctrl+R`.

## Estrutura principal

```text
src/
├── extension.ts
├── utils/
│   └── diagnostics.ts
└── rules/
    ├── index.ts
    ├── imgAlt.ts
    ├── linkText.ts
    ├── divSpanOnClick.ts
    ├── autofocus.ts
    ├── htmlLang.ts
    ├── inputLabel.ts
    └── buttonName.ts
```

## Responsabilidade de cada parte

`src/extension.ts` é o ponto de entrada da extensão. Ele registra a coleção de diagnostics, escuta eventos do VS Code, lê configurações do usuário e executa as regras habilitadas.

Esse arquivo não deve conter lógica específica de regras de acessibilidade. Se uma regra nova precisar de regex, validação ou mensagem própria, isso deve ficar em um arquivo dentro de `src/rules/`.

`src/utils/diagnostics.ts` contém os itens compartilhados:

- interface `A11yRule`;
- função `makeDiagnostic`.

`src/rules/index.ts` importa todas as regras e exporta o array `allRules`.

Cada arquivo dentro de `src/rules/` representa uma regra independente.

## Como uma regra funciona

Todas as regras seguem esta interface:

```typescript
interface A11yRule {
  id: string;
  check: (text: string, document: vscode.TextDocument) => vscode.Diagnostic[];
}
```

A função `check` recebe:

- `text`: o conteúdo completo do documento;
- `document`: o documento do VS Code, usado para calcular posições e criar diagnostics.

A regra deve retornar uma lista de `vscode.Diagnostic`.

## Como criar uma nova regra

1. Crie um arquivo em `src/rules/`.
2. Importe `vscode`, `A11yRule` e `makeDiagnostic`.
3. Exporte uma única constante que implemente `A11yRule`.
4. Adicione um JSDoc curto explicando o que a regra detecta.
5. Documente cada regex com JSDoc e uma nota sobre migração futura para parser/AST.
6. Importe a regra em `src/rules/index.ts`.
7. Adicione a regra ao array `allRules`.
8. Adicione a regra ao objeto `a11yDevHelper.rules.default` em `package.json`.

Exemplo de estrutura:

```typescript
// src/rules/exampleRule.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detects an example accessibility issue. */
export const exampleRule: A11yRule = {
  id: "example-rule",
  check(text, document) {
    /**
     * Matches an example pattern.
     * NOTE: Regex is used for MVP. Replace with AST parsing for accurate detection.
     */
    const exampleRegex = /example/gi;

    return [...text.matchAll(exampleRegex)].flatMap((match) => [
      makeDiagnostic(
        document,
        match.index,
        match[0].length,
        "Mensagem clara explicando o problema e sugerindo uma correção.",
        vscode.DiagnosticSeverity.Warning,
      ),
    ]);
  },
};
```

## Padrões de código que devem ser mantidos

- Use TypeScript com tipos explícitos quando isso melhorar a leitura.
- Não use `any`.
- Não adicione bibliotecas externas sem necessidade real.
- Prefira `Set` e `.has()` para listas de valores conhecidos.
- Prefira `flatMap` para coletar diagnostics.
- Mantenha `src/extension.ts` sem regex e sem lógica de regra.
- Use `ReturnType<typeof setTimeout>` para timers.
- Escreva mensagens de diagnóstico claras e acionáveis.

## Como testar alterações

Rode a compilação:

```bash
npm run compile
```

Rode o lint:

```bash
npm run lint
```

Rode os testes:

```bash
npm test
```

Se o runner de testes do VS Code falhar por problema de ambiente, caminho local ou inicialização do Electron, registre o erro encontrado e confirme pelo menos `npm run compile` e `npm run lint`.

## Como testar uma regra manualmente

1. Pressione `F5` para abrir a janela Extension Development Host.
2. Crie ou abra um arquivo suportado.
3. Escreva um exemplo que deve disparar a regra.
4. Confirme que o aviso aparece no painel `Problems`.
5. Escreva um exemplo corrigido.
6. Confirme que o aviso desaparece.

Exemplos úteis:

```html
<img src="foto.png">
<a href="/sobre">clique aqui</a>
<input id="email">
<button><span></span></button>
```

## Cuidados ao alterar regras

As regras atuais usam regex. Isso é intencional para manter o projeto simples no MVP, mas regex tem limitações para HTML, JSX e TSX complexos.

Antes de mudar uma regra, pense nos seguintes casos:

- O código pode estar em HTML puro ou JSX/TSX.
- Atributos podem usar aspas simples ou duplas.
- Pode haver tags internas dentro de links e botões.
- Algumas regras precisam cruzar informações de elementos diferentes, como `label` e `input`.
- Conteúdo dinâmico nem sempre será detectável por regex.

Quando a regra começar a ficar complexa demais, o próximo passo recomendado é migrar aquela análise para parser/AST.

## Checklist antes de abrir um pull request

- O projeto compila com `npm run compile`.
- O lint passa com `npm run lint`.
- A extensão foi testada manualmente no Extension Development Host.
- Novas regras foram adicionadas em `src/rules/index.ts`.
- Novas regras foram adicionadas à configuração em `package.json`.
- O README ou este guia foi atualizado se a mudança alterar o funcionamento da extensão.
