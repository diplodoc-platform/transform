declare module 'markdown-it-ins' {
    import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};

    function ins(md: MarkdownIt): void;
    export = ins;
}

declare module 'markdown-it-sub' {
    import type {MarkdownIt} from 'markdown-it' with {'resolution-mode': 'import'};

    function sub(md: MarkdownIt): void;
    export = sub;
}

declare module 'markdown-it-footnote' {
    function footnote(md: import('./footnotes/types').FootnoteGrammar): void;
    export = footnote;
}
