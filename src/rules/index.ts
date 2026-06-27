// src/rules/index.ts
import { A11yRule } from "../utils/diagnostics";
import { autofocusRule } from "./autofocus";
import { buttonNameRule } from "./buttonName";
import { colorContrastRule } from "./colorContrast";
import { divSpanOnClickRule } from "./divSpanOnClick";
import { htmlLangRule } from "./htmlLang";
import { imgAltRule } from "./imgAlt";
import { inputLabelRule } from "./inputLabel";
import { linkTextRule } from "./linkText";
import { linkNoHrefRule } from "./linkNoHref";
import { inputPlaceholderNoLabelRule } from "./inputPlaceholdernoLabel";
import { buttonEmojiOnlyRule } from "./buttonEmojionly";
import { tabIndexPositiveRule } from "./tabIndexPositive";
import { headingOrderRule } from "./headingOrder";
import { iframeTitleRule } from "./iframeTitle";
import { videoTrackRule } from "./videoTrack";
import { tableCaptionRule } from "./tableCaption";
import { selectLabelRule } from "./selectLabel";
import { fieldsetLegendRule } from "./fieldsetLegend";
import { ariaRoleRule } from "./ariaRole";
import { smallFontSizeRule } from "./smallFontSize";
import {
  ariaReferencedIdRule,
  buttonOnlySvgRule,
  clickableNoKeyboardSupportRule,
  duplicateIdRule,
  labelMissingForIdRule,
  linkEmptyRule,
} from "./newRules";

export const allRules: A11yRule[] = [
  imgAltRule,
  linkTextRule,
  linkNoHrefRule,
  divSpanOnClickRule,
  autofocusRule,
  htmlLangRule,
  inputLabelRule,
  inputPlaceholderNoLabelRule,
  buttonNameRule,
  buttonEmojiOnlyRule,
  tabIndexPositiveRule,
  headingOrderRule,
  iframeTitleRule,
  videoTrackRule,
  tableCaptionRule,
  colorContrastRule,
  selectLabelRule,
  fieldsetLegendRule,
  ariaRoleRule,
  smallFontSizeRule,
  duplicateIdRule,
  labelMissingForIdRule,
  ariaReferencedIdRule,
  buttonOnlySvgRule,
  linkEmptyRule,
  clickableNoKeyboardSupportRule,
];
