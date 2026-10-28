import type {CssWhiteList} from './shared-types';

/** Data-only sanitizer settings shared by the existing policy and browser API. */
export interface SanitizeDataOptions {
    cssWhiteList?: CssWhiteList;
    allowedTags?: string[] | false;
    allowedAttributes?:
        | Record<string, (string | {name: string; multiple?: boolean; values: string[]})[]>
        | false;
    allowedSchemes?: string[] | boolean;
    allowedSchemesByTag?: Record<string, string[]> | boolean;
    allowedSchemesAppliedToAttributes?: string[];
    allowProtocolRelative?: boolean;
}
