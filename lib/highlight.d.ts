import { LanguageFn } from 'highlight.js';
export declare type LangMap = Record<string, LanguageFn>;
export default function makeHighlight(langs?: LangMap): (str: string, lang: string) => string;
