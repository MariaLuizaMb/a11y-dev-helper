# A11y Dev Helper

A11y Dev Helper é uma extensão para Visual Studio Code que ajuda desenvolvedores a identificar problemas básicos de acessibilidade enquanto escrevem HTML, JSX e TSX.

A ideia da extensão é trazer sinais rápidos e educativos para dentro do fluxo normal de desenvolvimento. Em vez de deixar a acessibilidade apenas para revisões finais, auditorias manuais ou ferramentas externas, a extensão mostra avisos diretamente no painel `Problems` do VS Code enquanto o arquivo está sendo editado.

## Qual problema ela resolve

Muitos problemas de acessibilidade aparecem por pequenos descuidos no código:

- imagens sem `alt`;
- links com textos genéricos ou vazios;
- campos de formulário sem nome acessível;
- botões sem texto ou rótulo acessível;
- uso de `div` ou `span` como elemento clicável;
- ausência de `lang` na tag `<html>`;
- uso de `autofocus`;
- contraste de cores insuficiente;
- IDs duplicados e referências de ARIA inválidas;
- falta de `legend` em `fieldset`, `title` em `iframe`, `track` em `video` e ordem de headings.

Esses pontos parecem simples, mas afetam diretamente pessoas que usam leitores de tela, navegação por teclado ou outras tecnologias assistivas. A extensão atua como um lembrete imediato para corrigir esses casos ainda durante a implementação.

## Diferencial

O diferencial da A11y Dev Helper é ser simples, local e fácil de evoluir.

Ela não tenta substituir auditorias completas de acessibilidade, testes com usuários ou ferramentas mais robustas como Lighthouse, axe ou validadores especializados. O foco é outro: detectar problemas comuns cedo, com mensagens claras, dentro do editor.

Também existe uma preocupação didática. Cada diagnóstico explica o problema de forma direta e sugere uma correção possível. Isso ajuda quem está começando a aprender acessibilidade a entender o motivo do aviso, não apenas apagar um erro da tela.

Outro ponto importante é a arquitetura modular. Cada regra fica em um arquivo separado dentro de `src/rules/`, o que facilita adicionar, remover, testar ou melhorar regras individualmente.

## Como funciona

A extensão é ativada quando um arquivo HTML, JSX ou TSX é aberto no VS Code.

Os arquivos suportados são identificados pelos seguintes `languageId`:

- `html`
- `javascriptreact`
- `typescriptreact`

Quando um documento suportado é aberto, alterado ou selecionado, a extensão:

1. Lê o texto completo do arquivo.
2. Carrega as regras habilitadas nas configurações do usuário.
3. Executa cada regra sobre o texto.
4. Cria objetos `Diagnostic` do VS Code para os problemas encontrados.
5. Exibe os avisos no painel `Problems`.

As regras principais de estrutura e semântica são avaliadas sobre uma AST normalizada, construída a partir de parsers para HTML, JSX e TSX. Essa abordagem substitui a lógica baseada em regex para a detecção principal de problemas, melhorando a leitura de estrutura, atributos e relações entre elementos em arquivos com marcação e componentes mais complexos. A análise de contraste também usa essa mesma estrutura para interpretar estilos inline, props `style` e classes Tailwind de forma mais consistente.

## Regras disponíveis

Atualmente a extensão cobre as seguintes regras:

| ID | Severidade | O que detecta |
| --- | --- | --- |
| `img-missing-alt` | Warning | Imagens `<img>` sem atributo `alt`. |
| `link-generic-text` | Warning | Links com textos genéricos, como "clique aqui" ou "saiba mais". |
| `link-missing-href` | Warning | Links sem `href` ou sem destino acessível. |
| `link-empty` | Warning | Links sem texto visível ou nome acessível. |
| `div-span-onclick` | Warning | Elementos `<div>` ou `<span>` com `onClick`. |
| `autofocus` | Information | Uso de `autofocus` ou `autoFocus`. |
| `html-missing-lang` | Warning | Tag `<html>` sem atributo `lang`. |
| `input-missing-label` | Warning | Campos `<input>` sem label acessível. |
| `input-placeholder-no-label` | Warning | Campos com `placeholder` e sem label real. |
| `select-missing-label` | Warning | Elementos `<select>` sem label acessível. |
| `button-missing-name` | Warning | Botões sem texto visível ou nome acessível. |
| `button-emoji-only` | Warning | Botões com conteúdo composto apenas por emoji. |
| `button-only-svg` | Warning | Botões com apenas SVG sem nome acessível. |
| `tabindex-positive` | Warning | Uso de `tabindex` positivo. |
| `heading-order` | Warning | Ordem inconsistente de headings (`h1` a `h6`). |
| `iframe-missing-title` | Warning | `<iframe>` sem `title` acessível. |
| `video-missing-track` | Warning | `<video>` sem `track` ou sem legenda. |
| `table-missing-caption` | Warning | `<table>` sem `<caption>`. |
| `fieldset-missing-legend` | Warning | `<fieldset>` sem `<legend>` associado. |
| `aria-invalid-role` | Warning | Uso de papéis ARIA inválidos. |
| `duplicate-id` | Warning | IDs duplicados no documento. |
| `label-missing-for-id` | Warning | `label`/`htmlFor` apontando para um `id` inexistente. |
| `aria-referenced-id` | Warning | `aria-labelledby`/`aria-describedby` apontando para `id` inexistente. |
| `clickable-no-keyboard-support` | Warning | Elementos clicáveis sem suporte ao teclado. |
| `color-contrast` | Warning/Information | Contraste insuficiente em estilos inline, Tailwind e CSS-in-JS. |

## Configurações

É possível habilitar ou desabilitar regras individualmente pelas configurações do VS Code.

Exemplo em `settings.json`:

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

Para desativar uma regra, defina seu valor como `false`:

```json
{
  "a11yDevHelper.rules": {
    "autofocus": false
  }
}
```

## Estrutura do projeto

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

`src/extension.ts` cuida da integração com o VS Code: ativação, eventos, debounce, leitura de configuração e envio dos diagnostics.

`src/utils/htmlAst.ts` concentra o parser compartilhado para HTML, JSX e TSX, e `src/utils/diagnostics.ts` contém a interface `A11yRule` e o helper `makeDiagnostic`.

`src/rules/` contém as regras de acessibilidade. Cada arquivo exporta uma regra isolada, e `src/rules/index.ts` reúne todas no array `allRules`.

## Como rodar localmente

Instale as dependências:

```bash
npm install
```

Compile o projeto:

```bash
npm run compile
```

Abra o modo de desenvolvimento da extensão:

1. Abra este repositório no VS Code.
2. Pressione `F5`.
3. Uma nova janela do VS Code será aberta com a extensão carregada.
4. Abra o arquivo `sample.html` ou qualquer arquivo `.html`, `.jsx` ou `.tsx`.
5. Veja os avisos no painel `Problems`.

O arquivo `sample.html` foi pensado para testar as verificações de forma direta, com exemplos curtos e organizados, praticamente um por regra.

## Como contribuir

Para começar a editar a extensão, leia o guia:

[GUIA_DE_EDICAO.md](./GUIA_DE_EDICAO.md)

Ele explica a estrutura do projeto, como criar novas regras, como testar alterações e quais cuidados manter para preservar o padrão atual.
