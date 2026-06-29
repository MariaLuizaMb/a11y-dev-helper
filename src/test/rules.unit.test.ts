// src/test/rules.uni.test.ts
import * as assert from "assert";
import { fakeDocument, assertFinds, assertClean } from "./helpers";

// ── Rules under test ────────────────────────────────────────────────────────
import { imgAltRule } from "../rules/imgAlt";
import { htmlLangRule } from "../rules/htmlLang";
import { linkTextRule } from "../rules/linkText";
import { linkNoHrefRule } from "../rules/linkNoHref";
import { linkEmptyRule } from "../rules/linkEmpty";
import { buttonNameRule } from "../rules/buttonName";
import { buttonEmojiOnlyRule } from "../rules/buttonEmojionly";
import { divSpanOnClickRule } from "../rules/divSpanOnClick";
import { autofocusRule } from "../rules/autofocus";
import { inputLabelRule } from "../rules/inputLabel";
import { inputPlaceholderNoLabelRule } from "../rules/inputPlaceholdernoLabel";
import { headingOrderRule } from "../rules/headingOrder";
import { iframeTitleRule } from "../rules/iframeTitle";
import { tableCaptionRule } from "../rules/tableCaption";
import { videoTrackRule } from "../rules/videoTrack";
import { tabIndexPositiveRule } from "../rules/tabIndexPositive";
import { ariaRoleRule } from "../rules/ariaRole";
import { fieldsetLegendRule } from "../rules/fieldsetLegend";
import { selectLabelRule } from "../rules/selectLabel";
import { duplicateIdRule } from "../rules/duplicateId";
import { labelMissingForIdRule } from "../rules/labelMissingForId";
import { ariaReferencedIdRule } from "../rules/ariaReferencedId";
import { clickableNoKeyboardRule } from "../rules/clickableNoKeyboard";

// ── Helpers ─────────────────────────────────────────────────────────────────
const html = (s: string) => fakeDocument(s, "html");
const jsx = (s: string) => fakeDocument(s, "javascriptreact");

