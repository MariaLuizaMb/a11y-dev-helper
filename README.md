# A11y Dev Helper

A11y Dev Helper é uma extensão para Visual Studio Code que ajuda desenvolvedores a identificar problemas básicos de acessibilidade enquanto escrevem HTML, JSX e TSX.

A ideia da extensão é trazer sinais rápidos e educativos para dentro do fluxo normal de desenvolvimento. Em vez de deixar a acessibilidade apenas para revisões finais, auditorias manuais ou ferramentas externas, a extensão mostra avisos diretamente no painel `Problems` do VS Code enquanto o arquivo está sendo editado.

## Qual problema ela resolve

Muitos problemas de acessibilidade aparecem por pequenos descuidos no código:

- imagens sem `alt`;
- links com textos genéricos;
- campos de formulário sem nome acessível;
- botões sem texto ou rótulo acessível;
- uso de `div` ou `span` como elemento clicável;
- ausência de `lang` na tag `<html>`;
- uso de `autofocus`.

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

As regras atuais usam expressões regulares como abordagem inicial de MVP. Isso mantém o projeto leve e sem dependências externas, mas também tem limitações conhecidas. Em versões futuras, as regras podem migrar para parsers/AST para lidar melhor com HTML, JSX, TSX e casos dinâmicos.

## Regras disponíveis

| ID | Severidade | O que detecta |
| --- | --- | --- |
| `img-missing-alt` | Warning | Imagens `<img>` sem atributo `alt`. |
| `link-generic-text` | Warning | Links com textos genéricos como "clique aqui", "saiba mais" ou "read more". |
| `div-span-onclick` | Warning | Elementos `<div>` ou `<span>` com `onClick`. |
| `autofocus` | Information | Uso de `autofocus` ou `autoFocus`. |
| `html-missing-lang` | Warning | Tag `<html>` sem atributo `lang`. |
| `input-missing-label` | Warning | Campos `<input>` sem label acessível. |
| `button-missing-name` | Warning | Botões sem texto visível ou nome acessível. |

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

`src/extension.ts` cuida da integração com o VS Code: ativação, eventos, debounce, leitura de configuração e envio dos diagnostics.

`src/utils/diagnostics.ts` contém a interface compartilhada `A11yRule` e o helper `makeDiagnostic`.

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
4. Abra um arquivo `.html`, `.jsx` ou `.tsx`.
5. Veja os avisos no painel `Problems`.

## Como contribuir

Para começar a editar a extensão, leia o guia:

[GUIA_DE_EDICAO.md](./GUIA_DE_EDICAO.md)

Ele explica a estrutura do projeto, como criar novas regras, como testar alterações e quais cuidados manter para preservar o padrão atual.
