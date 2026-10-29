import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {FootnoteRenderer} from '../../footnote-data';
import type {ParserEnv} from '../../shared-types';

// Finite public capabilities read by pinned markdown-it-footnote 4.0.0.
// These are structural grammar inputs, never aliases for native private State classes.
interface BlockInput {
    src: string;
    bMarks: number[];
    tShift: number[];
    eMarks: number[];
    sCount: number[];
    level: number;
    blkIndent: number;
    parentType: string;
    tokens: Token[];
    env: ParserEnv;
    Token: new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;
    md: {block: {tokenize(state: BlockInput, start: number, end: number, silent: boolean): void}};
}
interface InlineInput {
    src: string;
    pos: number;
    posMax: number;
    env: ParserEnv;
    push(type: string, tag: string, nesting: -1 | 0 | 1): Token;
    md: FootnoteGrammar;
}
interface CoreInput {
    tokens: Token[];
    env: ParserEnv;
    inlineMode: boolean;
    Token: new (type: string, tag: string, nesting: -1 | 0 | 1) => Token;
}
export interface FootnoteGrammar {
    helpers: {parseLinkLabel(state: InlineInput, start: number): number};
    utils: {isSpace(code: number): boolean};
    block: {
        ruler: {
            before(
                anchor: string,
                name: string,
                rule: (state: BlockInput, start: number, end: number, silent: boolean) => boolean,
                options: {alt: string[]},
            ): void;
        };
    };
    inline: {
        parse(source: string, md: FootnoteGrammar, env: ParserEnv, tokens: Token[]): void;
        ruler: {
            after(
                anchor: string,
                name: string,
                rule: (state: InlineInput, silent: boolean) => boolean,
            ): void;
            disable(names: string[]): void;
        };
    };
    core: {ruler: {after(anchor: string, name: string, rule: (state: CoreInput) => void): void}};
    // The adapter and upstream install rules; neither reads a host renderer callback.
    renderer: {rules: Record<string, unknown>};
}
export interface FootnoteParser<Options> extends FootnoteGrammar, FootnoteRenderer<Options> {
    parse(source: string, env: ParserEnv): Token[];
    parseInline(source: string, env: ParserEnv): Token[];
    renderer: FootnoteRenderer<Options>['renderer'] & FootnoteGrammar['renderer'];
}
