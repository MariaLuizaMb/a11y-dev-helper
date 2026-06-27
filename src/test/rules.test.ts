import * as assert from "assert";
import * as vscode from "vscode";
import { allRules } from "../rules";

async function getRuleDiagnostics(ruleId: string, text: string, languageId = "html") {
  const document = await vscode.workspace.openTextDocument({
    language: languageId,
    content: text,
  });

  const rule = allRules.find((candidate) => candidate.id === ruleId);
  assert.ok(rule, `Rule ${ruleId} not found`);
  return rule.check(text, document);
}

suite("Accessibility rules", () => {
  test("detecta IDs duplicados", async () => {
    const diagnostics = await getRuleDiagnostics(
      "duplicate-id",
      `<div id="x"></div><div id="x"></div>`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta label for apontando para ID inexistente", async () => {
    const diagnostics = await getRuleDiagnostics(
      "label-missing-for-id",
      `<label for="missing">Nome</label><input id="field" />`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta aria-labelledby e aria-describedby inexistentes", async () => {
    const diagnostics = await getRuleDiagnostics(
      "aria-referenced-id",
      `<div id="title">Título</div><input aria-labelledby="missing" aria-describedby="also-missing" />`,
    );

    assert.strictEqual(diagnostics.length, 2);
  });

  test("detecta botão com apenas SVG sem nome acessível", async () => {
    const diagnostics = await getRuleDiagnostics(
      "button-only-svg",
      `<button><svg></svg></button>`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta link vazio sem nome acessível", async () => {
    const diagnostics = await getRuleDiagnostics(
      "link-empty",
      `<a href="#"></a>`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta elemento clicável sem suporte a teclado", async () => {
    const diagnostics = await getRuleDiagnostics(
      "clickable-no-keyboard-support",
      `<div onclick="doSomething()">Clique</div>`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta botão sem nome acessível usando o parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "button-missing-name",
      `<button><svg></svg></button>`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("ignora legend de fieldset aninhado para o fieldset externo", async () => {
    const diagnostics = await getRuleDiagnostics(
      "fieldset-missing-legend",
      `<fieldset><div><fieldset><legend>Grupo</legend></fieldset></div></fieldset>`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta input sem label usando o parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "input-missing-label",
      `<input type="text" />`,
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta img sem alt em JSX/TSX usando o parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "img-missing-alt",
      `<div><img src="/hero.png" /></div>`,
      "typescriptreact",
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("aceita iframe com title via expressão JSX no parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "iframe-missing-title",
      `<iframe title={label} />`,
      "typescriptreact",
    );

    assert.strictEqual(diagnostics.length, 0);
  });

  test("detecta contraste ruim em style prop JSX usando parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "color-contrast",
      `<div style={{ color: "#ffffff", backgroundColor: "#ffffff" }}>Texto</div>`,
      "typescriptreact",
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("aceita track com kind via expressão JSX no parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "video-missing-track",
      `<video><track kind={"captions"} /></video>`,
      "typescriptreact",
    );

    assert.strictEqual(diagnostics.length, 0);
  });

  test("detecta contraste ruim em cores rgb sem vírgulas usando o parser", async () => {
    const diagnostics = await getRuleDiagnostics(
      "color-contrast",
      `<div style={{ color: "rgb(255 255 255)", backgroundColor: "rgb(240 240 240)" }}>Texto</div>`,
      "typescriptreact",
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta contraste ruim em style inline em HTML", async () => {
    const diagnostics = await getRuleDiagnostics(
      "color-contrast",
      `<div style="color: #ffffff; background-color: #ffffff">Texto</div>`,
      "html",
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("detecta contraste ruim em classes Tailwind em HTML", async () => {
    const diagnostics = await getRuleDiagnostics(
      "color-contrast",
      `<div class="bg-white text-white">Texto</div>`,
      "html",
    );

    assert.strictEqual(diagnostics.length, 1);
  });

  test("aceita JSX/TSX com parser do Babel", async () => {
    const diagnostics = await getRuleDiagnostics(
      "button-only-svg",
      `<button aria-label="Fechar"><svg /></button>`,
      "typescriptreact",
    );

    assert.strictEqual(diagnostics.length, 0);
  });

  test("não quebra a análise quando o JSX/TSX tem sintaxe inválida", async () => {
    const diagnostics = await getRuleDiagnostics(
      "img-missing-alt",
      `<div><img src="/hero.png" /></div`,
      "typescriptreact",
    );

    assert.deepStrictEqual(diagnostics, []);
  });
});