suite("A11y Dev Helper — unit tests", () => {
  // ── img-missing-alt ───────────────────────────────────────────────────────
  suite("img-missing-alt", () => {
    test("flags img without alt (HTML)", () => {
      const doc = html(
        '<html lang="pt-BR"><body><img src="x.png"></body></html>',
      );
      assertFinds(imgAltRule.check(doc.getText(), doc), 1, "img no alt html");
    });
    test("ignores img with alt (HTML)", () => {
      const doc = html(
        '<html lang="pt-BR"><body><img src="x.png" alt=""></body></html>',
      );
      assertClean(imgAltRule.check(doc.getText(), doc), "img with alt html");
    });
    test("flags img without alt (JSX)", () => {
      const doc = jsx('<img src="x.png" />');
      assertFinds(imgAltRule.check(doc.getText(), doc), 1, "img no alt jsx");
    });
    test("ignores img with alt (JSX)", () => {
      const doc = jsx('<img src="x.png" alt="" />');
      assertClean(imgAltRule.check(doc.getText(), doc), "img with alt jsx");
    });
  });

  // ── html-missing-lang ─────────────────────────────────────────────────────
  suite("html-missing-lang", () => {
    test("flags html without lang", () => {
      const doc = html("<html><body></body></html>");
      assertFinds(htmlLangRule.check(doc.getText(), doc), 1, "html no lang");
    });
    test("ignores html with lang", () => {
      const doc = html('<html lang="pt-BR"><body></body></html>');
      assertClean(htmlLangRule.check(doc.getText(), doc), "html with lang");
    });
  });

  // ── link-generic-text ─────────────────────────────────────────────────────
  suite("link-generic-text", () => {
    test("flags generic link text (JSX)", () => {
      const doc = jsx('<a href="/x">clique aqui</a>');
      assertFinds(
        linkTextRule.check(doc.getText(), doc),
        1,
        "generic text jsx",
      );
    });
    test("ignores descriptive link text", () => {
      const doc = jsx('<a href="/x">Sobre o projeto</a>');
      assertClean(linkTextRule.check(doc.getText(), doc), "descriptive text");
    });
  });

  // ── link-missing-href ─────────────────────────────────────────────────────
  suite("link-missing-href", () => {
    test("flags anchor without href", () => {
      const doc = jsx("<a>Abrir</a>");
      assertFinds(linkNoHrefRule.check(doc.getText(), doc), 1, "no href");
    });
    test("ignores anchor with href", () => {
      const doc = jsx('<a href="/x">Abrir</a>');
      assertClean(linkNoHrefRule.check(doc.getText(), doc), "with href");
    });
  });

  // ── link-empty ────────────────────────────────────────────────────────────
  suite("link-empty", () => {
    test("flags empty anchor with href", () => {
      const doc = jsx('<a href="/x"></a>');
      assertFinds(linkEmptyRule.check(doc.getText(), doc), 1, "empty link");
    });
    test("ignores link with text", () => {
      const doc = jsx('<a href="/x">Sobre</a>');
      assertClean(linkEmptyRule.check(doc.getText(), doc), "link with text");
    });
    test("ignores link with aria-label", () => {
      const doc = jsx('<a href="/x" aria-label="Página inicial"></a>');
      assertClean(linkEmptyRule.check(doc.getText(), doc), "link aria-label");
    });
  });

  // ── button-missing-name ───────────────────────────────────────────────────
  suite("button-missing-name", () => {
    test("flags empty button", () => {
      const doc = jsx("<button></button>");
      assertFinds(buttonNameRule.check(doc.getText(), doc), 1, "empty button");
    });
    test("ignores button with text", () => {
      const doc = jsx("<button>Enviar</button>");
      assertClean(buttonNameRule.check(doc.getText(), doc), "button with text");
    });
    test("ignores button with aria-label", () => {
      const doc = jsx('<button aria-label="Fechar"></button>');
      assertClean(
        buttonNameRule.check(doc.getText(), doc),
        "button aria-label",
      );
    });
  });

  // ── button-emoji-only ─────────────────────────────────────────────────────
  suite("button-emoji-only", () => {
    test("flags button with only emoji", () => {
      const doc = jsx("<button>🔍</button>");
      assertFinds(
        buttonEmojiOnlyRule.check(doc.getText(), doc),
        1,
        "emoji button",
      );
    });
    test("ignores emoji button with aria-label", () => {
      const doc = jsx('<button aria-label="Buscar">🔍</button>');
      assertClean(
        buttonEmojiOnlyRule.check(doc.getText(), doc),
        "emoji + aria-label",
      );
    });
    test("ignores button with text and emoji", () => {
      const doc = jsx("<button>🔍 Buscar</button>");
      assertClean(
        buttonEmojiOnlyRule.check(doc.getText(), doc),
        "text + emoji",
      );
    });
  });

  // ── div-span-onclick ──────────────────────────────────────────────────────
  suite("div-span-onclick", () => {
    test("flags div with onClick (JSX)", () => {
      const doc = jsx("<div onClick={() => {}}>Menu</div>");
      assertFinds(
        divSpanOnClickRule.check(doc.getText(), doc),
        1,
        "div onclick jsx",
      );
    });
    test("ignores button with onClick", () => {
      const doc = jsx("<button onClick={() => {}}>Enviar</button>");
      assertClean(
        divSpanOnClickRule.check(doc.getText(), doc),
        "button onclick",
      );
    });
  });

  // ── autofocus ─────────────────────────────────────────────────────────────
  suite("autofocus", () => {
    test("flags autoFocus (JSX)", () => {
      const doc = jsx("<input autoFocus />");
      assertFinds(autofocusRule.check(doc.getText(), doc), 1, "autoFocus jsx");
    });
    test("flags autofocus (HTML)", () => {
      const doc = html(
        '<html lang="pt-BR"><body><input autofocus></body></html>',
      );
      assertFinds(autofocusRule.check(doc.getText(), doc), 1, "autofocus html");
    });
  });

  // ── input-missing-label ───────────────────────────────────────────────────
  suite("input-missing-label", () => {
    test("flags input without label", () => {
      const doc = jsx('<input type="text" />');
      assertFinds(
        inputLabelRule.check(doc.getText(), doc),
        1,
        "input no label",
      );
    });
    test("ignores input with aria-label", () => {
      const doc = jsx('<input type="text" aria-label="Nome" />');
      assertClean(inputLabelRule.check(doc.getText(), doc), "input aria-label");
    });
    test("ignores input with matching label for (HTML)", () => {
      const doc = html(
        '<html lang="pt-BR"><body>' +
          '<label for="n">Nome</label><input id="n" type="text">' +
          "</body></html>",
      );
      assertClean(inputLabelRule.check(doc.getText(), doc), "label for html");
    });
    test("ignores hidden/submit/reset inputs", () => {
      const doc = jsx(
        '<div><input type="hidden" /><input type="submit" /><input type="reset" /></div>',
      );
      assertClean(inputLabelRule.check(doc.getText(), doc), "exempt types");
    });
  });

  // ── input-placeholder-no-label ────────────────────────────────────────────
  suite("input-placeholder-no-label", () => {
    test("flags input with placeholder but no label", () => {
      const doc = jsx('<input type="text" placeholder="Nome" />');
      assertFinds(
        inputPlaceholderNoLabelRule.check(doc.getText(), doc),
        1,
        "placeholder no label",
      );
    });
    test("ignores input with placeholder and aria-label", () => {
      const doc = jsx(
        '<input type="text" placeholder="Nome" aria-label="Nome" />',
      );
      assertClean(
        inputPlaceholderNoLabelRule.check(doc.getText(), doc),
        "placeholder + aria-label",
      );
    });
  });

  // ── heading-order ─────────────────────────────────────────────────────────
  suite("heading-order", () => {
    test("flags h1 → h3 skip (HTML)", () => {
      const doc = html(
        '<html lang="pt-BR"><body><h1>A</h1><h3>B</h3></body></html>',
      );
      assertFinds(headingOrderRule.check(doc.getText(), doc), 1, "h1 h3 html");
    });
    test("ignores correct h1 → h2 → h3", () => {
      const doc = html(
        '<html lang="pt-BR"><body><h1>A</h1><h2>B</h2><h3>C</h3></body></html>',
      );
      assertClean(
        headingOrderRule.check(doc.getText(), doc),
        "correct headings",
      );
    });
  });

  // ── iframe-missing-title ──────────────────────────────────────────────────
  suite("iframe-missing-title", () => {
    test("flags iframe without title", () => {
      const doc = html(
        '<html lang="pt-BR"><body><iframe src="https://x.com"></iframe></body></html>',
      );
      assertFinds(
        iframeTitleRule.check(doc.getText(), doc),
        1,
        "iframe no title",
      );
    });
    test("ignores iframe with title", () => {
      const doc = html(
        '<html lang="pt-BR"><body><iframe src="https://x.com" title="Mapa"></iframe></body></html>',
      );
      assertClean(
        iframeTitleRule.check(doc.getText(), doc),
        "iframe with title",
      );
    });
    test("flags iframe with empty title", () => {
      const doc = html(
        '<html lang="pt-BR"><body><iframe src="https://x.com" title=""></iframe></body></html>',
      );
      assertFinds(
        iframeTitleRule.check(doc.getText(), doc),
        1,
        "iframe empty title",
      );
    });
  });

  // ── table-missing-caption ─────────────────────────────────────────────────
  suite("table-missing-caption", () => {
    test("flags table without caption", () => {
      const doc = html(
        '<html lang="pt-BR"><body><table><tr><th>Nome</th></tr></table></body></html>',
      );
      assertFinds(
        tableCaptionRule.check(doc.getText(), doc),
        1,
        "table no caption",
      );
    });
    test("ignores table with caption", () => {
      const doc = html(
        '<html lang="pt-BR"><body><table><caption>Resultados</caption><tr><th>Nome</th></tr></table></body></html>',
      );
      assertClean(
        tableCaptionRule.check(doc.getText(), doc),
        "table with caption",
      );
    });
    test("ignores table with aria-label", () => {
      const doc = html(
        '<html lang="pt-BR"><body><table aria-label="Dados"><tr><th>Nome</th></tr></table></body></html>',
      );
      assertClean(
        tableCaptionRule.check(doc.getText(), doc),
        "table aria-label",
      );
    });
  });

  // ── video-missing-track ───────────────────────────────────────────────────
  suite("video-missing-track", () => {
    test("flags video without captions track", () => {
      const doc = html(
        '<html lang="pt-BR"><body><video controls><source src="v.mp4"></video></body></html>',
      );
      assertFinds(
        videoTrackRule.check(doc.getText(), doc),
        1,
        "video no track",
      );
    });
    test("ignores video with captions track", () => {
      const doc = html(
        '<html lang="pt-BR"><body><video controls><source src="v.mp4"><track kind="captions" src="v.vtt"></video></body></html>',
      );
      assertClean(videoTrackRule.check(doc.getText(), doc), "video with track");
    });
  });

  // ── tabindex-positive ─────────────────────────────────────────────────────
  suite("tabindex-positive", () => {
    test("flags tabIndex={5} (JSX)", () => {
      const doc = jsx("<div tabIndex={5}>x</div>");
      assertFinds(
        tabIndexPositiveRule.check(doc.getText(), doc),
        1,
        "tabIndex jsx",
      );
    });
    test("ignores tabIndex={0}", () => {
      const doc = jsx("<div tabIndex={0}>x</div>");
      assertClean(tabIndexPositiveRule.check(doc.getText(), doc), "tabIndex 0");
    });
    test("ignores tabIndex={-1}", () => {
      const doc = jsx("<div tabIndex={-1}>x</div>");
      assertClean(
        tabIndexPositiveRule.check(doc.getText(), doc),
        "tabIndex -1",
      );
    });
  });

  // ── aria-invalid-role ─────────────────────────────────────────────────────
  suite("aria-invalid-role", () => {
    test('flags role="botao" (typo)', () => {
      const doc = jsx('<span role="botao">x</span>');
      assertFinds(ariaRoleRule.check(doc.getText(), doc), 1, "invalid role");
    });
    test('ignores role="button"', () => {
      const doc = jsx('<span role="button">x</span>');
      assertClean(ariaRoleRule.check(doc.getText(), doc), "valid role");
    });
  });

  // ── fieldset-missing-legend ───────────────────────────────────────────────
  suite("fieldset-missing-legend", () => {
    test("flags fieldset without legend", () => {
      const doc = html(
        '<html lang="pt-BR"><body><fieldset><input type="text" aria-label="Nome"></fieldset></body></html>',
      );
      assertFinds(
        fieldsetLegendRule.check(doc.getText(), doc),
        1,
        "fieldset no legend",
      );
    });
    test("ignores fieldset with legend", () => {
      const doc = html(
        '<html lang="pt-BR"><body><fieldset><legend>Endereço</legend><input type="text" aria-label="Rua"></fieldset></body></html>',
      );
      assertClean(
        fieldsetLegendRule.check(doc.getText(), doc),
        "fieldset with legend",
      );
    });
  });

  // ── select-missing-label ──────────────────────────────────────────────────
  suite("select-missing-label", () => {
    test("flags select without label", () => {
      const doc = html(
        '<html lang="pt-BR"><body><select><option>A</option></select></body></html>',
      );
      assertFinds(
        selectLabelRule.check(doc.getText(), doc),
        1,
        "select no label",
      );
    });
    test("ignores select with aria-label", () => {
      const doc = html(
        '<html lang="pt-BR"><body><select aria-label="País"><option>BR</option></select></body></html>',
      );
      assertClean(
        selectLabelRule.check(doc.getText(), doc),
        "select aria-label",
      );
    });
  });

  // ── duplicate-id ──────────────────────────────────────────────────────────
  suite("duplicate-id", () => {
    test("flags duplicate ids", () => {
      const doc = html(
        '<html lang="pt-BR"><body><div id="x">A</div><div id="x">B</div></body></html>',
      );
      assertFinds(duplicateIdRule.check(doc.getText(), doc), 1, "duplicate id");
    });
    test("ignores unique ids", () => {
      const doc = html(
        '<html lang="pt-BR"><body><div id="a">A</div><div id="b">B</div></body></html>',
      );
      assertClean(duplicateIdRule.check(doc.getText(), doc), "unique ids");
    });
  });

  // ── label-missing-for-id ──────────────────────────────────────────────────
  suite("label-missing-for-id", () => {
    test("flags label referencing nonexistent id", () => {
      const doc = html(
        '<html lang="pt-BR"><body><label for="nope">Nome</label></body></html>',
      );
      assertFinds(
        labelMissingForIdRule.check(doc.getText(), doc),
        1,
        "label dangling for",
      );
    });
    test("ignores label with existing id", () => {
      const doc = html(
        '<html lang="pt-BR"><body><label for="n">Nome</label><input id="n" /></body></html>',
      );
      assertClean(
        labelMissingForIdRule.check(doc.getText(), doc),
        "label valid for",
      );
    });
  });

  // ── aria-referenced-id ────────────────────────────────────────────────────
  suite("aria-referenced-id", () => {
    test("flags aria-labelledby referencing nonexistent id", () => {
      const doc = html(
        '<html lang="pt-BR"><body><div aria-labelledby="nope">x</div></body></html>',
      );
      assertFinds(
        ariaReferencedIdRule.check(doc.getText(), doc),
        1,
        "aria ref bad id",
      );
    });
    test("ignores aria-labelledby with existing id", () => {
      const doc = html(
        '<html lang="pt-BR"><body><h2 id="t">Título</h2><div aria-labelledby="t">x</div></body></html>',
      );
      assertClean(
        ariaReferencedIdRule.check(doc.getText(), doc),
        "aria ref good id",
      );
    });
  });

  // ── clickable-no-keyboard-support ─────────────────────────────────────────
  suite("clickable-no-keyboard-support", () => {
    test("flags div with onClick and no role/tabIndex", () => {
      const doc = jsx("<div onClick={() => {}}>x</div>");
      assertFinds(
        clickableNoKeyboardRule.check(doc.getText(), doc),
        1,
        "div no keyboard",
      );
    });
    test("ignores div with onClick and role", () => {
      const doc = jsx('<div role="button" onClick={() => {}}>x</div>');
      assertClean(
        clickableNoKeyboardRule.check(doc.getText(), doc),
        "div role + onclick",
      );
    });
    test("ignores button with onClick", () => {
      const doc = jsx("<button onClick={() => {}}>Enviar</button>");
      assertClean(
        clickableNoKeyboardRule.check(doc.getText(), doc),
        "button onclick",
      );
    });
  });
});
