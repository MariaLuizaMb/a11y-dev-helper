// src/rules/index.ts
import { A11yRule } from "../utils/diagnostics";
import { ariaReferencedIdRule } from "./ariaReferencedId";
import { ariaRoleRule } from "./ariaRole";
import { autofocusRule } from "./autofocus";
import { buttonEmojiOnlyRule } from "./buttonEmojionly";
import { buttonNameRule } from "./buttonName";
import { buttonOnlySvgRule } from "./buttonOnlySvg";
import { clickableNoKeyboardRule } from "./clickableNoKeyboard";
import { colorContrastRule } from "./colorContrast";
import { divSpanOnClickRule } from "./divSpanOnClick";
import { duplicateIdRule } from "./duplicateId";
import { fieldsetLegendRule } from "./fieldsetLegend";
import { headingOrderRule } from "./headingOrder";
import { htmlLangRule } from "./htmlLang";
import { iframeTitleRule } from "./iframeTitle";
import { imgAltRule } from "./imgAlt";
import { inputLabelRule } from "./inputLabel";
import { inputPlaceholderNoLabelRule } from "./inputPlaceholdernoLabel";
import { labelMissingForIdRule } from "./labelMissingForId";
import { linkEmptyRule } from "./linkEmpty";
import { linkNoHrefRule } from "./linkNoHref";
import { linkTextRule } from "./linkText";
import { selectLabelRule } from "./selectLabel";
import { smallFontSizeRule } from "./smallFontSize";
import { tabIndexPositiveRule } from "./tabIndexPositive";
import { tableCaptionRule } from "./tableCaption";
import { videoTrackRule } from "./videoTrack";

export const allRules: A11yRule[] = [
  // ── Imagens ────────────────────────────────────────────────────────────────
  imgAltRule,

  // ── Links ──────────────────────────────────────────────────────────────────
  linkTextRule,
  linkNoHrefRule,
  linkEmptyRule,

  // ── Botões ─────────────────────────────────────────────────────────────────
  buttonNameRule,
  buttonEmojiOnlyRule,
  buttonOnlySvgRule,

  // ── Formulários ────────────────────────────────────────────────────────────
  inputLabelRule,
  inputPlaceholderNoLabelRule,
  selectLabelRule,
  fieldsetLegendRule,
  labelMissingForIdRule,

  // ── Interatividade e teclado ───────────────────────────────────────────────
  divSpanOnClickRule,
  clickableNoKeyboardRule,
  tabIndexPositiveRule,
  autofocusRule,

  // ── ARIA ───────────────────────────────────────────────────────────────────
  ariaRoleRule,
  ariaReferencedIdRule,
  duplicateIdRule,

  // ── Estrutura do documento ─────────────────────────────────────────────────
  headingOrderRule,
  htmlLangRule,

  // ── Tipografia ─────────────────────────────────────────────────────────────
  smallFontSizeRule,

  // ── Mídia ──────────────────────────────────────────────────────────────────
  iframeTitleRule,
  videoTrackRule,

  // ── Tabelas ────────────────────────────────────────────────────────────────
  tableCaptionRule,

  // ── Contraste de cores ─────────────────────────────────────────────────────
  colorContrastRule,
];
