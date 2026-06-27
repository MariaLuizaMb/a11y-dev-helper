const { colorContrastRule } = require('./out/rules/colorContrast');
const text = '<div style="color: #ffffff; background-color: #ffffff">Texto</div>';
const doc = {
  languageId: 'html',
  offsetAt: () => 0,
  positionAt: () => ({ line: 0, column: 0 }),
  getText: () => text,
};
console.log(colorContrastRule.check(text, doc).length);
