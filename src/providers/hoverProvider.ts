// src/providers/hoverProvider.ts
import * as vscode from "vscode";

const RULE_DOCS: Record<string, { wcag: string; url: string; tip: string }> = {
  "img-missing-alt": {
    wcag: "WCAG 1.1.1 Non-text Content (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html",
    tip: 'Use alt="" para imagens decorativas e uma descrição para imagens informativas.',
  },
  "html-missing-lang": {
    wcag: "WCAG 3.1.1 Language of Page (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
    tip: 'Adicione `lang="pt-BR"` (ou o idioma correto) na tag `<html>`.',
  },
  "link-generic-text": {
    wcag: "WCAG 2.4.4 Link Purpose (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
    tip: 'Substitua "clique aqui" por um texto descritivo, ex: "Ver relatório de vendas".',
  },
  "link-missing-href": {
    wcag: "WCAG 2.1.1 Keyboard (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
    tip: "Sem `href` o link não é focável pelo teclado. Use `<button>` para ações.",
  },
  "link-empty": {
    wcag: "WCAG 2.4.4 Link Purpose (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
    tip: "Links vazios são anunciados como vazios por leitores de tela. Adicione texto ou aria-label.",
  },
  "button-missing-name": {
    wcag: "WCAG 4.1.2 Name, Role, Value (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    tip: "Adicione texto visível, aria-label ou title ao botão.",
  },
  "button-emoji-only": {
    wcag: "WCAG 4.1.2 Name, Role, Value (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    tip: 'Emoji são anunciados de forma inconsistente. Adicione aria-label="Buscar" ao botão.',
  },
  "button-only-svg": {
    wcag: "WCAG 4.1.2 Name, Role, Value (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    tip: "Ícones SVG não têm nome por padrão. Adicione `aria-label` ou `<title>` dentro do SVG.",
  },
  "div-span-onclick": {
    wcag: "WCAG 2.1.1 Keyboard (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
    tip: "Use `<button>` ou adicione `role`, `tabIndex` e `onKeyDown` para suporte ao teclado.",
  },
  "clickable-no-keyboard-support": {
    wcag: "WCAG 2.1.1 Keyboard (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html",
    tip: 'Adicione `tabIndex={0}` e `role="button"` (ou use um `<button>` nativo).',
  },
  autofocus: {
    wcag: "WCAG 2.4.3 Focus Order (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html",
    tip: "autofocus pode desorientar usuários de leitor de tela. Use com cuidado.",
  },
  "input-missing-label": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: 'Associe um `<label for="id">` ao `id` do input, ou use `aria-label`.',
  },
  "input-placeholder-no-label": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: "O `placeholder` desaparece ao digitar. Sempre use um `<label>` visível ou `aria-label`.",
  },
  "select-missing-label": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: 'Associe um `<label for="id">` ao `id` do select, ou use `aria-label`.',
  },
  "fieldset-missing-legend": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: "O `<legend>` é anunciado antes de cada campo do grupo por leitores de tela.",
  },
  "label-missing-for-id": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: "O atributo for deve referenciar o id exato de um elemento existente.",
  },
  "heading-order": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: "Não pule níveis de heading (ex: h1 → h3). A hierarquia deve ser sequencial.",
  },
  "iframe-missing-title": {
    wcag: "WCAG 4.1.2 Name, Role, Value (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    tip: 'Adicione title="Descrição do frame" ao iframe.',
  },
  "table-missing-caption": {
    wcag: "WCAG 1.3.1 Info and Relationships (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html",
    tip: "Adicione `<caption>` como primeiro filho da tabela.",
  },
  "video-missing-track": {
    wcag: "WCAG 1.2.2 Captions (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html",
    tip: 'Adicione `<track kind="captions" src="legendas.vtt">` dentro do `<video>`.',
  },
  "tabindex-positive": {
    wcag: "WCAG 2.4.3 Focus Order (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html",
    tip: "tabIndex > 0 reordena o foco de forma imprevisível. Use 0 ou -1.",
  },
  "aria-invalid-role": {
    wcag: "WCAG 4.1.2 Name, Role, Value (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    tip: "Consulte a lista de roles em https://www.w3.org/TR/wai-aria-1.2/",
  },
  "aria-referenced-id": {
    wcag: "WCAG 4.1.2 Name, Role, Value (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html",
    tip: "O id referenciado em aria-labelledby/aria-describedby deve existir na página.",
  },
  "duplicate-id": {
    wcag: "WCAG 4.1.1 Parsing (Nível A)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/parsing.html",
    tip: "Ids duplicados quebram associações de labels e aria. Cada id deve ser único.",
  },
  "color-contrast": {
    wcag: "WCAG 1.4.3 Contrast (Nível AA)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html",
    tip: "Texto normal precisa de proporção >= 4.5:1; texto grande >= 3:1.",
  },
  "small-font-size": {
    wcag: "WCAG 1.4.4 Resize Text (Nível AA)",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html",
    tip: "Use no mínimo 12px para texto de conteúdo.",
  },
};

/**
 * HoverProvider: shows WCAG context when hovering a diagnostic underline.
 */
export class A11yHoverProvider implements vscode.HoverProvider {
  constructor(private readonly collection: vscode.DiagnosticCollection) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const diags = this.collection.get(document.uri) ?? [];
    const hit = diags.find((d) => d.range.contains(position));
    if (!hit) return undefined;

    const ruleId =
      typeof hit.code === "string" ? hit.code : String(hit.code ?? "");
    const ref = RULE_DOCS[ruleId];

    const md = new vscode.MarkdownString("", true);
    md.isTrusted = true;
    md.appendMarkdown(`**A11y Dev Helper** \`${ruleId}\`\n\n`);
    md.appendMarkdown(`${hit.message}\n\n`);
    if (ref) {
      md.appendMarkdown(`---\n\n`);
      md.appendMarkdown(`📖 **${ref.wcag}**\n\n`);
      md.appendMarkdown(`💡 ${ref.tip}\n\n`);
      md.appendMarkdown(`[Ver documentação WCAG](${ref.url})`);
    }
    return new vscode.Hover(md, hit.range);
  }
}
