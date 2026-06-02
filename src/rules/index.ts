// src/rules/index.ts
import { A11yRule } from "../utils/diagnostics";
import { autofocusRule } from "./autofocus";
import { buttonNameRule } from "./buttonName";
import { divSpanOnClickRule } from "./divSpanOnClick";
import { htmlLangRule } from "./htmlLang";
import { imgAltRule } from "./imgAlt";
import { inputLabelRule } from "./inputLabel";
import { linkTextRule } from "./linkText";

export const allRules: A11yRule[] = [
  imgAltRule,
  linkTextRule,
  divSpanOnClickRule,
  autofocusRule,
  htmlLangRule,
  inputLabelRule,
  buttonNameRule,
];
