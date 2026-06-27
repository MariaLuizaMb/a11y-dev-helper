# Guia de edição da A11y Dev Helper

Este guia é para quem abrir o repositório pela primeira vez e começar a contribuir com a extensão.

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

Também é recomendável validar o lint:

```bash
npm run lint
```

## Como executar a extensão em modo de desenvolvimento

1. Abra a pasta do projeto no VS Code.
2. Pressione `F5`.
3. O VS Code abrirá uma nova janela chamada Extension Development Host.
4. Nessa nova janela, abra um arquivo `.html`, `.jsx` ou `.tsx`.
5. Escreva algum código que viole uma regra, como uma imagem sem `alt`.
6. Confira o aviso no painel `Problems`.

Quando alterar o código da extensão, recompile ou rode o modo watch:

```bash
npm run watch
```

Depois, recarregue a janela Extension Development Host com `Ctrl+R`.

## Estrutura atual do projeto

```text
src/
├── extension.ts
├── utils/
│   ├── colorContrast.ts
│   ├── diagnostics.ts
│   └── htmlAst.ts
├── rules/
│   ├── index.ts
│   ├── ariaRole.ts
│   ├── autofocus.ts
│   ├── buttonEmojionly.ts
│   ├── buttonName.ts
│   ├── colorContrast.ts
│   ├── contrast/
│   │   ├── cssInJs.ts
│   │   ├── inlineStyle.ts
│   │   └── tailwindClasses.ts
│   ├── divSpanOnClick.ts
│   ├── fieldsetLegend.ts
│   ├── headingOrder.ts
│   ├── htmlLang.ts
│   ├── iframeTitle.ts
│   ├── imgAlt.ts
│   ├── inputLabel.ts
│   ├── inputPlaceholdernoLabel.ts
│   ├── linkNoHref.ts
│   ├── linkText.ts
│   ├── newRules.ts
│   ├── selectLabel.ts
│   ├── smallFontSize.ts
│   ├── tableCaption.ts
│   ├── tabIndexPositive.ts
│   └── videoTrack.ts
└── test/
    └── rules.test.ts
```

## Responsabilidade de cada parte

- `src/extension.ts` é o ponto de entrada da extensão. Ele registra a coleção de diagnostics, escuta eventos do VS Code, lê a configuração do usuário e executa as regras habilitadas.
- `src/utils/diagnostics.ts` define a interface `A11yRule` e o helper `makeDiagnostic`.
- `src/utils/htmlAst.ts` concentra a leitura de árvore sintática para HTML, JSX e TSX, usando `parse5` e `@babel/parser`.
- `src/rules/index.ts` importa todas as regras e exporta o array `allRules`.
- Cada arquivo em `src/rules/` representa uma regra independente ou um grupo de lógica relacionada.

O fluxo principal da extensão é:

1. o documento é aberto ou alterado;
2. o conteúdo é parseado para uma estrutura intermediária;
3. cada regra habilitada é executada;
4. os diagnostics são enviados para o painel `Problems` do VS Code.

## Como uma regra funciona

Todas as regras seguem esta interface:

```typescript
interface A11yRule {
  id: string;
  check: (
    text: string,
    document: vscode.TextDocument,
    ast?: ParsedNode,
  ) => vscode.Diagnostic[];
}
```

A função `check` recebe:

- `text`: o conteúdo completo do documento;
- `document`: o documento do VS Code, usado para calcular posições e criar diagnostics;
- `ast`: a árvore parseada opcionalmente disponibilizada para regras que precisam de contexto estrutural.

A regra deve retornar uma lista de `vscode.Diagnostic`.

## Como criar uma nova regra

1. Crie um arquivo em `src/rules/`.
2. Importe `vscode`, `A11yRule` e `makeDiagnostic`.
3. Exporte uma única constante que implemente `A11yRule`.
4. Adicione um JSDoc curto explicando o que a regra detecta.
5. Se a regra depender de estrutura, use o parâmetro `ast` em vez de depender apenas de regex simples.
6. Importe a regra em `src/rules/index.ts`.
7. Adicione a regra ao array `allRules`.
8. Adicione a regra ao objeto `a11yDevHelper.rules.default` em `package.json`.

Exemplo de estrutura:

```typescript
// src/rules/exampleRule.ts
import * as vscode from "vscode";
import { A11yRule, makeDiagnostic } from "../utils/diagnostics";

/** Detecta um problema de acessibilidade de exemplo. */
export const exampleRule: A11yRule = {
  id: "example-rule",
  check(text, document, ast) {
    const exampleRegex = /example/gi;

    return [...text.matchAll(exampleRegex)].flatMap((match) => [
      makeDiagnostic(
        document,
        match.index ?? 0,
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
- Mantenha `src/extension.ts` sem lógica específica de regra.
- Use `ReturnType<typeof setTimeout>` para timers.
- Escreva mensagens de diagnóstico claras e acionáveis.
- Quando a regra ficar complexa, prefira analisar a árvore parseada em vez de depender apenas de regex.

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

A extensão já usa uma abordagem mais estrutural do que o MVP inicial. A análise principal passa por uma árvore intermediária construída a partir de HTML e JSX/TSX, o que melhora a detecção em arquivos mais complexos.

Antes de mudar uma regra, pense nos seguintes casos:

- o código pode estar em HTML puro ou JSX/TSX;
- atributos podem usar aspas simples ou duplas;
- pode haver tags internas dentro de links e botões;
- algumas regras precisam cruzar informações de elementos diferentes, como `label` e `input`;
- conteúdo dinâmico nem sempre será detectável por regex;
- contraste e análise semântica podem depender de estilo inline, props `style` e classes Tailwind.

## Configuração das regras

As regras podem ser habilitadas ou desabilitadas via configuração do VS Code. O objeto principal é `a11yDevHelper.rules`.

Exemplo:

```json
{
  "a11yDevHelper.rules": {
    "img-missing-alt": true,
    "link-generic-text": true,
    "div-span-onclick": true,
    "autofocus": true,
    "html-missing-lang": true,
    "input-missing-label": true,
    "button-missing-name": true
  }
}
```

Para desativar uma regra, defina seu valor como `false`.

## Checklist antes de abrir um pull request

- O projeto compila com `npm run compile`.
- O lint passa com `npm run lint`.
- A extensão foi testada manualmente no Extension Development Host.
- Novas regras foram adicionadas em `src/rules/index.ts`.
- Novas regras foram adicionadas à configuração em `package.json`.
- O guia ou o README foi atualizado se a mudança alterar o funcionamento da extensão.
