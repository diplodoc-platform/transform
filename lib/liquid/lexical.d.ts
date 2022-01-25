export declare const quoteBalanced: RegExp;
export declare const vars: RegExp;
export declare const variable: RegExp;
export declare const tagLine: RegExp;
export declare const rangeLine: RegExp;
export declare const operators: RegExp[];
export declare const isSupportedMethod: (exp: string) => boolean;
export declare const getParsedMethod: (exp: String) => {
    name: string;
    args: string[];
} | null;
export declare const isLiteral: (str: string) => boolean;
export declare const isVariable: (str: string) => boolean;
export declare function parseLiteral(str: string): string | number | boolean;
