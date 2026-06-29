# A11y Dev Helper

Extensão para VS Code que detecta problemas comuns de acessibilidade em arquivos **HTML**, **JSX** e **TSX** enquanto você programa.

> ⚠️ Esta extensão é uma ferramenta educativa de análise estática. Ela aponta padrões comuns de problemas, mas não garante conformidade completa com WCAG.

---

## Funcionalidades

- **26 regras** cobrindo critérios WCAG 2.1 nível A e AA
- Diagnósticos em tempo real na aba **Problems** (`Ctrl+Shift+M`)
- **Quick Fix** com `Ctrl+.` para correções automáticas
- **Hover** com explicação do critério WCAG violado e link para documentação
- **Status bar** com contagem de problemas no arquivo atual
- **Output channel** com log de execução (`View → Output → A11y Dev Helper`)
- Ativar/desativar regras individualmente nas configurações

---

## Regras implementadas

| ID                              | Descrição                                               | WCAG     |
| ------------------------------- | ------------------------------------------------------- | -------- |
| `img-missing-alt`               | `<img>` sem atributo `alt`                              | 1.1.1 A  |
| `html-missing-lang`             | `<html>` sem `lang`                                     | 3.1.1 A  |
| `link-generic-text`             | Link com texto genérico ("clique aqui")                 | 2.4.4 A  |
| `link-missing-href`             | `<a>` sem `href`                                        | 2.1.1 A  |
| `link-empty`                    | Link com href mas sem texto                             | 2.4.4 A  |
| `button-missing-name`           | Botão sem nome acessível                                | 4.1.2 A  |
| `button-emoji-only`             | Botão com apenas emoji                                  | 4.1.2 A  |
| `button-only-svg`               | Botão com apenas SVG sem nome                           | 4.1.2 A  |
| `div-span-onclick`              | `div`/`span` com `onClick`                              | 2.1.1 A  |
| `clickable-no-keyboard-support` | Elemento clicável sem suporte a teclado                 | 2.1.1 A  |
| `autofocus`                     | Uso de `autofocus` / `autoFocus`                        | 2.4.3 A  |
| `input-missing-label`           | `<input>` sem label                                     | 1.3.1 A  |
| `input-placeholder-no-label`    | `<input>` usando apenas placeholder                     | 1.3.1 A  |
| `select-missing-label`          | `<select>` sem label                                    | 1.3.1 A  |
| `fieldset-missing-legend`       | `<fieldset>` sem `<legend>`                             | 1.3.1 A  |
| `label-missing-for-id`          | `<label for>` referenciando id inexistente              | 1.3.1 A  |
| `heading-order`                 | Hierarquia de headings com saltos                       | 1.3.1 A  |
| `iframe-missing-title`          | `<iframe>` sem `title`                                  | 4.1.2 A  |
| `table-missing-caption`         | `<table>` sem `<caption>`                               | 1.3.1 A  |
| `video-missing-track`           | `<video>` sem legenda                                   | 1.2.2 A  |
| `tabindex-positive`             | `tabIndex` com valor positivo                           | 2.4.3 A  |
| `aria-invalid-role`             | `role` com valor inválido                               | 4.1.2 A  |
| `aria-referenced-id`            | `aria-labelledby`/`aria-describedby` com id inexistente | 4.1.2 A  |
| `duplicate-id`                  | `id` duplicado na página                                | 4.1.1 A  |
| `color-contrast`                | Contraste insuficiente (inline, Tailwind, CSS-in-JS)    | 1.4.3 AA |
| `small-font-size`               | `font-size` abaixo de 12px                              | 1.4.4 AA |

---

## Configuração

Desabilite regras individualmente em `settings.json`:

```json
"a11yDevHelper.rules": {
  "autofocus": false,
  "color-contrast": false
}
```

---

## Limitações conhecidas

- Análise **estática** — não executa o código nem considera estilos externos
- Contraste de cores cobre apenas estilos **inline**, classes **Tailwind** e **CSS-in-JS** (`sx={{}}`, `styled`)
- Regras JSX/TSX usam **@babel/parser** — templates dinâmicos podem ter falsos negativos
- `color-contrast` não resolve variáveis CSS (`var(--cor)`) nem tokens de tema
